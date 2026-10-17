"use client";

import type { Toast } from "@/components/providers";

type ToastFn = (message: string, tone?: Toast["tone"]) => void;

/** Copies a link and, when the device supports it, offers native sharing. */
export async function shareLink(url: string, title: string, toast: ToastFn): Promise<void> {
  const absolute = url.startsWith("http") ? url : `${window.location.origin}${url}`;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url: absolute });
      toast("Shared successfully", "success");
      return;
    } catch (err) {
      // User cancelled the native sheet — fall through to clipboard.
      if ((err as Error)?.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(absolute);
    toast("Link copied to clipboard", "success");
  } catch {
    // Clipboard API is blocked in some contexts — select a fallback.
    try {
      const input = document.createElement("textarea");
      input.value = absolute;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      toast("Link copied to clipboard", "success");
    } catch {
      toast("Could not copy the link — please copy it from the address bar.", "error");
    }
  }
}
