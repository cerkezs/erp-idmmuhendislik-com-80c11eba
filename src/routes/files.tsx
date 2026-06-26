import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  listFiles, createFile, updateFile, deleteFile, listCompanies,
} from "@/lib/nocodb.functions";
import { Files as FilesIcon, Plus, Pencil, Trash2, Loader2, AlertCircle, Folder, FileText, Eye, Download } from "lucide-react";
import { ListToolbar } from "@/components/list-toolbar";
import { useListFilter, applyListFilter } from "@/hooks/use-list-filter";
import { useMe } from "@/hooks/use-me";
import { crudToast, errorToast } from "@/lib/toast";

export const Route = createFileRoute("/files")({
  head: () => ({ meta: [{ title: "Dosyalar — IDM ERP" }] }),
  component: FilesPage,
});

type FileRow = {
  Id: number; date?: string; name?: string; category?: string;
  company_id?: number | null; company_name?: string;
  folder?: string; url?: string; size?: string; kind?: string; notes?: string;
};

const CATS = ["Teklif", "Sipariş", "Fatura", "Üretim", "Gider", "Sözleşme", "Genel"];

function FilesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listFiles);
  const create = useServerFn(createFile);
  const update = useServerFn(updateFile);
  const remove = useServerFn(deleteFile);
  const listCo = useServerFn(listCompanies);

  const { data, isLoading, error } = useQuery({ queryKey: ["files"], queryFn: () => list() });
  const { data: companies } = useQuery({ queryKey: ["companies"], queryFn: () => listCo() });

  const { canWrite, canDelete } = useMe();
  const createMut = useMutation({
    mutationFn: (d: Omit<FileRow, "Id">) => create({ data: d }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["files"] }); crudToast("create", "Dosya"); },
    onError: (e) => errorToast(e),
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: number; patch: Partial<FileRow> }) => update({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["files"] }); crudToast("update", "Dosya"); },
    onError: (e) => errorToast(e),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["files"] }); crudToast("delete", "Dosya"); },
    onError: (e) => errorToast(e),
  });

  const [editing, setEditing] = useState<FileRow | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedCo, setSelectedCo] = useState<string>("all");

  const all = (data || []) as FileRow[];
  const { filters, setFilters } = useListFilter({ initialSortKey: "name", initialSortDir: "asc" });
  const filtered = useMemo(() => {
    const base = selectedCo === "all" ? all : all.filter((f) => (f.company_name || "—") === selectedCo);
    return applyListFilter(base, filters, {
      searchKeys: ["name", "notes", "folder"],
      categoryKey: "category",
    });
  }, [all, filters, selectedCo]);

  const byCompany = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of all) {
      const k = f.company_name || "— Genel —";
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    // Tüm firmaları (dosyası olmasa da) sol ağaçta göster
    const fromCompanies = ((companies as Array<{ name: string }>) || []).map((c) => c.name).filter(Boolean);
    const names = new Set<string>(fromCompanies);
    for (const k of counts.keys()) names.add(k);
    const list = Array.from(names).sort((a, b) => a.localeCompare(b, "tr"));
    // "— Genel —" en üstte
    const general = "— Genel —";
    const ordered = [general, ...list.filter((n) => n !== general)];
    return ordered.map((name) => [name, counts.get(name) || 0] as const);
  }, [all, companies]);

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary"><FilesIcon className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold">Dosyalar</h1>
            <p className="text-sm text-muted-foreground">{all.length} kayıt · {byCompany.length} klasör</p>
          </div>
        </div>
        {canWrite && (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Yeni Dosya</Button></DialogTrigger>
          <FileForm initial={editing} companies={(companies as Array<{ Id: number; name: string }>) || []}
            onSubmit={async (vals) => {
              if (editing) await updateMut.mutateAsync({ id: editing.Id, patch: vals });
              else await createMut.mutateAsync(vals);
              setOpen(false); setEditing(null);
            }} submitting={createMut.isPending || updateMut.isPending} />
        </Dialog>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
            <div><div className="font-medium text-destructive">Yüklenemedi</div>
              <pre className="mt-1 whitespace-pre-wrap text-xs">{(error as Error).message}</pre>
              <p className="mt-2 text-xs">Tablo eksikse <Link to="/setup" className="underline">/setup</Link>.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border border-border bg-card p-2">
          <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Firma Ağacı</div>
          <button onClick={() => setSelectedCo("all")}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${selectedCo === "all" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
            <Folder className="h-3.5 w-3.5" /> Tümü <span className="ml-auto text-xs text-muted-foreground">{all.length}</span>
          </button>
          {byCompany.map(([co, count]) => (
            <button key={co} onClick={() => setSelectedCo(co)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${selectedCo === co ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
              <Folder className="h-3.5 w-3.5" /> <span className="truncate">{co}</span>
              <span className="ml-auto text-xs text-muted-foreground">{count}</span>
            </button>
          ))}
        </aside>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara: ad, klasör, not…" />
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Ad</th>
                  <th className="px-3 py-2 text-left">Kategori</th>
                  <th className="px-3 py-2 text-left">Firma</th>
                  <th className="px-3 py-2 text-left">Klasör</th>
                  <th className="px-3 py-2 text-left">Tür</th>
                  <th className="px-3 py-2 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={6} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>}
                {!isLoading && filtered.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">Sonuç yok.</td></tr>}
                {filtered.map((f) => (
                  <tr key={f.Id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        {f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">{f.name}</a> : <span className="font-medium">{f.name}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2"><span className="rounded bg-muted px-1.5 py-0.5 text-xs">{f.category}</span></td>
                    <td className="px-3 py-2 text-muted-foreground">{f.company_name || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{f.folder || "—"}</td>
                    <td className="px-3 py-2 text-xs">{f.kind || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" disabled={!f.url} title="Görüntüle"
                        onClick={() => { if (f.url) window.open(f.url, "_blank", "noopener,noreferrer"); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" disabled={!f.url} title="İndir" asChild={!!f.url}>
                        {f.url
                          ? <a href={f.url} download={f.name || true} rel="noreferrer"><Download className="h-3.5 w-3.5" /></a>
                          : <Download className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" title="Düzenle" onClick={() => { setEditing(f); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" title="Sil" onClick={() => { if (confirm("Kayıt silinsin mi? (Sunucudaki dosya silinmez)")) deleteMut.mutate(f.Id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function FileForm({ initial, companies, onSubmit, submitting }: {
  initial: FileRow | null;
  companies: Array<{ Id: number; name: string }>;
  onSubmit: (v: Omit<FileRow, "Id">) => void | Promise<void>;
  submitting: boolean;
}) {
  const [v, setV] = useState<Omit<FileRow, "Id">>({
    date: initial?.date || new Date().toISOString(),
    name: initial?.name || "",
    category: initial?.category || "Genel",
    company_id: initial?.company_id ?? null,
    company_name: initial?.company_name || "",
    folder: initial?.folder || "",
    url: initial?.url || "",
    size: initial?.size || "",
    kind: initial?.kind || "",
    notes: initial?.notes || "",
  });
  function set<K extends keyof typeof v>(k: K, val: (typeof v)[K]) { setV((p) => ({ ...p, [k]: val })); }
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{initial ? "Dosya Düzenle" : "Yeni Dosya"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5"><Label>Ad *</Label><Input value={v.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="teklif-2026-001.pdf" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>Kategori</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={v.category} onChange={(e) => set("category", e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div className="grid gap-1.5"><Label>Tür</Label><Input value={v.kind || ""} onChange={(e) => set("kind", e.target.value)} placeholder="pdf, jpg…" /></div>
        </div>
        <div className="grid gap-1.5"><Label>Firma</Label>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={v.company_id ?? ""} onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              const c = companies.find((x) => x.Id === id);
              set("company_id", id); set("company_name", c?.name || "");
            }}>
            <option value="">— Genel —</option>
            {companies.map((c) => <option key={c.Id} value={c.Id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>Klasör</Label><Input value={v.folder || ""} onChange={(e) => set("folder", e.target.value)} placeholder="2026/Q1" /></div>
          <div className="grid gap-1.5"><Label>Boyut</Label><Input value={v.size || ""} onChange={(e) => set("size", e.target.value)} placeholder="2.4 MB" /></div>
        </div>
        <div className="grid gap-1.5"><Label>URL / Yol</Label><Input value={v.url || ""} onChange={(e) => set("url", e.target.value)} placeholder="https://… veya cihaz yolu" /></div>
        <div className="grid gap-1.5"><Label>Notlar</Label><Textarea rows={2} value={v.notes || ""} onChange={(e) => set("notes", e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(v)} disabled={submitting || !v.name?.trim()}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> …</> : "Kaydet"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
