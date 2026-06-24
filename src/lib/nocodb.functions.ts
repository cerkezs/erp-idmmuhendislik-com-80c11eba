import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------- Low-level HTTP ----------
const BASE_TITLE = "IDM ERP";

function env() {
  const url = process.env.NOCODB_URL?.replace(/\/$/, "");
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

// ---------- Schema definitions ----------
type ColDef = { column_name: string; title: string; uidt: string; dt?: string; dtxp?: string };

const TABLES: Record<string, ColDef[]> = {
  companies: [
    { column_name: "name", title: "Ad", uidt: "SingleLineText" },
    { column_name: "type", title: "Tip", uidt: "SingleLineText" }, // Müşteri / Tedarikçi
    { column_name: "tax_no", title: "Vergi No", uidt: "SingleLineText" },
    { column_name: "tax_office", title: "Vergi Dairesi", uidt: "SingleLineText" },
    { column_name: "phone", title: "Telefon", uidt: "PhoneNumber" },
    { column_name: "email", title: "E-posta", uidt: "Email" },
    { column_name: "address", title: "Adres", uidt: "LongText" },
    { column_name: "notes", title: "Notlar", uidt: "LongText" },
  ],
  products: [
    { column_name: "code", title: "Kod", uidt: "SingleLineText" },
    { column_name: "name", title: "Ad", uidt: "SingleLineText" },
    { column_name: "unit", title: "Birim", uidt: "SingleLineText" },
    { column_name: "price", title: "Fiyat", uidt: "Decimal" },
    { column_name: "currency", title: "Para Birimi", uidt: "SingleLineText" },
    { column_name: "vat_rate", title: "KDV %", uidt: "Decimal" },
    { column_name: "stock", title: "Stok", uidt: "Decimal" },
    { column_name: "notes", title: "Notlar", uidt: "LongText" },
  ],
  quotes: [
    { column_name: "number", title: "Teklif No", uidt: "SingleLineText" },
    { column_name: "company_id", title: "Firma ID", uidt: "Number" },
    { column_name: "company_name", title: "Firma", uidt: "SingleLineText" },
    { column_name: "date", title: "Tarih", uidt: "Date" },
    { column_name: "valid_until", title: "Geçerlilik", uidt: "Date" },
    { column_name: "status", title: "Durum", uidt: "SingleLineText" },
    { column_name: "currency", title: "Para Birimi", uidt: "SingleLineText" },
    { column_name: "subtotal", title: "Ara Toplam", uidt: "Decimal" },
    { column_name: "vat_total", title: "KDV Toplam", uidt: "Decimal" },
    { column_name: "total", title: "Genel Toplam", uidt: "Decimal" },
    { column_name: "notes", title: "Notlar", uidt: "LongText" },
  ],
  quote_items: [
    { column_name: "quote_id", title: "Teklif ID", uidt: "Number" },
    { column_name: "product_id", title: "Ürün ID", uidt: "Number" },
    { column_name: "description", title: "Açıklama", uidt: "LongText" },
    { column_name: "qty", title: "Miktar", uidt: "Decimal" },
    { column_name: "unit_price", title: "Birim Fiyat", uidt: "Decimal" },
    { column_name: "vat_rate", title: "KDV %", uidt: "Decimal" },
    { column_name: "line_total", title: "Satır Toplamı", uidt: "Decimal" },
  ],
  invoices: [
    { column_name: "number", title: "Fatura No", uidt: "SingleLineText" },
    { column_name: "company_id", title: "Firma ID", uidt: "Number" },
    { column_name: "company_name", title: "Firma", uidt: "SingleLineText" },
    { column_name: "date", title: "Tarih", uidt: "Date" },
    { column_name: "due_date", title: "Vade", uidt: "Date" },
    { column_name: "status", title: "Durum", uidt: "SingleLineText" },
    { column_name: "currency", title: "Para Birimi", uidt: "SingleLineText" },
    { column_name: "subtotal", title: "Ara Toplam", uidt: "Decimal" },
    { column_name: "vat_total", title: "KDV Toplam", uidt: "Decimal" },
    { column_name: "total", title: "Genel Toplam", uidt: "Decimal" },
    { column_name: "notes", title: "Notlar", uidt: "LongText" },
  ],
  invoice_items: [
    { column_name: "invoice_id", title: "Fatura ID", uidt: "Number" },
    { column_name: "product_id", title: "Ürün ID", uidt: "Number" },
    { column_name: "description", title: "Açıklama", uidt: "LongText" },
    { column_name: "qty", title: "Miktar", uidt: "Decimal" },
    { column_name: "unit_price", title: "Birim Fiyat", uidt: "Decimal" },
    { column_name: "vat_rate", title: "KDV %", uidt: "Decimal" },
    { column_name: "line_total", title: "Satır Toplamı", uidt: "Decimal" },
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
      body: JSON.stringify({
        table_name: name,
        title: name,
        columns: [
          // NocoDB needs at least one display column; Id auto-added
          ...columns,
        ],
      }),
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

// ---------- Companies ----------
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
    return await listRecords("companies");
  },
);

export const createCompany = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CompanyInput.parse(d))
  .handler(async ({ data }) => createRecord("companies", data));

export const updateCompany = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.number(), patch: CompanyInput.partial() }).parse(d),
  )
  .handler(async ({ data }) => updateRecord("companies", data.id, data.patch));

export const deleteCompany = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }) => deleteRecord("companies", data.id));
