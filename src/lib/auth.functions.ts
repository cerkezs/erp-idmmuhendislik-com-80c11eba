import { createServerFn } from "@tanstack/react-start";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import {
  _internalFindUserByEmail,
  _internalGetUser,
  _internalUpdateUserRaw,
  _internalCreateUserRaw,
  _internalLogLogin,
  _internalCountUsers,
} from "./nocodb.functions";

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

async function getSession() {
  const { useSession } = await import("@tanstack/react-start/server");
  return useSession<SessionData>(sessionConfig());
}

function clientIp(req: Request | null): string {
  if (!req) return "";
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    ""
  );
}

// ------------- ensure first admin -------------
async function ensureBootstrapAdmin(): Promise<{ created: boolean; email?: string; tempPassword?: string }> {
  const count = await _internalCountUsers();
  if (count > 0) return { created: false };
  const email = "admin@idmmuhendislik.com";
  const tempPassword = "IDM-" + Math.random().toString(36).slice(2, 10) + "!";
  const hash = await bcrypt.hash(tempPassword, 10);
  await _internalCreateUserRaw({
    ad: "Yönetici",
    eposta: email,
    rol: "admin",
    aktif: true,
    parola_hash: hash,
    totp_aktif: false,
    sifre_degistir: true,
  });
  return { created: true, email, tempPassword };
}

export const bootstrapAuth = createServerFn({ method: "POST" }).handler(async () => {
  return ensureBootstrapAdmin();
});

// ------------- login -------------
const LoginInput = z.object({
  email: z.string().email("Geçerli e-posta gir"),
  password: z.string().min(1, "Parola zorunlu"),
  totp: z.string().optional().default(""),
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LoginInput.parse(d))
  .handler(async ({ data }) => {
    // First-time bootstrap
    await ensureBootstrapAdmin();

    const row = await _internalFindUserByEmail(data.email);
    if (!row) {
      await _internalLogLogin({
        tarih: new Date().toISOString(),
        eposta: data.email,
        basarili: false,
        notlar: "user-not-found",
      });
      return { ok: false as const, error: "E-posta veya parola hatalı" };
    }
    if (row.aktif === false) {
      return { ok: false as const, error: "Hesap pasif" };
    }
    const hash = String(row.parola_hash || "");
    if (!hash) return { ok: false as const, error: "Bu hesap için parola atanmamış" };
    const okPass = await bcrypt.compare(data.password, hash);
    if (!okPass) {
      await _internalLogLogin({
        tarih: new Date().toISOString(),
        kullanici_id: row.Id as number,
        eposta: data.email,
        basarili: false,
        notlar: "bad-password",
      });
      return { ok: false as const, error: "E-posta veya parola hatalı" };
    }

    if (row.totp_aktif === true) {
      const secret = String(row.totp_secret || "");
      if (!secret) return { ok: false as const, error: "TOTP yapılandırılmamış — yöneticinizle iletişime geçin" };
      if (!data.totp) return { ok: false as const, needsTotp: true as const };
      const ok = (await verify({ token: data.totp.replace(/\s+/g, ""), secret, epochTolerance: 1 })).valid;
      if (!ok) {
        await _internalLogLogin({
          tarih: new Date().toISOString(),
          kullanici_id: row.Id as number,
          eposta: data.email,
          basarili: false,
          notlar: "bad-totp",
        });
        return { ok: false as const, error: "Doğrulama kodu hatalı", needsTotp: true as const };
      }
    }

    const session = await getSession();
    const user: SessionUser = {
      id: row.Id as number,
      email: String(row.eposta || ""),
      name: String(row.ad || ""),
      role: String(row.rol || "viewer"),
      mustChangePassword: row.sifre_degistir === true,
    };
    await session.update({ user });
    await _internalUpdateUserRaw(user.id, { son_giris: new Date().toISOString() });
    await _internalLogLogin({
      tarih: new Date().toISOString(),
      kullanici_id: user.id,
      eposta: user.email,
      basarili: true,
    });
    return { ok: true as const, user };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getSession();
  await session.clear();
  return { ok: true as const };
});

export const me = createServerFn({ method: "GET" }).handler(async (): Promise<SessionUser | null> => {
  const session = await getSession();
  return session.data.user ?? null;
});

// ------------- password change -------------
const ChangePwdInput = z.object({
  current: z.string().optional().default(""),
  next: z.string().min(6, "Parola en az 6 karakter olmalı"),
});
export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChangePwdInput.parse(d))
  .handler(async ({ data }) => {
    const session = await getSession();
    const u = session.data.user;
    if (!u) return { ok: false as const, error: "Oturum yok" };
    const row = await _internalGetUser(u.id);
    if (!row) return { ok: false as const, error: "Kullanıcı bulunamadı" };
    if (!u.mustChangePassword) {
      const okCur = await bcrypt.compare(data.current, String(row.parola_hash || ""));
      if (!okCur) return { ok: false as const, error: "Mevcut parola hatalı" };
    }
    const hash = await bcrypt.hash(data.next, 10);
    await _internalUpdateUserRaw(u.id, { parola_hash: hash, sifre_degistir: false });
    await session.update({ user: { ...u, mustChangePassword: false } });
    return { ok: true as const };
  });

// ------------- admin: reset password for user -------------
const AdminResetPwdInput = z.object({ id: z.number(), password: z.string().min(6) });
export const adminResetPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AdminResetPwdInput.parse(d))
  .handler(async ({ data }) => {
    const session = await getSession();
    if (session.data.user?.role !== "admin") return { ok: false as const, error: "Yetkisiz" };
    const hash = await bcrypt.hash(data.password, 10);
    await _internalUpdateUserRaw(data.id, { parola_hash: hash, sifre_degistir: true });
    return { ok: true as const };
  });

export const adminResetTotp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const session = await getSession();
    if (session.data.user?.role !== "admin") return { ok: false as const, error: "Yetkisiz" };
    await _internalUpdateUserRaw(data.id, { totp_secret: "", totp_aktif: false });
    return { ok: true as const };
  });

// ------------- TOTP setup -------------
export const setupTotp = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getSession();
  const u = session.data.user;
  if (!u) return { ok: false as const, error: "Oturum yok" };
  const secret = generateSecret();
  const otpauth = generateURI({ issuer: "IDM ERP", label: u.email, secret });
  const qr = await QRCode.toDataURL(otpauth);
  await _internalUpdateUserRaw(u.id, { totp_secret: secret, totp_aktif: false });
  return { ok: true as const, secret, otpauth, qr };
});

const ConfirmTotpInput = z.object({ code: z.string().min(6) });
export const confirmTotp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ConfirmTotpInput.parse(d))
  .handler(async ({ data }) => {
    const session = await getSession();
    const u = session.data.user;
    if (!u) return { ok: false as const, error: "Oturum yok" };
    const row = await _internalGetUser(u.id);
    const secret = String(row?.totp_secret || "");
    if (!secret) return { ok: false as const, error: "Önce TOTP kurulumu başlat" };
    const ok = (await verify({ token: data.code.replace(/\s+/g, ""), secret, epochTolerance: 1 })).valid;
    if (!ok) return { ok: false as const, error: "Kod hatalı" };
    await _internalUpdateUserRaw(u.id, { totp_aktif: true });
    return { ok: true as const };
  });

export const disableTotp = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getSession();
  const u = session.data.user;
  if (!u) return { ok: false as const, error: "Oturum yok" };
  await _internalUpdateUserRaw(u.id, { totp_secret: "", totp_aktif: false });
  return { ok: true as const };
});

// Helper used by other server fns later
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session.data.user ?? null;
}
export { clientIp };
