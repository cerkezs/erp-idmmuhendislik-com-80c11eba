import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2, Archive, AlertCircle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/settings/backup")({
  head: () => ({ meta: [{ title: "Yedekleme — IDM ERP" }] }),
  component: BackupPage,
});

const SECTIONS = [
  { key: "firmalar",    label: "Firmalar" },
  { key: "urunler",     label: "Ürünler" },
  { key: "teklifler",   label: "Teklifler (+ kalemler)" },
  { key: "faturalar",   label: "Faturalar (+ kalemler)" },
  { key: "uretim",      label: "Üretim Emirleri (+ aşamalar)" },
  { key: "giderler",    label: "Giderler" },
  { key: "kasa",        label: "Kasa (hesaplar + hareketler)" },
  { key: "dosyalar",    label: "Dosyalar (metadata)" },
  { key: "mail_log",    label: "Mail Log" },
  { key: "bildirimler", label: "Bildirimler" },
];

function BackupPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set(SECTIONS.map((s) => s.key)));
  const [byCompany, setByCompany] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (k: string) => {
    const s = new Set(selected);
    if (s.has(k)) s.delete(k); else s.add(k);
    setSelected(s);
  };

  async function download() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: Array.from(selected),
          byCompany,
          from: from || undefined,
          to: to || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") || "";
      const m = /filename="([^"]+)"/.exec(cd);
      a.download = m?.[1] || `idm-erp-backup-${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/settings" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Ayarlar
        </Link>
        <div className="mb-6 flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Yedekleme</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Seçtiğin bölümlerin tüm verilerini ZIP olarak indir. Firma bazlı klasörleme aktifse her firma için ayrı alt klasör üretilir.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-sm font-medium">Bölümler</Label>
            <div className="flex gap-2 text-xs">
              <button className="text-primary hover:underline" onClick={() => setSelected(new Set(SECTIONS.map((s) => s.key)))}>Tümünü seç</button>
              <span className="text-muted-foreground">·</span>
              <button className="text-primary hover:underline" onClick={() => setSelected(new Set())}>Hiçbiri</button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <label key={s.key} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40">
                <Checkbox checked={selected.has(s.key)} onCheckedChange={() => toggle(s.key)} />
                {s.label}
              </label>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Tarih: şundan</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Tarih: şuna</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40">
            <Checkbox checked={byCompany} onCheckedChange={(v) => setByCompany(!!v)} className="mt-0.5" />
            <div>
              <div className="font-medium">Firma bazlı kategorize et</div>
              <div className="text-xs text-muted-foreground">
                Her firma için ayrı klasör (örn. <code>acme-ltd/faturalar.csv</code>). Kapalıysa tablo başına tek CSV.
              </div>
            </div>
          </label>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <pre className="whitespace-pre-wrap text-xs">{error}</pre>
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button onClick={download} disabled={busy || selected.size === 0}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Hazırlanıyor…</> : <><Download className="mr-2 h-4 w-4" /> Yedeği indir (ZIP)</>}
            </Button>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Not: Fiziksel dosyalar (Dosyalar sekmesindekiler) sizin sunucunuzda durduğu için yedeğe yalnızca metadata + URL bilgileri girer. Fiziksel dosya yedeği için sunucu tarafında ayrıca yedekleme önerilir.
        </p>
      </div>
    </AppShell>
  );
}
