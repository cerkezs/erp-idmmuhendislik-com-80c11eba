import { createServerFn } from "@tanstack/react-start";

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

export const getRates = createServerFn({ method: "GET" }).handler(async (): Promise<RatesPayload> => {
  try {
    const res = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
      headers: { "User-Agent": "Mozilla/5.0 IDM-ERP" },
    });
    if (!res.ok) throw new Error(`TCMB ${res.status}`);
    const xml = await res.text();
    const usd = extractRate(xml, "USD");
    const eur = extractRate(xml, "EUR");
    const dateMatch = xml.match(/Date=\"([^\"]+)\"/);
    if (usd && eur) {
      return {
        usd,
        eur,
        time: dateMatch?.[1] ?? new Date().toISOString().slice(0, 10),
        source: "tcmb",
      };
    }
  } catch {
    // ignore, fallback below
  }
  return {
    usd: 0,
    eur: 0,
    time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    source: "fallback",
  };
});
