import { createFileRoute } from "@tanstack/react-router";
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
import { getSmtpStatus, sendTestMail } from "@/lib/system.functions";
import { listMailAccounts, createMailAccount, updateMailAccount, deleteMailAccount } from "@/lib/nocodb.functions";
import { Mail, Send, Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/settings_/mail")({
  head: () => ({ meta: [{ title: "Mail & SMTP — Ayarlar" }] }),
  component: MailPage,
});

type MA = { Id: number; name?: string; from_address?: string; signature?: string; active?: boolean };

function MailPage() {
  const qc = useQueryClient();
  const status = useServerFn(getSmtpStatus);
  const sendTest = useServerFn(sendTestMail);
  const list = useServerFn(listMailAccounts);
  const create = useServerFn(createMailAccount);
  const update = useServerFn(updateMailAccount);
  const remove = useServerFn(deleteMailAccount);

  const statusQ = useQuery({ queryKey: ["smtp-status"], queryFn: () => status() });
  const accQ = useQuery({ queryKey: ["mail-accounts"], queryFn: () => list() });
  const accounts = (accQ.data || []) as MA[];

  const [to, setTo] = useState("");
  const [testMsg, setTestMsg] = useState<string>("");
  const testMut = useMutation({
    mutationFn: (email: string) => sendTest({ data: { to: email, subject: "IDM ERP Test", body: "Bu bir test mailidir." } }),
    onSuccess: (r) => setTestMsg(`✓ Gönderildi (id: ${r.messageId})`),
    onError: (e: Error) => setTestMsg(`✗ ${e.message}`),
  });

  const [editing, setEditing] = useState<MA | null>(null);
  const [open, setOpen] = useState(false);
  const createMut = useMutation({
    mutationFn: (d: Omit<MA, "Id">) => create({ data: d as { name: string; from_address: string; signature: string; active: boolean } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mail-accounts"] }),
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: number; patch: Partial<MA> }) => update({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mail-accounts"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mail-accounts"] }),
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary"><Mail className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold">Mail & SMTP</h1>
            <p className="text-sm text-muted-foreground">Sunucu SMTP yapılandırması ve ortak gönderici hesaplar.</p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="text-sm font-medium">SMTP Durumu</div>
            {statusQ.data?.configured ? (
              <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300"><CheckCircle2 className="h-3 w-3" /> Yapılandırılmış</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><AlertCircle className="h-3 w-3" /> Yapılandırılmamış</span>
            )}
          </div>
          {statusQ.data && (
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <Info label="Host" value={statusQ.data.host || "—"} />
              <Info label="Port" value={statusQ.data.port || "—"} />
              <Info label="Kullanıcı" value={statusQ.data.user || "—"} />
              <Info label="From" value={statusQ.data.from || "—"} />
            </div>
          )}
          {!statusQ.data?.configured && (
            <p className="mt-2 text-xs text-muted-foreground">
              Sunucu .env dosyasına <code className="rounded bg-muted px-1">SMTP_HOST</code>, <code className="rounded bg-muted px-1">SMTP_PORT</code>, <code className="rounded bg-muted px-1">SMTP_USER</code>, <code className="rounded bg-muted px-1">SMTP_PASS</code>, <code className="rounded bg-muted px-1">MAIL_FROM</code> eklenmelidir. (Komutları sohbette istersen veririm.)
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Test maili adresi</Label>
              <Input type="email" placeholder="test@example.com" value={to} onChange={(e) => setTo(e.target.value)} className="w-72" />
            </div>
            <Button onClick={() => testMut.mutate(to)} disabled={!to || testMut.isPending || !statusQ.data?.configured}>
              {testMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Test Gönder
            </Button>
            {testMsg && <div className="text-xs">{testMsg}</div>}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Ortak Gönderici Hesaplar</h2>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" /> Yeni</Button></DialogTrigger>
            <MailAccountForm
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
        <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">İsim</th><th className="px-3 py-2 text-left">From Adres</th><th className="px-3 py-2">Aktif</th><th className="px-3 py-2 text-right">İşlem</th></tr>
            </thead>
            <tbody>
              {accQ.isLoading && <tr><td colSpan={4} className="px-3 py-8 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>}
              {!accQ.isLoading && accounts.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Henüz hesap yok.</td></tr>}
              {accounts.map((a) => (
                <tr key={a.Id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{a.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.from_address || "—"}</td>
                  <td className="px-3 py-2 text-center">{a.active === false ? "—" : "✓"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm(`"${a.name}" silinsin mi?`)) deleteMut.mutate(a.Id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-xs">{value}</div>
    </div>
  );
}

function MailAccountForm({ initial, onSubmit, submitting }: {
  initial: MA | null;
  onSubmit: (vals: { name: string; from_address: string; signature: string; active: boolean }) => void | Promise<void>;
  submitting: boolean;
}) {
  const [vals, setVals] = useState({
    name: initial?.name || "",
    from_address: initial?.from_address || "",
    signature: initial?.signature || "",
    active: initial?.active ?? true,
  });
  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{initial ? "Hesap Düzenle" : "Yeni Hesap"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5"><Label>İsim *</Label><Input value={vals.name} onChange={(e) => setVals({ ...vals, name: e.target.value })} placeholder="Satış, Muhasebe..." /></div>
        <div className="grid gap-1.5"><Label>From Adres</Label><Input type="email" value={vals.from_address} onChange={(e) => setVals({ ...vals, from_address: e.target.value })} placeholder="satis@firma.com" /></div>
        <div className="grid gap-1.5"><Label>İmza</Label><Textarea rows={3} value={vals.signature} onChange={(e) => setVals({ ...vals, signature: e.target.value })} /></div>
        <div className="flex items-center gap-2"><input type="checkbox" checked={vals.active} onChange={(e) => setVals({ ...vals, active: e.target.checked })} /> <Label>Aktif</Label></div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(vals)} disabled={submitting || !vals.name.trim()}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor…</> : "Kaydet"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
