import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type RatesPayload = {
  usd: number;
  eur: number;
  time: string;
  source: "tcmb" | "fallback";
};

function extractRate(xml: string, code: string): number | null {
  const re = new RegExp(
    `<Currency[^>]*CurrencyCode=\"${code}\"[\\s\\S]*?<ForexSelling>([^<]+)</ForexSelling>`,
    "i",
  );
  const m = xml.match(re);
  if (!m) return null;
  const v = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

async function fetchTcmbXml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 IDM-ERP" } });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

export const getRates = createServerFn({ method: "GET" }).handler(async (): Promise<RatesPayload> => {
  const xml = await fetchTcmbXml("https://www.tcmb.gov.tr/kurlar/today.xml");
  if (xml) {
    const usd = extractRate(xml, "USD");
    const eur = extractRate(xml, "EUR");
    const dateMatch = xml.match(/Date=\"([^\"]+)\"/);
    if (usd && eur) {
      return {
        usd, eur,
        time: dateMatch?.[1] ?? new Date().toISOString().slice(0, 10),
        source: "tcmb",
      };
    }
  }
  return {
    usd: 0, eur: 0,
    time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    source: "fallback",
  };
});

// Belirli bir tarihteki TCMB kurunu döner. Hafta sonu/tatil ise son 7 günde geriye gider.
// Dönüş: { usd, eur, date, source } veya null (hiç bulunamadı).
export const getRateForDate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ date: z.string().min(8) }).parse(d))
  .handler(async ({ data }): Promise<{ usd: number; eur: number; date: string; source: string } | null> => {
    const target = new Date(data.date + "T00:00:00Z");
    if (Number.isNaN(target.getTime())) return null;
    const todayIso = new Date().toISOString().slice(0, 10);

    // Bugün ise today.xml
    if (data.date >= todayIso) {
      const xml = await fetchTcmbXml("https://www.tcmb.gov.tr/kurlar/today.xml");
      if (xml) {
        const usd = extractRate(xml, "USD");
        const eur = extractRate(xml, "EUR");
        if (usd && eur) return { usd, eur, date: todayIso, source: "tcmb-today" };
      }
    }

    // Arşiv: YYYYMM/DDMMYYYY.xml — son 7 güne kadar geriye git
    for (let i = 0; i < 7; i++) {
      const d = new Date(target.getTime() - i * 86400000);
      const dd = String(d.getUTCDate()).padStart(2, "0");
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const yyyy = String(d.getUTCFullYear());
      const url = `https://www.tcmb.gov.tr/kurlar/${yyyy}${mm}/${dd}${mm}${yyyy}.xml`;
      const xml = await fetchTcmbXml(url);
      if (!xml) continue;
      const usd = extractRate(xml, "USD");
      const eur = extractRate(xml, "EUR");
      if (usd && eur) {
        return { usd, eur, date: `${yyyy}-${mm}-${dd}`, source: i === 0 ? "tcmb-archive" : "tcmb-archive-prev" };
      }
    }
    return null;
  });
