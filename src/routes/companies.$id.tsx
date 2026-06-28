import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  companyProfile, createLedgerManual, deleteLedgerEntry, listAccounts,
} from "@/lib/nocodb.functions";
import { getRateForDate } from "@/lib/rates.functions";
import {
  Building2, Plus, Trash2, Loader2, ArrowLeft, Mail, Phone, MapPin, FileText, Wallet, ReceiptText, FileInput,
} from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { crudToast, errorToast } from "@/lib/toast";

export const Route = createFileRoute("/companies/$id")({
  head: () => ({ meta: [{ title: "Firma Profili — IDM ERP" }] }),
  component: CompanyProfilePage,
});

function fmtMoney(n: number, cur = "TRY") {
  const sym = cur === "TRY" ? "₺" : cur === "USD" ? "$" : cur === "EUR" ? "€" : cur;
  return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${sym}`;
}

function CompanyProfilePage() {
  const { id } = Route.useParams();
  const cid = Number(id);
  const qc = useQueryClient();
  const fn = useServerFn(companyProfile);
  const removeLedger = useServerFn(deleteLedgerEntry);
  const { canWrite, canDelete } = useMe();

  const { data, isLoading, error } = useQuery({
    queryKey: ["company-profile", cid],
    queryFn: () => fn({ data: { id: cid } }),
    enabled: !isNaN(cid),
  });

  const deleteMut = useMutation({
    mutationFn: (lid: number) => removeLedger({ data: { id: lid } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company-profile", cid] }); crudToast("delete", "Cari hareket"); },
    onError: (e) => errorToast(e),
  });

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"cari" | "satis" | "alis" | "teklif">("cari");

  if (isLoading) {
    return <AppShell><div className="py-20 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div></AppShell>;
  }
  if (error || !data) {
    return <AppShell><div className="text-sm text-destructive">Firma yüklenemedi.</div></AppShell>;
  }

  const c = data.company as Record<string, unknown>;
  const balance = data.balance;
  const isPositive = balance > 0; // borç (firma bize borçlu)

  return (
    <AppShell>
      <div className="mb-4">
        <Link to="/companies" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Firmalar
        </Link>
      </div>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-md bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{(c.name as string) || "—"}</h1>
            <div className="mt-0.5 text-xs text-muted-foreground flex flex-wrap gap-3">
              <span className="rounded bg-muted px-2 py-0.5">{(c.type as string) || "Müşteri"}</span>
              {c.tax_no ? <span>VKN: {c.tax_no as string}</span> : null}
              {c.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone as string}</span> : null}
              {c.email ? <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email as string}</span> : null}
              {c.address ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{(c.address as string).slice(0, 60)}</span> : null}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase text-muted-foreground">Bakiye</div>
          <div className={"text-2xl font-semibold tabular-nums " + (isPositive ? "text-amber-600" : balance < 0 ? "text-emerald-600" : "")}>
            {fmtMoney(Math.abs(balance))}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {balance > 0 ? "Firma bize borçlu" : balance < 0 ? "Biz firmaya borçluyuz" : "Hesap kapalı"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={ReceiptText} label="Toplam Borç (Satış)" value={fmtMoney(data.totalBorc)} />
        <Stat icon={FileInput} label="Toplam Alacak (Alış+Ödeme)" value={fmtMoney(data.totalAlacak)} />
        <Stat icon={FileText} label="Satış Faturası" value={String(data.sales.length)} />
        <Stat icon={FileText} label="Alış Faturası" value={String(data.purchases.length)} />
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-2 border-b border-border">
        {[
          { key: "cari", label: "Cari Hareketler" },
          { key: "satis", label: `Satış Faturaları (${data.sales.length})` },
          { key: "alis", label: `Alış Faturaları (${data.purchases.length})` },
          { key: "teklif", label: `Teklifler (${data.quotes.length})` },
        ].map((t) => (
          <button key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={"-mb-px border-b-2 px-3 py-2 text-sm " + (tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cari" && (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{data.ledger.length} hareket</div>
            {canWrite && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" /> Yeni Hareket</Button>
                </DialogTrigger>
                <LedgerForm
                  companyId={cid}
                  companyName={(c.name as string) || ""}
                  onSubmitted={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["company-profile", cid] }); }}
                />
              </Dialog>
            )}
          </div>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Tarih</th>
                  <th className="px-3 py-2 text-left">Tür</th>
                  <th className="px-3 py-2 text-left">Açıklama</th>
                  <th className="px-3 py-2 text-right">Borç (₺)</th>
                  <th className="px-3 py-2 text-right">Alacak (₺)</th>
                  <th className="px-3 py-2 text-right">Tutar</th>
                  <th className="px-3 py-2 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {data.ledger.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Henüz hareket yok.</td></tr>
                )}
                {[...data.ledger]
                  .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
                  .map((l) => {
                    const tl = Number(l.amount_try) || 0;
                    const isBorc = l.direction === "borc";
                    return (
                      <tr key={l.Id as number} className="border-t border-border hover:bg-muted/20">
                        <td className="px-3 py-2">{l.date as string}</td>
                        <td className="px-3 py-2">
                          <span className="rounded bg-muted px-2 py-0.5 text-xs">{l.type as string}</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{(l.description as string) || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-amber-700">{isBorc ? fmtMoney(tl) : ""}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{!isBorc ? fmtMoney(tl) : ""}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs text-muted-foreground">
                          {Number(l.amount).toLocaleString("tr-TR")} {l.currency as string}
                          {(l.rate as number) > 1 ? ` · @${l.rate}` : ""}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {canDelete && (l.ref_type === "manuel" || !l.ref_type) && (
                            <Button variant="ghost" size="sm" onClick={() => {
                              if (confirm("Bu hareket silinsin mi?")) deleteMut.mutate(l.Id as number);
                            }}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "satis" && <DocumentTable rows={data.sales} kind="sales" />}
      {tab === "alis" && <DocumentTable rows={data.purchases} kind="purchases" />}
      {tab === "teklif" && <DocumentTable rows={data.quotes} kind="quotes" />}
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span><Icon className="h-3.5 w-3.5" />
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function DocumentTable({ rows, kind }: { rows: Array<Record<string, unknown>>; kind: "sales" | "purchases" | "quotes" }) {
  const link = kind === "sales" ? "/invoices" : kind === "purchases" ? "/alis-faturalari" : "/quotes";
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{rows.length} kayıt</div>
        <Link to={link} className="text-[11px] text-muted-foreground hover:text-foreground">Tümü →</Link>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">No</th>
              <th className="px-3 py-2 text-left">Tarih</th>
              <th className="px-3 py-2 text-left">Durum</th>
              <th className="px-3 py-2 text-right">Tutar</th>
              <th className="px-3 py-2 text-right">TL Karşılığı</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Kayıt yok.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.Id as number} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{(r.number as string) || `#${r.Id}`}</td>
                <td className="px-3 py-2">{(r.date as string) || "—"}</td>
                <td className="px-3 py-2"><span className="rounded bg-muted px-2 py-0.5 text-xs">{(r.status as string) || "—"}</span></td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {Number(r.total || 0).toLocaleString("tr-TR")} {(r.currency as string) || "TRY"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {r.total_try ? fmtMoney(Number(r.total_try)) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LedgerForm({
  companyId, companyName, onSubmitted,
}: { companyId: number; companyName: string; onSubmitted: () => void }) {
  const create = useServerFn(createLedgerManual);
  const fetchRate = useServerFn(getRateForDate);
  const accountsFn = useServerFn(listAccounts);
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => accountsFn() });

  const today = new Date().toISOString().slice(0, 10);
  const [vals, setVals] = useState({
    date: today,
    type: "tahsilat" as "tahsilat" | "odeme" | "iade" | "manuel",
    direction: "alacak" as "borc" | "alacak", // tahsilat = bize ödeme geldi → cari azalır = alacak
    amount: 0,
    currency: "TRY",
    rate: 1,
    rate_source: "tl",
    description: "",
    account_id: null as number | null,
  });
  const [busy, setBusy] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);

  function set<K extends keyof typeof vals>(k: K, v: (typeof vals)[K]) {
    setVals((p) => ({ ...p, [k]: v }));
  }

  async function autoRate() {
    if (vals.currency === "TRY") return;
    setRateLoading(true);
    try {
      const r = await fetchRate({ data: { date: vals.date } });
      if (r) {
        const v = vals.currency === "USD" ? r.usd : r.eur;
        setVals((p) => ({ ...p, rate: v, rate_source: "tcmb" }));
      }
    } finally { setRateLoading(false); }
  }

  async function submit() {
    if (!(vals.amount > 0)) return;
    setBusy(true);
    try {
      await create({ data: {
        company_id: companyId, company_name: companyName,
        date: vals.date, type: vals.type, direction: vals.direction,
        amount: vals.amount, currency: vals.currency, rate: vals.rate,
        description: vals.description, account_id: vals.account_id,
      } });
      crudToast("create", "Cari hareket");
      onSubmitted();
    } catch (e) { errorToast(e); }
    finally { setBusy(false); }
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Yeni Cari Hareket</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>Tarih</Label>
            <Input type="date" value={vals.date} onChange={(e) => set("date", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>İşlem Türü</Label>
            <Select value={vals.type} onValueChange={(v) => {
              const t = v as typeof vals.type;
              setVals((p) => ({
                ...p, type: t,
                // tahsilat: firma bize ödedi → alacak (cari azalır)
                // odeme: biz firmaya ödedik → borc (alış cariyi azaltır)
                // iade / manuel → kullanıcı seçer
                direction: t === "tahsilat" ? "alacak" : t === "odeme" ? "borc" : p.direction,
              }));
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tahsilat">Tahsilat (firma bize ödedi)</SelectItem>
                <SelectItem value="odeme">Ödeme (biz firmaya ödedik)</SelectItem>
                <SelectItem value="iade">İade</SelectItem>
                <SelectItem value="manuel">Manuel Düzeltme</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5"><Label>Yön</Label>
            <Select value={vals.direction} onValueChange={(v) => set("direction", v as typeof vals.direction)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="borc">Borç (cariye yükle)</SelectItem>
                <SelectItem value="alacak">Alacak (cariden düş)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label>Tutar</Label>
            <Input type="number" step="0.01" value={vals.amount}
              onChange={(e) => set("amount", parseFloat(e.target.value) || 0)} /></div>
          <div className="grid gap-1.5"><Label>Döviz</Label>
            <Select value={vals.currency} onValueChange={(v) => {
              setVals((p) => ({ ...p, currency: v, rate: v === "TRY" ? 1 : p.rate, rate_source: v === "TRY" ? "tl" : p.rate_source }));
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">₺ TRY</SelectItem>
                <SelectItem value="USD">$ USD</SelectItem>
                <SelectItem value="EUR">€ EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {vals.currency !== "TRY" && (
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5 col-span-2"><Label>Kur (1 {vals.currency} = ? ₺)</Label>
              <div className="flex gap-1">
                <Input type="number" step="0.0001" value={vals.rate}
                  onChange={(e) => setVals((p) => ({ ...p, rate: parseFloat(e.target.value) || 0, rate_source: "manuel" }))} />
                <Button type="button" variant="outline" size="sm" onClick={autoRate} disabled={rateLoading}>
                  {rateLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "TCMB"}
                </Button>
              </div>
              <div className="text-[10px] text-muted-foreground">Kaynak: {vals.rate_source}</div>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">TL Karşılığı</Label>
              <div className="rounded border border-border bg-muted/40 px-2 py-1.5 text-right tabular-nums">
                {(vals.amount * (vals.rate || 0)).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-1.5">
          <Label>Kasa (opsiyonel — seçilirse kasa hareketi de açılır)</Label>
          <Select value={vals.account_id ? String(vals.account_id) : "none"}
            onValueChange={(v) => set("account_id", v === "none" ? null : Number(v))}>
            <SelectTrigger><SelectValue placeholder="Kasa seç" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Kasaya işleme —</SelectItem>
              {(accounts.data || []).map((a) => {
                const x = a as { Id: number; name?: string; currency?: string };
                return <SelectItem key={x.Id} value={String(x.Id)}>{x.name} ({x.currency})</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5"><Label>Açıklama</Label>
          <Textarea rows={2} value={vals.description} onChange={(e) => set("description", e.target.value)}
            placeholder={`örn: ${companyName} havale dekont no...`} /></div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={busy || !(vals.amount > 0)}>
          {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor…</> : "Kaydet"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
