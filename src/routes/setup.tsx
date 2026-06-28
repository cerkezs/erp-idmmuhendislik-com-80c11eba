import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { setupNocoDB } from "@/lib/nocodb.functions";
import { Database, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Kurulum — IDM ERP" }] }),
  component: SetupPage,
});

function SetupPage() {
  const run = useServerFn(setupNocoDB);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof run>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await run();
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">NocoDB Kurulumu</h1>
            <p className="text-sm text-muted-foreground">
              ERP tablolarını NocoDB'de oluşturur. Var olan tablolar dokunulmaz.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Bu işlem <code className="rounded bg-muted px-1">IDM ERP</code> isimli base'i
            (yoksa) oluşturur ve şu tabloları kurar:
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {[
              "firmalar",
              "urunler",
              "teklifler",
              "teklif_kalemleri",
              "faturalar",
              "fatura_kalemleri",
              "giderler",
              "kasalar",
              "kasa_hareketleri",
              "bildirimler",
              "uretim_emirleri",
              "uretim_asamalari",
              "gorevler",
              "dosyalar",
              "mail_log",
              "alis_faturalari",
              "alis_fatura_kalemleri",
              "cari_hareketler",
            ].map((t) => (
              <li key={t} className="rounded-md bg-muted/40 px-3 py-1.5 font-mono text-xs">
                {t}
              </li>
            ))}
          </ul>

          <Button onClick={handleRun} disabled={loading} className="mt-5">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kuruluyor…
              </>
            ) : (
              "Tabloları Kur"
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <div className="font-medium text-destructive">Hata</div>
              <pre className="mt-1 whitespace-pre-wrap text-xs">{error}</pre>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="font-medium">Base hazır:</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {result.baseTitle}
              </code>
              <span className="text-muted-foreground">({result.baseId})</span>
            </div>
            <div className="overflow-hidden rounded-md border border-border text-sm">
              <table className="w-full">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Tablo</th>
                    <th className="px-3 py-2 text-left">Durum</th>
                    <th className="px-3 py-2 text-left">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.tables).map(([name, info]) => (
                    <tr key={name} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{name}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            info.status === "created"
                              ? "rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-600"
                              : info.status === "exists"
                                ? "rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                : "rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
                          }
                        >
                          {info.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {info.id || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm">
              <Link to="/companies" className="text-primary hover:underline">
                → Firmalar sayfasına git
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
