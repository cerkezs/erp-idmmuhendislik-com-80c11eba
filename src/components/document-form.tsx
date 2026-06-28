import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listCompanies, listProducts } from "@/lib/nocodb.functions";
import { getRateForDate } from "@/lib/rates.functions";
import { Plus, Trash2, Loader2 } from "lucide-react";

export type DocItem = {
  product_id?: number | null;
  description?: string;
  qty: number;
  unit_price: number;
  vat_rate: number;
};

export type DocData = {
  number?: string;
  company_id?: number | null;
  company_name?: string;
  date?: string;
  status?: string;
  currency?: string;
  rate?: number;
  rate_source?: string; // "tcmb" | "manuel" | "tl"
  notes?: string;
  items: DocItem[];
  // teklif/fatura'ya özgü:
  valid_until?: string;
  due_date?: string;
};

const STATUS_OPTIONS = ["Taslak", "Gönderildi", "Onaylandı", "Faturalandı", "İptal", "Ödendi"];

export function DocumentForm({
  open,
  onOpenChange,
  kind,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kind: "quote" | "invoice";
  initial: (DocData & { Id?: number }) | null;
  onSubmit: (vals: DocData) => void | Promise<void>;
  submitting: boolean;
}) {
  const listC = useServerFn(listCompanies);
  const listP = useServerFn(listProducts);
  const fetchRate = useServerFn(getRateForDate);
  const companies = useQuery({ queryKey: ["companies"], queryFn: () => listC() });
  const products = useQuery({ queryKey: ["products"], queryFn: () => listP() });

  const [vals, setVals] = useState<DocData>(() => freshDefaults(kind, initial));
  const [rateLoading, setRateLoading] = useState(false);
  useEffect(() => { setVals(freshDefaults(kind, initial)); }, [initial, kind, open]);

  async function autoFetchRate() {
    if (!vals.currency || vals.currency === "TRY" || !vals.date) return;
    setRateLoading(true);
    try {
      const r = await fetchRate({ data: { date: vals.date } });
      if (r) {
        const v = vals.currency === "USD" ? r.usd : r.eur;
        setVals((p) => ({ ...p, rate: v, rate_source: "tcmb" }));
      }
    } finally { setRateLoading(false); }
  }

  function set<K extends keyof DocData>(k: K, v: DocData[K]) {
    setVals((p) => ({ ...p, [k]: v }));
  }
  function setItem(i: number, patch: Partial<DocItem>) {
    setVals((p) => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) }));
  }
  function addItem() {
    setVals((p) => ({ ...p, items: [...p.items, { qty: 1, unit_price: 0, vat_rate: 20, description: "" }] }));
  }
  function removeItem(i: number) {
    setVals((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  }

  const totals = useMemo(() => {
    let sub = 0, vat = 0;
    for (const it of vals.items) {
      const line = (it.qty || 0) * (it.unit_price || 0);
      sub += line; vat += line * ((it.vat_rate || 0) / 100);
    }
    return { sub: round2(sub), vat: round2(vat), total: round2(sub + vat) };
  }, [vals.items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{initial?.Id ? "Düzenle" : "Yeni"} {kind === "quote" ? "Teklif" : "Fatura"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="grid gap-1.5">
              <Label>{kind === "quote" ? "Teklif No" : "Fatura No"}</Label>
              <Input value={vals.number || ""} onChange={(e) => set("number", e.target.value)} placeholder="otomatik" />
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label>Firma *</Label>
              <Select
                value={vals.company_id ? String(vals.company_id) : ""}
                onValueChange={(v) => {
                  const id = Number(v);
                  const c = (companies.data || []).find((x) => (x as { Id: number }).Id === id);
                  setVals((p) => ({ ...p, company_id: id, company_name: (c as { name?: string })?.name || "" }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Firma seç" /></SelectTrigger>
                <SelectContent>
                  {(companies.data || []).map((c) => {
                    const x = c as { Id: number; name?: string };
                    return <SelectItem key={x.Id} value={String(x.Id)}>{x.name || `#${x.Id}`}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Durum</Label>
              <Select value={vals.status || "Taslak"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="grid gap-1.5">
              <Label>Tarih</Label>
              <Input type="date" value={vals.date || ""} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{kind === "quote" ? "Geçerlilik" : "Vade"}</Label>
              <Input
                type="date"
                value={(kind === "quote" ? vals.valid_until : vals.due_date) || ""}
                onChange={(e) => kind === "quote" ? set("valid_until", e.target.value) : set("due_date", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Döviz</Label>
              <Select value={vals.currency || "TRY"} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY (₺)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between bg-muted/40 px-3 py-2">
              <div className="text-sm font-medium">Kalemler</div>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Satır ekle
              </Button>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 text-left">Ürün</th>
                  <th className="px-2 py-1 text-left">Açıklama</th>
                  <th className="px-2 py-1 text-right w-20">Miktar</th>
                  <th className="px-2 py-1 text-right w-28">Birim Fiyat</th>
                  <th className="px-2 py-1 text-right w-20">KDV %</th>
                  <th className="px-2 py-1 text-right w-28">Toplam</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {vals.items.length === 0 && (
                  <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">Kalem yok</td></tr>
                )}
                {vals.items.map((it, i) => {
                  const line = round2((it.qty || 0) * (it.unit_price || 0));
                  return (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1">
                        <Select
                          value={it.product_id ? String(it.product_id) : ""}
                          onValueChange={(v) => {
                            const id = Number(v);
                            const p = (products.data || []).find((x) => (x as { Id: number }).Id === id) as
                              { Id: number; name?: string; price?: number; vat_rate?: number } | undefined;
                            setItem(i, {
                              product_id: id,
                              description: p?.name || it.description,
                              unit_price: p?.price ?? it.unit_price,
                              vat_rate: p?.vat_rate ?? it.vat_rate,
                            });
                          }}
                        >
                          <SelectTrigger className="h-8"><SelectValue placeholder="Seç" /></SelectTrigger>
                          <SelectContent>
                            {(products.data || []).map((p) => {
                              const x = p as { Id: number; name?: string };
                              return <SelectItem key={x.Id} value={String(x.Id)}>{x.name}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1">
                        <Input className="h-8" value={it.description || ""} onChange={(e) => setItem(i, { description: e.target.value })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className="h-8 text-right" type="number" step="0.01" value={it.qty}
                          onChange={(e) => setItem(i, { qty: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className="h-8 text-right" type="number" step="0.01" value={it.unit_price}
                          onChange={(e) => setItem(i, { unit_price: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className="h-8 text-right" type="number" step="0.01" value={it.vat_rate}
                          onChange={(e) => setItem(i, { vat_rate: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">{line.toLocaleString("tr-TR")}</td>
                      <td className="px-2 py-1">
                        <Button variant="ghost" size="sm" onClick={() => removeItem(i)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-border bg-muted/20 text-sm">
                <tr><td colSpan={5} className="px-2 py-1 text-right text-muted-foreground">Ara Toplam</td>
                  <td className="px-2 py-1 text-right tabular-nums">{totals.sub.toLocaleString("tr-TR")}</td><td /></tr>
                <tr><td colSpan={5} className="px-2 py-1 text-right text-muted-foreground">KDV</td>
                  <td className="px-2 py-1 text-right tabular-nums">{totals.vat.toLocaleString("tr-TR")}</td><td /></tr>
                <tr><td colSpan={5} className="px-2 py-1 text-right font-semibold">Genel Toplam</td>
                  <td className="px-2 py-1 text-right font-semibold tabular-nums">{totals.total.toLocaleString("tr-TR")} {vals.currency}</td><td /></tr>
              </tfoot>
            </table>
          </div>

          <div className="grid gap-1.5">
            <Label>Notlar</Label>
            <Textarea rows={2} value={vals.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onSubmit(vals)} disabled={submitting || !vals.company_id}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor…</> : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function freshDefaults(kind: "quote" | "invoice", initial: (DocData & { Id?: number }) | null): DocData {
  const today = new Date().toISOString().slice(0, 10);
  return {
    number: initial?.number || "",
    company_id: initial?.company_id ?? null,
    company_name: initial?.company_name || "",
    date: initial?.date || today,
    status: initial?.status || "Taslak",
    currency: initial?.currency || "TRY",
    notes: initial?.notes || "",
    items: (initial?.items || []).map((it) => ({
      product_id: it.product_id ?? null,
      description: it.description || "",
      qty: Number(it.qty) || 0,
      unit_price: Number(it.unit_price) || 0,
      vat_rate: Number(it.vat_rate) || 0,
    })),
    valid_until: kind === "quote" ? (initial?.valid_until || "") : undefined,
    due_date: kind === "invoice" ? (initial?.due_date || "") : undefined,
  };
}

function round2(n: number) { return Math.round(n * 100) / 100; }
