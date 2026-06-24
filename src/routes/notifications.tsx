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
  listNotifications, createNotification, markNotificationRead, deleteNotification,
} from "@/lib/nocodb.functions";
import { Bell, Plus, Trash2, Loader2, AlertCircle, Check, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Bildirimler — IDM ERP" }] }),
  component: NotificationsPage,
});

type Notification = {
  Id: number; date?: string; type?: string; title?: string;
  message?: string; link?: string; read?: boolean; user?: string;
};

const TYPES = [
  { value: "info", label: "Bilgi", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { value: "warning", label: "Uyarı", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { value: "success", label: "Başarı", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { value: "error", label: "Hata", color: "bg-destructive/10 text-destructive" },
];

function NotificationsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listNotifications);
  const create = useServerFn(createNotification);
  const mark = useServerFn(markNotificationRead);
  const remove = useServerFn(deleteNotification);

  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => list(),
  });

  const createMut = useMutation({
    mutationFn: (d: Omit<Notification, "Id">) => create({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markMut = useMutation({
    mutationFn: (v: { id: number; read: boolean }) => mark({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const [open, setOpen] = useState(false);
  const rows = ((data || []) as Notification[]).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const unread = rows.filter((r) => !r.read).length;

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Bildirimler</h1>
            <p className="text-sm text-muted-foreground">
              {unread > 0 ? <><span className="font-medium text-foreground">{unread}</span> okunmamış</> : "Tüm bildirimler okundu"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <Button variant="outline" onClick={() => {
              rows.filter((r) => !r.read).forEach((r) => markMut.mutate({ id: r.Id, read: true }));
            }}>
              <CheckCheck className="mr-2 h-4 w-4" /> Tümünü okundu yap
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Yeni Bildirim</Button>
            </DialogTrigger>
            <NotificationForm
              onSubmit={async (vals) => { await createMut.mutateAsync(vals); setOpen(false); }}
              submitting={createMut.isPending}
            />
          </Dialog>
        </div>
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

      <div className="space-y-2">
        {isLoading && (
          <div className="p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        )}
        {!isLoading && rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Henüz bildirim yok.
          </div>
        )}
        {rows.map((n) => {
          const t = TYPES.find((x) => x.value === n.type) || TYPES[0];
          return (
            <div key={n.Id} className={`flex items-start gap-3 rounded-lg border border-border bg-card p-4 ${!n.read ? "border-l-4 border-l-primary" : "opacity-80"}`}>
              <span className={`mt-0.5 inline-flex items-center rounded px-2 py-0.5 text-xs ${t.color}`}>
                {t.label}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.date?.slice(0, 16).replace("T", " ") || ""}</div>
                </div>
                {n.message && <div className="mt-1 text-sm text-muted-foreground">{n.message}</div>}
                {n.link && (
                  <a href={n.link} className="mt-1 inline-block text-xs text-primary hover:underline">
                    Detaya git →
                  </a>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {!n.read && (
                  <Button variant="ghost" size="sm" title="Okundu işaretle"
                    onClick={() => markMut.mutate({ id: n.Id, read: true })}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => {
                  if (confirm("Bildirim silinsin mi?")) deleteMut.mutate(n.Id);
                }}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function NotificationForm({ onSubmit, submitting }: {
  onSubmit: (vals: Omit<Notification, "Id">) => void | Promise<void>;
  submitting: boolean;
}) {
  const [vals, setVals] = useState<Omit<Notification, "Id">>({
    date: new Date().toISOString(),
    type: "info",
    title: "",
    message: "",
    link: "",
    read: false,
    user: "",
  });
  function set<K extends keyof typeof vals>(k: K, v: (typeof vals)[K]) {
    setVals((p) => ({ ...p, [k]: v }));
  }
  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Yeni Bildirim</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label>Tür</Label>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={vals.type || "info"} onChange={(e) => set("type", e.target.value)}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label>Başlık *</Label>
          <Input value={vals.title || ""} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Mesaj</Label>
          <Textarea rows={3} value={vals.message || ""} onChange={(e) => set("message", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Link (opsiyonel)</Label>
          <Input value={vals.link || ""} onChange={(e) => set("link", e.target.value)} placeholder="/invoices/123" />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(vals)} disabled={submitting || !vals.title?.trim()}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor…</> : "Oluştur"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
