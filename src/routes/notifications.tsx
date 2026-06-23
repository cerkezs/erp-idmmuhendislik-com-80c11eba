import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Bildirimler — IDM ERP" }] }),
  component: () => (
    <AppShell>
      <PlaceholderPage
        title="Bildirimler"
        description="Vade yaklaşan fatura, ödeme geldi, stok minimum altı, üretim aşaması bitti — uygulama içi / push / e-posta."
        icon={Bell}
      />
    </AppShell>
  ),
});
