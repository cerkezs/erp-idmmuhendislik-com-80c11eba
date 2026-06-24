import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { listUsers, createUser, updateUser, deleteUser } from "@/lib/nocodb.functions";
import { Users, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/settings_/kullanicilar")({
  head: () => ({ meta: [{ title: "Kullanıcılar — Ayarlar" }] }),
  component: KullanicilarPage,
});

type U = { Id: number; name?: string; email?: string; role?: string; active?: boolean; notes?: string };
type Role = "admin" | "operator" | "viewer";

function KullanicilarPage() {
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const update = useServerFn(updateUser);
  const remove = useServerFn(deleteUser);

  const q = useQuery({ queryKey: ["users"], queryFn: () => list() });
  const items = (q.data || []) as U[];

  const createMut = useMutation({
    mutationFn: (d: Omit<U, "Id">) => create({ data: d as { name: string; email: string; role: Role; active: boolean; notes: string } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: number; patch: Partial<U> }) => update({ data: v as { id: number; patch: Partial<{ name: string; email: string; role: Role; active: boolean; notes: string }> } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const [editing, setEditing] = useState<U | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Kullanıcılar & Roller</h1>
              <p className="text-sm text-muted-foreground">Sistemi kullanan kişiler ve yetki düzeyleri.</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Yeni Kullanıcı</Button></DialogTrigger>
            <UserForm
              initial={editing}
              submitting={createMut.isPending || updateMut.isPending}
              onSubmit={async (vals) => {
                if (editing) await updateMut.mutateAsync({ id: editing.Id, patch: vals });
                else await createMut.mutateAsync(vals);
                setOpen(false); setEditing(null);
              }}
            />
          </Dialog>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">Ad</th><th className="px-3 py-2 text-left">E-posta</th><th className="px-3 py-2">Rol</th><th className="px-3 py-2">Aktif</th><th className="px-3 py-2 text-right">İşlem</th></tr>
            </thead>
            <tbody>
              {q.isLoading && <tr><td colSpan={5} className="px-3 py-8 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>}
              {!q.isLoading && items.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Henüz kayıt yok.</td></tr>}
              {items.map((u) => (
                <tr key={u.Id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{u.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{u.email || "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{u.role || "operator"}</span>
                  </td>
                  <td className="px-3 py-2 text-center">{u.active === false ? "—" : "✓"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(u); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm(`"${u.name}" silinsin mi?`)) deleteMut.mutate(u.Id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Not: Şu an şifre / oturum açma yok — yalnızca kayıt amaçlıdır. İleride Lovable Cloud ile gerçek kimlik doğrulama eklenebilir.</p>
      </div>
    </AppShell>
  );
}

function UserForm({ initial, onSubmit, submitting }: {
  initial: U | null;
  onSubmit: (vals: { name: string; email: string; role: Role; active: boolean; notes: string }) => void | Promise<void>;
  submitting: boolean;
}) {
  const [vals, setVals] = useState({
    name: initial?.name || "",
    email: initial?.email || "",
    role: (initial?.role || "operator") as Role,
    active: initial?.active ?? true,
    notes: initial?.notes || "",
  });
  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{initial ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5"><Label>Ad *</Label><Input value={vals.name} onChange={(e) => setVals({ ...vals, name: e.target.value })} /></div>
        <div className="grid gap-1.5"><Label>E-posta</Label><Input type="email" value={vals.email} onChange={(e) => setVals({ ...vals, email: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Rol</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={vals.role} onChange={(e) => setVals({ ...vals, role: e.target.value as Role })}>
              <option value="admin">admin</option>
              <option value="operator">operator</option>
              <option value="viewer">viewer</option>
            </select>
          </div>
          <div className="flex items-end gap-2"><input type="checkbox" checked={vals.active} onChange={(e) => setVals({ ...vals, active: e.target.checked })} /> <Label>Aktif</Label></div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(vals)} disabled={submitting || !vals.name.trim()}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor…</> : "Kaydet"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
