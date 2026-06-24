import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from "@/lib/nocodb.functions";
import { Building2, Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/companies")({
  head: () => ({ meta: [{ title: "Firmalar — IDM ERP" }] }),
  component: CompaniesPage,
});

type Company = {
  Id: number;
  name?: string;
  type?: string;
  tax_no?: string;
  tax_office?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

function CompaniesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCompanies);
  const create = useServerFn(createCompany);
  const update = useServerFn(updateCompany);
  const remove = useServerFn(deleteCompany);

  const { data, isLoading, error } = useQuery({
    queryKey: ["companies"],
    queryFn: () => list(),
  });

  const createMut = useMutation({
    mutationFn: (d: Omit<Company, "Id">) => create({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: number; patch: Partial<Company> }) =>
      update({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });

  const [editing, setEditing] = useState<Company | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Firmalar</h1>
            <p className="text-sm text-muted-foreground">
              Müşteri ve tedarikçi kayıtları
            </p>
          </div>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Yeni Firma
            </Button>
          </DialogTrigger>
          <CompanyForm
            initial={editing}
            onSubmit={async (vals) => {
              if (editing) {
                await updateMut.mutateAsync({ id: editing.Id, patch: vals });
              } else {
                await createMut.mutateAsync(vals);
              }
              setOpen(false);
              setEditing(null);
            }}
            submitting={createMut.isPending || updateMut.isPending}
          />
        </Dialog>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <div className="font-medium text-destructive">Veri yüklenemedi</div>
            <pre className="mt-1 whitespace-pre-wrap text-xs">
              {(error as Error).message}
            </pre>
            <p className="mt-2 text-xs">
              Tablo eksik olabilir.{" "}
              <Link to="/setup" className="underline">
                /setup
              </Link>{" "}
              sayfasından tabloları kur.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Ad</th>
              <th className="px-3 py-2 text-left">Tip</th>
              <th className="px-3 py-2 text-left">Vergi No</th>
              <th className="px-3 py-2 text-left">Telefon</th>
              <th className="px-3 py-2 text-left">E-posta</th>
              <th className="px-3 py-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </td>
              </tr>
            )}
            {!isLoading && data && data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                  Henüz firma yok. Sağ üstten "Yeni Firma" ekleyin.
                </td>
              </tr>
            )}
            {data?.map((c) => c as Company).map((c: Company) => (
              <tr key={c.Id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{c.name || "—"}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    {c.type || "Müşteri"}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{c.tax_no || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.phone || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.email || "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(c);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`"${c.name}" silinsin mi?`)) {
                        deleteMut.mutate(c.Id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function CompanyForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial: Company | null;
  onSubmit: (vals: Omit<Company, "Id">) => void | Promise<void>;
  submitting: boolean;
}) {
  const [vals, setVals] = useState<Omit<Company, "Id">>({
    name: initial?.name || "",
    type: initial?.type || "Müşteri",
    tax_no: initial?.tax_no || "",
    tax_office: initial?.tax_office || "",
    phone: initial?.phone || "",
    email: initial?.email || "",
    address: initial?.address || "",
    notes: initial?.notes || "",
  });

  function set<K extends keyof typeof vals>(k: K, v: (typeof vals)[K]) {
    setVals((p) => ({ ...p, [k]: v }));
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{initial ? "Firma Düzenle" : "Yeni Firma"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="name">Ad *</Label>
            <Input
              id="name"
              value={vals.name || ""}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="type">Tip</Label>
            <Select
              value={vals.type || "Müşteri"}
              onValueChange={(v) => set("type", v)}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Müşteri">Müşteri</SelectItem>
                <SelectItem value="Tedarikçi">Tedarikçi</SelectItem>
                <SelectItem value="Her İkisi">Her İkisi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="tax_no">Vergi No</Label>
            <Input
              id="tax_no"
              value={vals.tax_no || ""}
              onChange={(e) => set("tax_no", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tax_office">Vergi Dairesi</Label>
            <Input
              id="tax_office"
              value={vals.tax_office || ""}
              onChange={(e) => set("tax_office", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              value={vals.phone || ""}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              value={vals.email || ""}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="address">Adres</Label>
          <Textarea
            id="address"
            rows={2}
            value={vals.address || ""}
            onChange={(e) => set("address", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="notes">Notlar</Label>
          <Textarea
            id="notes"
            rows={2}
            value={vals.notes || ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => onSubmit(vals)}
          disabled={submitting || !vals.name?.trim()}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor…
            </>
          ) : (
            "Kaydet"
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
