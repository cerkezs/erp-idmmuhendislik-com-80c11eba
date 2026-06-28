import { createFileRoute } from "@tanstack/react-router";
import { CompanyListView } from "@/components/company-list-view";

export const Route = createFileRoute("/tedarikciler")({
  head: () => ({ meta: [{ title: "Tedarikçiler — IDM ERP" }] }),
  component: () => <CompanyListView tip="Tedarikçi" />,
});
