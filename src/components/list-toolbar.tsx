import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ListFilterState, SortDir } from "@/hooks/use-list-filter";

export type SortOption = { value: string; label: string; key: string; dir: SortDir };

export type ListToolbarProps = {
  filters: ListFilterState;
  setFilters: (f: ListFilterState) => void;
  placeholder?: string;
  statusOptions?: { value: string; label: string }[];
  categoryOptions?: { value: string; label: string }[];
  showDates?: boolean;
  sortOptions?: SortOption[];
  totalCount?: number;
  filteredCount?: number;
  rightSlot?: React.ReactNode;
};

export function ListToolbar({
  filters, setFilters,
  placeholder = "Ara…",
  statusOptions, categoryOptions, showDates, sortOptions,
  totalCount, filteredCount, rightSlot,
}: ListToolbarProps) {
  const activeCount =
    (filters.q ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0);

  function clear() {
    setFilters({ ...filters, q: "", status: "", category: "", from: "", to: "" });
  }

  return (
    <div className="mb-3 rounded-lg border border-border bg-card p-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder={placeholder}
            className="h-9 pl-7"
          />
        </div>

        {statusOptions && statusOptions.length > 0 && (
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            title="Durum"
          >
            <option value="">Tüm durumlar</option>
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}

        {categoryOptions && categoryOptions.length > 0 && (
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            title="Kategori"
          >
            <option value="">Tüm kategoriler</option>
            {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}

        {showDates && (
          <>
            <Input
              type="date" value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="h-9 w-[140px]" title="Başlangıç"
            />
            <Input
              type="date" value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="h-9 w-[140px]" title="Bitiş"
            />
          </>
        )}

        {sortOptions && sortOptions.length > 0 && (
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={`${filters.sortKey}:${filters.sortDir}`}
            onChange={(e) => {
              const [k, d] = e.target.value.split(":") as [string, SortDir];
              setFilters({ ...filters, sortKey: k, sortDir: d });
            }}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={`${o.key}:${o.dir}`}>{o.label}</option>
            ))}
          </select>
        )}

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="h-9" onClick={clear}>
            <X className="mr-1 h-3.5 w-3.5" /> Temizle ({activeCount})
          </Button>
        )}

        {rightSlot}

        {(totalCount != null || filteredCount != null) && (
          <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
            {filteredCount != null && totalCount != null && filteredCount !== totalCount
              ? `${filteredCount} / ${totalCount}`
              : `${filteredCount ?? totalCount} kayıt`}
          </span>
        )}
      </div>
    </div>
  );
}
