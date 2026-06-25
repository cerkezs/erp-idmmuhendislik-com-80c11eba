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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  listMails, createMail, updateMail, deleteMail,
} from "@/lib/nocodb.functions";
import { Mail as MailIcon, Plus, Trash2, Loader2, AlertCircle, Send, ExternalLink, RefreshCw } from "lucide-react";

const WEBMAIL_URL = "https://webmail.idmmuhendislik.com";

export const Route = createFileRoute("/mail")({
  head: () => ({ meta: [{ title: "Webmail — IDM ERP" }] }),
  component: MailPage,
});

type Mail = {
  Id: number; date?: string; to?: string; from?: string; subject?: string;
  body?: string; status?: string; error?: string; attachment_url?: string; company_name?: string;
};

function MailPage() {
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary"><MailIcon className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold">Mail</h1>
            <p className="text-sm text-muted-foreground">Webmail paneli ve gönderim logları</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="webmail" className="w-full">
        <TabsList>
          <TabsTrigger value="webmail">Webmail</TabsTrigger>
          <TabsTrigger value="log">Log & Hızlı Gönder</TabsTrigger>
        </TabsList>

        <TabsContent value="webmail" className="mt-3">
          <div className="mb-2 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setIframeLoaded(false); setIframeKey((k) => k + 1); }}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Yenile
            </Button>
            <a href={WEBMAIL_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Yeni sekmede aç</Button>
            </a>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-border bg-card" style={{ height: "calc(100vh - 220px)", minHeight: 520 }}>
            {!iframeLoaded && (
              <div className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Webmail yükleniyor…
                </div>
              </div>
            )}
            <iframe
              key={iframeKey}
              src={WEBMAIL_URL}
              title="Webmail"
              className="h-full w-full"
              referrerPolicy="no-referrer"
              allow="clipboard-read; clipboard-write; fullscreen"
              onLoad={() => setIframeLoaded(true)}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Not: Tarayıcı güvenliği nedeniyle bazı durumlarda webmail iframe içinde açılmayabilir. O zaman "Yeni sekmede aç" düğmesini kullanın.
          </p>
        </TabsContent>

        <TabsContent value="log" className="mt-3">
          <MailLogPanel />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function MailLogPanel() {
  const qc = useQueryClient();
  const list = useServerFn(listMails);
  const create = useServerFn(createMail);
  const update = useServerFn(updateMail);
  const remove = useServerFn(deleteMail);

  const { data, isLoading, error } = useQuery({ queryKey: ["mails"], queryFn: () => list() });

  const createMut = useMutation({
    mutationFn: (d: Omit<Mail, "Id">) => create({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mails"] }),
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: number; patch: Partial<Mail> }) => update({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mails"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mails"] }),
  });

  const [open, setOpen] = useState(false);
  const rows = ((data || []) as Mail[]).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} kayıt</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Yeni Mail</Button></DialogTrigger>
          <MailForm
            onSend={async (vals) => {
              await createMut.mutateAsync({ ...vals, status: "Gönderildi" });
              const to = encodeURIComponent(vals.to || "");
              const subj = encodeURIComponent(vals.subject || "");
              const body = encodeURIComponent(vals.body || "");
              window.location.href = `mailto:${to}?subject=${subj}&body=${body}`;
              setOpen(false);
            }}
            onSaveDraft={async (vals) => {
              await createMut.mutateAsync({ ...vals, status: "Taslak" });
              setOpen(false);
            }}
            submitting={createMut.isPending}
          />
        </Dialog>
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

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Tarih</th>
              <th className="px-3 py-2 text-left">Kime</th>
              <th className="px-3 py-2 text-left">Konu</th>
              <th className="px-3 py-2 text-left">Firma</th>
              <th className="px-3 py-2 text-left">Durum</th>
              <th className="px-3 py-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">Henüz mail kaydı yok.</td></tr>}
            {rows.map((m) => (
              <tr key={m.Id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 text-xs text-muted-foreground">{m.date?.slice(0, 16).replace("T", " ") || "—"}</td>
                <td className="px-3 py-2">{m.to}</td>
                <td className="px-3 py-2 font-medium">{m.subject || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{m.company_name || "—"}</td>
                <td className="px-3 py-2"><span className={`rounded px-1.5 py-0.5 text-xs ${m.status === "Gönderildi" ? "bg-green-500/10 text-green-600 dark:text-green-400" : m.status === "Hata" ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>{m.status}</span></td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => {
                    const to = encodeURIComponent(m.to || ""); const subj = encodeURIComponent(m.subject || ""); const body = encodeURIComponent(m.body || "");
                    window.location.href = `mailto:${to}?subject=${subj}&body=${body}`;
                    updateMut.mutate({ id: m.Id, patch: { status: "Gönderildi" } });
                  }}><Send className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm("Sil?")) deleteMut.mutate(m.Id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MailForm({ onSend, onSaveDraft, submitting }: {
  onSend: (v: Omit<Mail, "Id">) => void | Promise<unknown>;
  onSaveDraft: (v: Omit<Mail, "Id">) => void | Promise<unknown>;
  submitting: boolean;
}) {
  const [v, setV] = useState<Omit<Mail, "Id">>({
    date: new Date().toISOString(), to: "", from: "", subject: "", body: "",
    status: "Taslak", error: "", attachment_url: "", company_name: "",
  });
  function set<K extends keyof typeof v>(k: K, val: (typeof v)[K]) { setV((p) => ({ ...p, [k]: val })); }
  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>Yeni Mail</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>Kime *</Label><Input type="email" value={v.to || ""} onChange={(e) => set("to", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Firma</Label><Input value={v.company_name || ""} onChange={(e) => set("company_name", e.target.value)} /></div>
        </div>
        <div className="grid gap-1.5"><Label>Konu</Label><Input value={v.subject || ""} onChange={(e) => set("subject", e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>Mesaj</Label><Textarea rows={6} value={v.body || ""} onChange={(e) => set("body", e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>Ek (URL)</Label><Input value={v.attachment_url || ""} onChange={(e) => set("attachment_url", e.target.value)} placeholder="https://… PDF" /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onSaveDraft(v)} disabled={submitting || !v.to?.trim()}>Taslak Kaydet</Button>
        <Button onClick={() => onSend(v)} disabled={submitting || !v.to?.trim()}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> …</> : <><Send className="mr-2 h-4 w-4" /> Gönder</>}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
