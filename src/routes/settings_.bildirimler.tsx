import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { listNotifPrefs, upsertNotifPref } from "@/lib/nocodb.functions";
import { Bell, Loader2 } from "lucide-react";

export const Route = createFileRoute("/settings_/bildirimler")({
  head: () => ({ meta: [{ title: "Bildirim Türleri — Ayarlar" }] }),
  component: BildirimlerPage,
});

const TYPES: { key: string; label: string; desc: string }[] = [
  { key: "vade_yakin", label: "Vade Yaklaşan", desc: "Faturanın vade tarihi yaklaştığında" },
  { key: "stok_kritik", label: "Stok Kritik", desc: "Ürün stoğu minimum seviyenin altına indiğinde" },
  { key: "uretim_gecikti", label: "Üretim Gecikti", desc: "Üretim emri bitiş tarihi geçtiğinde" },
  { key: "kasa_hareket", label: "Kasa Hareketi", desc: "Büyük tutarlı gelir/gider hareketinde" },
  { key: "teklif_onay", label: "Teklif Onay", desc: "Teklif onaylandığında / reddedildiğinde" },
];

type Pref = { Id: number; user?: string; type?: string; mail?: boolean; push?: boolean };

function BildirimlerPage() {
  const qc = useQueryClient();
  const list = useServerFn(listNotifPrefs);
  const upsert = useServerFn(upsertNotifPref);

  const q = useQuery({ queryKey: ["notif-prefs"], queryFn: () => list() });
  const items = (q.data || []) as Pref[];

  const upsertMut = useMutation({
    mutationFn: (v: { id?: number; type: string; mail: boolean; push: boolean }) =>
      upsert({ data: { id: v.id, data: { user: "default", type: v.type, mail: v.mail, push: v.push } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-prefs"] }),
  });

  function getPref(type: string): Pref | undefined {
    return items.find((p) => p.type === type && (p.user || "default") === "default");
  }

  function toggle(type: string, field: "mail" | "push", val: boolean) {
    const cur = getPref(type);
    upsertMut.mutate({
      id: cur?.Id,
      type,
      mail: field === "mail" ? val : (cur?.mail ?? true),
      push: field === "push" ? val : (cur?.push ?? true),
    });
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Bildirim Türleri</h1>
            <p className="text-sm text-muted-foreground">Her bildirim türü için mail ve uygulama içi bildirimleri açıp kapatın.</p>
          </div>
        </div>

        {q.isLoading ? (
          <div className="mt-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Tür</th>
                  <th className="px-3 py-2 text-center">Mail</th>
                  <th className="px-3 py-2 text-center">Uygulama</th>
                </tr>
              </thead>
              <tbody>
                {TYPES.map((t) => {
                  const p = getPref(t.key);
                  const mail = p?.mail ?? true;
                  const push = p?.push ?? true;
                  return (
                    <tr key={t.key} className="border-t border-border">
                      <td className="px-3 py-3">
                        <div className="font-medium">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.desc}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input type="checkbox" checked={mail} onChange={(e) => toggle(t.key, "mail", e.target.checked)} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input type="checkbox" checked={push} onChange={(e) => toggle(t.key, "push", e.target.checked)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Mail kanalı için Ayarlar → Mail & SMTP bölümünde SMTP yapılandırılmış olmalıdır.</p>
      </div>
    </AppShell>
  );
}
