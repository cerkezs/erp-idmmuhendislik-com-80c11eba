import { createFileRoute, useRouter, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Building2, ShieldCheck, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, bootstrapAuth } from "@/lib/auth.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const searchSchema = z.object({ next: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { next } = useSearch({ from: "/auth" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Show bootstrap admin credentials only when no user exists yet
  const boot = useQuery({
    queryKey: ["auth-bootstrap"],
    queryFn: () => bootstrapAuth({ data: undefined as never }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await login({ data: { email, password, totp } });
      if (res.ok) {
        if (res.sessionToken) localStorage.setItem("idm-erp-session-token", res.sessionToken);
        queryClient.setQueryData(["auth-me"], res.user);
        await router.navigate({ to: (next || "/") as never });
        return;
      }
      if ("needsTotp" in res && res.needsTotp) setNeedsTotp(true);
      setError(res.error || "Giriş başarısız");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen w-full place-items-center bg-gradient-to-br from-muted/30 to-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-semibold">IDM ERP</h1>
          <p className="text-sm text-muted-foreground">Yönetim paneline giriş</p>
        </div>

        {boot.data?.created && boot.data.email && (
          <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900">
            <div className="mb-1 font-semibold">İlk yönetici hesabı oluşturuldu</div>
            <div>
              E-posta: <code className="font-mono">{boot.data.email}</code>
            </div>
            <div>
              Geçici parola: <code className="font-mono">{boot.data.tempPassword}</code>
            </div>
            <div className="mt-1 opacity-80">Girişten sonra mutlaka değiştirin.</div>
          </div>
        )}

        <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="space-y-3">
            <div>
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                autoFocus
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@idmmuhendislik.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Parola</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {needsTotp && (
              <div>
                <Label htmlFor="totp" className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Doğrulama kodu (6 hane)
                </Label>
                <Input
                  id="totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  placeholder="123 456"
                  required
                />
              </div>
            )}
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              <LogIn className="mr-2 h-4 w-4" />
              {busy ? "Giriş yapılıyor…" : "Giriş yap"}
            </Button>
          </div>
        </form>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Hesap oluşturma kapalıdır. Erişim için yöneticinize başvurun.
        </p>
      </div>
    </div>
  );
}
