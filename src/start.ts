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
    console.error("[startInstance] unhandled error", error);
    // RPC / API requests must surface the error to the client — never swallow as HTML.
    let isRpc = false;
    try {
      const req = getRequest();
      const url = new URL(req.url);
      isRpc =
        url.pathname.startsWith("/_serverFn") ||
        url.pathname.startsWith("/api/") ||
        req.headers.get("accept")?.includes("application/json") === true;
    } catch {
      // No request context available — fall through to HTML response.
    }
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
