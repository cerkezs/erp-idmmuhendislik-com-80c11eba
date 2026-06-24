import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  listInvoices, listQuotes, listExpenses, listMovements, listProductions,
} from "@/lib/nocodb.functions";
import { BarChart3, TrendingUp, TrendingDown, Wallet, FileText, ReceiptText, AlertCircle, Download } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Raporlar — IDM ERP" }] }),
  component: ReportsPage,
});

type Doc = { Id: number; date?: string; total?: number; currency?: string; status?: string; company_name?: string };
type Exp = { Id: number; date?: string; amount?: number; currency?: string; fx_rate?: number; category?: string };
type Mov = { Id: number; date?: string; type?: string; amount?: number; currency?: string; fx_rate?: number };
type Prod = { Id: number; start_date?: string; status?: string; total_cost?: number };

function toTRY(amount: number, currency?: string, fx?: number) {
  if (!currency || currency === "TRY") return amount;
  return amount * (fx || 1);
}

function inRange(dateStr: string | undefined, from: string, to: string) {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= from && d <= to;
}

function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(); monthStart.setDate(1);
  const [from, setFrom] = useState(monthStart.toISOString().slice(0, 10));
  const [to, setTo] = useState(today);

  const listInv = useServerFn(listInvoices);
  const listQ = useServerFn(listQuotes);
  const listEx = useServerFn(listExpenses);
  const listMv = useServerFn(listMovements);
  const listPr = useServerFn(listProductions);

  const invQ = useQuery({ queryKey: ["invoices"], queryFn: () => listInv() });
  const quoQ = useQuery({ queryKey: ["quotes"], queryFn: () => listQ() });
  const expQ = useQuery({ queryKey: ["expenses"], queryFn: () => listEx() });
  const movQ = useQuery({ queryKey: ["movements"], queryFn: () => listMv() });
  const prdQ = useQuery({ queryKey: ["productions"], queryFn: () => listPr() });

  const err = invQ.error || quoQ.error || expQ.error || movQ.error || prdQ.error;
  const loading = invQ.isLoading || quoQ.isLoading || expQ.isLoading || movQ.isLoading || prdQ.isLoading;

  const stats = useMemo(() => {
    const invoices = ((invQ.data || []) as Doc[]).filter((d) => inRange(d.date, from, to));
    const quotes = ((quoQ.data || []) as Doc[]).filter((d) => inRange(d.date, from, to));
    const expenses = ((expQ.data || []) as Exp[]).filter((e) => inRange(e.date, from, to));
    const movements = ((movQ.data || []) as Mov[]).filter((m) => inRange(m.date, from, to));
    const productions = ((prdQ.data || []) as Prod[]).filter((p) => inRange(p.start_date, from, to));

    const income = invoices.reduce((s, d) => s + (d.total || 0), 0);
    const expTotal = expenses.reduce((s, e) => s + toTRY(e.amount || 0, e.currency, e.fx_rate), 0);
    const cashIn = movements.filter((m) => m.type === "Gelir").reduce((s, m) => s + toTRY(m.amount || 0, m.currency, m.fx_rate), 0);
    const cashOut = movements.filter((m) => m.type === "Gider").reduce((s, m) => s + toTRY(m.amount || 0, m.currency, m.fx_rate), 0);
    const quotesValue = quoQ.data ? (quoQ.data as Doc[]).reduce((s, q) => s + (q.total || 0), 0) : 0;
    const prodCost = productions.reduce((s, p) => s + (p.total_cost || 0), 0);

    const byCategory = new Map<string, number>();
    for (const e of expenses) {
      const k = e.category || "Diğer";
      byCategory.set(k, (byCategory.get(k) || 0) + toTRY(e.amount || 0, e.currency, e.fx_rate));
    }

    return {
      income, expTotal, cashIn, cashOut, net: income - expTotal,
      quotesValue, prodCost,
      counts: { invoices: invoices.length, quotes: quotes.length, expenses: expenses.length, movements: movements.length, productions: productions.length },
      byCategory: Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [invQ.data, quoQ.data, expQ.data, movQ.data, prdQ.data, from, to]);

  function exportCSV() {
    const rows = [
      ["Rapor", `${from} → ${to}`],
      [],
      ["Metrik", "Tutar (₺)"],
      ["Toplam Gelir (Faturalar)", stats.income.toFixed(2)],
      ["Toplam Gider", stats.expTotal.toFixed(2)],
      ["Net", stats.net.toFixed(2)],
      ["Kasa Giriş", stats.cashIn.toFixed(2)],
      ["Kasa Çıkış", stats.cashOut.toFixed(2)],
      ["Teklif Hacmi (tüm)", stats.quotesValue.toFixed(2)],
      ["Üretim Maliyeti", stats.prodCost.toFixed(2)],
      [],
      ["Kategori", "Gider (₺)"],
      ...stats.byCategory.map(([k, v]) => [k, v.toFixed(2)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rapor-${from}-${to}.csv`;
    a.click();
  }

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary"><BarChart3 className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold">Raporlar</h1>
            <p className="text-sm text-muted-foreground">Tarih aralığı bazında özet</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1"><Label className="text-xs">Başlangıç</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" /></div>
          <div className="grid gap-1"><Label className="text-xs">Bitiş</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" /></div>
          <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" /> CSV</Button>
          <Button variant="outline" onClick={() => window.print()}>Yazdır / PDF</Button>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
            <div><div className="font-medium text-destructive">Bazı veriler yüklenemedi</div>
              <pre className="mt-1 whitespace-pre-wrap text-xs">{(err as Error).message}</pre>
              <p className="mt-2 text-xs">Tablo eksikse <Link to="/setup" className="underline">/setup</Link>.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gelir (Faturalar)" value={stats.income} icon={TrendingUp} tone="green" loading={loading} />
        <Stat label="Gider" value={stats.expTotal} icon={TrendingDown} tone="red" loading={loading} />
        <Stat label="Net" value={stats.net} icon={Wallet} tone={stats.net >= 0 ? "green" : "red"} loading={loading} />
        <Stat label="Üretim Maliyeti" value={stats.prodCost} icon={ReceiptText} loading={loading} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Kasa Hareketleri</h2>
          <div className="space-y-2">
            <Row label="Giriş" value={stats.cashIn} tone="green" />
            <Row label="Çıkış" value={stats.cashOut} tone="red" />
            <div className="border-t border-border pt-2"><Row label="Net Akış" value={stats.cashIn - stats.cashOut} bold /></div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Belge Sayıları</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Box icon={FileText} label="Teklif" n={stats.counts.quotes} />
            <Box icon={ReceiptText} label="Fatura" n={stats.counts.invoices} />
            <Box icon={Wallet} label="Kasa Har." n={stats.counts.movements} />
            <Box icon={TrendingDown} label="Gider" n={stats.counts.expenses} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Kategori Bazlı Gider</h2>
          {stats.byCategory.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">Bu aralıkta gider yok.</div>}
          {stats.byCategory.length > 0 && (
            <div className="space-y-1.5">
              {(() => { const max = Math.max(...stats.byCategory.map(([, v]) => v)); return stats.byCategory.map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-xs"><span>{k}</span><span className="tabular-nums">{v.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</span></div>
                  <div className="mt-0.5 h-2 rounded bg-muted"><div className="h-full rounded bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div>
                </div>
              )); })()}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, icon: Icon, tone, loading }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone?: "green" | "red"; loading?: boolean }) {
  const color = tone === "green" ? "text-green-600 dark:text-green-400" : tone === "red" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{loading ? "…" : `${value.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`}</div>
    </div>
  );
}
function Row({ label, value, tone, bold }: { label: string; value: number; tone?: "green" | "red"; bold?: boolean }) {
  const c = tone === "green" ? "text-green-600 dark:text-green-400" : tone === "red" ? "text-destructive" : "";
  return <div className={`flex justify-between text-sm ${bold ? "font-semibold" : ""}`}><span>{label}</span><span className={`tabular-nums ${c}`}>{value.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</span></div>;
}
function Box({ icon: Icon, label, n }: { icon: React.ComponentType<{ className?: string }>; label: string; n: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{n}</div>
    </div>
  );
}
