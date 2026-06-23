import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/kasa")({
  head: () => ({ meta: [{ title: "Kasa — IDM ERP" }] }),
  component: () => (
    <AppShell>
      <PlaceholderPage
        title="Kasa"
        description="Çoklu kasa (Nakit, Banka-TL, Banka-USD, Banka-EUR). Anlık bakiye, gelen/giden, bekleyen alacak, net kâr/zarar."
        icon={Wallet}
      />
    </AppShell>
  ),
});
