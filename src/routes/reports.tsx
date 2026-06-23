import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Raporlar — IDM ERP" }] }),
  component: () => (
    <AppShell>
      <PlaceholderPage
        title="Raporlar"
        description="Tarih aralığı + döviz seçimi. Genel mali özet, teklifler, faturalar, cari, gelir, gider — PDF + Excel."
        icon={BarChart3}
      />
    </AppShell>
  ),
});
