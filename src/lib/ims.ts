/**
 * Server-side proxy for the official NSUT IMS student login.
 *
 * CampusConnect runs locally on the student's machine. This module keeps the
 * IMS PHP session (PHPSESSID) server-side so the genuine, server-validated IMS
 * CAPTCHA can be displayed inside CampusConnect while credentials flow only
 * from this app to https://imsnsit.org over HTTPS.
 *
 * Hard privacy rules enforced here:
 *   - IMS passwords and CAPTCHA answers are used for the single official login
 *     POST and never stored, logged, or written anywhere.
 *   - Session state lives only in this process's memory, expires in 10
 *     minutes, and is deleted once consumed by the attendance sync.
 *   - The only outbound host is https://imsnsit.org (no user-controlled URLs).
 */

import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/api";

const IMS_ORIGIN = "https://imsnsit.org";
const IMS_BASE = `${IMS_ORIGIN}/imsnsit/`;
const IMS_HOME = `${IMS_BASE}student.htm`;
const IMS_LOGIN_ENTRY = `${IMS_BASE}student_login110.php`;
const IMS_LOGIN_POST = `${IMS_BASE}student_login.php`;
const IMS_CAPTCHA_REFRESH = `${IMS_BASE}plum5_fw_utils.php?rty=captcha&typ=login`;

/** Same user agent the portal was verified with (some portals fingerprint it). */
const IMS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const SESSION_TTL_MS = 10 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_CAPTCHA_BYTES = 200_000;

/** Fallbacks matching what the portal currently renders (same year nsut.py pins). */
const DEFAULT_FY = "2026-27";
const DEFAULT_COMP = "NETAJI SUBHAS UNIVERSITY OF TECHNOLOGY";

export type IMSLoginResult =
  | { ok: true }
  | { ok: false; error: string; captchaImage?: string };

type IMSSession = {
  /** Opaque CampusConnect token handed to the browser — never the PHPSESSID. */
  token: string;
  cookies: Map<string, string>;
  hrand: string;
  fy: string;
  comp: string;
  attempts: number;
  createdAt: number;
};

const sessions = new Map<string, IMSSession>();

function sweepSessions(): void {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [token, session] of sessions) {
    if (session.createdAt < cutoff) sessions.delete(token);
  }
}

function getValidSession(token: string): IMSSession {
  sweepSessions();
  const session = sessions.get(token);
  if (!session) {
    throw new ApiError(400, "The IMS connection expired. Please start a new connection.");
  }
  return session;
}

function cookieHeader(cookies: Map<string, string>): string {
  return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}

function captureCookies(cookies: Map<string, string>, response: Response): void {
  const header = response.headers as Headers & { getSetCookie?: () => string[] };
  const chunks = typeof header.getSetCookie === "function" ? header.getSetCookie() : [];
  for (const chunk of chunks) {
    const pair = chunk.split(";")[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

type IMSFetchInit = RequestInit & {
  referer?: string;
  /** Fetch metadata header browsers send on POSTs (allowed by the portal). */
  origin?: string;
  redirectManual?: boolean;
};

async function imsFetch(url: string, cookies: Map<string, string>, init: IMSFetchInit = {}): Promise<Response> {
  const { referer, origin, redirectManual, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("user-agent", IMS_UA);
  if (cookies.size > 0) headers.set("cookie", cookieHeader(cookies));
  if (referer) headers.set("referer", referer);
  if (origin) headers.set("origin", origin);

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers,
      redirect: redirectManual ? "manual" : "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    // Diagnostic only: method + host, never cookies or credentials.
    console.warn("[ims] request failed", {
      method: rest.method ?? "GET",
      host: IMS_ORIGIN,
      reason: err instanceof Error ? err.name : "unknown",
    });
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new ApiError(
      502,
      timedOut
        ? "The NSUT IMS portal timed out. Please check your connection and try again."
        : "Could not reach the NSUT IMS portal. Check your internet connection and try again.",
    );
  }
  captureCookies(cookies, response);
  return response;
}

/* ------------------------------------------------------------- parsing -- */

function matchValue(html: string, name: string): string {
  const pattern = new RegExp(`name=['"]${name}['"][^>]*value=['"]([^'"]*)['"]`, "i");
  return html.match(pattern)?.[1]?.trim() ?? "";
}

function matchCaptchaPath(html: string): string | null {
  const bySrc =
    html.match(/src=['"]((?:images\/)?captcha\/[^'"]+)['"][^>]*id=['"]captchaimg['"]/i) ??
    html.match(/id=['"]captchaimg['"][^>]*src=['"]((?:images\/)?captcha\/[^'"]+)['"]/i);
  return bySrc?.[1] ?? null;
}

function absoluteImsUrl(path: string): string {
  return new URL(path, IMS_BASE).toString();
}

async function captchaDataUri(path: string, cookies: Map<string, string>, referer: string): Promise<string> {
  const response = await imsFetch(absoluteImsUrl(path), cookies, { referer });
  if (!response.ok) {
    throw new ApiError(502, "Could not download the CAPTCHA from the NSUT IMS portal.");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_CAPTCHA_BYTES) {
    throw new ApiError(502, "The NSUT IMS portal returned an unexpected CAPTCHA image.");
  }
  const type = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  return `data:${type};base64,${bytes.toString("base64")}`;
}

/** Applies a fresh login page (after refresh or a failed attempt) to a session. */
async function applyLoginPage(session: IMSSession, html: string): Promise<string> {
  const hrand = matchValue(html, "HRAND_NUM");
  if (hrand) session.hrand = hrand;
  session.fy = matchValue(html, "fy") || DEFAULT_FY;
  session.comp = matchValue(html, "comp") || DEFAULT_COMP;

  const captchaPath = matchCaptchaPath(html);
  if (!captchaPath) {
    // Reached only when the portal itself responds with its skeleton page
    // (no <body> form) — e.g. while it is busy or limiting requests.
    throw new ApiError(
      502,
      "The NSUT IMS portal responded with an unexpected page (its login form is missing). " +
        "This can happen when the portal is busy or temporarily limiting requests. " +
        "Please wait a few minutes and retry, or use browser login instead.",
    );
  }
  return captchaDataUri(captchaPath, session.cookies, IMS_LOGIN_POST);
}

/**
 * Loads the IMS login form.
 *
 * A real browser first loads the frameset index (scripts/nsut.py does
 * `driver.get(IMS_URL)` before clicking Student Login), and the portal only
 * renders the login form for sessions that have done that — otherwise it
 * serves the skeleton page without the <body> form/CAPTCHA. The banner page
 * (student_login110.php) then sets the PHPSESSID on its 302 to
 * student_login.php; the referer stays student.htm across the redirect,
 * exactly like a real browser navigation.
 */
async function fetchLoginForm(cookies: Map<string, string>): Promise<Response> {
  const index = await imsFetch(IMS_BASE, cookies);
  if (!index.ok) {
    // Non-fatal: the login fetch below decides success and reports its own
    // status. Diagnostic only — status and path, no cookies or credentials.
    console.warn("[ims] index pre-fetch returned non-OK", { status: index.status });
  }

  const entry = await imsFetch(IMS_LOGIN_ENTRY, cookies, { referer: IMS_HOME, redirectManual: true });
  const location = entry.headers.get("location");
  return location
    ? imsFetch(absoluteImsUrl(location), cookies, { referer: IMS_HOME })
    : entry;
}

/* -------------------------------------------------------------- public -- */

/** Opens a fresh IMS session and returns its genuine CAPTCHA as a data URI. */
export async function createIMSSession(): Promise<{ token: string; captchaImage: string }> {
  sweepSessions();
  if (sessions.size >= 25) {
    throw new ApiError(429, "Too many open IMS connections. Please retry in a few minutes.");
  }

  const cookies = new Map<string, string>();

  // 1. Load the login page. The frameset banner (student_login110.php) issues
  //    the PHPSESSID on its 302 and redirects to student_login.php. The
  //    referer stays student.htm across the redirect, matching a real browser.
  const page = await fetchLoginForm(cookies);
  if (!page.ok) {
    // Diagnostic only: status + final host/path, never cookies or credentials.
    console.warn("[ims] login page HTTP error", {
      status: page.status,
      path: new URL(page.url).pathname,
    });
    throw new ApiError(
      502,
      `The NSUT IMS portal returned HTTP ${page.status}. Please try again later.`,
    );
  }

  const html = await page.text();

  // Diagnostic breadcrumb: helps distinguish "portal served its skeleton
  // page (no <body> form)" from a parsing problem. Status/path/size only.
  if (!matchCaptchaPath(html)) {
    console.warn("[ims] login page missing CAPTCHA marker", {
      status: page.status,
      path: new URL(page.url).pathname,
      bytes: html.length,
      hasForm: /<form/i.test(html),
      hasUidInput: /id=['"]uid['"]/i.test(html),
    });
  }

  const session: IMSSession = {
    token: randomUUID(),
    cookies,
    hrand: "",
    fy: DEFAULT_FY,
    comp: DEFAULT_COMP,
    attempts: 0,
    createdAt: Date.now(),
  };
  const captchaImage = await applyLoginPage(session, html);
  sessions.set(session.token, session);
  return { token: session.token, captchaImage };
}

/** Official refresh: asks IMS for a new CAPTCHA inside the same session. */
export async function refreshIMSCaptcha(token: string): Promise<{ captchaImage: string }> {
  const session = getValidSession(token);
  const response = await imsFetch(IMS_CAPTCHA_REFRESH, session.cookies, { referer: IMS_LOGIN_POST });
  const html = await response.text();
  const path = html.match(/getElementById\('captchaimg'\)\.src='([^']+)'/i)?.[1];

  if (path) {
    return { captchaImage: await captchaDataUri(path, session.cookies, IMS_LOGIN_POST) };
  }

  // Fallback: reloading the login page also issues a new CAPTCHA.
  return { captchaImage: await applyLoginPage(session, await (await fetchLoginForm(session.cookies)).text()) };
}

function isLoginPage(html: string): boolean {
  return /Enter\s+Security\s+No/i.test(html) || /id=['"]captchaimg['"]/i.test(html);
}

/** Extracts the portal's red-font error, dropping its fixed boilerplate. */
function extractLoginError(html: string): string {
  // The portal often leaves its red <font> tags unclosed, so bound each block
  // by the next structural tag instead of requiring </font>.
  const blocks = [
    ...html.matchAll(/<font[^>]*color=red[^>]*>([\s\S]*?)(?:<\/font>|<\/td>|<input|<table|$)/gi),
  ];
  const text = (blocks[blocks.length - 1]?.[1] ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/do not share your password|responsible for all activities|activate your login/i.test(line))
    .join(" ");
  return text || "IMS rejected the login. Check your username, password and CAPTCHA.";
}

/**
 * Submits credentials to the official IMS login endpoint within the session
 * that owns the displayed CAPTCHA. IMS validates the CAPTCHA server-side.
 */
export async function loginWithIMS(token: string, uid: string, pwd: string, cap: string): Promise<IMSLoginResult> {
  const session = getValidSession(token);
  session.attempts += 1;
  if (session.attempts > MAX_LOGIN_ATTEMPTS) {
    sessions.delete(token);
    throw new ApiError(400, "Too many login attempts. Please start a new connection.");
  }

  const body = new URLSearchParams({
    f: "",
    uid,
    pwd,
    HRAND_NUM: session.hrand,
    fy: session.fy,
    comp: session.comp,
    cap,
    login: "Login",
    logintype: "student",
  });

  const response = await imsFetch(IMS_LOGIN_POST, session.cookies, {
    method: "POST",
    referer: IMS_LOGIN_POST,
    origin: IMS_ORIGIN,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const html = await response.text();
  const finalUrl = response.url.toLowerCase();

  // Failed attempts re-render the login form (possibly at student_login.php?uid=).
  if (isLoginPage(html) || finalUrl.includes("blank.htm")) {
    const error = isLoginPage(html) ? extractLoginError(html) : "IMS did not accept the login session. Please try again.";
    let captchaImage: string | undefined;
    try {
      // Every failed attempt issues a fresh CAPTCHA — mirror it in the panel.
      captchaImage = await applyLoginPage(session, html);
    } catch {
      // Keep the session usable even if the new image cannot be parsed.
    }
    return { ok: false, error, captchaImage };
  }

  // Positive verification: an authenticated session renders the portal menu
  // (the same "My Activities" signal the Selenium script waits for).
  const verifyHtml = await (await fetchLoginForm(session.cookies)).text();

  if (/my\s*activities/i.test(verifyHtml)) return { ok: true };
  if (isLoginPage(verifyHtml)) {
    sessions.delete(token);
    return { ok: false, error: "IMS rejected the username, password or CAPTCHA. Please try again." };
  }

  // Unusual page shape: let the existing Selenium step verify (it falls back
  // to a manual login in Chrome if the session is not recognized).
  return { ok: true };
}

/**
 * One-time handover for the Selenium extraction: returns the session cookie
 * string for scripts/nsut.py (NSUT_IMS_SESSION) and deletes the session.
 */
export function consumeIMSSession(token: string): string | null {
  sweepSessions();
  const session = sessions.get(token);
  if (!session) return null;
  sessions.delete(token);
  return cookieHeader(session.cookies);
}

/** Explicit cleanup from the Cancel action. */
export function deleteIMSSession(token: string): void {
  sessions.delete(token);
}
