import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/companies")({
  head: () => ({ meta: [{ title: "Firmalar — IDM ERP" }] }),
  component: () => (
    <AppShell>
      <PlaceholderPage
        title="Firmalar"
        description="Müşteri ve tedarikçi kayıtları. Her firma için otomatik dosya klasörü, cari hesap ve yetkili kişiler."
        icon={Building2}
      />
    </AppShell>
  ),
});
