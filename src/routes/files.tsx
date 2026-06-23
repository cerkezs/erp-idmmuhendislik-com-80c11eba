import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Files } from "lucide-react";

export const Route = createFileRoute("/files")({
  head: () => ({ meta: [{ title: "Dosyalar — IDM ERP" }] }),
  component: () => (
    <AppShell>
      <PlaceholderPage
        title="Dosyalar"
        description="Firma → klasör ağacı, şirket giderleri, sipariş ↔ fatura çift yön bağlantı, arama."
        icon={Files}
      />
    </AppShell>
  ),
});
