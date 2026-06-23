import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MODULES } from "@/lib/modules";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Wallet,
  ReceiptText,
  Clock,
  Factory,
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

const SUMMARY = [
  { label: "Kasa Bakiyesi", value: "₺ 248.350", sub: "3 kasa toplam", icon: Wallet, tone: "default" as const },
  { label: "Bekleyen Alacak", value: "₺ 87.420", sub: "12 fatura · 4'ü vadesi geçmiş", icon: Clock, tone: "warn" as const },
  { label: "Bu Ay Tahsilat", value: "₺ 142.880", sub: "+%18 önceki aya göre", icon: TrendingUp, tone: "ok" as const },
  { label: "Bu Ay Gider", value: "₺ 58.190", sub: "Yakıt · malzeme · maaş", icon: TrendingDown, tone: "default" as const },
];

const RECENT = [
  { icon: ReceiptText, text: "FT-2026-0142 faturası kesildi — ABC Ltd.", who: "Yusuf", time: "12 dk önce" },
  { icon: CheckCircle2, text: "Serdar Makine cari ödemesi alındı — ₺ 24.000", who: "Erdoğan", time: "1 sa önce" },
  { icon: Factory, text: "Üretim #18 'İşleme' aşaması tamamlandı", who: "Yusuf", time: "2 sa önce" },
  { icon: AlertCircle, text: "TR-3 makina bıçağı stoku minimum altı (3 adet)", who: "Sistem", time: "3 sa önce" },
];

function Dashboard() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Panel</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            IDM Mühendislik — gün özeti, hızlı erişim ve son hareketler.
          </p>
        </div>

        {/* Özet kartlar */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {SUMMARY.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <Icon
                    className={
                      "h-4 w-4 " +
                      (s.tone === "warn"
                        ? "text-amber-600"
                        : s.tone === "ok"
                          ? "text-emerald-600"
                          : "text-muted-foreground")
                    }
                  />
                </div>
                <div className="mt-2 text-lg font-semibold tabular-nums sm:text-xl">{s.value}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{s.sub}</div>
              </div>
            );
          })}
        </div>

        {/* Hızlı erişim + son hareketler */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Hızlı Erişim</h2>
              <span className="text-[11px] text-muted-foreground">Tüm modüller</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MODULES.filter((m) => m.to !== "/").slice(0, 9).map((m) => {
                const Icon = m.icon;
                return (
                  <Link
                    key={m.to}
                    to={m.to}
                    className="group flex items-center gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:bg-accent"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{m.label}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{m.desc}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Son Hareketler</h2>
              <Link to="/notifications" className="text-[11px] text-muted-foreground hover:text-foreground">
                Tümü →
              </Link>
            </div>
            <ul className="space-y-3">
              {RECENT.map((r, i) => {
                const Icon = r.icon;
                return (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-muted text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm leading-snug">{r.text}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {r.who} · {r.time}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Bilgi notu */}
        <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Sıradaki adım:</strong> sunucu denetim scriptini
          (<code className="rounded bg-muted px-1 py-0.5 text-xs">scripts/server-audit.sh</code>)
          SSH üzerinden çalıştırıp çıktıyı sohbete yapıştır. NocoDB tablolarını ve mini-API'yi
          ondan sonra otomatik kuracağız. Buradaki rakamlar şu an demo amaçlı sabittir.
        </div>
      </div>
    </AppShell>
  );
}
