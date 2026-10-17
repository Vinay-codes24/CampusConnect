import { NextResponse, type NextRequest } from "next/server";

/** Thrown anywhere in a route handler; mapped to an HTTP response by `handler`. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export type RouteContext = { params: Promise<Record<string, string>> };

/**
 * Wraps a route handler with uniform error handling so every endpoint returns
 * JSON errors instead of an HTML stack trace.
 */
export function handler(
  fn: (req: NextRequest, ctx: RouteContext) => Promise<Response>,
): (req: NextRequest, ctx: RouteContext) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error("[api]", err);
      return NextResponse.json(
        { error: "Something went wrong on the server. Please try again." },
        { status: 500 },
      );
    }
  };
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export async function readBody<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "The request body was not valid JSON.");
  }
}

export function badRequest(message: string): never {
  throw new ApiError(400, message);
}
