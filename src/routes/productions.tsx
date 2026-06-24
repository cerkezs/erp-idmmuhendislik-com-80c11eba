import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  listProductions, createProduction, updateProduction, deleteProduction,
  listStages, createStage, updateStage, deleteStage,
  listCompanies, listProducts,
} from "@/lib/nocodb.functions";
import { Factory, Plus, Pencil, Trash2, Loader2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/productions")({
  head: () => ({ meta: [{ title: "Üretim — IDM ERP" }] }),
  component: ProductionsPage,
});

type Production = {
  Id: number; number?: string; company_id?: number | null; company_name?: string;
  product_id?: number | null; product_name?: string; qty?: number;
  start_date?: string; end_date?: string; status?: string; total_cost?: number; notes?: string;
};
type Stage = {
  Id: number; production_id: number; name?: string; company_id?: number | null;
  company_name?: string; cost?: number; currency?: string;
  start_date?: string; end_date?: string; status?: string; notes?: string;
};

const STATUS = ["Planlandı", "Üretimde", "Beklemede", "Tamamlandı", "İptal"];
const STAGE_STATUS = ["Beklemede", "Devam", "Tamamlandı"];

function ProductionsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listProductions);
  const create = useServerFn(createProduction);
  const update = useServerFn(updateProduction);
  const remove = useServerFn(deleteProduction);
  const listCo = useServerFn(listCompanies);
  const listPr = useServerFn(listProducts);

  const { data, isLoading, error } = useQuery({ queryKey: ["productions"], queryFn: () => list() });
  const { data: companies } = useQuery({ queryKey: ["companies"], queryFn: () => listCo() });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => listPr() });

  const createMut = useMutation({
    mutationFn: (d: Omit<Production, "Id">) => create({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["productions"] }),
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: number; patch: Partial<Production> }) => update({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["productions"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["productions"] }),
  });

  const [editing, setEditing] = useState<Production | null>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const rows = (data || []) as Production[];

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <Factory className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Üretim Emirleri</h1>
            <p className="text-sm text-muted-foreground">{rows.length} emir · aşama detayı için satırı genişletin</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Yeni Emir</Button>
          </DialogTrigger>
          <ProductionForm
            initial={editing}
            companies={(companies as Array<{ Id: number; name: string }>) || []}
            products={(products as Array<{ Id: number; name: string }>) || []}
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
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <div className="font-medium text-destructive">Yüklenemedi</div>
              <pre className="mt-1 whitespace-pre-wrap text-xs">{(error as Error).message}</pre>
              <p className="mt-2 text-xs">Tablo eksikse <Link to="/setup" className="underline">/setup</Link>.</p>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-8"></th>
              <th className="px-3 py-2 text-left">No</th>
              <th className="px-3 py-2 text-left">Firma</th>
              <th className="px-3 py-2 text-left">Ürün</th>
              <th className="px-3 py-2 text-right">Miktar</th>
              <th className="px-3 py-2 text-left">Başlangıç</th>
              <th className="px-3 py-2 text-left">Durum</th>
              <th className="px-3 py-2 text-right">Maliyet</th>
              <th className="px-3 py-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">Henüz üretim emri yok.</td></tr>}
            {rows.map((p) => {
              const isOpen = expanded.has(p.Id);
              return (
                <>
                  <tr key={p.Id} className="border-t border-border hover:bg-muted/20">
                    <td className="pl-2">
                      <button onClick={() => {
                        const s = new Set(expanded);
                        if (s.has(p.Id)) s.delete(p.Id); else s.add(p.Id);
                        setExpanded(s);
                      }}>
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-medium">{p.number || `#${p.Id}`}</td>
                    <td className="px-3 py-2">{p.company_name || "—"}</td>
                    <td className="px-3 py-2">{p.product_name || "—"}</td>
                    <td className="px-3 py-2 text-right">{p.qty ?? 0}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.start_date || "—"}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs">{p.status || "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{(p.total_cost ?? 0).toLocaleString("tr-TR")} ₺</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm("Emir silinsin mi?")) deleteMut.mutate(p.Id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-muted/20">
                      <td></td>
                      <td colSpan={8} className="px-3 py-3">
                        <StagesPanel productionId={p.Id} companies={(companies as Array<{ Id: number; name: string }>) || []} onTotalChange={(t) => {
                          if (Math.abs((p.total_cost || 0) - t) > 0.01) updateMut.mutate({ id: p.Id, patch: { total_cost: t } });
                        }} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function StagesPanel({ productionId, companies, onTotalChange }: {
  productionId: number;
  companies: Array<{ Id: number; name: string }>;
  onTotalChange: (total: number) => void;
}) {
  const qc = useQueryClient();
  const list = useServerFn(listStages);
  const create = useServerFn(createStage);
  const update = useServerFn(updateStage);
  const remove = useServerFn(deleteStage);

  const { data } = useQuery({
    queryKey: ["stages", productionId],
    queryFn: () => list({ data: { production_id: productionId } }),
  });

  const createMut = useMutation({
    mutationFn: (d: Omit<Stage, "Id">) => create({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stages", productionId] }),
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: number; patch: Partial<Stage> }) => update({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stages", productionId] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stages", productionId] }),
  });

  const stages = (data || []) as Stage[];
  const total = stages.reduce((s, x) => s + (x.cost || 0), 0);
  if (Math.abs(total - 0) >= 0 && stages.length > 0) onTotalChange(total);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Stage | null>(null);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Aşamalar · Toplam: {total.toLocaleString("tr-TR")} ₺</div>
        <Dialog open={openForm} onOpenChange={(o) => { setOpenForm(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="mr-1 h-3 w-3" /> Aşama</Button></DialogTrigger>
          <StageForm initial={editing} productionId={productionId} companies={companies}
            onSubmit={async (vals) => {
              if (editing) await updateMut.mutateAsync({ id: editing.Id, patch: vals });
              else await createMut.mutateAsync(vals);
              setOpenForm(false); setEditing(null);
            }}
            submitting={createMut.isPending || updateMut.isPending}
          />
        </Dialog>
      </div>
      <div className="space-y-1">
        {stages.length === 0 && <div className="text-xs text-muted-foreground">Henüz aşama yok.</div>}
        {stages.map((s) => (
          <div key={s.Id} className="flex items-center gap-2 rounded border border-border bg-background px-2 py-1.5 text-xs">
            <span className="rounded bg-muted px-1.5 py-0.5">{s.status}</span>
            <span className="font-medium">{s.name}</span>
            <span className="text-muted-foreground">· {s.company_name || "—"}</span>
            <span className="ml-auto tabular-nums">{(s.cost || 0).toLocaleString("tr-TR")} {s.currency}</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditing(s); setOpenForm(true); }}><Pencil className="h-3 w-3" /></Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { if (confirm("Sil?")) deleteMut.mutate(s.Id); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductionForm({ initial, companies, products, onSubmit, submitting }: {
  initial: Production | null;
  companies: Array<{ Id: number; name: string }>;
  products: Array<{ Id: number; name: string }>;
  onSubmit: (v: Omit<Production, "Id">) => void | Promise<void>;
  submitting: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState<Omit<Production, "Id">>({
    number: initial?.number || "",
    company_id: initial?.company_id ?? null,
    company_name: initial?.company_name || "",
    product_id: initial?.product_id ?? null,
    product_name: initial?.product_name || "",
    qty: initial?.qty ?? 1,
    start_date: initial?.start_date || today,
    end_date: initial?.end_date || "",
    status: initial?.status || "Planlandı",
    total_cost: initial?.total_cost ?? 0,
    notes: initial?.notes || "",
  });
  function set<K extends keyof typeof v>(k: K, val: (typeof v)[K]) { setV((p) => ({ ...p, [k]: val })); }
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{initial ? "Üretim Emri Düzenle" : "Yeni Üretim Emri"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Emir No</Label>
            <Input value={v.number || ""} onChange={(e) => set("number", e.target.value)} placeholder="UE-2026-001" />
          </div>
          <div className="grid gap-1.5">
            <Label>Durum</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={v.status} onChange={(e) => set("status", e.target.value)}>
              {STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Firma</Label>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={v.company_id ?? ""} onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              const c = companies.find((x) => x.Id === id);
              set("company_id", id); set("company_name", c?.name || "");
            }}>
            <option value="">— Seç —</option>
            {companies.map((c) => <option key={c.Id} value={c.Id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5 col-span-2">
            <Label>Ürün</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={v.product_id ?? ""} onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                const p = products.find((x) => x.Id === id);
                set("product_id", id); set("product_name", p?.name || "");
              }}>
              <option value="">— Seç —</option>
              {products.map((p) => <option key={p.Id} value={p.Id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>Miktar</Label>
            <Input type="number" step="0.01" value={v.qty ?? 0} onChange={(e) => set("qty", parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Başlangıç</Label>
            <Input type="date" value={v.start_date || ""} onChange={(e) => set("start_date", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Bitiş</Label>
            <Input type="date" value={v.end_date || ""} onChange={(e) => set("end_date", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Notlar</Label>
          <Textarea rows={2} value={v.notes || ""} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(v)} disabled={submitting}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor…</> : "Kaydet"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function StageForm({ initial, productionId, companies, onSubmit, submitting }: {
  initial: Stage | null;
  productionId: number;
  companies: Array<{ Id: number; name: string }>;
  onSubmit: (v: Omit<Stage, "Id">) => void | Promise<void>;
  submitting: boolean;
}) {
  const [v, setV] = useState<Omit<Stage, "Id">>({
    production_id: productionId,
    name: initial?.name || "",
    company_id: initial?.company_id ?? null,
    company_name: initial?.company_name || "",
    cost: initial?.cost ?? 0,
    currency: initial?.currency || "TRY",
    start_date: initial?.start_date || "",
    end_date: initial?.end_date || "",
    status: initial?.status || "Beklemede",
    notes: initial?.notes || "",
  });
  function set<K extends keyof typeof v>(k: K, val: (typeof v)[K]) { setV((p) => ({ ...p, [k]: val })); }
  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{initial ? "Aşama Düzenle" : "Yeni Aşama"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label>Aşama Adı *</Label>
          <Input value={v.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Kesim, Boya, Montaj…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Tedarikçi</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={v.company_id ?? ""} onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                const c = companies.find((x) => x.Id === id);
                set("company_id", id); set("company_name", c?.name || "");
              }}>
              <option value="">— Yok —</option>
              {companies.map((c) => <option key={c.Id} value={c.Id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>Durum</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={v.status} onChange={(e) => set("status", e.target.value)}>
              {STAGE_STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Maliyet</Label>
            <Input type="number" step="0.01" value={v.cost ?? 0} onChange={(e) => set("cost", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Döviz</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={v.currency} onChange={(e) => set("currency", e.target.value)}>
              <option>TRY</option><option>USD</option><option>EUR</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>Başlangıç</Label><Input type="date" value={v.start_date || ""} onChange={(e) => set("start_date", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Bitiş</Label><Input type="date" value={v.end_date || ""} onChange={(e) => set("end_date", e.target.value)} /></div>
        </div>
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
