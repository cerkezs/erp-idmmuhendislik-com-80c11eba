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
  listCompanies, listProducts, completeProduction,
} from "@/lib/nocodb.functions";
import { Factory, Plus, Pencil, Trash2, Loader2, AlertCircle, ChevronDown, ChevronRight, Search, X, ArrowUp, ArrowDown, ArrowUpDown, CheckCircle2 } from "lucide-react";

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

const STATUS_STYLE: Record<string, { row: string; badge: string }> = {
  "Planlandı":   { row: "border-l-4 border-l-blue-500",   badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  "Üretimde":    { row: "border-l-4 border-l-amber-500",  badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  "Beklemede":   { row: "border-l-4 border-l-slate-400",  badge: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
  "Tamamlandı":  { row: "border-l-4 border-l-emerald-500",badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  "İptal":       { row: "border-l-4 border-l-red-500",    badge: "bg-red-500/15 text-red-600 dark:text-red-400" },
};

type SortKey = "start_date" | "number" | "company_name" | "total_cost" | "qty";
type SortDir = "asc" | "desc";

type Filters = {
  q: string;
  statuses: string[]; // empty = all
  company: string;   // company_name; "" = all
  from: string;
  to: string;
  sortKey: SortKey;
  sortDir: SortDir;
};

const emptyFilters = (sortKey: SortKey = "start_date", sortDir: SortDir = "desc"): Filters => ({
  q: "", statuses: [], company: "", from: "", to: "", sortKey, sortDir,
});

function applyFilters(rows: Production[], f: Filters): Production[] {
  const q = f.q.trim().toLowerCase();
  let out = rows.filter((p) => {
    if (q) {
      const hay = `${p.number || ""} ${p.company_name || ""} ${p.product_name || ""} ${p.notes || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.statuses.length && !f.statuses.includes(p.status || "")) return false;
    if (f.company && (p.company_name || "") !== f.company) return false;
    if (f.from && (p.start_date || "") < f.from) return false;
    if (f.to && (p.start_date || "") > f.to) return false;
    return true;
  });
  const dir = f.sortDir === "asc" ? 1 : -1;
  out = [...out].sort((a, b) => {
    const av = a[f.sortKey] ?? "";
    const bv = b[f.sortKey] ?? "";
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv), "tr") * dir;
  });
  return out;
}

function activeFilterCount(f: Filters, includeStatuses: boolean) {
  let n = 0;
  if (f.q) n++;
  if (includeStatuses && f.statuses.length) n++;
  if (f.company) n++;
  if (f.from) n++;
  if (f.to) n++;
  return n;
}

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
  const completeFn = useServerFn(completeProduction);
  const completeMut = useMutation({
    mutationFn: (id: number) => completeFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["productions"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (e) => alert("Hata: " + (e as Error).message),
  });

  const [editing, setEditing] = useState<Production | null>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [activeFilters, setActiveFilters] = useState<Filters>(emptyFilters("start_date", "desc"));
  const [doneFilters, setDoneFilters] = useState<Filters>(emptyFilters("start_date", "desc"));
  const [doneOpen, setDoneOpen] = useState(false);

  const rows = (data || []) as Production[];
  const activeRows = rows.filter((r) => (r.status || "") !== "Tamamlandı");
  const doneRows = rows.filter((r) => (r.status || "") === "Tamamlandı");

  const filteredActive = applyFilters(activeRows, activeFilters);
  const filteredDone = applyFilters(doneRows, doneFilters);

  const companyNames = Array.from(new Set(rows.map((r) => r.company_name).filter(Boolean) as string[])).sort();

  const toggleExpand = (id: number) => {
    const s = new Set(expanded);
    if (s.has(id)) s.delete(id); else s.add(id);
    setExpanded(s);
  };

  const renderRow = (p: Production) => {
    const isOpen = expanded.has(p.Id);
    const style = STATUS_STYLE[p.status || ""] || { row: "", badge: "bg-muted" };
    return (
      <Fragment key={p.Id}>
        <tr className={`border-t border-border hover:bg-muted/20 ${style.row}`}>
          <td className="pl-2">
            <button onClick={() => toggleExpand(p.Id)}>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </td>
          <td className="px-3 py-2 font-medium">{p.number || `#${p.Id}`}</td>
          <td className="px-3 py-2">{p.company_name || "—"}</td>
          <td className="px-3 py-2">{p.product_name || "—"}</td>
          <td className="px-3 py-2 text-right">{p.qty ?? 0}</td>
          <td className="px-3 py-2 text-muted-foreground">{p.start_date || "—"}</td>
          <td className="px-3 py-2">
            <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${style.badge}`}>{p.status || "—"}</span>
          </td>
          <td className="px-3 py-2 text-right tabular-nums">{(p.total_cost ?? 0).toLocaleString("tr-TR")} ₺</td>
          <td className="px-3 py-2 text-right whitespace-nowrap">
            {p.status !== "Tamamlandı" && p.status !== "İptal" && (
              <Button variant="ghost" size="sm" title="Tamamla (stoğa ekle)"
                disabled={completeMut.isPending}
                onClick={() => {
                  if (confirm(`"${p.number || p.Id}" tamamlandı olarak işaretlensin ve ${p.qty || 0} adet ürün stoğa eklensin mi?`)) completeMut.mutate(p.Id);
                }}>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="sm" onClick={() => { if (confirm("Emir silinsin mi?")) deleteMut.mutate(p.Id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </td>
        </tr>
        {isOpen && (
          <tr className="bg-muted/20">
            <td></td>
            <td colSpan={8} className="px-3 py-3">
              <StagesPanel productionId={p.Id} currentTotal={p.total_cost || 0} companies={(companies as Array<{ Id: number; name: string }>) || []} onTotalChange={(t) => {
                if (Math.abs((p.total_cost || 0) - t) > 0.01) updateMut.mutate({ id: p.Id, patch: { total_cost: t } });
              }} />
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  const SortHeader = ({ label, k, filters, setFilters, align = "left" }: {
    label: string; k: SortKey; filters: Filters; setFilters: (f: Filters) => void; align?: "left" | "right";
  }) => {
    const active = filters.sortKey === k;
    const Icon = !active ? ArrowUpDown : filters.sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th className={`px-3 py-2 ${align === "right" ? "text-right" : "text-left"}`}>
        <button
          className="inline-flex items-center gap-1 hover:text-foreground"
          onClick={() => setFilters({ ...filters, sortKey: k, sortDir: active && filters.sortDir === "asc" ? "desc" : "asc" })}
        >
          {label} <Icon className="h-3 w-3" />
        </button>
      </th>
    );
  };

  const renderTable = (list: Production[], filters: Filters, setFilters: (f: Filters) => void, emptyText: string) => (
    <table className="w-full text-sm">
      <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
        <tr>
          <th className="w-8"></th>
          <SortHeader label="No" k="number" filters={filters} setFilters={setFilters} />
          <SortHeader label="Firma" k="company_name" filters={filters} setFilters={setFilters} />
          <th className="px-3 py-2 text-left">Ürün</th>
          <SortHeader label="Miktar" k="qty" filters={filters} setFilters={setFilters} align="right" />
          <SortHeader label="Başlangıç" k="start_date" filters={filters} setFilters={setFilters} />
          <th className="px-3 py-2 text-left">Durum</th>
          <SortHeader label="Maliyet" k="total_cost" filters={filters} setFilters={setFilters} align="right" />
          <th className="px-3 py-2 text-right">İşlem</th>
        </tr>
      </thead>
      <tbody>
        {list.length === 0 && <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">{emptyText}</td></tr>}
        {list.map(renderRow)}
      </tbody>
    </table>
  );

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <Factory className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Üretim Emirleri</h1>
            <p className="text-sm text-muted-foreground">{activeRows.length} aktif · {doneRows.length} tamamlandı</p>
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

      {/* Aktif emirler */}
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Aktif Emirler <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">{filteredActive.length}/{activeRows.length}</span>
          </h2>
        </div>
        <ListToolbar
          filters={activeFilters}
          setFilters={setActiveFilters}
          companies={companyNames}
          statusOptions={STATUS.filter((s) => s !== "Tamamlandı")}
        />
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {isLoading
            ? <div className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
            : renderTable(filteredActive, activeFilters, setActiveFilters, activeRows.length === 0 ? "Henüz üretim emri yok." : "Filtreyle eşleşen emir yok.")}
        </div>
      </section>

      {/* Tamamlanan emirler */}
      <section>
        <button
          onClick={() => setDoneOpen((v) => !v)}
          className="mb-2 flex w-full items-center justify-between rounded-md px-1 py-1 text-left hover:bg-muted/30"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-2">
            {doneOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Tamamlanan Emirler
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">{doneRows.length}</span>
          </h2>
        </button>
        {doneOpen && (
          <>
            <ListToolbar
              filters={doneFilters}
              setFilters={setDoneFilters}
              companies={companyNames}
              statusOptions={[]}
            />
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {renderTable(filteredDone, doneFilters, setDoneFilters, doneRows.length === 0 ? "Henüz tamamlanan emir yok." : "Filtreyle eşleşen emir yok.")}
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}

function ListToolbar({ filters, setFilters, companies, statusOptions }: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  companies: string[];
  statusOptions: string[];
}) {
  const count = activeFilterCount(filters, statusOptions.length > 0);
  return (
    <div className="mb-2 rounded-lg border border-border bg-card p-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder="No, firma, ürün, not…"
            className="h-9 pl-7"
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={filters.company}
          onChange={(e) => setFilters({ ...filters, company: e.target.value })}
        >
          <option value="">Tüm firmalar</option>
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          className="h-9 w-[140px]"
          title="Başlangıç (şundan)"
        />
        <Input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          className="h-9 w-[140px]"
          title="Başlangıç (şuna)"
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={`${filters.sortKey}:${filters.sortDir}`}
          onChange={(e) => {
            const [k, d] = e.target.value.split(":") as [SortKey, SortDir];
            setFilters({ ...filters, sortKey: k, sortDir: d });
          }}
        >
          <option value="start_date:desc">Tarih (yeni→eski)</option>
          <option value="start_date:asc">Tarih (eski→yeni)</option>
          <option value="number:asc">Emir No (A→Z)</option>
          <option value="number:desc">Emir No (Z→A)</option>
          <option value="company_name:asc">Firma (A→Z)</option>
          <option value="total_cost:desc">Maliyet (yüksek→düşük)</option>
          <option value="total_cost:asc">Maliyet (düşük→yüksek)</option>
          <option value="qty:desc">Miktar (yüksek→düşük)</option>
        </select>
        {count > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => setFilters({ ...emptyFilters(filters.sortKey, filters.sortDir) })}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Temizle ({count})
          </Button>
        )}
      </div>
      {statusOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Durum:</span>
          {statusOptions.map((s) => {
            const on = filters.statuses.includes(s);
            const sty = STATUS_STYLE[s]?.badge || "bg-muted";
            return (
              <button
                key={s}
                onClick={() => setFilters({
                  ...filters,
                  statuses: on ? filters.statuses.filter((x) => x !== s) : [...filters.statuses, s],
                })}
                className={`rounded px-2 py-0.5 text-xs transition ${on ? sty : "bg-muted/40 text-muted-foreground hover:bg-muted"}`}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StagesPanel({ productionId, currentTotal, companies, onTotalChange }: {
  productionId: number;
  currentTotal: number;
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
  useEffect(() => {
    if (data && Math.abs(currentTotal - total) > 0.01) onTotalChange(total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, data]);


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
