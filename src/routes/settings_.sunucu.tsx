import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getServerHealth } from "@/lib/system.functions";
import { Server, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/settings/sunucu")({
  head: () => ({ meta: [{ title: "Sunucu Durumu — Ayarlar" }] }),
  component: SunucuPage,
});

function SunucuPage() {
  const health = useServerFn(getServerHealth);
  const q = useQuery({ queryKey: ["server-health"], queryFn: () => health(), refetchInterval: 30_000 });
  const d = q.data;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary"><Server className="h-5 w-5" /></div>
            <div>
              <h1 className="text-xl font-semibold">Sunucu Durumu</h1>
              <p className="text-sm text-muted-foreground">NocoDB ve mini sağlık-API erişilebilirlik kontrolü.</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
            {q.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>

        {q.isLoading ? (
          <div className="text-center py-8"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">NocoDB</div>
                {d?.nocoOk ? (
                  <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300"><CheckCircle2 className="h-3 w-3" /> Çevrimiçi · {d.nocoLatency}ms</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive"><AlertCircle className="h-3 w-3" /> Erişilemiyor</span>
                )}
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">{d?.nocoUrl || "—"}</div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Sağlık API (Mini)</div>
                {!d?.healthConfigured ? (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Yapılandırılmamış</span>
                ) : d.healthData ? (
                  <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300"><CheckCircle2 className="h-3 w-3" /> Çevrimiçi</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive"><AlertCircle className="h-3 w-3" /> {d.healthError || "Hata"}</span>
                )}
              </div>
              {d?.healthData && (
                <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-3 text-xs">{d.healthData}</pre>
              )}
              {!d?.healthConfigured && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Mini API'yi sunucuna kuralım — sohbette "<em>sunucu sağlık API komutlarını ver</em>" dersen, kopyala-yapıştır setup'ı veririm. Kurulduktan sonra <code className="rounded bg-muted px-1">HEALTH_API_URL</code> ve <code className="rounded bg-muted px-1">HEALTH_API_TOKEN</code> .env'ye eklenir.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              Son kontrol: {d?.checkedAt ? new Date(d.checkedAt).toLocaleString("tr-TR") : "—"} · Otomatik yenileme: 30 sn
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
