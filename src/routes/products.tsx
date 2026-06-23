import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Package } from "lucide-react";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Ürünler — IDM ERP" }] }),
  component: () => (
    <AppShell>
      <PlaceholderPage
        title="Ürünler & Stok"
        description="Ürün kartları, mevcut stok, minimum stok uyarısı, üretim ve satış geçmişi."
        icon={Package}
      />
    </AppShell>
  ),
});
