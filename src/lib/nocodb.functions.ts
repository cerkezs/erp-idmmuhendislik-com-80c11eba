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
    { title: "kaynak_tip", uidt: "SingleLineText" },
    { title: "kaynak_id", uidt: "Number" },
  ],
  bildirimler: [
    { title: "tarih", uidt: "DateTime" },
    { title: "tur", uidt: "SingleLineText" },
    { title: "baslik", uidt: "SingleLineText" },
    { title: "mesaj", uidt: "LongText" },
    { title: "link", uidt: "SingleLineText" },
    { title: "okundu", uidt: "Checkbox" },
    { title: "kullanici", uidt: "SingleLineText" },
    { title: "kaynak_tip", uidt: "SingleLineText" },
    { title: "kaynak_id", uidt: "Number" },
    { title: "dedup", uidt: "SingleLineText" },
  ],
  uretim_emirleri: [
    { title: "numara", uidt: "SingleLineText" },
    { title: "firma_id", uidt: "Number" },
    { title: "firma_adi", uidt: "SingleLineText" },
    { title: "urun_id", uidt: "Number" },
    { title: "urun_adi", uidt: "SingleLineText" },
    { title: "miktar", uidt: "Decimal" },
    { title: "baslama", uidt: "Date" },
    { title: "bitis", uidt: "Date" },
    { title: "durum", uidt: "SingleLineText" },
    { title: "toplam_maliyet", uidt: "Decimal" },
    { title: "notlar", uidt: "LongText" },
  ],
  uretim_asamalari: [
    { title: "emir_id", uidt: "Number" },
    { title: "ad", uidt: "SingleLineText" },
    { title: "firma_id", uidt: "Number" },
    { title: "firma_adi", uidt: "SingleLineText" },
    { title: "maliyet", uidt: "Decimal" },
    { title: "para_birimi", uidt: "SingleLineText" },
    { title: "baslama", uidt: "Date" },
  uretim_asamalari: [
    { title: "emir_id", uidt: "Number" },
    { title: "ad", uidt: "SingleLineText" },
    { title: "firma_id", uidt: "Number" },
    { title: "firma_adi", uidt: "SingleLineText" },
    { title: "maliyet", uidt: "Decimal" },
    { title: "para_birimi", uidt: "SingleLineText" },
    { title: "baslama", uidt: "Date" },
    { title: "bitis", uidt: "Date" },
    { title: "durum", uidt: "SingleLineText" },
    { title: "notlar", uidt: "LongText" },
    { title: "sarf_urun_id", uidt: "Number" },
    { title: "sarf_miktar", uidt: "Decimal" },
  ],
    { title: "tarih", uidt: "DateTime" },
    { title: "baslik", uidt: "SingleLineText" },
    { title: "aciklama", uidt: "LongText" },
    { title: "durum", uidt: "SingleLineText" },
    { title: "oncelik", uidt: "SingleLineText" },
    { title: "atanan", uidt: "SingleLineText" },
    { title: "son_tarih", uidt: "Date" },
    { title: "ilgili_tur", uidt: "SingleLineText" },
    { title: "ilgili_id", uidt: "Number" },
  ],
  dosyalar: [
    { title: "tarih", uidt: "DateTime" },
    { title: "ad", uidt: "SingleLineText" },
    { title: "kategori", uidt: "SingleLineText" },
    { title: "firma_id", uidt: "Number" },
    { title: "firma_adi", uidt: "SingleLineText" },
    { title: "klasor", uidt: "SingleLineText" },
    { title: "url", uidt: "LongText" },
    { title: "boyut", uidt: "SingleLineText" },
    { title: "tur", uidt: "SingleLineText" },
    { title: "notlar", uidt: "LongText" },
  ],
  mail_log: [
    { title: "tarih", uidt: "DateTime" },
    { title: "kime", uidt: "SingleLineText" },
    { title: "kimden", uidt: "SingleLineText" },
    { title: "konu", uidt: "SingleLineText" },
    { title: "govde", uidt: "LongText" },
    { title: "durum", uidt: "SingleLineText" },
    { title: "hata", uidt: "LongText" },
    { title: "ek_url", uidt: "LongText" },
    { title: "firma_adi", uidt: "SingleLineText" },
  ],
  kategoriler: [
    { title: "ad", uidt: "SingleLineText" },
    { title: "tip", uidt: "SingleLineText" },
    { title: "renk", uidt: "SingleLineText" },
    { title: "aktif", uidt: "Checkbox" },
  ],
  kur_log: [
    { title: "tarih", uidt: "Date" },
    { title: "usd", uidt: "Decimal" },
    { title: "eur", uidt: "Decimal" },
    { title: "kaynak", uidt: "SingleLineText" },
    { title: "notlar", uidt: "LongText" },
  ],
  bildirim_ayarlari: [
    { title: "kullanici", uidt: "SingleLineText" },
    { title: "tur", uidt: "SingleLineText" },
    { title: "mail_aktif", uidt: "Checkbox" },
    { title: "push_aktif", uidt: "Checkbox" },
  ],
  kullanicilar: [
    { title: "ad", uidt: "SingleLineText" },
    { title: "eposta", uidt: "Email" },
    { title: "rol", uidt: "SingleLineText" },
    { title: "aktif", uidt: "Checkbox" },
    { title: "notlar", uidt: "LongText" },
  ],
  mail_hesaplari: [
    { title: "isim", uidt: "SingleLineText" },
    { title: "from_adres", uidt: "Email" },
    { title: "imza", uidt: "LongText" },
    { title: "smtp_host", uidt: "SingleLineText" },
    { title: "smtp_port", uidt: "Number" },
    { title: "smtp_user", uidt: "SingleLineText" },
    { title: "smtp_pass_enc", uidt: "LongText" },
    { title: "smtp_secure", uidt: "Checkbox" },
    { title: "varsayilan", uidt: "Checkbox" },
    { title: "aktif", uidt: "Checkbox" },
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

async function loadTableCache(): Promise<Record<string, string>> {
  const baseId = await ensureBase();
  const tables = await listTables(baseId);
  const cache: Record<string, string> = {};
  for (const t of tables.list || []) {
    cache[t.title] = t.id;
    cache[t.table_name] = t.id;
  }
  tableCache = cache;
  return cache;
}

async function getTableId(name: string): Promise<string> {
  if (tableCache?.[name]) return tableCache[name];
  const cache = await loadTableCache();
  if (cache[name]) return cache[name];
  // Auto-create missing table if we know its schema
  if (TABLES[name]) {
    const baseId = await ensureBase();
    const created = await ensureTable(baseId, name, TABLES[name]);
    cache[name] = created.id;
    return created.id;
  }
  throw new Error(`Tablo bulunamadı: ${name}. Önce /setup çalıştırın.`);
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

// ---------- Giderler ----------
const GIDER_MAP = {
  date: "tarih",
  category: "kategori",
  description: "aciklama",
  amount: "tutar",
  currency: "para_birimi",
  fx_rate: "kur",
  company_id: "firma_id",
  company_name: "firma_adi",
  receipt_no: "fis_no",
  notes: "notlar",
} as const;

const ExpenseInput = z.object({
  date: z.string().optional().default(""),
  category: z.string().optional().default(""),
  description: z.string().optional().default(""),
  amount: z.number().optional().default(0),
  currency: z.string().optional().default("TRY"),
  fx_rate: z.number().optional().default(1),
  company_id: z.number().nullable().optional(),
  company_name: z.string().optional().default(""),
  receipt_no: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export const listExpenses = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record_[]> => {
    const rows = await listRecords("giderler");
    return rows.map((r) => fromTr(r, GIDER_MAP));
  },
);

export const createExpense = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ExpenseInput.parse(d))
  .handler(async ({ data }) =>
    fromTr(await createRecord("giderler", toTr(data, GIDER_MAP)), GIDER_MAP),
  );

export const updateExpense = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.number(), patch: ExpenseInput.partial() }).parse(d),
  )
  .handler(async ({ data }) =>
    fromTr(await updateRecord("giderler", data.id, toTr(data.patch, GIDER_MAP)), GIDER_MAP),
  );

export const deleteExpense = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("giderler", data.id));

// ---------- Kasa ----------
const KASA_MAP = {
  name: "ad",
  type: "tur",
  currency: "para_birimi",
  opening_balance: "acilis_bakiye",
  notes: "notlar",
} as const;

const KASA_HAR_MAP = {
  date: "tarih",
  account_id: "kasa_id",
  account_name: "kasa_adi",
  type: "tur",
  amount: "tutar",
  currency: "para_birimi",
  fx_rate: "kur",
  description: "aciklama",
  reference: "referans",
} as const;

const AccountInput = z.object({
  name: z.string().min(1, "Ad zorunlu"),
  type: z.string().optional().default("Nakit"),
  currency: z.string().optional().default("TRY"),
  opening_balance: z.number().optional().default(0),
  notes: z.string().optional().default(""),
});

const MovementInput = z.object({
  date: z.string().optional().default(""),
  account_id: z.number(),
  account_name: z.string().optional().default(""),
  type: z.string().optional().default("Gelir"),
  amount: z.number().default(0),
  currency: z.string().optional().default("TRY"),
  fx_rate: z.number().optional().default(1),
  description: z.string().optional().default(""),
  reference: z.string().optional().default(""),
});

export const listAccounts = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record_[]> => {
    const rows = await listRecords("kasalar");
    return rows.map((r) => fromTr(r, KASA_MAP));
  },
);

export const createAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AccountInput.parse(d))
  .handler(async ({ data }) =>
    fromTr(await createRecord("kasalar", toTr(data, KASA_MAP)), KASA_MAP),
  );

export const updateAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.number(), patch: AccountInput.partial() }).parse(d),
  )
  .handler(async ({ data }) =>
    fromTr(await updateRecord("kasalar", data.id, toTr(data.patch, KASA_MAP)), KASA_MAP),
  );

export const deleteAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("kasalar", data.id));

export const listMovements = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record_[]> => {
    const rows = await listRecords("kasa_hareketleri", 500);
    return rows.map((r) => fromTr(r, KASA_HAR_MAP));
  },
);

export const createMovement = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MovementInput.parse(d))
  .handler(async ({ data }) =>
    fromTr(await createRecord("kasa_hareketleri", toTr(data, KASA_HAR_MAP)), KASA_HAR_MAP),
  );

export const deleteMovement = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("kasa_hareketleri", data.id));

// ---------- Bildirimler ----------
const BILDIRIM_MAP = {
  date: "tarih",
  type: "tur",
  title: "baslik",
  message: "mesaj",
  link: "link",
  read: "okundu",
  user: "kullanici",
} as const;

const NotificationInput = z.object({
  date: z.string().optional().default(""),
  type: z.string().optional().default("info"),
  title: z.string().min(1, "Başlık zorunlu"),
  message: z.string().optional().default(""),
  link: z.string().optional().default(""),
  read: z.boolean().optional().default(false),
  user: z.string().optional().default(""),
});

export const listNotifications = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record_[]> => {
    const rows = await listRecords("bildirimler", 500);
    return rows.map((r) => fromTr(r, BILDIRIM_MAP));
  },
);

export const createNotification = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => NotificationInput.parse(d))
  .handler(async ({ data }) =>
    fromTr(await createRecord("bildirimler", toTr(data, BILDIRIM_MAP)), BILDIRIM_MAP),
  );

export const markNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number(), read: z.boolean().default(true) }).parse(d))
  .handler(async ({ data }) =>
    fromTr(await updateRecord("bildirimler", data.id, { okundu: data.read }), BILDIRIM_MAP),
  );

export const deleteNotification = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("bildirimler", data.id));

// ---------- Üretim Emirleri ----------
const URETIM_MAP = {
  number: "numara",
  company_id: "firma_id",
  company_name: "firma_adi",
  product_id: "urun_id",
  product_name: "urun_adi",
  qty: "miktar",
  start_date: "baslama",
  end_date: "bitis",
  status: "durum",
  total_cost: "toplam_maliyet",
  notes: "notlar",
} as const;

const ProductionInput = z.object({
  number: z.string().optional().default(""),
  company_id: z.number().nullable().optional(),
  company_name: z.string().optional().default(""),
  product_id: z.number().nullable().optional(),
  product_name: z.string().optional().default(""),
  qty: z.number().optional().default(0),
  start_date: z.string().optional().default(""),
  end_date: z.string().optional().default(""),
  status: z.string().optional().default("Planlandı"),
  total_cost: z.number().optional().default(0),
  notes: z.string().optional().default(""),
});

export const listProductions = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record_[]> => {
    const rows = await listRecords("uretim_emirleri");
    return rows.map((r) => fromTr(r, URETIM_MAP));
  },
);
export const createProduction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ProductionInput.parse(d))
  .handler(async ({ data }) =>
    fromTr(await createRecord("uretim_emirleri", toTr(data, URETIM_MAP)), URETIM_MAP),
  );
export const updateProduction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.number(), patch: ProductionInput.partial() }).parse(d),
  )
  .handler(async ({ data }) =>
    fromTr(await updateRecord("uretim_emirleri", data.id, toTr(data.patch, URETIM_MAP)), URETIM_MAP),
  );
export const deleteProduction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("uretim_emirleri", data.id));

// ---------- Üretim Aşamaları ----------
const ASAMA_MAP = {
  production_id: "emir_id",
  name: "ad",
  company_id: "firma_id",
  company_name: "firma_adi",
  cost: "maliyet",
  currency: "para_birimi",
  start_date: "baslama",
  end_date: "bitis",
  status: "durum",
  notes: "notlar",
} as const;

const StageInput = z.object({
  production_id: z.number(),
  name: z.string().min(1, "Aşama adı zorunlu"),
  company_id: z.number().nullable().optional(),
  company_name: z.string().optional().default(""),
  cost: z.number().optional().default(0),
  currency: z.string().optional().default("TRY"),
  start_date: z.string().optional().default(""),
  end_date: z.string().optional().default(""),
  status: z.string().optional().default("Beklemede"),
  notes: z.string().optional().default(""),
});

export const listStages = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ production_id: z.number() }).parse(d))
  .handler(async ({ data }): Promise<Record_[]> => {
    const tableId = await getTableId("uretim_asamalari");
    const where = encodeURIComponent(`(emir_id,eq,${data.production_id})`);
    const res = await nc<{ list: Record_[] }>(
      `/api/v2/tables/${tableId}/records?where=${where}&limit=500`,
    );
    return (res.list || []).map((r) => fromTr(r, ASAMA_MAP));
  });
export const createStage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => StageInput.parse(d))
  .handler(async ({ data }) =>
    fromTr(await createRecord("uretim_asamalari", toTr(data, ASAMA_MAP)), ASAMA_MAP),
  );
export const updateStage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.number(), patch: StageInput.partial() }).parse(d),
  )
  .handler(async ({ data }) =>
    fromTr(await updateRecord("uretim_asamalari", data.id, toTr(data.patch, ASAMA_MAP)), ASAMA_MAP),
  );
export const deleteStage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("uretim_asamalari", data.id));

// ---------- Görevler ----------
const GOREV_MAP = {
  date: "tarih",
  title: "baslik",
  description: "aciklama",
  status: "durum",
  priority: "oncelik",
  assignee: "atanan",
  due_date: "son_tarih",
  related_type: "ilgili_tur",
  related_id: "ilgili_id",
} as const;

const TaskInput = z.object({
  date: z.string().optional().default(""),
  title: z.string().min(1, "Başlık zorunlu"),
  description: z.string().optional().default(""),
  status: z.string().optional().default("Açık"),
  priority: z.string().optional().default("Normal"),
  assignee: z.string().optional().default(""),
  due_date: z.string().optional().default(""),
  related_type: z.string().optional().default(""),
  related_id: z.number().nullable().optional(),
});

export const listTasks = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record_[]> => {
    const rows = await listRecords("gorevler", 500);
    return rows.map((r) => fromTr(r, GOREV_MAP));
  },
);
export const createTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TaskInput.parse(d))
  .handler(async ({ data }) =>
    fromTr(await createRecord("gorevler", toTr(data, GOREV_MAP)), GOREV_MAP),
  );
export const updateTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.number(), patch: TaskInput.partial() }).parse(d),
  )
  .handler(async ({ data }) =>
    fromTr(await updateRecord("gorevler", data.id, toTr(data.patch, GOREV_MAP)), GOREV_MAP),
  );
export const deleteTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("gorevler", data.id));

// ---------- Dosyalar ----------
const DOSYA_MAP = {
  date: "tarih",
  name: "ad",
  category: "kategori",
  company_id: "firma_id",
  company_name: "firma_adi",
  folder: "klasor",
  url: "url",
  size: "boyut",
  kind: "tur",
  notes: "notlar",
} as const;

const FileInput = z.object({
  date: z.string().optional().default(""),
  name: z.string().min(1, "Ad zorunlu"),
  category: z.string().optional().default("Genel"),
  company_id: z.number().nullable().optional(),
  company_name: z.string().optional().default(""),
  folder: z.string().optional().default(""),
  url: z.string().optional().default(""),
  size: z.string().optional().default(""),
  kind: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export const listFiles = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record_[]> => {
    const rows = await listRecords("dosyalar", 500);
    return rows.map((r) => fromTr(r, DOSYA_MAP));
  },
);
export const createFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => FileInput.parse(d))
  .handler(async ({ data }) =>
    fromTr(await createRecord("dosyalar", toTr(data, DOSYA_MAP)), DOSYA_MAP),
  );
export const updateFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.number(), patch: FileInput.partial() }).parse(d),
  )
  .handler(async ({ data }) =>
    fromTr(await updateRecord("dosyalar", data.id, toTr(data.patch, DOSYA_MAP)), DOSYA_MAP),
  );
export const deleteFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("dosyalar", data.id));

// ---------- Mail Log ----------
const MAIL_MAP = {
  date: "tarih",
  to: "kime",
  from: "kimden",
  subject: "konu",
  body: "govde",
  status: "durum",
  error: "hata",
  attachment_url: "ek_url",
  company_name: "firma_adi",
} as const;

const MailInput = z.object({
  date: z.string().optional().default(""),
  to: z.string().min(1, "Alıcı zorunlu"),
  from: z.string().optional().default(""),
  subject: z.string().optional().default(""),
  body: z.string().optional().default(""),
  status: z.string().optional().default("Taslak"),
  error: z.string().optional().default(""),
  attachment_url: z.string().optional().default(""),
  company_name: z.string().optional().default(""),
});

export const listMails = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record_[]> => {
    const rows = await listRecords("mail_log", 500);
    return rows.map((r) => fromTr(r, MAIL_MAP));
  },
);
export const createMail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MailInput.parse(d))
  .handler(async ({ data }) =>
    fromTr(await createRecord("mail_log", toTr(data, MAIL_MAP)), MAIL_MAP),
  );
export const updateMail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.number(), patch: MailInput.partial() }).parse(d),
  )
  .handler(async ({ data }) =>
    fromTr(await updateRecord("mail_log", data.id, toTr(data.patch, MAIL_MAP)), MAIL_MAP),
  );
export const deleteMail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("mail_log", data.id));

// ---------- Kategoriler ----------
const KAT_MAP = { name: "ad", type: "tip", color: "renk", active: "aktif" } as const;
const CategoryInput = z.object({
  name: z.string().min(1),
  type: z.enum(["gider", "urun", "teklif"]).default("gider"),
  color: z.string().optional().default(""),
  active: z.boolean().optional().default(true),
});
export const listCategories = createServerFn({ method: "GET" }).handler(async () =>
  (await listRecords("kategoriler", 500)).map((r) => fromTr(r, KAT_MAP)),
);
export const createCategory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CategoryInput.parse(d))
  .handler(async ({ data }) =>
    fromTr(await createRecord("kategoriler", toTr(data, KAT_MAP)), KAT_MAP),
  );
export const updateCategory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number(), patch: CategoryInput.partial() }).parse(d))
  .handler(async ({ data }) =>
    fromTr(await updateRecord("kategoriler", data.id, toTr(data.patch, KAT_MAP)), KAT_MAP),
  );
export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("kategoriler", data.id));

// ---------- Kur Log ----------
const KUR_MAP = { date: "tarih", usd: "usd", eur: "eur", source: "kaynak", notes: "notlar" } as const;
const KurInput = z.object({
  date: z.string().min(1),
  usd: z.number(),
  eur: z.number(),
  source: z.string().optional().default("manuel"),
  notes: z.string().optional().default(""),
});
export const listKurLog = createServerFn({ method: "GET" }).handler(async () =>
  (await listRecords("kur_log", 500)).map((r) => fromTr(r, KUR_MAP)),
);
export const createKurLog = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => KurInput.parse(d))
  .handler(async ({ data }) =>
    fromTr(await createRecord("kur_log", toTr(data, KUR_MAP)), KUR_MAP),
  );
export const deleteKurLog = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("kur_log", data.id));

// ---------- Bildirim Ayarları ----------
const BAY_MAP = { user: "kullanici", type: "tur", mail: "mail_aktif", push: "push_aktif" } as const;
const NotifPrefInput = z.object({
  user: z.string().optional().default("default"),
  type: z.string().min(1),
  mail: z.boolean().optional().default(true),
  push: z.boolean().optional().default(true),
});
export const listNotifPrefs = createServerFn({ method: "GET" }).handler(async () =>
  (await listRecords("bildirim_ayarlari", 500)).map((r) => fromTr(r, BAY_MAP)),
);
export const upsertNotifPref = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number().optional(), data: NotifPrefInput }).parse(d))
  .handler(async ({ data }) => {
    if (data.id) {
      return fromTr(await updateRecord("bildirim_ayarlari", data.id, toTr(data.data, BAY_MAP)), BAY_MAP);
    }
    return fromTr(await createRecord("bildirim_ayarlari", toTr(data.data, BAY_MAP)), BAY_MAP);
  });

// ---------- Kullanıcılar ----------
const USER_MAP = { name: "ad", email: "eposta", role: "rol", active: "aktif", notes: "notlar" } as const;
const UserInput = z.object({
  name: z.string().min(1),
  email: z.string().optional().default(""),
  role: z.enum(["admin", "operator", "viewer"]).default("operator"),
  active: z.boolean().optional().default(true),
  notes: z.string().optional().default(""),
});
export const listUsers = createServerFn({ method: "GET" }).handler(async () =>
  (await listRecords("kullanicilar", 200)).map((r) => fromTr(r, USER_MAP)),
);
export const createUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UserInput.parse(d))
  .handler(async ({ data }) =>
    fromTr(await createRecord("kullanicilar", toTr(data, USER_MAP)), USER_MAP),
  );
export const updateUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number(), patch: UserInput.partial() }).parse(d))
  .handler(async ({ data }) =>
    fromTr(await updateRecord("kullanicilar", data.id, toTr(data.patch, USER_MAP)), USER_MAP),
  );
export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("kullanicilar", data.id));

// ---------- Mail Hesapları (gönderici profilleri) ----------
const MH_MAP = {
  name: "isim",
  from_address: "from_adres",
  signature: "imza",
  smtp_host: "smtp_host",
  smtp_port: "smtp_port",
  smtp_user: "smtp_user",
  smtp_pass_enc: "smtp_pass_enc",
  smtp_secure: "smtp_secure",
  is_default: "varsayilan",
  active: "aktif",
} as const;
const MailAccountInput = z.object({
  name: z.string().min(1),
  from_address: z.string().optional().default(""),
  signature: z.string().optional().default(""),
  smtp_host: z.string().optional().default(""),
  smtp_port: z.number().optional().default(587),
  smtp_user: z.string().optional().default(""),
  smtp_pass_enc: z.string().optional().default(""),
  smtp_secure: z.boolean().optional().default(false),
  is_default: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
});
export const listMailAccounts = createServerFn({ method: "GET" }).handler(async () =>
  (await listRecords("mail_hesaplari", 100)).map((r) => {
    const m = fromTr(r, MH_MAP) as Record<string, unknown>;
    // never return encrypted password to client
    delete m.smtp_pass_enc;
    return { ...m, has_password: Boolean((r as Record<string, unknown>).smtp_pass_enc) };
  }),
);
export const createMailAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MailAccountInput.parse(d))
  .handler(async ({ data }) => {
    const rec = fromTr(await createRecord("mail_hesaplari", toTr(data, MH_MAP)), MH_MAP) as Record<string, unknown>;
    delete rec.smtp_pass_enc;
    return rec as { Id?: number; [k: string]: string | number | boolean | undefined };
  });
export const updateMailAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number(), patch: MailAccountInput.partial() }).parse(d))
  .handler(async ({ data }) => {
    const rec = fromTr(await updateRecord("mail_hesaplari", data.id, toTr(data.patch, MH_MAP)), MH_MAP) as Record<string, unknown>;
    delete rec.smtp_pass_enc;
    return rec as { Id?: number; [k: string]: string | number | boolean | undefined };
  });

export const deleteMailAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("mail_hesaplari", data.id));

// internal: full record (with encrypted pass) - used by mail sender
export async function _internalGetMailAccount(id: number): Promise<Record<string, unknown> | null> {
  const list = await listRecords("mail_hesaplari", 100);
  const row = list.find((r) => (r as Record<string, unknown>).Id === id);
  return row ? (fromTr(row, MH_MAP) as Record<string, unknown>) : null;
}
export async function _internalGetDefaultMailAccount(): Promise<Record<string, unknown> | null> {
  const list = await listRecords("mail_hesaplari", 100);
  const def = list.find((r) => (r as Record<string, unknown>).varsayilan === true && (r as Record<string, unknown>).aktif !== false)
    || list.find((r) => (r as Record<string, unknown>).aktif !== false);
  return def ? (fromTr(def, MH_MAP) as Record<string, unknown>) : null;
}

