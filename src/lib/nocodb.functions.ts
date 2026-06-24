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
  giderler: [
    { title: "tarih", uidt: "Date" },
    { title: "kategori", uidt: "SingleLineText" },
    { title: "aciklama", uidt: "LongText" },
    { title: "tutar", uidt: "Decimal" },
    { title: "para_birimi", uidt: "SingleLineText" },
    { title: "kur", uidt: "Decimal" },
    { title: "firma_id", uidt: "Number" },
    { title: "firma_adi", uidt: "SingleLineText" },
    { title: "fis_no", uidt: "SingleLineText" },
    { title: "notlar", uidt: "LongText" },
  ],
  kasalar: [
    { title: "ad", uidt: "SingleLineText" },
    { title: "tur", uidt: "SingleLineText" },
    { title: "para_birimi", uidt: "SingleLineText" },
    { title: "acilis_bakiye", uidt: "Decimal" },
    { title: "notlar", uidt: "LongText" },
  ],
  kasa_hareketleri: [
    { title: "tarih", uidt: "Date" },
    { title: "kasa_id", uidt: "Number" },
    { title: "kasa_adi", uidt: "SingleLineText" },
    { title: "tur", uidt: "SingleLineText" },
    { title: "tutar", uidt: "Decimal" },
    { title: "para_birimi", uidt: "SingleLineText" },
    { title: "kur", uidt: "Decimal" },
    { title: "aciklama", uidt: "LongText" },
    { title: "referans", uidt: "SingleLineText" },
  ],
  bildirimler: [
    { title: "tarih", uidt: "DateTime" },
    { title: "tur", uidt: "SingleLineText" },
    { title: "baslik", uidt: "SingleLineText" },
    { title: "mesaj", uidt: "LongText" },
    { title: "link", uidt: "SingleLineText" },
    { title: "okundu", uidt: "Checkbox" },
    { title: "kullanici", uidt: "SingleLineText" },
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
    // NocoDB rejects empty strings for Date/Number fields; normalize to null
    const normalized = v === "" || v === undefined ? null : (v as JsonValue);
    out[tr] = normalized;
  }
  return out;
}

function fromTr(row: Record_, map: Record<string, string>): Record_ {
  const out: Record_ = {};
  if (typeof row.Id === "number") out.Id = row.Id;
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

// ---------- Ürünler ----------
const URUN_MAP = {
  code: "kod",
  name: "ad",
  unit: "birim",
  price: "fiyat",
  currency: "para_birimi",
  vat_rate: "kdv_orani",
  stock: "stok",
  notes: "notlar",
} as const;

const ProductInput = z.object({
  code: z.string().optional().default(""),
  name: z.string().min(1, "Ad zorunlu"),
  unit: z.string().optional().default("adet"),
  price: z.number().optional().default(0),
  currency: z.string().optional().default("TRY"),
  vat_rate: z.number().optional().default(20),
  stock: z.number().optional().default(0),
  notes: z.string().optional().default(""),
});

export const listProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record_[]> => {
    const rows = await listRecords("urunler");
    return rows.map((r) => fromTr(r, URUN_MAP));
  },
);

export const createProduct = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ProductInput.parse(d))
  .handler(async ({ data }) =>
    fromTr(await createRecord("urunler", toTr(data, URUN_MAP)), URUN_MAP),
  );

export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.number(), patch: ProductInput.partial() }).parse(d),
  )
  .handler(async ({ data }) =>
    fromTr(await updateRecord("urunler", data.id, toTr(data.patch, URUN_MAP)), URUN_MAP),
  );

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("urunler", data.id));

// ---------- Teklif / Fatura ortak ----------
const BELGE_MAP = {
  number: "numara",
  company_id: "firma_id",
  company_name: "firma_adi",
  date: "tarih",
  status: "durum",
  currency: "para_birimi",
  subtotal: "ara_toplam",
  vat_total: "kdv_toplam",
  total: "genel_toplam",
  notes: "notlar",
} as const;

const TEKLIF_MAP = { ...BELGE_MAP, valid_until: "gecerlilik" } as const;
const FATURA_MAP = { ...BELGE_MAP, due_date: "vade_tarihi" } as const;

const KALEM_MAP = {
  product_id: "urun_id",
  description: "aciklama",
  qty: "miktar",
  unit_price: "birim_fiyat",
  vat_rate: "kdv_orani",
  line_total: "satir_toplam",
} as const;

const TEKLIF_KALEM_MAP = { ...KALEM_MAP, quote_id: "teklif_id" } as const;
const FATURA_KALEM_MAP = { ...KALEM_MAP, invoice_id: "fatura_id" } as const;

const ItemInput = z.object({
  product_id: z.number().nullable().optional(),
  description: z.string().optional().default(""),
  qty: z.number().default(1),
  unit_price: z.number().default(0),
  vat_rate: z.number().default(20),
});

const QuoteInput = z.object({
  number: z.string().optional().default(""),
  company_id: z.number().nullable().optional(),
  company_name: z.string().optional().default(""),
  date: z.string().optional().default(""),
  valid_until: z.string().optional().default(""),
  status: z.string().optional().default("Taslak"),
  currency: z.string().optional().default("TRY"),
  notes: z.string().optional().default(""),
  items: z.array(ItemInput).default([]),
});

const InvoiceInput = z.object({
  number: z.string().optional().default(""),
  company_id: z.number().nullable().optional(),
  company_name: z.string().optional().default(""),
  date: z.string().optional().default(""),
  due_date: z.string().optional().default(""),
  status: z.string().optional().default("Taslak"),
  currency: z.string().optional().default("TRY"),
  notes: z.string().optional().default(""),
  items: z.array(ItemInput).default([]),
});

function computeTotals(items: Array<z.infer<typeof ItemInput>>) {
  let subtotal = 0;
  let vat_total = 0;
  const lines = items.map((it) => {
    const line = (it.qty || 0) * (it.unit_price || 0);
    const vat = line * ((it.vat_rate || 0) / 100);
    subtotal += line;
    vat_total += vat;
    return { ...it, line_total: round2(line) };
  });
  return { lines, subtotal: round2(subtotal), vat_total: round2(vat_total), total: round2(subtotal + vat_total) };
}
function round2(n: number) { return Math.round(n * 100) / 100; }

// Teklifler
export const listQuotes = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record_[]> => {
    const rows = await listRecords("teklifler");
    return rows.map((r) => fromTr(r, TEKLIF_MAP));
  },
);

export const getQuote = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const id = await getTableId("teklifler");
    const row = await nc<Record_>(`/api/v2/tables/${id}/records/${data.id}`);
    const itemsTable = await getTableId("teklif_kalemleri");
    const where = encodeURIComponent(`(teklif_id,eq,${data.id})`);
    const items = await nc<{ list: Record_[] }>(
      `/api/v2/tables/${itemsTable}/records?where=${where}&limit=500`,
    );
    return {
      ...fromTr(row, TEKLIF_MAP),
      items: (items.list || []).map((r) => fromTr(r, TEKLIF_KALEM_MAP)),
    };
  });

async function replaceItems(
  itemsTable: string,
  parentField: string,
  parentId: number,
  items: Array<z.infer<typeof ItemInput>>,
  map: Record<string, string>,
) {
  // delete existing
  const where = encodeURIComponent(`(${parentField},eq,${parentId})`);
  const existing = await nc<{ list: Record_[] }>(
    `/api/v2/tables/${itemsTable}/records?where=${where}&limit=500`,
  );
  for (const r of existing.list || []) {
    await nc(`/api/v2/tables/${itemsTable}/records`, {
      method: "DELETE",
      body: JSON.stringify({ Id: r.Id }),
    });
  }
  for (const it of items) {
    const line_total = round2((it.qty || 0) * (it.unit_price || 0));
    const payload = toTr(
      { ...it, line_total, [parentField === "teklif_id" ? "quote_id" : "invoice_id"]: parentId },
      map,
    );
    await nc(`/api/v2/tables/${itemsTable}/records`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export const saveQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.number().nullable().optional(), data: QuoteInput }).parse(d),
  )
  .handler(async ({ data }) => {
    const { items, ...rest } = data.data;
    const t = computeTotals(items);
    const header = toTr(
      { ...rest, subtotal: t.subtotal, vat_total: t.vat_total, total: t.total },
      TEKLIF_MAP,
    );
    const tableId = await getTableId("teklifler");
    let parentId: number;
    if (data.id) {
      await nc(`/api/v2/tables/${tableId}/records`, {
        method: "PATCH",
        body: JSON.stringify({ Id: data.id, ...header }),
      });
      parentId = data.id;
    } else {
      const created = await nc<Record_>(`/api/v2/tables/${tableId}/records`, {
        method: "POST",
        body: JSON.stringify(header),
      });
      parentId = created.Id as number;
    }
    const kalemTable = await getTableId("teklif_kalemleri");
    await replaceItems(kalemTable, "teklif_id", parentId, items, TEKLIF_KALEM_MAP);
    return { id: parentId, ...t };
  });

export const deleteQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const kalemTable = await getTableId("teklif_kalemleri");
    const where = encodeURIComponent(`(teklif_id,eq,${data.id})`);
    const existing = await nc<{ list: Record_[] }>(
      `/api/v2/tables/${kalemTable}/records?where=${where}&limit=500`,
    );
    for (const r of existing.list || []) {
      await nc(`/api/v2/tables/${kalemTable}/records`, {
        method: "DELETE",
        body: JSON.stringify({ Id: r.Id }),
      });
    }
    return deleteRecord("teklifler", data.id);
  });

// Faturalar
export const listInvoices = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record_[]> => {
    const rows = await listRecords("faturalar");
    return rows.map((r) => fromTr(r, FATURA_MAP));
  },
);

export const getInvoice = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const id = await getTableId("faturalar");
    const row = await nc<Record_>(`/api/v2/tables/${id}/records/${data.id}`);
    const itemsTable = await getTableId("fatura_kalemleri");
    const where = encodeURIComponent(`(fatura_id,eq,${data.id})`);
    const items = await nc<{ list: Record_[] }>(
      `/api/v2/tables/${itemsTable}/records?where=${where}&limit=500`,
    );
    return {
      ...fromTr(row, FATURA_MAP),
      items: (items.list || []).map((r) => fromTr(r, FATURA_KALEM_MAP)),
    };
  });

export const saveInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.number().nullable().optional(), data: InvoiceInput }).parse(d),
  )
  .handler(async ({ data }) => {
    const { items, ...rest } = data.data;
    const t = computeTotals(items);
    const header = toTr(
      { ...rest, subtotal: t.subtotal, vat_total: t.vat_total, total: t.total },
      FATURA_MAP,
    );
    const tableId = await getTableId("faturalar");
    let parentId: number;
    if (data.id) {
      await nc(`/api/v2/tables/${tableId}/records`, {
        method: "PATCH",
        body: JSON.stringify({ Id: data.id, ...header }),
      });
      parentId = data.id;
    } else {
      const created = await nc<Record_>(`/api/v2/tables/${tableId}/records`, {
        method: "POST",
        body: JSON.stringify(header),
      });
      parentId = created.Id as number;
    }
    const kalemTable = await getTableId("fatura_kalemleri");
    await replaceItems(kalemTable, "fatura_id", parentId, items, FATURA_KALEM_MAP);
    return { id: parentId, ...t };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const kalemTable = await getTableId("fatura_kalemleri");
    const where = encodeURIComponent(`(fatura_id,eq,${data.id})`);
    const existing = await nc<{ list: Record_[] }>(
      `/api/v2/tables/${kalemTable}/records?where=${where}&limit=500`,
    );
    for (const r of existing.list || []) {
      await nc(`/api/v2/tables/${kalemTable}/records`, {
        method: "DELETE",
        body: JSON.stringify({ Id: r.Id }),
      });
    }
    return deleteRecord("faturalar", data.id);
  });
