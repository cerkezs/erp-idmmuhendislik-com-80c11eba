import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/app-shell";
import { me, changePassword, setupTotp, confirmTotp, disableTotp } from "@/lib/auth.functions";
import { ShieldCheck, KeyRound } from "lucide-react";

export const Route = createFileRoute("/auth_/sifre")({
  component: PasswordPage,
});

function PasswordPage() {
  return (
    <AppShell>
      <PwdContent />
    </AppShell>
  );
}

function PwdContent() {
  const router = useRouter();
  const qc = useQueryClient();
  const userQ = useQuery({ queryKey: ["auth-me"], queryFn: () => me() });

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [next2, setNext2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [totp, setTotp] = useState<{ qr: string; secret: string; otpauth: string } | null>(null);
  const [code, setCode] = useState("");
  const [totpMsg, setTotpMsg] = useState<string | null>(null);

  const u = userQ.data;
  const mustChange = u?.mustChangePassword === true;

  async function onChange(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (next.length < 6) return setErr("En az 6 karakter olmalı");
    if (next !== next2) return setErr("Parolalar eşleşmiyor");
    const res = await changePassword({ data: { current, next } });
    if (!res.ok) return setErr(res.error || "Hata");
    setMsg("Parola güncellendi");
    setCurrent(""); setNext(""); setNext2("");
    await qc.invalidateQueries({ queryKey: ["auth-me"] });
    if (mustChange) router.navigate({ to: "/" as never });
  }

  async function onSetupTotp() {
    setTotpMsg(null);
    const r = await setupTotp({ data: undefined as never });
    if (!r.ok) return setTotpMsg(r.error || "Hata");
    setTotp({ qr: r.qr, secret: r.secret, otpauth: r.otpauth });
  }

  async function onConfirmTotp(e: React.FormEvent) {
    e.preventDefault();
    setTotpMsg(null);
    const r = await confirmTotp({ data: { code } });
    if (!r.ok) return setTotpMsg(r.error || "Kod hatalı");
    setTotpMsg("İki adımlı doğrulama etkinleştirildi.");
    setTotp(null); setCode("");
    await qc.invalidateQueries({ queryKey: ["auth-me"] });
  }

  async function onDisableTotp() {
    setTotpMsg(null);
    const r = await disableTotp({ data: undefined as never });
    if (!r.ok) return setTotpMsg(r.error || "Hata");
    setTotpMsg("Devre dışı bırakıldı.");
    await qc.invalidateQueries({ queryKey: ["auth-me"] });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Güvenlik</h1>
        <p className="text-sm text-muted-foreground">
          Parolanızı değiştirin ve iki adımlı doğrulamayı yönetin.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <KeyRound className="h-4 w-4" /> Parola değiştir
        </h2>
        {mustChange && (
          <div className="mb-3 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
            Devam etmeden önce parolanızı değiştirmeniz gerekir.
          </div>
        )}
        <form onSubmit={onChange} className="space-y-3">
          {!mustChange && (
            <div>
              <Label htmlFor="cur">Mevcut parola</Label>
              <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
          )}
          <div>
            <Label htmlFor="np">Yeni parola</Label>
            <Input id="np" type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="np2">Yeni parola (tekrar)</Label>
            <Input id="np2" type="password" value={next2} onChange={(e) => setNext2(e.target.value)} required />
          </div>
          {err && <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}
          {msg && <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800">{msg}</div>}
          <Button type="submit">Parolayı güncelle</Button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="h-4 w-4" /> İki adımlı doğrulama (Google Authenticator)
        </h2>

        {u?.role && (
          <p className="mb-3 text-xs text-muted-foreground">
            Durum: {" "}
            <span className={(u as { totp_enabled?: boolean }).totp_enabled ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
              {(u as { totp_enabled?: boolean }).totp_enabled ? "Aktif" : "Kapalı"}
            </span>
          </p>
        )}

        {!totp && (
          <div className="flex gap-2">
            <Button type="button" onClick={onSetupTotp}>Kurulumu başlat</Button>
            <Button type="button" variant="outline" onClick={onDisableTotp}>Devre dışı bırak</Button>
          </div>
        )}

        {totp && (
          <div className="space-y-3">
            <p className="text-sm">
              Google Authenticator / 1Password / Authy uygulamasıyla QR'ı tarayın ya da gizli anahtarı manuel girin:
            </p>
            <img src={totp.qr} alt="TOTP QR" className="h-44 w-44 rounded border border-border bg-white p-2" />
            <div className="text-xs">
              Gizli anahtar: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{totp.secret}</code>
            </div>
            <form onSubmit={onConfirmTotp} className="flex gap-2">
              <Input
                inputMode="numeric"
                placeholder="6 haneli kod"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="max-w-[180px]"
              />
              <Button type="submit">Doğrula ve etkinleştir</Button>
            </form>
          </div>
        )}
        {totpMsg && <div className="mt-3 rounded-md bg-muted px-3 py-2 text-xs">{totpMsg}</div>}
      </section>
    </div>
  );
}
