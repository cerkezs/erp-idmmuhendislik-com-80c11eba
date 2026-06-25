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
  listExpenses, createExpenseWithCash, updateExpense, deleteExpense, listAccounts,
} from "@/lib/nocodb.functions";
import { Receipt, Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Giderler — IDM ERP" }] }),
  component: ExpensesPage,
});

type Expense = {
  Id: number;
  date?: string; category?: string; description?: string;
  amount?: number; currency?: string; fx_rate?: number;
  company_name?: string; receipt_no?: string; notes?: string;
};

const CATEGORIES = ["Yakıt", "Malzeme", "Kira", "Maaş", "Vergi", "Yemek", "Ulaşım", "Diğer"];

function ExpensesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listExpenses);
  const create = useServerFn(createExpenseWithCash);
  const update = useServerFn(updateExpense);
  const remove = useServerFn(deleteExpense);
  const accountsFn = useServerFn(listAccounts);

  const { data, isLoading, error } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => list(),
  });
  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: () => accountsFn() });

  const createMut = useMutation({
    mutationFn: (v: { expense: Omit<Expense, "Id">; account_id: number | null }) => create({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: number; patch: Partial<Expense> }) => update({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const [editing, setEditing] = useState<Expense | null>(null);
  const [open, setOpen] = useState(false);

  const rows = (data || []) as Expense[];
  const totalTRY = rows.reduce((s, r) => s + (r.amount || 0) * (r.fx_rate || 1), 0);

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Şirket Giderleri</h1>
            <p className="text-sm text-muted-foreground">
              Toplam (TL): <span className="font-medium text-foreground">{totalTRY.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺</span>
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Yeni Gider</Button>
          </DialogTrigger>
          <ExpenseForm
            initial={editing}
            onSubmit={async (vals) => {
              if (editing) await updateMut.mutateAsync({ id: editing.Id, patch: vals });
              else await createMut.mutateAsync(vals);
              setOpen(false); setEditing(null);
            }}
            submitting={createMut.isPending || updateMut.isPending}
          />
        </Dialog>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <div className="font-medium text-destructive">Veri yüklenemedi</div>
            <pre className="mt-1 whitespace-pre-wrap text-xs">{(error as Error).message}</pre>
            <p className="mt-2 text-xs">
              Tablo eksik olabilir. <Link to="/setup" className="underline">/setup</Link> sayfasından kur.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Tarih</th>
              <th className="px-3 py-2 text-left">Kategori</th>
              <th className="px-3 py-2 text-left">Açıklama</th>
              <th className="px-3 py-2 text-left">Firma</th>
              <th className="px-3 py-2 text-right">Tutar</th>
              <th className="px-3 py-2 text-left">Fiş No</th>
              <th className="px-3 py-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">Henüz gider yok.</td></tr>
            )}
            {rows.map((e) => (
              <tr key={e.Id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 text-muted-foreground">{e.date || "—"}</td>
                <td className="px-3 py-2">{e.category || "—"}</td>
                <td className="px-3 py-2">{e.description || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.company_name || "—"}</td>
                <td className="px-3 py-2 text-right font-medium">{(e.amount ?? 0).toLocaleString("tr-TR")} {e.currency || "TRY"}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.receipt_no || "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(e); setOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (confirm(`Gider silinsin mi?`)) deleteMut.mutate(e.Id);
                  }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function ExpenseForm({ initial, onSubmit, submitting }: {
  initial: Expense | null;
  onSubmit: (vals: Omit<Expense, "Id">) => void | Promise<void>;
  submitting: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [vals, setVals] = useState<Omit<Expense, "Id">>({
    date: initial?.date || today,
    category: initial?.category || "Diğer",
    description: initial?.description || "",
    amount: initial?.amount ?? 0,
    currency: initial?.currency || "TRY",
    fx_rate: initial?.fx_rate ?? 1,
    company_name: initial?.company_name || "",
    receipt_no: initial?.receipt_no || "",
    notes: initial?.notes || "",
  });
  function set<K extends keyof typeof vals>(k: K, v: (typeof vals)[K]) {
    setVals((p) => ({ ...p, [k]: v }));
  }
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{initial ? "Gider Düzenle" : "Yeni Gider"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Tarih</Label>
            <Input type="date" value={vals.date || ""} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Kategori</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={vals.category || ""}
              onChange={(e) => set("category", e.target.value)}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Açıklama</Label>
          <Input value={vals.description || ""} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <Label>Tutar</Label>
            <Input type="number" step="0.01" value={vals.amount ?? 0} onChange={(e) => set("amount", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Döviz</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={vals.currency || "TRY"}
              onChange={(e) => set("currency", e.target.value)}
            >
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>Kur (TL)</Label>
            <Input type="number" step="0.0001" value={vals.fx_rate ?? 1} onChange={(e) => set("fx_rate", parseFloat(e.target.value) || 1)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Firma</Label>
            <Input value={vals.company_name || ""} onChange={(e) => set("company_name", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Fiş No</Label>
            <Input value={vals.receipt_no || ""} onChange={(e) => set("receipt_no", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Notlar</Label>
          <Textarea rows={2} value={vals.notes || ""} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(vals)} disabled={submitting}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor…</> : "Kaydet"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
