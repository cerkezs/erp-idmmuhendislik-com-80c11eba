import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { DocumentForm, type DocData } from "@/components/document-form";
import {
  listInvoices, getInvoice, saveInvoice, deleteInvoice,
} from "@/lib/nocodb.functions";
import { ReceiptText, Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/invoices")({
  head: () => ({ meta: [{ title: "Faturalar — IDM ERP" }] }),
  component: InvoicesPage,
});

type Invoice = {
  Id: number; number?: string; company_name?: string; date?: string;
  status?: string; currency?: string; total?: number; due_date?: string;
};

function InvoicesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listInvoices);
  const get = useServerFn(getInvoice);
  const save = useServerFn(saveInvoice);
  const remove = useServerFn(deleteInvoice);

  const { data, isLoading, error } = useQuery({ queryKey: ["invoices"], queryFn: () => list() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<(DocData & { Id?: number }) | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const saveMut = useMutation({
    mutationFn: (v: { id: number | null; data: DocData }) => save({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
  const delMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  async function openEdit(id: number) {
    setLoadingEdit(true);
    try {
      const full = await get({ data: { id } });
      setEditing(full as unknown as DocData & { Id: number });
      setOpen(true);
    } finally { setLoadingEdit(false); }
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <ReceiptText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Faturalar</h1>
            <p className="text-sm text-muted-foreground">Fatura kayıtları, vade takibi</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Yeni Fatura
        </Button>
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

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">No</th>
              <th className="px-3 py-2 text-left">Firma</th>
              <th className="px-3 py-2 text-left">Tarih</th>
              <th className="px-3 py-2 text-left">Vade</th>
              <th className="px-3 py-2 text-left">Durum</th>
              <th className="px-3 py-2 text-right">Toplam</th>
              <th className="px-3 py-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {(isLoading || loadingEdit) && (
              <tr><td colSpan={7} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
            )}
            {!isLoading && data && data.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">Henüz fatura yok.</td></tr>
            )}
            {data?.map((q) => q as Invoice).map((q) => (
              <tr key={q.Id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{q.number || `#${q.Id}`}</td>
                <td className="px-3 py-2">{q.company_name || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{q.date || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{q.due_date || "—"}</td>
                <td className="px-3 py-2"><span className="rounded bg-muted px-2 py-0.5 text-xs">{q.status || "Taslak"}</span></td>
                <td className="px-3 py-2 text-right tabular-nums">{(q.total ?? 0).toLocaleString("tr-TR")} {q.currency || "TRY"}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(q.Id)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (confirm(`"${q.number || q.Id}" silinsin mi?`)) delMut.mutate(q.Id);
                  }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
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
    </AppShell>
  );
}
