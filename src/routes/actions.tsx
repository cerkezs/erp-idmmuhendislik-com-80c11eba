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
  listTasks, createTask, updateTask, deleteTask,
} from "@/lib/nocodb.functions";
import { ListChecks, Plus, Pencil, Trash2, Loader2, AlertCircle, Check } from "lucide-react";
import { ListToolbar } from "@/components/list-toolbar";
import { useListFilter, useFilteredList } from "@/hooks/use-list-filter";
import { useMe } from "@/hooks/use-me";
import { crudToast, errorToast } from "@/lib/toast";

export const Route = createFileRoute("/actions")({
  head: () => ({ meta: [{ title: "Aksiyon & Görev — IDM ERP" }] }),
  component: TasksPage,
});

type Task = {
  Id: number; date?: string; title?: string; description?: string;
  status?: string; priority?: string; assignee?: string;
  due_date?: string; related_type?: string; related_id?: number | null;
};

const STATUS = ["Açık", "Devam", "Tamamlandı", "İptal"];
const PRIO = ["Düşük", "Normal", "Yüksek", "Acil"];
const PRIO_COLOR: Record<string, string> = {
  "Düşük": "bg-muted text-muted-foreground",
  "Normal": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Yüksek": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Acil": "bg-destructive/10 text-destructive",
};

function TasksPage() {
  const qc = useQueryClient();
  const list = useServerFn(listTasks);
  const create = useServerFn(createTask);
  const update = useServerFn(updateTask);
  const remove = useServerFn(deleteTask);

  const { data, isLoading, error } = useQuery({ queryKey: ["tasks"], queryFn: () => list() });

  const { canWrite, canDelete } = useMe();
  const createMut = useMutation({
    mutationFn: (d: Omit<Task, "Id">) => create({ data: d }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); crudToast("create", "Görev"); },
    onError: (e) => errorToast(e),
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: number; patch: Partial<Task> }) => update({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e) => errorToast(e),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); crudToast("delete", "Görev"); },
    onError: (e) => errorToast(e),
  });

  const [editing, setEditing] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);

  const all = (data || []) as Task[];
  const counts = {
    open: all.filter((t) => t.status === "Açık").length,
    progress: all.filter((t) => t.status === "Devam").length,
    done: all.filter((t) => t.status === "Tamamlandı").length,
  };

  const { filters, setFilters } = useListFilter({ initialSortKey: "due_date", initialSortDir: "asc" });
  const rows = useFilteredList<Task>(all, filters, {
    searchKeys: ["title", "description", "assignee"],
    statusKey: "status",
    categoryKey: "priority",
    dateKey: "due_date",
  });

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <ListChecks className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Aksiyon & Görev</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{counts.open}</span> açık ·{" "}
              <span className="font-medium text-foreground">{counts.progress}</span> devam ·{" "}
              <span className="font-medium text-foreground">{counts.done}</span> tamam
            </p>
          </div>
        </div>
        {canWrite && (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Yeni Görev</Button></DialogTrigger>
          <TaskForm initial={editing}
            onSubmit={async (vals) => {
              if (editing) await updateMut.mutateAsync({ id: editing.Id, patch: vals });
              else await createMut.mutateAsync(vals);
              setOpen(false); setEditing(null);
            }}
            submitting={createMut.isPending || updateMut.isPending}
          />
        </Dialog>
        )}
      </div>

      <ListToolbar
        filters={filters}
        setFilters={setFilters}
        placeholder="Ara: başlık, açıklama, atanan…"
        statusOptions={STATUS.map((s) => ({ value: s, label: s }))}
        categoryOptions={PRIO.map((p) => ({ value: p, label: p }))}
        showDates
        sortOptions={[
          { value: "due_date-asc", key: "due_date", dir: "asc", label: "Son tarih (yakın)" },
          { value: "due_date-desc", key: "due_date", dir: "desc", label: "Son tarih (uzak)" },
          { value: "priority-desc", key: "priority", dir: "desc", label: "Öncelik" },
          { value: "title-asc", key: "title", dir: "asc", label: "Başlık (A→Z)" },
        ]}
        totalCount={all.length}
        filteredCount={rows.length}
      />

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

      <div className="space-y-2">
        {isLoading && <div className="p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {!isLoading && rows.length === 0 && <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{all.length === 0 ? "Görev yok." : "Filtreyle eşleşen görev yok."}</div>}
        {rows.map((t) => {
          const done = t.status === "Tamamlandı";
          const overdue = t.due_date && !done && t.due_date < new Date().toISOString().slice(0, 10);
          return (
            <div key={t.Id} className={`flex items-start gap-3 rounded-lg border bg-card p-3 ${done ? "opacity-60" : ""} ${overdue ? "border-destructive/50" : "border-border"}`}>
              <button className="mt-0.5 grid h-5 w-5 place-items-center rounded border border-border hover:bg-muted"
                disabled={!canWrite}
                onClick={() => updateMut.mutate({ id: t.Id, patch: { status: done ? "Açık" : "Tamamlandı" } })}>
                {done && <Check className="h-3 w-3" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${PRIO_COLOR[t.priority || "Normal"]}`}>{t.priority}</span>
                  <span className={`font-medium ${done ? "line-through" : ""}`}>{t.title}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{t.status}</span>
                  {t.assignee && <span className="text-xs text-muted-foreground">· {t.assignee}</span>}
                  {t.due_date && <span className={`text-xs ${overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>· son: {t.due_date}</span>}
                </div>
                {t.description && <div className="mt-1 text-sm text-muted-foreground">{t.description}</div>}
              </div>
              {canWrite && <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>}
              {canDelete && <Button variant="ghost" size="sm" onClick={() => { if (confirm("Sil?")) deleteMut.mutate(t.Id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function TaskForm({ initial, onSubmit, submitting }: {
  initial: Task | null;
  onSubmit: (v: Omit<Task, "Id">) => void | Promise<void>;
  submitting: boolean;
}) {
  const [v, setV] = useState<Omit<Task, "Id">>({
    date: initial?.date || new Date().toISOString(),
    title: initial?.title || "",
    description: initial?.description || "",
    status: initial?.status || "Açık",
    priority: initial?.priority || "Normal",
    assignee: initial?.assignee || "",
    due_date: initial?.due_date || "",
    related_type: initial?.related_type || "",
    related_id: initial?.related_id ?? null,
  });
  function set<K extends keyof typeof v>(k: K, val: (typeof v)[K]) { setV((p) => ({ ...p, [k]: val })); }
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{initial ? "Görev Düzenle" : "Yeni Görev"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5"><Label>Başlık *</Label><Input value={v.title || ""} onChange={(e) => set("title", e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>Açıklama</Label><Textarea rows={3} value={v.description || ""} onChange={(e) => set("description", e.target.value)} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5"><Label>Durum</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={v.status} onChange={(e) => set("status", e.target.value)}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <div className="grid gap-1.5"><Label>Öncelik</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={v.priority} onChange={(e) => set("priority", e.target.value)}>{PRIO.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <div className="grid gap-1.5"><Label>Son Tarih</Label><Input type="date" value={v.due_date || ""} onChange={(e) => set("due_date", e.target.value)} /></div>
        </div>
        <div className="grid gap-1.5"><Label>Atanan</Label><Input value={v.assignee || ""} onChange={(e) => set("assignee", e.target.value)} placeholder="Yusuf K." /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(v)} disabled={submitting || !v.title?.trim()}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> …</> : "Kaydet"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
