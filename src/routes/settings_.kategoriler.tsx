import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  listCategories, createCategory, updateCategory, deleteCategory,
} from "@/lib/nocodb.functions";
import { Tags, Plus, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/settings_/kategoriler")({
  head: () => ({ meta: [{ title: "Kategoriler — Ayarlar" }] }),
  component: KategorilerPage,
});

type Cat = { Id: number; name?: string; type?: string; color?: string; active?: boolean };

function KategorilerPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCategories);
  const create = useServerFn(createCategory);
  const update = useServerFn(updateCategory);
  const remove = useServerFn(deleteCategory);

  const q = useQuery({ queryKey: ["categories"], queryFn: () => list() });
  const items = (q.data || []) as Cat[];

  const createMut = useMutation({
    mutationFn: (d: { name: string; type: "gider" | "urun" | "teklif"; color: string }) =>
      create({ data: { ...d, active: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
  const toggleMut = useMutation({
    mutationFn: (v: { id: number; active: boolean }) =>
      update({ data: { id: v.id, patch: { active: v.active } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl">
        <Header />
        <Tabs defaultValue="gider" className="mt-4">
          <TabsList>
            <TabsTrigger value="gider">Gider</TabsTrigger>
            <TabsTrigger value="urun">Ürün</TabsTrigger>
            <TabsTrigger value="teklif">Teklif</TabsTrigger>
          </TabsList>
          {(["gider", "urun", "teklif"] as const).map((t) => (
            <TabsContent key={t} value={t}>
              <CategoryList
                type={t}
                items={items.filter((i) => i.type === t)}
                loading={q.isLoading}
                onCreate={(name, color) => createMut.mutate({ name, type: t, color })}
                onToggle={(id, active) => toggleMut.mutate({ id, active })}
                onDelete={(id) => deleteMut.mutate(id)}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppShell>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
        <Tags className="h-5 w-5" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">Kategoriler</h1>
        <p className="text-sm text-muted-foreground">Gider, ürün ve teklif kategorilerini buradan yönetin.</p>
      </div>
    </div>
  );
}

function CategoryList({
  type, items, loading, onCreate, onToggle, onDelete,
}: {
  type: string;
  items: Cat[];
  loading: boolean;
  onCreate: (name: string, color: string) => void;
  onToggle: (id: number, active: boolean) => void;
  onDelete: (id: number) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");
  return (
    <div className="mt-3">
      <div className="mb-3 flex gap-2">
        <Input placeholder={`Yeni ${type} kategorisi`} value={name} onChange={(e) => setName(e.target.value)} />
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 rounded border border-input" />
        <Button onClick={() => { if (name.trim()) { onCreate(name.trim(), color); setName(""); } }}>
          <Plus className="mr-1 h-4 w-4" /> Ekle
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">Ad</th><th className="px-3 py-2 text-left">Renk</th><th className="px-3 py-2 text-left">Aktif</th><th className="px-3 py-2 text-right">İşlem</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-3 py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Henüz kayıt yok.</td></tr>}
            {items.map((c) => (
              <tr key={c.Id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2"><span className="inline-block h-4 w-8 rounded" style={{ background: c.color || "#94a3b8" }} /></td>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={c.active ?? true} onChange={(e) => onToggle(c.Id, e.target.checked)} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm(`"${c.name}" silinsin mi?`)) onDelete(c.Id); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
