import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/quotes")({
  head: () => ({ meta: [{ title: "Teklifler — IDM ERP" }] }),
  component: () => (
    <AppShell>
      <PlaceholderPage
        title="Teklifler"
        description="Teklif → onay → sipariş → faturalandı akışı. Çoklu döviz, PDF üretimi, e-posta gönderimi."
        icon={FileText}
      />
    </AppShell>
  ),
});
