import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  _internalGetMailAccount,
  _internalGetDefaultMailAccount,
} from "./nocodb.functions";

// ---------- AES-256-GCM şifreleme ----------
// .env'deki MAIL_ENC_KEY (32 byte / 64 hex char) ile şifrelenir.
async function getKey(): Promise<Buffer> {
  const k = process.env.MAIL_ENC_KEY || "";
  if (k.length < 32) {
    throw new Error(
      "MAIL_ENC_KEY ortam değişkeni eksik veya çok kısa. Sunucu .env dosyasına 32+ karakterlik bir anahtar ekleyin.",
    );
  }
  const crypto = await import("crypto");
  // 64 hex => 32 byte. Aksi halde sha256 ile türet.
  if (/^[0-9a-fA-F]{64}$/.test(k)) return Buffer.from(k, "hex");
  return crypto.createHash("sha256").update(k).digest();
}

export async function encryptPassword(plain: string): Promise<string> {
  if (!plain) return "";
  const crypto = await import("crypto");
  const key = await getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export async function decryptPassword(blob: string): Promise<string> {
  if (!blob) return "";
  const [v, ivB64, tagB64, encB64] = blob.split(":");
  if (v !== "v1") throw new Error("Bilinmeyen şifre formatı");
  const crypto = await import("crypto");
  const key = await getKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(encB64, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

// ---------- Şifre kaydetmek için server fn ----------
export const setMailAccountPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.number(), password: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { updateMailAccount } = await import("./nocodb.functions");
    const enc = await encryptPassword(data.password);
    await updateMailAccount({ data: { id: data.id, patch: { smtp_pass_enc: enc } } });
    return { ok: true };
  });

// ---------- Mail gönderimi ----------
async function buildTransport(acc: Record<string, unknown>) {
  const host = String(acc.smtp_host || "");
  const port = Number(acc.smtp_port || 587);
  const user = String(acc.smtp_user || acc.from_address || "");
  const passEnc = String(acc.smtp_pass_enc || "");
  if (!host || !user || !passEnc) {
    throw new Error(
      `Hesap "${String(acc.name || acc.from_address)}" için SMTP eksik (host/user/şifre).`,
    );
  }
  const pass = await decryptPassword(passEnc);
  const nm = await import("nodemailer");
  return nm.default.createTransport({
    host,
    port,
    secure: Boolean(acc.smtp_secure) || port === 465,
    auth: { user, pass },
  });
}

const SendInput = z.object({
  from_account_id: z.number().optional(),
  to: z.string().min(3),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
});

export const sendMail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SendInput.parse(d))
  .handler(async ({ data }) => {
    const acc = data.from_account_id
      ? await _internalGetMailAccount(data.from_account_id)
      : await _internalGetDefaultMailAccount();
    if (!acc) throw new Error("Aktif gönderici hesap bulunamadı.");
    const transporter = await buildTransport(acc);
    const fromName = String(acc.name || "");
    const fromAddr = String(acc.from_address || acc.smtp_user || "");
    const info = await transporter.sendMail({
      from: fromName ? `"${fromName}" <${fromAddr}>` : fromAddr,
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text || (data.html ? undefined : data.subject),
    });
    return { ok: true, messageId: info.messageId };
  });

// ---------- Test maili (seçili hesabın kendisine) ----------
export const testMailAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.number(), to: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const acc = await _internalGetMailAccount(data.id);
    if (!acc) throw new Error("Hesap bulunamadı");
    const transporter = await buildTransport(acc);
    const target = data.to || String(acc.from_address || acc.smtp_user || "");
    const info = await transporter.sendMail({
      from: `"${String(acc.name || "IDM ERP")}" <${String(acc.from_address || acc.smtp_user)}>`,
      to: target,
      subject: "IDM ERP — SMTP Test",
      text: `Bu mail "${String(acc.name)}" hesabından test amaçlı gönderildi.`,
    });
    return { ok: true, messageId: info.messageId, to: target };
  });

// ---------- Şifreleme anahtarı kontrolü ----------
export const getMailEncStatus = createServerFn({ method: "GET" }).handler(async () => {
  const k = process.env.MAIL_ENC_KEY || "";
  return { configured: k.length >= 32, length: k.length };
});
