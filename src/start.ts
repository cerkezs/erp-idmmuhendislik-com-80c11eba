import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const SESSION_TOKEN_KEY = "idm-erp-session-token";
const SESSION_HEADER = "x-idm-erp-session";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("[startInstance] unhandled error", error);
    // Server function / API calls expect JSON or a passthrough — never HTML.
    const url = request?.url ? new URL(request.url) : null;
    const isRpc =
      !!url &&
      (url.pathname.startsWith("/_serverFn") ||
        url.pathname.startsWith("/api/") ||
        request?.headers.get("accept")?.includes("application/json") === true);
    if (isRpc) throw error;
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
