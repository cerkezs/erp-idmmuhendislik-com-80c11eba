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
  listAccounts, createAccount, updateAccount, deleteAccount,
  listMovements, createMovement, deleteMovement,
} from "@/lib/nocodb.functions";
import { Wallet, Plus, Pencil, Trash2, Loader2, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";

export const Route = createFileRoute("/kasa")({
  head: () => ({ meta: [{ title: "Kasa — IDM ERP" }] }),
  component: KasaPage,
});

type Account = {
  Id: number; name?: string; type?: string; currency?: string;
  opening_balance?: number; notes?: string;
};
type Movement = {
  Id: number; date?: string; account_id?: number; account_name?: string;
  type?: string; amount?: number; currency?: string; fx_rate?: number;
  description?: string; reference?: string;
};

function KasaPage() {
  const qc = useQueryClient();
  const listA = useServerFn(listAccounts);
  const createA = useServerFn(createAccount);
  const updateA = useServerFn(updateAccount);
  const removeA = useServerFn(deleteAccount);
  const listM = useServerFn(listMovements);
  const createM = useServerFn(createMovement);
  const removeM = useServerFn(deleteMovement);

  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: () => listA() });
  const movementsQ = useQuery({ queryKey: ["movements"], queryFn: () => listM() });

  const accounts = (accountsQ.data || []) as Account[];
  const movements = (movementsQ.data || []) as Movement[];

  const createAMut = useMutation({
    mutationFn: (d: Omit<Account, "Id">) => createA({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
  const updateAMut = useMutation({
    mutationFn: (v: { id: number; patch: Partial<Account> }) => updateA({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
  const deleteAMut = useMutation({
    mutationFn: (id: number) => removeA({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
  const createMMut = useMutation({
    mutationFn: (d: Omit<Movement, "Id">) => createM({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movements"] }),
  });
  const deleteMMut = useMutation({
    mutationFn: (id: number) => removeM({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movements"] }),
  });

  const [editingA, setEditingA] = useState<Account | null>(null);
  const [openA, setOpenA] = useState(false);
  const [openM, setOpenM] = useState(false);

  function balanceFor(acc: Account): number {
    const sign = (t?: string) => t === "Gider" ? -1 : 1;
    const moves = movements.filter((m) => m.account_id === acc.Id);
    return (acc.opening_balance || 0) + moves.reduce((s, m) => s + sign(m.type) * (m.amount || 0), 0);
  }

  const err = accountsQ.error || movementsQ.error;

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Kasa</h1>
            <p className="text-sm text-muted-foreground">Kasa hesapları & nakit akışı</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={openM} onOpenChange={setOpenM}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={accounts.length === 0}>
                <Plus className="mr-2 h-4 w-4" /> Hareket
              </Button>
            </DialogTrigger>
            <MovementForm
              accounts={accounts}
              onSubmit={async (vals) => { await createMMut.mutateAsync(vals); setOpenM(false); }}
              submitting={createMMut.isPending}
            />
          </Dialog>
          <Dialog open={openA} onOpenChange={(o) => { setOpenA(o); if (!o) setEditingA(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Yeni Kasa</Button>
            </DialogTrigger>
            <AccountForm
              initial={editingA}
              onSubmit={async (vals) => {
                if (editingA) await updateAMut.mutateAsync({ id: editingA.Id, patch: vals });
                else await createAMut.mutateAsync(vals);
                setOpenA(false); setEditingA(null);
              }}
              submitting={createAMut.isPending || updateAMut.isPending}
            />
          </Dialog>
        </div>
      </div>

      {err && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <div className="font-medium text-destructive">Veri yüklenemedi</div>
            <pre className="mt-1 whitespace-pre-wrap text-xs">{(err as Error).message}</pre>
            <p className="mt-2 text-xs">
              Tablo eksik olabilir. <Link to="/setup" className="underline">/setup</Link> sayfasından kur.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accountsQ.isLoading && (
          <div className="col-span-full p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        )}
        {accounts.map((a) => (
          <div key={a.Id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{a.type || "Nakit"}</div>
                <div className="text-base font-semibold">{a.name}</div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditingA(a); setOpenA(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  if (confirm(`"${a.name}" silinsin mi?`)) deleteAMut.mutate(a.Id);
                }}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="mt-3 text-2xl font-semibold tabular-nums">
              {balanceFor(a).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}{" "}
              <span className="text-base font-normal text-muted-foreground">{a.currency || "TRY"}</span>
            </div>
          </div>
        ))}
        {!accountsQ.isLoading && accounts.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Henüz kasa yok. "Yeni Kasa" ile başlayın.
          </div>
        )}
      </div>

      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Son Hareketler</h2>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Tarih</th>
              <th className="px-3 py-2 text-left">Kasa</th>
              <th className="px-3 py-2 text-left">Tür</th>
              <th className="px-3 py-2 text-left">Açıklama</th>
              <th className="px-3 py-2 text-right">Tutar</th>
              <th className="px-3 py-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {movementsQ.isLoading && (
              <tr><td colSpan={6} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
            )}
            {!movementsQ.isLoading && movements.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">Henüz hareket yok.</td></tr>
            )}
            {movements.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((m) => (
              <tr key={m.Id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 text-muted-foreground">{m.date || "—"}</td>
                <td className="px-3 py-2">{m.account_name || "—"}</td>
                <td className="px-3 py-2">
                  {m.type === "Gider" ? (
                    <span className="inline-flex items-center gap-1 text-destructive"><ArrowDownRight className="h-3.5 w-3.5" /> Gider</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400"><ArrowUpRight className="h-3.5 w-3.5" /> Gelir</span>
                  )}
                </td>
                <td className="px-3 py-2">{m.description || "—"}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {m.type === "Gider" ? "−" : "+"}{(m.amount ?? 0).toLocaleString("tr-TR")} {m.currency || "TRY"}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (confirm("Hareket silinsin mi?")) deleteMMut.mutate(m.Id);
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

function AccountForm({ initial, onSubmit, submitting }: {
  initial: Account | null;
  onSubmit: (vals: Omit<Account, "Id">) => void | Promise<void>;
  submitting: boolean;
}) {
  const [vals, setVals] = useState<Omit<Account, "Id">>({
    name: initial?.name || "",
    type: initial?.type || "Nakit",
    currency: initial?.currency || "TRY",
    opening_balance: initial?.opening_balance ?? 0,
    notes: initial?.notes || "",
  });
  function set<K extends keyof typeof vals>(k: K, v: (typeof vals)[K]) {
    setVals((p) => ({ ...p, [k]: v }));
  }
  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{initial ? "Kasa Düzenle" : "Yeni Kasa"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label>Ad *</Label>
          <Input value={vals.name || ""} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Tür</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={vals.type || "Nakit"} onChange={(e) => set("type", e.target.value)}>
              <option>Nakit</option>
              <option>Banka</option>
              <option>POS</option>
              <option>Diğer</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>Para Birimi</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={vals.currency || "TRY"} onChange={(e) => set("currency", e.target.value)}>
              <option>TRY</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Açılış Bakiyesi</Label>
          <Input type="number" step="0.01" value={vals.opening_balance ?? 0}
            onChange={(e) => set("opening_balance", parseFloat(e.target.value) || 0)} />
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

function MovementForm({ accounts, onSubmit, submitting }: {
  accounts: Account[];
  onSubmit: (vals: Omit<Movement, "Id">) => void | Promise<void>;
  submitting: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [vals, setVals] = useState<Omit<Movement, "Id">>({
    date: today,
    account_id: accounts[0]?.Id || 0,
    account_name: accounts[0]?.name || "",
    type: "Gelir",
    amount: 0,
    currency: accounts[0]?.currency || "TRY",
    fx_rate: 1,
    description: "",
    reference: "",
  });
  function set<K extends keyof typeof vals>(k: K, v: (typeof vals)[K]) {
    setVals((p) => ({ ...p, [k]: v }));
  }
  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Yeni Hareket</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Tarih</Label>
            <Input type="date" value={vals.date || ""} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Tür</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={vals.type || "Gelir"} onChange={(e) => set("type", e.target.value)}>
              <option>Gelir</option>
              <option>Gider</option>
            </select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Kasa</Label>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={vals.account_id}
            onChange={(e) => {
              const id = Number(e.target.value);
              const acc = accounts.find((a) => a.Id === id);
              setVals((p) => ({ ...p, account_id: id, account_name: acc?.name || "", currency: acc?.currency || p.currency }));
            }}>
            {accounts.map((a) => <option key={a.Id} value={a.Id}>{a.name} ({a.currency})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <Label>Tutar</Label>
            <Input type="number" step="0.01" value={vals.amount ?? 0} onChange={(e) => set("amount", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Döviz</Label>
            <Input value={vals.currency || "TRY"} onChange={(e) => set("currency", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Kur</Label>
            <Input type="number" step="0.0001" value={vals.fx_rate ?? 1} onChange={(e) => set("fx_rate", parseFloat(e.target.value) || 1)} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Açıklama</Label>
          <Input value={vals.description || ""} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Referans (opsiyonel)</Label>
          <Input value={vals.reference || ""} onChange={(e) => set("reference", e.target.value)} placeholder="Fatura no, gider no…" />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(vals)} disabled={submitting || !vals.account_id || !vals.amount}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor…</> : "Kaydet"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
