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
import {
  listMailAccounts, createMailAccount, updateMailAccount, deleteMailAccount,
} from "@/lib/nocodb.functions";
import {
  setMailAccountPassword, testMailAccount, getMailEncStatus,
} from "@/lib/mail.functions";
import { Mail, Send, Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertCircle, Star, KeyRound } from "lucide-react";

export const Route = createFileRoute("/settings_/mail")({
  head: () => ({ meta: [{ title: "Mail Hesapları — Ayarlar" }] }),
  component: MailPage,
});

type MA = {
  Id: number;
  name?: string;
  from_address?: string;
  signature?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_secure?: boolean;
  is_default?: boolean;
  active?: boolean;
  has_password?: boolean;
};

function MailPage() {
  const qc = useQueryClient();
  const list = useServerFn(listMailAccounts);
  const create = useServerFn(createMailAccount);
  const update = useServerFn(updateMailAccount);
  const remove = useServerFn(deleteMailAccount);
  const setPass = useServerFn(setMailAccountPassword);
  const test = useServerFn(testMailAccount);
  const encStatus = useServerFn(getMailEncStatus);

  const encQ = useQuery({ queryKey: ["mail-enc"], queryFn: () => encStatus() });
  const accQ = useQuery({ queryKey: ["mail-accounts"], queryFn: () => list() });
  const accounts = (accQ.data || []) as unknown as MA[];

  const [editing, setEditing] = useState<MA | null>(null);
  const [open, setOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<number, string>>({});

  const invalidate = () => qc.invalidateQueries({ queryKey: ["mail-accounts"] });

  const createMut = useMutation({
    mutationFn: async (vals: AccountFormVals) => {
      const { password, ...rest } = vals;
      const created = await create({ data: rest });
      if (password && created?.Id) {
        await setPass({ data: { id: created.Id as number, password } });
      }
      return created;
    },
    onSuccess: invalidate,
  });
  const updateMut = useMutation({
    mutationFn: async (v: { id: number; vals: AccountFormVals }) => {
      const { password, ...rest } = v.vals;
      await update({ data: { id: v.id, patch: rest } });
      if (password) await setPass({ data: { id: v.id, password } });
    },
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: invalidate,
  });
  const defaultMut = useMutation({
    mutationFn: async (id: number) => {
      // önce hepsini false yap, sonra seçileni true
      await Promise.all(
        accounts.filter((a) => a.is_default && a.Id !== id).map((a) =>
          update({ data: { id: a.Id, patch: { is_default: false } } }),
        ),
      );
      await update({ data: { id, patch: { is_default: true } } });
    },
    onSuccess: invalidate,
  });
  const testMut = useMutation({
    mutationFn: (id: number) => test({ data: { id } }),
    onSuccess: (r, id) => setTestStatus((s) => ({ ...s, [id]: `✓ Gönderildi → ${r.to}` })),
    onError: (e: Error, id) => setTestStatus((s) => ({ ...s, [id]: `✗ ${e.message}` })),
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary"><Mail className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold">Mail Hesapları</h1>
            <p className="text-sm text-muted-foreground">Birden fazla gönderici tanımlayın; mail atarken hangisinin kullanılacağını seçin.</p>
          </div>
        </div>

        {/* Şifreleme anahtarı uyarısı */}
        <div className="mt-4 rounded-lg border border-border bg-card p-3 text-sm">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Şifreleme anahtarı</span>
            {encQ.data?.configured ? (
              <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300"><CheckCircle2 className="h-3 w-3" /> Tanımlı</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><AlertCircle className="h-3 w-3" /> Eksik — şifreler kaydedilemez</span>
            )}
          </div>
          {!encQ.data?.configured && (
            <p className="mt-1 text-xs text-muted-foreground">
              Sunucu <code className="rounded bg-muted px-1">.env</code> dosyasına <code className="rounded bg-muted px-1">MAIL_ENC_KEY=&lt;32+ karakter&gt;</code> ekleyip uygulamayı yeniden başlatın.
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Gönderici Hesaplar ({accounts.length})</h2>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" /> Yeni Hesap</Button></DialogTrigger>
            <MailAccountForm
              initial={editing}
              submitting={createMut.isPending || updateMut.isPending}
              onSubmit={async (vals) => {
                if (editing) await updateMut.mutateAsync({ id: editing.Id, vals });
                else await createMut.mutateAsync(vals);
                setOpen(false); setEditing(null);
              }}
            />
          </Dialog>
        </div>

        <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">İsim / From</th>
                <th className="px-3 py-2 text-left">SMTP</th>
                <th className="px-3 py-2 text-center">Şifre</th>
                <th className="px-3 py-2 text-center">Varsayılan</th>
                <th className="px-3 py-2 text-center">Aktif</th>
                <th className="px-3 py-2 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {accQ.isLoading && <tr><td colSpan={6} className="px-3 py-8 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>}
              {!accQ.isLoading && accounts.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Henüz hesap yok. "Yeni Hesap" ile ekleyin.</td></tr>
              )}
              {accounts.map((a) => (
                <tr key={a.Id} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{a.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{a.from_address || "—"}</div>
                    {testStatus[a.Id] && <div className="mt-1 text-xs">{testStatus[a.Id]}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {a.smtp_host ? `${a.smtp_host}:${a.smtp_port || 587}${a.smtp_secure ? " (SSL)" : ""}` : "—"}
                    {a.smtp_user && <div>{a.smtp_user}</div>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {a.has_password
                      ? <span className="text-green-700 dark:text-green-300">•••</span>
                      : <span className="text-amber-700 dark:text-amber-300">yok</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {a.is_default
                      ? <Star className="mx-auto h-4 w-4 fill-amber-400 text-amber-500" />
                      : <Button variant="ghost" size="sm" onClick={() => defaultMut.mutate(a.Id)} title="Varsayılan yap">
                          <Star className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>}
                  </td>
                  <td className="px-3 py-2 text-center">{a.active === false ? "—" : "✓"}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => testMut.mutate(a.Id)} disabled={!a.has_password || !a.smtp_host || testMut.isPending} title="Test maili gönder">
                      {testMut.isPending && testMut.variables === a.Id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm(`"${a.name}" silinsin mi?`)) deleteMut.mutate(a.Id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong>İpucu:</strong> TürkTicaret hesaplarınız için SMTP host genellikle <code>mail.idmmuhendislik.com</code>, port <code>587</code> (TLS) ya da <code>465</code> (SSL) olur. Şifreler AES-256-GCM ile şifrelenip veritabanına yazılır; sunucu <code>.env</code>'inde yalnızca <code>MAIL_ENC_KEY</code> bulunur.
        </div>
      </div>
    </AppShell>
  );
}

type AccountFormVals = {
  name: string;
  from_address: string;
  signature: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_secure: boolean;
  is_default: boolean;
  active: boolean;
  password?: string;
};

function MailAccountForm({ initial, onSubmit, submitting }: {
  initial: MA | null;
  onSubmit: (vals: AccountFormVals) => void | Promise<void>;
  submitting: boolean;
}) {
  const [vals, setVals] = useState<AccountFormVals>({
    name: initial?.name || "",
    from_address: initial?.from_address || "",
    signature: initial?.signature || "",
    smtp_host: initial?.smtp_host || "mail.idmmuhendislik.com",
    smtp_port: initial?.smtp_port || 587,
    smtp_user: initial?.smtp_user || initial?.from_address || "",
    smtp_secure: initial?.smtp_secure ?? false,
    is_default: initial?.is_default ?? false,
    active: initial?.active ?? true,
    password: "",
  });
  const [changePw, setChangePw] = useState(!initial?.has_password);

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{initial ? "Hesap Düzenle" : "Yeni Hesap"}</DialogTitle></DialogHeader>
      <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>İsim *</Label><Input value={vals.name} onChange={(e) => setVals({ ...vals, name: e.target.value })} placeholder="IDM Bilgi, No-Reply..." /></div>
          <div className="grid gap-1.5"><Label>From Adres *</Label><Input type="email" value={vals.from_address} onChange={(e) => setVals({ ...vals, from_address: e.target.value, smtp_user: vals.smtp_user || e.target.value })} placeholder="info@idmmuhendislik.com" /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 grid gap-1.5"><Label>SMTP Host</Label><Input value={vals.smtp_host} onChange={(e) => setVals({ ...vals, smtp_host: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Port</Label><Input type="number" value={vals.smtp_port} onChange={(e) => setVals({ ...vals, smtp_port: Number(e.target.value) || 587 })} /></div>
        </div>
        <div className="grid gap-1.5"><Label>SMTP Kullanıcı</Label><Input value={vals.smtp_user} onChange={(e) => setVals({ ...vals, smtp_user: e.target.value })} placeholder="genellikle from adresiyle aynı" /></div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label>SMTP Şifre</Label>
            {initial?.has_password && !changePw && (
              <button type="button" className="text-xs text-primary underline" onClick={() => setChangePw(true)}>değiştir</button>
            )}
          </div>
          {changePw ? (
            <Input type="password" value={vals.password} onChange={(e) => setVals({ ...vals, password: e.target.value })} placeholder={initial ? "yeni şifre" : "e-posta şifresi"} />
          ) : (
            <div className="rounded border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">••• kayıtlı (değişmeyecek)</div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={vals.smtp_secure} onChange={(e) => setVals({ ...vals, smtp_secure: e.target.checked })} /> SSL (port 465)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={vals.is_default} onChange={(e) => setVals({ ...vals, is_default: e.target.checked })} /> Varsayılan</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={vals.active} onChange={(e) => setVals({ ...vals, active: e.target.checked })} /> Aktif</label>
        </div>

        <div className="grid gap-1.5"><Label>İmza</Label><Textarea rows={3} value={vals.signature} onChange={(e) => setVals({ ...vals, signature: e.target.value })} placeholder="-- &#10;İsim Soyisim&#10;IDM Mühendislik" /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(vals)} disabled={submitting || !vals.name.trim() || !vals.from_address.trim()}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor…</> : "Kaydet"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
