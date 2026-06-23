import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Giderler — IDM ERP" }] }),
  component: () => (
    <AppShell>
      <PlaceholderPage
        title="Şirket Giderleri"
        description="Yakıt, malzeme, kira, maaş gibi giderler. Fiş yüklendiğinde otomatik Dosyalar/_giderler altına kaydedilir."
        icon={Receipt}
      />
    </AppShell>
  ),
});
