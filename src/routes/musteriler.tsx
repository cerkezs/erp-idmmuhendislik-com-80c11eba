import { createFileRoute } from "@tanstack/react-router";
import { CompanyListView } from "@/components/company-list-view";

export const Route = createFileRoute("/musteriler")({
  head: () => ({ meta: [{ title: "Müşteriler — IDM ERP" }] }),
  component: () => <CompanyListView tip="Müşteri" />,
});
