import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export type ListFilterState = {
  q: string;
  status: string; // "" = tümü
  category: string; // "" = tümü
  from: string;
  to: string;
  sortKey: string;
  sortDir: SortDir;
};

export type ListFilterOptions = {
  initialSortKey?: string;
  initialSortDir?: SortDir;
};

export function emptyListFilters(initialSortKey = "date", initialSortDir: SortDir = "desc"): ListFilterState {
  return { q: "", status: "", category: "", from: "", to: "", sortKey: initialSortKey, sortDir: initialSortDir };
}

export function useListFilter(opts: ListFilterOptions = {}) {
  const [filters, setFilters] = useState<ListFilterState>(() =>
    emptyListFilters(opts.initialSortKey, opts.initialSortDir),
  );
  const reset = () => setFilters(emptyListFilters(opts.initialSortKey, opts.initialSortDir));
  return { filters, setFilters, reset };
}

export type FilterConfig<T> = {
  searchKeys?: (keyof T | ((row: T) => string | number | undefined | null))[];
  dateKey?: keyof T;
  statusKey?: keyof T;
  categoryKey?: keyof T;
};

export function applyListFilter<T>(rows: T[], filters: ListFilterState, cfg: FilterConfig<T>): T[] {
  const q = filters.q.trim().toLowerCase();
  let out = rows.slice();

  if (q && cfg.searchKeys?.length) {
    out = out.filter((r) =>
      cfg.searchKeys!.some((k) => {
        const v = typeof k === "function" ? k(r) : (r as Record<string, unknown>)[k as string];
        return v != null && String(v).toLowerCase().includes(q);
      }),
    );
  }
  if (filters.status && cfg.statusKey) {
    out = out.filter((r) => String((r as Record<string, unknown>)[cfg.statusKey as string] || "") === filters.status);
  }
  if (filters.category && cfg.categoryKey) {
    out = out.filter((r) => String((r as Record<string, unknown>)[cfg.categoryKey as string] || "") === filters.category);
  }
  if ((filters.from || filters.to) && cfg.dateKey) {
    out = out.filter((r) => {
      const raw = (r as Record<string, unknown>)[cfg.dateKey as string];
      const d = raw ? String(raw).slice(0, 10) : "";
      if (!d) return false;
      if (filters.from && d < filters.from) return false;
      if (filters.to && d > filters.to) return false;
      return true;
    });
  }
  if (filters.sortKey) {
    const k = filters.sortKey;
    const dir = filters.sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      const av = (a as Record<string, unknown>)[k];
      const bv = (b as Record<string, unknown>)[k];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "tr") * dir;
    });
  }
  return out;
}

export function useFilteredList<T>(rows: T[] | undefined, filters: ListFilterState, cfg: FilterConfig<T>) {
  return useMemo(() => applyListFilter(rows || [], filters, cfg), [rows, filters, cfg]);
}
