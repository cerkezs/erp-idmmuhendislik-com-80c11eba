import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listCompanies, createCompany, updateCompany, deleteCompany,
} from "@/lib/nocodb.functions";
import { Building2, Plus, Pencil, Trash2, Loader2, AlertCircle, Eye, Users, Truck } from "lucide-react";
import { ListToolbar } from "@/components/list-toolbar";
import { useListFilter, useFilteredList } from "@/hooks/use-list-filter";
import { useMe } from "@/hooks/use-me";
import { crudToast, errorToast } from "@/lib/toast";

export type Company = {
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

export function CompanyListView({ tip }: { tip?: "Müşteri" | "Tedarikçi" }) {
  const qc = useQueryClient();
  const list = useServerFn(listCompanies);
  const create = useServerFn(createCompany);
  const update = useServerFn(updateCompany);
  const remove = useServerFn(deleteCompany);

  const { data, isLoading, error } = useQuery({
    queryKey: ["companies"],
    queryFn: () => list(),
  });

  const { canWrite, canDelete } = useMe();

  const createMut = useMutation({
    mutationFn: (d: Omit<Company, "Id">) => create({ data: d }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); crudToast("create", "Firma"); },
    onError: (e) => errorToast(e),
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: number; patch: Partial<Company> }) => update({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); crudToast("update", "Firma"); },
    onError: (e) => errorToast(e),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); crudToast("delete", "Firma"); },
    onError: (e) => errorToast(e),
  });

  const [editing, setEditing] = useState<Company | null>(null);
  const [open, setOpen] = useState(false);

  const { filters, setFilters } = useListFilter({ initialSortKey: "name", initialSortDir: "asc" });

  // tip filtresi: tedarikçi/müşteri sayfasında ilgili kayıtlar (+ "Her İkisi")
  const base = (data as Company[] | undefined) || [];
  const scoped = tip
    ? base.filter((c) => c.type === tip || c.type === "Her İkisi")
    : base;

  const filtered = useFilteredList<Company>(scoped, filters, {
    searchKeys: ["name", "tax_no", "phone", "email"],
    statusKey: tip ? undefined : "type",
  });

  const Title = tip === "Müşteri" ? "Müşteriler" : tip === "Tedarikçi" ? "Tedarikçiler" : "Firmalar";
  const Icon = tip === "Tedarikçi" ? Truck : tip === "Müşteri" ? Users : Building2;
  const newBtn = tip === "Tedarikçi" ? "Yeni Tedarikçi" : tip === "Müşteri" ? "Yeni Müşteri" : "Yeni Firma";

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{Title}</h1>
            <p className="text-sm text-muted-foreground">
              {tip ? `${tip} kartları & cari hareketler` : "Müşteri ve tedarikçi kayıtları"}
            </p>
          </div>
        </div>
        {canWrite && (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> {newBtn}</Button>
          </DialogTrigger>
          <CompanyForm
            initial={editing}
            defaultType={tip || "Müşteri"}
            onSubmit={async (vals) => {
              if (editing) await updateMut.mutateAsync({ id: editing.Id, patch: vals });
              else await createMut.mutateAsync(vals);
              setOpen(false); setEditing(null);
            }}
            submitting={createMut.isPending || updateMut.isPending}
          />
        </Dialog>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <div className="font-medium text-destructive">Veri yüklenemedi</div>
            <pre className="mt-1 whitespace-pre-wrap text-xs">{(error as Error).message}</pre>
            <p className="mt-2 text-xs">Tablo eksik olabilir. <Link to="/setup" className="underline">/setup</Link> sayfasından tabloları kur.</p>
          </div>
        </div>
      )}

      <ListToolbar
        filters={filters}
        setFilters={setFilters}
        placeholder="Ara: ad, vergi no, telefon, e-posta…"
        statusOptions={tip ? undefined : [
          { value: "Müşteri", label: "Müşteri" },
          { value: "Tedarikçi", label: "Tedarikçi" },
          { value: "Her İkisi", label: "Her İkisi" },
        ]}
        sortOptions={[
          { value: "name-asc", key: "name", dir: "asc", label: "Ad (A→Z)" },
          { value: "name-desc", key: "name", dir: "desc", label: "Ad (Z→A)" },
          { value: "Id-desc", key: "Id", dir: "desc", label: "Yeni eklenen" },
          { value: "Id-asc", key: "Id", dir: "asc", label: "Önce eski" },
        ]}
        totalCount={scoped.length}
        filteredCount={filtered.length}
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
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
              <tr><td colSpan={6} className="px-3 py-10 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              </td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                {scoped.length === 0 ? `Henüz ${tip ? tip.toLowerCase() : "firma"} yok.` : "Filtreyle eşleşen kayıt yok."}
              </td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.Id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">
                  <Link to="/companies/$id" params={{ id: String(c.Id) }} className="hover:underline">
                    {c.name || "—"}
                  </Link>
                </td>
                <td className="px-3 py-2"><span className="rounded bg-muted px-2 py-0.5 text-xs">{c.type || "Müşteri"}</span></td>
                <td className="px-3 py-2 text-muted-foreground">{c.tax_no || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.phone || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.email || "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Link to="/companies/$id" params={{ id: String(c.Id) }}>
                    <Button variant="ghost" size="sm" title="Profil"><Eye className="h-3.5 w-3.5" /></Button>
                  </Link>
                  {canWrite && (
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      if (confirm(`"${c.name}" silinsin mi?`)) deleteMut.mutate(c.Id);
                    }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
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
  initial, onSubmit, submitting, defaultType,
}: {
  initial: Company | null;
  onSubmit: (vals: Omit<Company, "Id">) => void | Promise<void>;
  submitting: boolean;
  defaultType: string;
}) {
  const [vals, setVals] = useState<Omit<Company, "Id">>({
    name: initial?.name || "",
    type: initial?.type || defaultType,
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
      <DialogHeader><DialogTitle>{initial ? "Firma Düzenle" : "Yeni Firma"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="name">Ad *</Label>
            <Input id="name" value={vals.name || ""} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="type">Tip</Label>
            <Select value={vals.type || "Müşteri"} onValueChange={(v) => set("type", v)}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Müşteri">Müşteri</SelectItem>
                <SelectItem value="Tedarikçi">Tedarikçi</SelectItem>
                <SelectItem value="Her İkisi">Her İkisi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>Vergi No</Label>
            <Input value={vals.tax_no || ""} onChange={(e) => set("tax_no", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Vergi Dairesi</Label>
            <Input value={vals.tax_office || ""} onChange={(e) => set("tax_office", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>Telefon</Label>
            <Input value={vals.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>E-posta</Label>
            <Input type="email" value={vals.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
        </div>
        <div className="grid gap-1.5"><Label>Adres</Label>
          <Textarea rows={2} value={vals.address || ""} onChange={(e) => set("address", e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>Notlar</Label>
          <Textarea rows={2} value={vals.notes || ""} onChange={(e) => set("notes", e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(vals)} disabled={submitting || !vals.name?.trim()}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor…</> : "Kaydet"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
