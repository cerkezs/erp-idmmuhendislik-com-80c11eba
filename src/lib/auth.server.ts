import { useSession } from "@tanstack/react-start/server";

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
  return {
    password,
    name: "idm-erp-session",
    maxAge: 60 * 60 * 24 * 14,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export async function getSession() {
  return useSession<SessionData>(sessionConfig());
}
