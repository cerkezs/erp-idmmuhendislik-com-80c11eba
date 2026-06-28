import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { DocumentForm, type DocData } from "@/components/document-form";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  listPurchaseInvoices, getPurchaseInvoice, savePurchaseInvoice, deletePurchaseInvoice,
  payPurchaseInvoice, listAccounts,
} from "@/lib/nocodb.functions";
import { FileInput, Plus, Pencil, Trash2, Loader2, AlertCircle, BadgeDollarSign } from "lucide-react";
import { ListToolbar } from "@/components/list-toolbar";
import { useListFilter, useFilteredList } from "@/hooks/use-list-filter";
import { useMe } from "@/hooks/use-me";
import { crudToast, errorToast } from "@/lib/toast";

export const Route = createFileRoute("/alis-faturalari")({
  head: () => ({ meta: [{ title: "Alış Faturaları — IDM ERP" }] }),
  component: PurchaseInvoicesPage,
});

type Purchase = {
  Id: number; number?: string; supplier_name?: string; date?: string;
  status?: string; currency?: string; total?: number; total_try?: number; due_date?: string;
};

// DocumentForm sales contract → purchase contract dönüşümleri
function toDocData(p: Record<string, unknown> | null): (DocData & { Id?: number }) | null {
  if (!p) return null;
  return {
    Id: p.Id as number | undefined,
    number: p.number as string,
    company_id: (p.supplier_id as number) ?? null,
    company_name: p.supplier_name as string,
    date: p.date as string,
    due_date: p.due_date as string,
    status: p.status as string,
    currency: p.currency as string,
    rate: p.rate as number,
    rate_source: p.rate_source as string,
    notes: p.notes as string,
    items: ((p.items as unknown[]) || []) as DocData["items"],
  };
}

function fromDocData(d: DocData) {
  return {
    number: d.number || "",
    supplier_id: d.company_id ?? null,
    supplier_name: d.company_name || "",
    date: d.date || "",
    due_date: d.due_date || "",
    status: d.status || "Bekliyor",
    currency: d.currency || "TRY",
    rate: d.rate ?? 1,
    rate_source: d.rate_source || "tl",
    notes: d.notes || "",
    items: d.items.map((it) => ({
      product_id: it.product_id ?? null,
      description: it.description || "",
      qty: Number(it.qty) || 0,
      unit_price: Number(it.unit_price) || 0,
      vat_rate: Number(it.vat_rate) || 0,
    })),
  };
}

function PurchaseInvoicesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listPurchaseInvoices);
  const get = useServerFn(getPurchaseInvoice);
  const save = useServerFn(savePurchaseInvoice);
  const remove = useServerFn(deletePurchaseInvoice);
  const pay = useServerFn(payPurchaseInvoice);
  const accountsFn = useServerFn(listAccounts);

  const { data, isLoading, error } = useQuery({ queryKey: ["purchase-invoices"], queryFn: () => list() });
  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: () => accountsFn() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<(DocData & { Id?: number }) | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [paying, setPaying] = useState<Purchase | null>(null);
  const [payAccount, setPayAccount] = useState<number | null>(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));

  const { canWrite, canDelete } = useMe();
  const saveMut = useMutation({
    mutationFn: (v: { id: number | null; data: DocData }) => save({ data: { id: v.id, data: fromDocData(v.data) } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      crudToast(editing?.Id ? "update" : "create", "Alış faturası");
    },
    onError: (e) => errorToast(e),
  });
  const delMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-invoices"] }); crudToast("delete", "Alış faturası"); },
    onError: (e) => errorToast(e),
  });
  const payMut = useMutation({
    mutationFn: (v: { invoice_id: number; account_id: number | null; date: string }) => pay({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setPaying(null);
      crudToast("update", "Ödeme");
    },
    onError: (e) => errorToast(e),
  });

  const { filters, setFilters } = useListFilter({ initialSortKey: "date", initialSortDir: "desc" });
  const filtered = useFilteredList<Purchase>(data as Purchase[] | undefined, filters, {
    searchKeys: ["number", "supplier_name"],
    statusKey: "status",
    dateKey: "date",
  });

  async function openEdit(id: number) {
    setLoadingEdit(true);
    try {
      const full = await get({ data: { id } });
      setEditing(toDocData(full as Record<string, unknown>));
      setOpen(true);
    } finally { setLoadingEdit(false); }
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <FileInput className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Alış Faturaları</h1>
            <p className="text-sm text-muted-foreground">Tedarikçilerin bize kestiği faturalar</p>
          </div>
        </div>
        {canWrite && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Yeni Alış Faturası
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <div className="font-medium text-destructive">Veri yüklenemedi</div>
            <pre className="mt-1 whitespace-pre-wrap text-xs">{(error as Error).message}</pre>
            <p className="mt-2 text-xs">Tablo eksikse <Link to="/setup" className="underline">/setup</Link> sayfasından kur.</p>
          </div>
        </div>
      )}

      <ListToolbar
        filters={filters}
        setFilters={setFilters}
        placeholder="Ara: no, tedarikçi…"
        statusOptions={[
          { value: "Bekliyor", label: "Bekliyor" },
          { value: "Ödendi", label: "Ödendi" },
          { value: "Kısmi Ödendi", label: "Kısmi" },
          { value: "İptal", label: "İptal" },
        ]}
        showDates
        sortOptions={[
          { value: "date-desc", key: "date", dir: "desc", label: "Tarih (yeni)" },
          { value: "date-asc", key: "date", dir: "asc", label: "Tarih (eski)" },
          { value: "due_date-asc", key: "due_date", dir: "asc", label: "Vade (yakın)" },
          { value: "total_try-desc", key: "total_try", dir: "desc", label: "TL Toplam (yüksek)" },
          { value: "supplier_name-asc", key: "supplier_name", dir: "asc", label: "Tedarikçi (A→Z)" },
        ]}
        totalCount={(data as Purchase[] | undefined)?.length ?? 0}
        filteredCount={filtered.length}
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">No</th>
              <th className="px-3 py-2 text-left">Tedarikçi</th>
              <th className="px-3 py-2 text-left">Tarih</th>
              <th className="px-3 py-2 text-left">Vade</th>
              <th className="px-3 py-2 text-left">Durum</th>
              <th className="px-3 py-2 text-right">Tutar</th>
              <th className="px-3 py-2 text-right">TL Karşılığı</th>
              <th className="px-3 py-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {(isLoading || loadingEdit) && (
              <tr><td colSpan={8} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                {((data as Purchase[] | undefined)?.length ?? 0) === 0 ? "Henüz alış faturası yok." : "Filtreyle eşleşen kayıt yok."}
              </td></tr>
            )}
            {filtered.map((q) => (
              <tr key={q.Id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{q.number || `#${q.Id}`}</td>
                <td className="px-3 py-2">{q.supplier_name || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{q.date || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{q.due_date || "—"}</td>
                <td className="px-3 py-2">
                  <span className={"rounded px-2 py-0.5 text-xs " + (
                    q.status === "Ödendi" ? "bg-emerald-500/15 text-emerald-700" :
                    q.status === "İptal" ? "bg-red-500/15 text-red-600" :
                    "bg-amber-500/15 text-amber-700"
                  )}>{q.status || "Bekliyor"}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{(q.total ?? 0).toLocaleString("tr-TR")} {q.currency || "TRY"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {q.total_try ? `${q.total_try.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺` : "—"}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {canWrite && q.status !== "Ödendi" && q.status !== "İptal" && (
                    <Button variant="ghost" size="sm" title="Ödendi olarak işaretle"
                      onClick={() => {
                        setPaying(q);
                        setPayAccount(accountsQ.data?.[0]?.Id as number ?? null);
                        setPayDate(new Date().toISOString().slice(0, 10));
                      }}>
                      <BadgeDollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    </Button>
                  )}
                  {canWrite && (
                    <Button variant="ghost" size="sm" onClick={() => openEdit(q.Id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      if (confirm(`"${q.number || q.Id}" silinsin mi?`)) delMut.mutate(q.Id);
                    }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DocumentForm
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}
        kind="invoice"
        initial={editing}
        submitting={saveMut.isPending}
        onSubmit={async (vals) => {
          await saveMut.mutateAsync({ id: editing?.Id ?? null, data: vals });
          setOpen(false); setEditing(null);
        }}
      />

      {/* Ödeme dialog */}
      <Dialog open={!!paying} onOpenChange={(o) => { if (!o) setPaying(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ödeme — {paying?.number || paying?.Id}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="rounded-md bg-muted/40 p-3 text-sm">
              <div><span className="text-muted-foreground">Tedarikçi:</span> {paying?.supplier_name || "—"}</div>
              <div><span className="text-muted-foreground">Tutar:</span> <span className="font-medium">{(paying?.total ?? 0).toLocaleString("tr-TR")} {paying?.currency || "TRY"}</span></div>
            </div>
            <div className="grid gap-1.5">
              <Label>Tarih</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Kasa / Banka (opsiyonel)</Label>
              <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={payAccount ?? ""}
                onChange={(e) => setPayAccount(Number(e.target.value) || null)}>
                <option value="">— Sadece cariye işle —</option>
                {(accountsQ.data || []).map((a) => {
                  const x = a as { Id: number; name?: string; currency?: string };
                  return <option key={x.Id} value={x.Id}>{x.name} ({x.currency})</option>;
                })}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPaying(null)}>Vazgeç</Button>
            <Button
              disabled={payMut.isPending}
              onClick={() => paying && payMut.mutate({ invoice_id: paying.Id, account_id: payAccount, date: payDate })}>
              {payMut.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> İşleniyor…</> : "Ödendi İşle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
