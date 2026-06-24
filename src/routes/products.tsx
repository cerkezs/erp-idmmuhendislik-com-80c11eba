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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  listProducts, createProduct, updateProduct, deleteProduct,
} from "@/lib/nocodb.functions";
import { Package, Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Ürünler — IDM ERP" }] }),
  component: ProductsPage,
});

type Product = {
  Id: number;
  code?: string; name?: string; unit?: string;
  price?: number; currency?: string; vat_rate?: number; stock?: number; notes?: string;
};

function ProductsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listProducts);
  const create = useServerFn(createProduct);
  const update = useServerFn(updateProduct);
  const remove = useServerFn(deleteProduct);

  const { data, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: () => list(),
  });

  const createMut = useMutation({
    mutationFn: (d: Omit<Product, "Id">) => create({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: number; patch: Partial<Product> }) => update({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Ürünler</h1>
            <p className="text-sm text-muted-foreground">Ürün kartları ve stok</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Yeni Ürün</Button>
          </DialogTrigger>
          <ProductForm
            initial={editing}
            onSubmit={async (vals) => {
              if (editing) await updateMut.mutateAsync({ id: editing.Id, patch: vals });
              else await createMut.mutateAsync(vals);
              setOpen(false); setEditing(null);
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
            <pre className="mt-1 whitespace-pre-wrap text-xs">{(error as Error).message}</pre>
            <p className="mt-2 text-xs">
              Tablo eksik olabilir. <Link to="/setup" className="underline">/setup</Link> sayfasından kur.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Kod</th>
              <th className="px-3 py-2 text-left">Ad</th>
              <th className="px-3 py-2 text-right">Fiyat</th>
              <th className="px-3 py-2 text-right">KDV %</th>
              <th className="px-3 py-2 text-right">Stok</th>
              <th className="px-3 py-2 text-left">Birim</th>
              <th className="px-3 py-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
            )}
            {!isLoading && data && data.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">Henüz ürün yok.</td></tr>
            )}
            {data?.map((p) => p as Product).map((p) => (
              <tr key={p.Id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 text-muted-foreground">{p.code || "—"}</td>
                <td className="px-3 py-2 font-medium">{p.name || "—"}</td>
                <td className="px-3 py-2 text-right">{(p.price ?? 0).toLocaleString("tr-TR")} {p.currency || "TRY"}</td>
                <td className="px-3 py-2 text-right">{p.vat_rate ?? 0}</td>
                <td className="px-3 py-2 text-right">{p.stock ?? 0}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.unit || "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (confirm(`"${p.name}" silinsin mi?`)) deleteMut.mutate(p.Id);
                  }}>
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

function ProductForm({ initial, onSubmit, submitting }: {
  initial: Product | null;
  onSubmit: (vals: Omit<Product, "Id">) => void | Promise<void>;
  submitting: boolean;
}) {
  const [vals, setVals] = useState<Omit<Product, "Id">>({
    code: initial?.code || "",
    name: initial?.name || "",
    unit: initial?.unit || "adet",
    price: initial?.price ?? 0,
    currency: initial?.currency || "TRY",
    vat_rate: initial?.vat_rate ?? 20,
    stock: initial?.stock ?? 0,
    notes: initial?.notes || "",
  });
  function set<K extends keyof typeof vals>(k: K, v: (typeof vals)[K]) {
    setVals((p) => ({ ...p, [k]: v }));
  }
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{initial ? "Ürün Düzenle" : "Yeni Ürün"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <Label>Kod</Label>
            <Input value={vals.code || ""} onChange={(e) => set("code", e.target.value)} />
          </div>
          <div className="col-span-2 grid gap-1.5">
            <Label>Ad *</Label>
            <Input value={vals.name || ""} onChange={(e) => set("name", e.target.value)} required />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="grid gap-1.5">
            <Label>Fiyat</Label>
            <Input type="number" step="0.01" value={vals.price ?? 0} onChange={(e) => set("price", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Döviz</Label>
            <Input value={vals.currency || "TRY"} onChange={(e) => set("currency", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>KDV %</Label>
            <Input type="number" step="0.01" value={vals.vat_rate ?? 20} onChange={(e) => set("vat_rate", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Birim</Label>
            <Input value={vals.unit || ""} onChange={(e) => set("unit", e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Stok</Label>
          <Input type="number" step="0.01" value={vals.stock ?? 0} onChange={(e) => set("stock", parseFloat(e.target.value) || 0)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Notlar</Label>
          <Textarea rows={2} value={vals.notes || ""} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(vals)} disabled={submitting || !vals.name?.trim()}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor…</> : "Kaydet"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
