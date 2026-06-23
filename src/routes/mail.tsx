import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/mail")({
  head: () => ({ meta: [{ title: "Mail — IDM ERP" }] }),
  component: () => (
    <AppShell>
      <PlaceholderPage
        title="Mail Gönderim"
        description="Kişisel SMTP veya ortak hesaplardan firma yetkilisine gönderim. Ek olarak Dosyalar / cihaz / anlık PDF."
        icon={Mail}
      />
    </AppShell>
  ),
});
