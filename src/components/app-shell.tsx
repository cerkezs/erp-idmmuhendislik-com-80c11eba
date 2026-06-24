import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, Building2, ChevronDown, RefreshCw } from "lucide-react";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getRates } from "@/lib/rates.functions";

const GROUP_LABEL: Record<string, string> = {
  main: "Genel",
  ops: "Operasyon",
  fin: "Finans",
  system: "Sistem",
};

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  const groups = ["main", "ops", "fin", "system"] as const;

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar — desktop sabit, mobilde drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold" onClick={() => setOpen(false)}>
            <span className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="text-sm tracking-tight">IDM ERP</span>
          </Link>
          <button
            className="md:hidden rounded-md p-2 hover:bg-sidebar-accent"
            onClick={() => setOpen(false)}
            aria-label="Menüyü kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {groups.map((g) => (
            <div key={g} className="mb-4">
              <div className="px-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
                {GROUP_LABEL[g]}
              </div>
              <ul className="space-y-0.5">
                {MODULES.filter((m) => m.group === g).map((m) => {
                  const Icon = m.icon;
                  const active =
                    m.to === "/" ? path === "/" : path === m.to || path.startsWith(`${m.to}/`);
                  return (
                    <li key={m.to}>
                      <Link
                        to={m.to}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{m.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-2 text-[11px] text-sidebar-foreground/60">
          v0.1 · idmmuhendislik.com
        </div>
      </aside>

      {/* Mobile backdrop */}
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Menüyü kapat"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-h-screen w-full flex-col md:pl-72">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["tcmb-rates"],
    queryFn: () => getRates(),
    staleTime: 1000 * 60 * 30,
    refetchInterval: 1000 * 60 * 60,
  });

  const fmt = (n?: number) => (n && n > 0 ? n.toFixed(4) : "—");
  const usd = fmt(data?.usd);
  const eur = fmt(data?.eur);
  const last = data?.time ?? "—";
  const label = data?.source === "tcmb" ? "TCMB" : "—";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur sm:px-6">
      <button
        className="md:hidden rounded-md p-2 hover:bg-accent"
        onClick={onMenu}
        aria-label="Menüyü aç"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex flex-1 items-center gap-3 text-xs sm:text-sm">
        <div className="hidden items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 sm:flex">
          <span className="tabular-nums">$ {usd} ₺</span>
          <span className="text-muted-foreground">·</span>
          <span className="tabular-nums">€ {eur} ₺</span>
          <span className="text-muted-foreground">·</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
            {label}
          </span>
          <span className="text-muted-foreground">{last}</span>
          <button
            className="ml-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
            title="Kurları yenile"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
        {/* Mobil özet */}
        <div className="flex items-center gap-2 sm:hidden">
          <span className="rounded-md bg-muted px-2 py-1 text-[11px] tabular-nums">
            $ {usd} · € {eur}
          </span>
        </div>
      </div>

      <div className="hidden h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground sm:grid">
        <span className="text-xs font-medium">YK</span>
      </div>
    </header>
  );
}
