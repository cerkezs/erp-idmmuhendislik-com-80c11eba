import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getQuote, getInvoice } from "@/lib/nocodb.functions";

export const Route = createFileRoute("/print/$kind/$id")({
  head: () => ({ meta: [{ title: "Yazdır — IDM ERP" }] }),
  component: PrintPage,
});

type DocItem = {
  description?: string;
  qty?: number;
  unit_price?: number;
  vat_rate?: number;
  line_total?: number;
};

function fmt(n: number | undefined, c = "TRY") {
  const v = Number(n || 0);
  const sym = c === "USD" ? "$" : c === "EUR" ? "€" : "₺";
  return `${v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}`;
}

function PrintPage() {
  const { kind, id } = useParams({ from: "/print/$kind/$id" });
  const isQuote = kind === "teklif";
  const fnRef = useServerFn(isQuote ? getQuote : getInvoice);
  const { data, isLoading } = useQuery({
    queryKey: ["print", kind, id],
    queryFn: () => fnRef({ data: { id: Number(id) } }),
  });

  useEffect(() => {
    if (!isLoading && data) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [isLoading, data]);

  if (isLoading || !data) {
    return <div className="p-10 text-sm text-muted-foreground">Yükleniyor…</div>;
  }

  const d = data as Record<string, unknown> & { items?: DocItem[] };
  const items = d.items || [];
  const cur = (d.currency as string) || "TRY";

  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-black print:p-0">
      <style>{`@media print { @page { margin: 16mm; } body { background: white; } }`}</style>

      <header className="mb-8 flex items-start justify-between border-b border-black/20 pb-6">
        <div>
          <div className="text-2xl font-semibold">IDM Mühendislik</div>
          <div className="mt-1 text-xs text-black/60">idmmuhendislik.com</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold uppercase">
            {isQuote ? "Teklif" : "Fatura"}
          </div>
          <div className="mt-1 text-sm">No: {(d.number as string) || d.Id}</div>
          <div className="text-xs text-black/60">Tarih: {(d.date as string) || "—"}</div>
          {!isQuote && (
            <div className="text-xs text-black/60">
              Vade: {(d.due_date as string) || "—"}
            </div>
          )}
          {isQuote && (
            <div className="text-xs text-black/60">
              Geçerlilik: {(d.valid_until as string) || "—"}
            </div>
          )}
        </div>
      </header>

      <section className="mb-6 text-sm">
        <div className="font-medium">Müşteri</div>
        <div>{(d.company_name as string) || "—"}</div>
      </section>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/30 text-left">
            <th className="py-2">Açıklama</th>
            <th className="py-2 text-right">Miktar</th>
            <th className="py-2 text-right">Birim Fiyat</th>
            <th className="py-2 text-right">KDV %</th>
            <th className="py-2 text-right">Tutar</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-b border-black/10 align-top">
              <td className="py-2">{it.description}</td>
              <td className="py-2 text-right">{it.qty}</td>
              <td className="py-2 text-right">{fmt(it.unit_price, cur)}</td>
              <td className="py-2 text-right">{it.vat_rate}</td>
              <td className="py-2 text-right">{fmt(it.line_total, cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-6 ml-auto w-72 text-sm">
        <div className="flex justify-between py-1">
          <span>Ara Toplam</span><span>{fmt(d.subtotal as number, cur)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span>KDV</span><span>{fmt(d.vat_total as number, cur)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-black/30 pt-2 font-semibold">
          <span>Genel Toplam</span><span>{fmt(d.total as number, cur)}</span>
        </div>
      </section>

      {d.notes ? (
        <section className="mt-8 text-sm">
          <div className="font-medium">Notlar</div>
          <div className="whitespace-pre-wrap text-black/70">{d.notes as string}</div>
        </section>
      ) : null}

      <footer className="mt-12 text-xs text-black/50">
        Bu belge IDM ERP üzerinden oluşturulmuştur.
      </footer>

      <div className="mt-8 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded bg-black px-4 py-2 text-white"
        >
          Yazdır
        </button>
      </div>
    </div>
  );
}
