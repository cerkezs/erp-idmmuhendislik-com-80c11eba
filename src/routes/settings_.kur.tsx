import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRates } from "@/lib/rates.functions";
import { listKurLog, createKurLog, deleteKurLog } from "@/lib/nocodb.functions";
import { RefreshCw, Plus, Trash2, Loader2, DownloadCloud } from "lucide-react";

export const Route = createFileRoute("/settings_/kur")({
  head: () => ({ meta: [{ title: "Döviz Kurları — Ayarlar" }] }),
  component: KurPage,
});

type KurRow = { Id: number; date?: string; usd?: number; eur?: number; source?: string; notes?: string };

function KurPage() {
  const qc = useQueryClient();
  const fetchRates = useServerFn(getRates);
  const list = useServerFn(listKurLog);
  const create = useServerFn(createKurLog);
  const remove = useServerFn(deleteKurLog);

  const tcmbQ = useQuery({ queryKey: ["tcmb-rates"], queryFn: () => fetchRates() });
  const logQ = useQuery({ queryKey: ["kur-log"], queryFn: () => list() });
  const rows = ((logQ.data || []) as KurRow[]).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [usd, setUsd] = useState("");
  const [eur, setEur] = useState("");

  const createMut = useMutation({
    mutationFn: (d: { date: string; usd: number; eur: number; source: string; notes: string }) => create({ data: d }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kur-log"] }); setUsd(""); setEur(""); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kur-log"] }),
  });

  const saveFromTcmb = () => {
    if (!tcmbQ.data) return;
    createMut.mutate({ date: today, usd: tcmbQ.data.usd, eur: tcmbQ.data.eur, source: "tcmb", notes: "" });
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Döviz Kurları</h1>
            <p className="text-sm text-muted-foreground">TCMB güncel kur · manuel kur girişi · geçmiş kurlar</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">TCMB Güncel</div>
              <Button size="sm" variant="outline" onClick={() => tcmbQ.refetch()} disabled={tcmbQ.isFetching}>
                {tcmbQ.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {tcmbQ.data ? (
              <div className="space-y-1 text-sm">
                <div>USD: <span className="font-semibold tabular-nums">{tcmbQ.data.usd?.toFixed(4)}</span></div>
                <div>EUR: <span className="font-semibold tabular-nums">{tcmbQ.data.eur?.toFixed(4)}</span></div>
                <div className="text-xs text-muted-foreground">Kaynak: {tcmbQ.data.source} · {tcmbQ.data.time}</div>
                <Button size="sm" className="mt-2" onClick={saveFromTcmb} disabled={createMut.isPending || tcmbQ.data.source === "fallback"}>
                  <DownloadCloud className="mr-1 h-3.5 w-3.5" /> Bugünün kuru olarak kaydet
                </Button>
              </div>
            ) : <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 text-sm font-medium">Manuel Kur Girişi</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 grid gap-1.5">
                <Label className="text-xs">Tarih</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">USD</Label>
                <Input type="number" step="0.0001" value={usd} onChange={(e) => setUsd(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">EUR</Label>
                <Input type="number" step="0.0001" value={eur} onChange={(e) => setEur(e.target.value)} />
              </div>
            </div>
            <Button
              className="mt-3 w-full"
              size="sm"
              disabled={!usd || !eur || createMut.isPending}
              onClick={() => createMut.mutate({ date, usd: parseFloat(usd), eur: parseFloat(eur), source: "manuel", notes: "" })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Kaydet
            </Button>
          </div>
        </div>

        <h2 className="mt-6 mb-2 text-sm font-medium text-muted-foreground">Geçmiş Kurlar</h2>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">Tarih</th><th className="px-3 py-2 text-right">USD</th><th className="px-3 py-2 text-right">EUR</th><th className="px-3 py-2">Kaynak</th><th className="px-3 py-2 text-right">İşlem</th></tr>
            </thead>
            <tbody>
              {logQ.isLoading && <tr><td colSpan={5} className="px-3 py-8 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>}
              {!logQ.isLoading && rows.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Henüz kayıt yok.</td></tr>}
              {rows.map((r) => (
                <tr key={r.Id} className="border-t border-border">
                  <td className="px-3 py-2">{r.date || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.usd?.toFixed(4) ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.eur?.toFixed(4) ?? "—"}</td>
                  <td className="px-3 py-2 text-center text-xs">
                    <span className={`rounded px-2 py-0.5 ${r.source === "tcmb" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>{r.source || "—"}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Silinsin mi?")) deleteMut.mutate(r.Id); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
