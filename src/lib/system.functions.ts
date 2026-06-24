import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------- SMTP durumu ----------
export const getSmtpStatus = createServerFn({ method: "GET" }).handler(async () => {
  const host = process.env.SMTP_HOST || "";
  const port = process.env.SMTP_PORT || "";
  const user = process.env.SMTP_USER || "";
  const from = process.env.MAIL_FROM || "";
  const mask = (v: string) => (v ? v.slice(0, 2) + "•••" + v.slice(-2) : "");
  return {
    configured: Boolean(host && user),
    host,
    port,
    user: mask(user),
    from,
    secure: process.env.SMTP_SECURE === "true",
  };
});

// ---------- Test maili ----------
const TestMailInput = z.object({
  to: z.string().min(3),
  subject: z.string().optional().default("IDM ERP — Test"),
  body: z.string().optional().default("SMTP testi başarılı."),
});

export const sendTestMail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TestMailInput.parse(d))
  .handler(async ({ data }) => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.MAIL_FROM || user;
    if (!host || !user || !pass) {
      throw new Error("SMTP yapılandırılmamış. Sunucu .env dosyasına SMTP_HOST/USER/PASS ekleyin.");
    }
    const nm = await import("nodemailer");
    const transporter = nm.default.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: { user, pass },
    });
    const info = await transporter.sendMail({
      from,
      to: data.to,
      subject: data.subject,
      text: data.body,
    });
    return { ok: true, messageId: info.messageId };
  });

// ---------- Sunucu sağlık ----------
export const getServerHealth = createServerFn({ method: "GET" }).handler(async () => {
  const nocoUrl = process.env.NOCODB_URL || "";
  const healthUrl = process.env.HEALTH_API_URL || "";
  const healthToken = process.env.HEALTH_API_TOKEN || "";

  let nocoOk = false;
  let nocoLatency = 0;
  if (nocoUrl) {
    try {
      const t = Date.now();
      const r = await fetch(new URL("/api/v1/health", nocoUrl).toString(), {
        signal: AbortSignal.timeout(5000),
      });
      nocoOk = r.ok;
      nocoLatency = Date.now() - t;
    } catch {
      nocoOk = false;
    }
  }

  let healthData: string | null = null;
  let healthError = "";
  if (healthUrl) {
    try {
      const r = await fetch(healthUrl, {
        headers: healthToken ? { "X-Token": healthToken } : {},
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) healthData = await r.json();
      else healthError = `HTTP ${r.status}`;
    } catch (e) {
      healthError = (e as Error).message;
    }
  }

  return {
    nocoUrl,
    nocoOk,
    nocoLatency,
    healthConfigured: Boolean(healthUrl),
    healthData,
    healthError,
    checkedAt: new Date().toISOString(),
  };
});
