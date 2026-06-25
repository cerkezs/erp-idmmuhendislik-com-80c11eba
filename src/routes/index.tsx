import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { MODULES } from "@/lib/modules";
import { dashboardSummary } from "@/lib/nocodb.functions";
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  Wallet, ReceiptText, Clock, Factory, Info, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IDM ERP — Panel" },
      { name: "description", content: "IDM Mühendislik kurumsal yönetim paneli — teklif, fatura, üretim, kasa, stok." },
    ],
  }),
  component: Dashboard,
});

function fmtTRY(n: number) {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

const NOTIF_ICON: Record<string, typeof Info> = {
  success: CheckCircle2, warning: AlertCircle, error: AlertCircle, info: Info,
};

function Dashboard() {
  const summary = useServerFn(dashboardSummary);
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => summary(),
    refetchInterval: 60_000,
  });

  const s = data;
  const cards = [
    { label: "Kasa Bakiyesi", value: s ? `${fmtTRY(s.kasaBakiye)} ₺` : "—",
      sub: s ? `${s.kasaCount} kasa toplam` : "", icon: Wallet, tone: "default" as const },
    { label: "Bekleyen Alacak", value: s ? `${fmtTRY(s.bekleyenAlacak)} ₺` : "—",
      sub: s ? `${s.openInvoiceCount} fatura · ${s.vadesiGecmis} vadesi geçmiş` : "", icon: Clock,
      tone: s && s.vadesiGecmis > 0 ? "warn" : "default" },
    { label: "Bu Ay Tahsilat", value: s ? `${fmtTRY(s.ayTahsilat)} ₺` : "—",
      sub: "Kasa girişleri", icon: TrendingUp, tone: "ok" as const },
    { label: "Bu Ay Gider", value: s ? `${fmtTRY(s.ayGider)} ₺` : "—",
      sub: "Kasa çıkışları + giderler", icon: TrendingDown, tone: "default" as const },
  ];

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Panel</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              IDM Mühendislik — gün özeti, hızlı erişim ve son hareketler.
            </p>
          </div>
          {s && (
            <div className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1">
              <Factory className="h-3 w-3" /> {s.activeProductions} aktif üretim
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span>Özet verisi alınamadı: {(error as Error).message}. <Link to="/setup" className="underline">/setup</Link> sayfasından tabloları kurun.</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                  <Icon className={"h-4 w-4 " + (c.tone === "warn" ? "text-amber-600" : c.tone === "ok" ? "text-emerald-600" : "text-muted-foreground")} />
                </div>
                <div className="mt-2 text-lg font-semibold tabular-nums sm:text-xl">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : c.value}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{c.sub}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Bekleyen faturalar */}
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Bekleyen Faturalar</h2>
              <Link to="/invoices" className="text-[11px] text-muted-foreground hover:text-foreground">Tümü →</Link>
            </div>
            {!s ? (
              <div className="py-6 text-center text-xs text-muted-foreground">{isLoading ? "Yükleniyor…" : "—"}</div>
            ) : s.openInvoices.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Bekleyen fatura yok 🎉</div>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {s.openInvoices.map((i) => (
                  <li key={i.Id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{i.number || `#${i.Id}`} · {i.company_name || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Vade: {i.due_date || "—"} {i.overdue && <span className="ml-1 rounded bg-red-500/15 px-1 text-red-600">vadesi geçti</span>}
                      </div>
                    </div>
                    <div className="text-right tabular-nums font-medium">{fmtTRY(i.total)} ₺</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Son hareketler */}
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Son Hareketler</h2>
              <Link to="/notifications" className="text-[11px] text-muted-foreground hover:text-foreground">Tümü →</Link>
            </div>
            {!s ? (
              <div className="py-6 text-center text-xs text-muted-foreground">{isLoading ? "Yükleniyor…" : "—"}</div>
            ) : s.recent.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Bildirim yok.</div>
            ) : (
              <ul className="space-y-3">
                {s.recent.slice(0, 6).map((r) => {
                  const Icon = NOTIF_ICON[r.type] || Info;
                  return (
                    <li key={r.Id} className="flex gap-3">
                      <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm leading-snug font-medium">{r.title}</div>
                        {r.message && <div className="text-[11px] text-muted-foreground truncate">{r.message}</div>}
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{r.date}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Hızlı erişim */}
        <section className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Hızlı Erişim</h2>
            <span className="text-[11px] text-muted-foreground">{MODULES.length} modül</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {MODULES.filter((m) => m.to !== "/").slice(0, 12).map((m) => {
              const Icon = m.icon;
              return (
                <Link key={m.to} to={m.to}
                  className="group flex items-center gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:bg-accent">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.label}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{m.desc}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
