import { createFileRoute } from "@tanstack/react-router";
import { CompanyListView } from "@/components/company-list-view";

export const Route = createFileRoute("/companies")({
  head: () => ({ meta: [{ title: "Firmalar — IDM ERP" }] }),
  component: () => <CompanyListView />,
});
