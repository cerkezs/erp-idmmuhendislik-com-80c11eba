import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { ListChecks } from "lucide-react";

export const Route = createFileRoute("/actions")({
  head: () => ({ meta: [{ title: "Aksiyon & Görev — IDM ERP" }] }),
  component: () => (
    <AppShell>
      <PlaceholderPage
        title="Aksiyon & Görev"
        description="Notlar, hatırlatıcılar, atanmış görevler. Her kayıtta 'kim · ne zaman' rozeti."
        icon={ListChecks}
      />
    </AppShell>
  ),
});
