import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { DocumentForm, type DocData } from "@/components/document-form";
import {
  listQuotes, getQuote, saveQuote, deleteQuote, convertQuoteToInvoice,
} from "@/lib/nocodb.functions";
import { FileText, Plus, Pencil, Trash2, Loader2, AlertCircle, ArrowRightCircle } from "lucide-react";

export const Route = createFileRoute("/quotes")({
  head: () => ({ meta: [{ title: "Teklifler — IDM ERP" }] }),
  component: QuotesPage,
});

type Quote = {
  Id: number; number?: string; company_name?: string; date?: string;
  status?: string; currency?: string; total?: number; valid_until?: string;
};

function QuotesPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const list = useServerFn(listQuotes);
  const get = useServerFn(getQuote);
  const save = useServerFn(saveQuote);
  const remove = useServerFn(deleteQuote);
  const convert = useServerFn(convertQuoteToInvoice);

  const { data, isLoading, error } = useQuery({ queryKey: ["quotes"], queryFn: () => list() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<(DocData & { Id?: number }) | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const saveMut = useMutation({
    mutationFn: (v: { id: number | null; data: DocData }) => save({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
  const delMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
  const convertMut = useMutation({
    mutationFn: (quote_id: number) => convert({ data: { quote_id } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      alert(`Fatura oluşturuldu: ${res.number}`);
      router.navigate({ to: "/invoices" });
    },
    onError: (e) => alert("Hata: " + (e as Error).message),
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
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Teklifler</h1>
            <p className="text-sm text-muted-foreground">Teklif kayıtları</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Yeni Teklif
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
              <th className="px-3 py-2 text-left">Geçerlilik</th>
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
              <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">Henüz teklif yok.</td></tr>
            )}
            {data?.map((q) => q as Quote).map((q) => (
              <tr key={q.Id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{q.number || `#${q.Id}`}</td>
                <td className="px-3 py-2">{q.company_name || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{q.date || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{q.valid_until || "—"}</td>
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
        kind="quote"
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
