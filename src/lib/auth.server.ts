import { getRequestHeader, sealSession, useSession } from "@tanstack/react-start/server";

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  mustChangePassword?: boolean;
};

type SessionData = { user?: SessionUser };

function sessionConfig() {
  const password = process.env.SESSION_SECRET || "dev-secret-please-rotate-at-least-32-chars-long";
  const host = getRequestHeader("host") || "";
  const proto = getRequestHeader("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const isSecure = proto === "https" && !host.includes("localhost") && !host.startsWith("127.0.0.1");

  return {
    password,
    name: "idm-erp-session",
    maxAge: 60 * 60 * 24 * 14,
    cookie: {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? ("none" as const) : ("lax" as const),
      partitioned: isSecure,
      path: "/",
    },
  };
}

export async function getSession() {
  return useSession<SessionData>(sessionConfig());
}

export async function sealCurrentSession() {
  return sealSession(sessionConfig());
}
