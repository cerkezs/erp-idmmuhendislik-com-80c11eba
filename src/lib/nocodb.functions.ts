import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------- Low-level HTTP ----------
const BASE_TITLE = "IDM ERP";

function env() {
  // NOCODB_URL may point to a sub-path (e.g. /account/tokens). We only need the origin.
  const raw = process.env.NOCODB_URL?.replace(/\/$/, "") || "";
  let url = raw;
  try {
    url = new URL(raw).origin;
  } catch {
    /* keep raw */
  }
  const token = process.env.NOCODB_API_TOKEN;
  if (!url || !token) throw new Error("NOCODB_URL veya NOCODB_API_TOKEN eksik");
  return { url, token };
}

async function nc<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const { url, token } = env();
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "xc-token": token,
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`NocoDB ${res.status} ${path}: ${text.slice(0, 400)}`);
  }
  return (text ? JSON.parse(text) : ({} as T)) as T;
}

// ---------- Türkçe tablo / kolon tanımları ----------
type ColDef = { title: string; uidt: string };

const TABLES: Record<string, ColDef[]> = {
  firmalar: [
    { title: "ad", uidt: "SingleLineText" },
    { title: "tur", uidt: "SingleLineText" },
    { title: "vergi_no", uidt: "SingleLineText" },
    { title: "vergi_dairesi", uidt: "SingleLineText" },
    { title: "telefon", uidt: "PhoneNumber" },
    { title: "eposta", uidt: "Email" },
    { title: "adres", uidt: "LongText" },
    { title: "notlar", uidt: "LongText" },
  ],
  urunler: [
    { title: "kod", uidt: "SingleLineText" },
    { title: "ad", uidt: "SingleLineText" },
    { title: "birim", uidt: "SingleLineText" },
    { title: "fiyat", uidt: "Decimal" },
    { title: "para_birimi", uidt: "SingleLineText" },
    { title: "kdv_orani", uidt: "Decimal" },
    { title: "stok", uidt: "Decimal" },
    { title: "notlar", uidt: "LongText" },
  ],
  teklifler: [
    { title: "numara", uidt: "SingleLineText" },
    { title: "firma_id", uidt: "Number" },
    { title: "firma_adi", uidt: "SingleLineText" },
    { title: "tarih", uidt: "Date" },
    { title: "gecerlilik", uidt: "Date" },
    { title: "durum", uidt: "SingleLineText" },
    { title: "para_birimi", uidt: "SingleLineText" },
    { title: "ara_toplam", uidt: "Decimal" },
    { title: "kdv_toplam", uidt: "Decimal" },
    { title: "genel_toplam", uidt: "Decimal" },
    { title: "notlar", uidt: "LongText" },
  ],
  teklif_kalemleri: [
    { title: "teklif_id", uidt: "Number" },
    { title: "urun_id", uidt: "Number" },
    { title: "aciklama", uidt: "LongText" },
    { title: "miktar", uidt: "Decimal" },
    { title: "birim_fiyat", uidt: "Decimal" },
    { title: "kdv_orani", uidt: "Decimal" },
    { title: "satir_toplam", uidt: "Decimal" },
  ],
  faturalar: [
    { title: "numara", uidt: "SingleLineText" },
    { title: "firma_id", uidt: "Number" },
    { title: "firma_adi", uidt: "SingleLineText" },
    { title: "tarih", uidt: "Date" },
    { title: "vade_tarihi", uidt: "Date" },
    { title: "durum", uidt: "SingleLineText" },
    { title: "para_birimi", uidt: "SingleLineText" },
    { title: "ara_toplam", uidt: "Decimal" },
    { title: "kdv_toplam", uidt: "Decimal" },
    { title: "genel_toplam", uidt: "Decimal" },
    { title: "notlar", uidt: "LongText" },
  ],
  fatura_kalemleri: [
    { title: "fatura_id", uidt: "Number" },
    { title: "urun_id", uidt: "Number" },
    { title: "aciklama", uidt: "LongText" },
    { title: "miktar", uidt: "Decimal" },
    { title: "birim_fiyat", uidt: "Decimal" },
    { title: "kdv_orani", uidt: "Decimal" },
    { title: "satir_toplam", uidt: "Decimal" },
  ],
};

// ---------- Setup ----------
async function ensureBase(): Promise<string> {
  const list = await nc<{ list: Array<{ id: string; title: string }> }>(
    "/api/v2/meta/bases",
  );
  const existing = list.list?.find((b) => b.title === BASE_TITLE);
  if (existing) return existing.id;
  const created = await nc<{ id: string }>("/api/v2/meta/bases", {
    method: "POST",
    body: JSON.stringify({ title: BASE_TITLE }),
  });
  return created.id;
}

async function listTables(baseId: string) {
  return nc<{ list: Array<{ id: string; title: string; table_name: string }> }>(
    `/api/v2/meta/bases/${baseId}/tables`,
  );
}

async function ensureTable(baseId: string, name: string, columns: ColDef[]) {
  const existing = await listTables(baseId);
  const found = existing.list?.find(
    (t) => t.title === name || t.table_name === name,
  );
  if (found) return { id: found.id, status: "exists" as const };

  const created = await nc<{ id: string }>(
    `/api/v2/meta/bases/${baseId}/tables`,
    {
      method: "POST",
      body: JSON.stringify({ title: name, columns }),
    },
  );
  return { id: created.id, status: "created" as const };
}

export const setupNocoDB = createServerFn({ method: "POST" }).handler(
  async () => {
    const baseId = await ensureBase();
    const results: Record<string, { id: string; status: string }> = {};
    for (const [name, cols] of Object.entries(TABLES)) {
      try {
        results[name] = await ensureTable(baseId, name, cols);
      } catch (e) {
        results[name] = {
          id: "",
          status: `error: ${(e as Error).message}`,
        };
      }
    }
    return { baseId, baseTitle: BASE_TITLE, tables: results };
  },
);

// ---------- Table ID cache ----------
let tableCache: Record<string, string> | null = null;

async function getTableId(name: string): Promise<string> {
  if (tableCache?.[name]) return tableCache[name];
  const baseId = await ensureBase();
  const tables = await listTables(baseId);
  tableCache = {};
  for (const t of tables.list || []) {
    tableCache[t.title] = t.id;
    tableCache[t.table_name] = t.id;
  }
  const id = tableCache[name];
  if (!id) throw new Error(`Tablo bulunamadı: ${name}. Önce /setup çalıştırın.`);
  return id;
}

// ---------- Generic CRUD ----------
type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
type Record_ = { [k: string]: JsonValue } & { Id?: number };

async function listRecords(tableName: string, limit = 200): Promise<Record_[]> {
  const id = await getTableId(tableName);
  const res = await nc<{ list: Record_[] }>(
    `/api/v2/tables/${id}/records?limit=${limit}`,
  );
  return res.list || [];
}

async function createRecord(tableName: string, data: Record<string, JsonValue>): Promise<Record_> {
  const id = await getTableId(tableName);
  return nc<Record_>(`/api/v2/tables/${id}/records`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function updateRecord(
  tableName: string,
  recordId: number,
  data: Record<string, JsonValue>,
): Promise<Record_> {
  const id = await getTableId(tableName);
  return nc<Record_>(`/api/v2/tables/${id}/records`, {
    method: "PATCH",
    body: JSON.stringify({ Id: recordId, ...data }),
  });
}

async function deleteRecord(tableName: string, recordId: number): Promise<{ ok: true }> {
  const id = await getTableId(tableName);
  await nc(`/api/v2/tables/${id}/records`, {
    method: "DELETE",
    body: JSON.stringify({ Id: recordId }),
  });
  return { ok: true };
}

// ---------- Firmalar ----------
// Frontend İngilizce alan adlarını kullanır; burada Türkçe sütunlara çeviririz.
const FIRMA_MAP = {
  name: "ad",
  type: "tur",
  tax_no: "vergi_no",
  tax_office: "vergi_dairesi",
  phone: "telefon",
  email: "eposta",
  address: "adres",
  notes: "notlar",
} as const;

function toTr<T extends Record<string, unknown>>(
  obj: T,
  map: Record<string, string>,
): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    const tr = map[k] || k;
    out[tr] = (v ?? null) as JsonValue;
  }
  return out;
}

function fromTr(row: Record_, map: Record<string, string>): Record_ {
  const out: Record_ = { Id: row.Id };
  for (const [en, tr] of Object.entries(map)) {
    out[en] = (row[tr] ?? null) as JsonValue;
  }
  // pass through extras
  for (const [k, v] of Object.entries(row)) {
    if (!(k in out)) out[k] = v;
  }
  return out;
}

const CompanyInput = z.object({
  name: z.string().min(1, "Ad zorunlu"),
  type: z.string().optional().default("Müşteri"),
  tax_no: z.string().optional().default(""),
  tax_office: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  address: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export const listCompanies = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record_[]> => {
    const rows = await listRecords("firmalar");
    return rows.map((r) => fromTr(r, FIRMA_MAP));
  },
);

export const createCompany = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CompanyInput.parse(d))
  .handler(async ({ data }) =>
    fromTr(await createRecord("firmalar", toTr(data, FIRMA_MAP)), FIRMA_MAP),
  );

export const updateCompany = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.number(), patch: CompanyInput.partial() }).parse(d),
  )
  .handler(async ({ data }) =>
    fromTr(
      await updateRecord("firmalar", data.id, toTr(data.patch, FIRMA_MAP)),
      FIRMA_MAP,
    ),
  );

export const deleteCompany = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("firmalar", data.id));
