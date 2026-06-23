import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { ReceiptText } from "lucide-react";

export const Route = createFileRoute("/invoices")({
  head: () => ({ meta: [{ title: "Faturalar — IDM ERP" }] }),
  component: () => (
    <AppShell>
      <PlaceholderPage
        title="Faturalar"
        description="Fatura kayıtları, vade takibi, kısmi ödeme, kaynak siparişe çift yön bağlantı."
        icon={ReceiptText}
      />
    </AppShell>
  ),
});
