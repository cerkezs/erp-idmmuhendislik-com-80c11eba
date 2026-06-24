import { createFileRoute } from "@tanstack/react-router";
import { zipSync, strToU8 } from "fflate";

// NocoDB low-level (route is server-only at runtime)
function env() {
  const raw = process.env.NOCODB_URL?.replace(/\/$/, "") || "";
  let url = raw;
  try { url = new URL(raw).origin; } catch { /* keep raw */ }
  const token = process.env.NOCODB_API_TOKEN;
  if (!url || !token) throw new Error("NOCODB_URL veya NOCODB_API_TOKEN eksik");
  return { url, token };
}

async function nc<T = unknown>(path: string): Promise<T> {
  const { url, token } = env();
  const res = await fetch(`${url}${path}`, {
    headers: { "Content-Type": "application/json", "xc-token": token },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`NocoDB ${res.status} ${path}: ${text.slice(0, 200)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

async function getBaseId(): Promise<string> {
  const list = await nc<{ list: Array<{ id: string; title: string }> }>("/api/v2/meta/bases");
  const b = list.list?.find((x) => x.title === "IDM ERP");
  if (!b) throw new Error("IDM ERP base bulunamadı");
  return b.id;
}

async function listTables(baseId: string) {
  const r = await nc<{ list: Array<{ id: string; title: string; table_name: string }> }>(`/api/v2/meta/bases/${baseId}/tables`);
  const map: Record<string, string> = {};
  for (const t of r.list || []) { map[t.title] = t.id; map[t.table_name] = t.id; }
  return map;
}

async function listAll(tableId: string): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = [];
  let offset = 0;
  const limit = 1000;
  for (let i = 0; i < 50; i++) {
    const r = await nc<{ list: Array<Record<string, unknown>>; pageInfo?: { isLastPage?: boolean } }>(
      `/api/v2/tables/${tableId}/records?limit=${limit}&offset=${offset}`,
    );
    const chunk = r.list || [];
    out.push(...chunk);
    if (chunk.length < limit || r.pageInfo?.isLastPage) break;
    offset += limit;
  }
  return out;
}

// CSV helpers
function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "\ufeff"; // BOM only
  const cols = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set<string>()));
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => csvEscape(r[c])).join(","));
  return "\ufeff" + lines.join("\n");
}

function slug(s: string): string {
  return (s || "firmasiz")
    .toLowerCase()
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "firmasiz";
}

// Section name -> tablo(lar) ve firma alanı
type Section = {
  key: string;
  tables: Array<{ name: string; companyField?: string; companyNameField?: string; parentTable?: string; parentField?: string }>;
};

const SECTIONS: Record<string, Section> = {
  firmalar:        { key: "firmalar", tables: [{ name: "firmalar" }] },
  urunler:         { key: "urunler", tables: [{ name: "urunler" }] },
  teklifler:       { key: "teklifler", tables: [
                      { name: "teklifler", companyField: "firma_id", companyNameField: "firma_adi" },
                      { name: "teklif_kalemleri", parentTable: "teklifler", parentField: "teklif_id" },
                    ]},
  faturalar:       { key: "faturalar", tables: [
                      { name: "faturalar", companyField: "firma_id", companyNameField: "firma_adi" },
                      { name: "fatura_kalemleri", parentTable: "faturalar", parentField: "fatura_id" },
                    ]},
  uretim:          { key: "uretim", tables: [
                      { name: "uretim_emirleri", companyField: "firma_id", companyNameField: "firma_adi" },
                      { name: "uretim_asamalari", parentTable: "uretim_emirleri", parentField: "emir_id" },
                    ]},
  giderler:        { key: "giderler", tables: [{ name: "giderler", companyField: "firma_id", companyNameField: "firma_adi" }] },
  kasa:            { key: "kasa", tables: [{ name: "kasalar" }, { name: "kasa_hareketleri" }] },
  dosyalar:        { key: "dosyalar", tables: [{ name: "dosyalar", companyField: "firma_id", companyNameField: "firma_adi" }] },
  mail_log:        { key: "mail_log", tables: [{ name: "mail_log", companyNameField: "firma_adi" }] },
  bildirimler:     { key: "bildirimler", tables: [{ name: "bildirimler" }] },
};

export const Route = createFileRoute("/api/backup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json() as {
            sections: string[];
            byCompany?: boolean;
            from?: string;
            to?: string;
          };

          const selected = (body.sections || []).filter((s) => SECTIONS[s]);
          if (!selected.length) return new Response("Bölüm seçilmedi", { status: 400 });

          const baseId = await getBaseId();
          const tableMap = await listTables(baseId);

          // Tüm gerekli tabloları topla
          const needed = new Set<string>();
          for (const s of selected) for (const t of SECTIONS[s].tables) needed.add(t.name);
          // Firma adı için firmalar tablosu lazım (firma-bazlı modda)
          if (body.byCompany) needed.add("firmalar");

          const rowsByTable: Record<string, Array<Record<string, unknown>>> = {};
          for (const name of needed) {
            const id = tableMap[name];
            if (!id) { rowsByTable[name] = []; continue; }
            rowsByTable[name] = await listAll(id);
          }

          // Tarih filtresi (varsa)
          const from = body.from ? body.from : "";
          const to = body.to ? body.to : "";
          if (from || to) {
            for (const [name, rows] of Object.entries(rowsByTable)) {
              const dateField = rows[0] && ("tarih" in rows[0] ? "tarih" : ("baslama" in rows[0] ? "baslama" : ""));
              if (!dateField) continue;
              rowsByTable[name] = rows.filter((r) => {
                const v = String(r[dateField] || "").slice(0, 10);
                if (!v) return true;
                if (from && v < from) return false;
                if (to && v > to) return false;
                return true;
              });
            }
          }

          // Firma id -> ad
          const companyName = new Map<number, string>();
          for (const r of rowsByTable["firmalar"] || []) {
            if (typeof r.Id === "number") companyName.set(r.Id, String(r.ad || `firma-${r.Id}`));
          }

          const files: Record<string, Uint8Array> = {};
          files["_meta.json"] = strToU8(JSON.stringify({
            generated_at: new Date().toISOString(),
            sections: selected,
            byCompany: !!body.byCompany,
            from: from || null,
            to: to || null,
            counts: Object.fromEntries(Object.entries(rowsByTable).map(([k, v]) => [k, v.length])),
          }, null, 2));

          if (!body.byCompany) {
            // Düz mod: tablo başına bir CSV
            for (const s of selected) {
              for (const t of SECTIONS[s].tables) {
                files[`${t.name}.csv`] = strToU8(toCsv(rowsByTable[t.name] || []));
              }
            }
          } else {
            // Firma-bazlı mod
            // firmalar.csv köke
            if (selected.includes("firmalar")) files["firmalar.csv"] = strToU8(toCsv(rowsByTable["firmalar"] || []));

            // Firma adlarını topla (kayıtlı + dosyalarda geçen)
            const folders = new Map<string, string>(); // folderName -> slug
            folders.set("firmasiz", "firmasiz");
            for (const [, name] of companyName) folders.set(name, slug(name));

            for (const s of selected) {
              if (s === "firmalar") continue;
              for (const t of SECTIONS[s].tables) {
                const rows = rowsByTable[t.name] || [];
                if (!rows.length) continue;

                if (t.parentTable && t.parentField) {
                  // Alt tablo: parent kayıt üzerinden firma'ya bağla
                  const parentRows = rowsByTable[t.parentTable] || [];
                  const parentCo = new Map<number, string>();
                  for (const p of parentRows) {
                    const pid = p.Id as number;
                    const cn = (p["firma_adi"] as string) || (typeof p["firma_id"] === "number" ? companyName.get(p["firma_id"] as number) : "") || "";
                    if (typeof pid === "number") parentCo.set(pid, cn || "");
                  }
                  const grouped = new Map<string, Array<Record<string, unknown>>>();
                  for (const r of rows) {
                    const pid = r[t.parentField] as number | undefined;
                    const cn = (typeof pid === "number" ? parentCo.get(pid) : "") || "";
                    const folder = cn ? cn : "firmasiz";
                    if (!grouped.has(folder)) grouped.set(folder, []);
                    grouped.get(folder)!.push(r);
                  }
                  for (const [folder, list] of grouped) {
                    files[`${slug(folder)}/${t.name}.csv`] = strToU8(toCsv(list));
                  }
                } else if (t.companyField || t.companyNameField) {
                  const grouped = new Map<string, Array<Record<string, unknown>>>();
                  for (const r of rows) {
                    let cn = (t.companyNameField && r[t.companyNameField]) ? String(r[t.companyNameField]) : "";
                    if (!cn && t.companyField && typeof r[t.companyField] === "number") cn = companyName.get(r[t.companyField] as number) || "";
                    const folder = cn ? cn : "firmasiz";
                    if (!grouped.has(folder)) grouped.set(folder, []);
                    grouped.get(folder)!.push(r);
                  }
                  for (const [folder, list] of grouped) {
                    files[`${slug(folder)}/${t.name}.csv`] = strToU8(toCsv(list));
                  }
                } else {
                  // Firma ile ilişkilendirilemez (kasa, bildirim) -> kök
                  files[`${t.name}.csv`] = strToU8(toCsv(rows));
                }
              }
            }
          }

          const zipped = zipSync(files, { level: 6 });
          const stamp = new Date().toISOString().slice(0, 10);
          return new Response(zipped, {
            status: 200,
            headers: {
              "Content-Type": "application/zip",
              "Content-Disposition": `attachment; filename="idm-erp-backup-${stamp}.zip"`,
              "Cache-Control": "no-store",
            },
          });
        } catch (e) {
          return new Response(`Yedek oluşturulamadı: ${(e as Error).message}`, { status: 500 });
        }
      },
    },
  },
});
