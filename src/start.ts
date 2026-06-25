import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";

const SESSION_TOKEN_KEY = "idm-erp-session-token";
const SESSION_HEADER = "x-idm-erp-session";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[startInstance] unhandled error", error);
    let isRpc = false;
    try {
      const req = getRequest();
      const url = new URL(req.url);
      isRpc =
        url.pathname.startsWith("/_serverFn") ||
        url.pathname.startsWith("/api/") ||
        req.headers.get("accept")?.includes("application/json") === true;
    } catch {
      /* no request context */
    }
    if (isRpc) {
      return new Response(
        JSON.stringify({ error: { message, stack: stack?.split("\n").slice(0, 8).join("\n") } }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const sessionHeaderMiddleware = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const token = typeof window !== "undefined" ? window.localStorage.getItem(SESSION_TOKEN_KEY) : null;
  return next(token ? { headers: { [SESSION_HEADER]: token } } : undefined);
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [sessionHeaderMiddleware],
}));
