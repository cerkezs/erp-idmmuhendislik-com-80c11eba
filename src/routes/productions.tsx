import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Factory } from "lucide-react";

export const Route = createFileRoute("/productions")({
  head: () => ({ meta: [{ title: "Üretim — IDM ERP" }] }),
  component: () => (
    <AppShell>
      <PlaceholderPage
        title="Üretim / DOM"
        description="Üretim emirleri, aşamalar (firma + maliyet), otomatik cari hareket oluşumu."
        icon={Factory}
      />
    </AppShell>
  ),
});
