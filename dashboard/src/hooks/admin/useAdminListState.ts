import { useState, useEffect } from "react";

export interface AdminListState<F> {
  page: number;
  pageSize: number;
  filters: F;
  debouncedSearch: string;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: F | ((prev: F) => F)) => void;
}

export function useAdminListState<F extends { search?: string }>(
  initialFilters: F,
  debounceMs = 500,
): AdminListState<F> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(10);
  const [filters, setFiltersState] = useState<F>(initialFilters);

  const [debouncedSearch, setDebouncedSearch] = useState(
    initialFilters.search ?? "",
  );

  useEffect(() => {
    const id = setTimeout(() => {
      if ((filters.search ?? "") !== debouncedSearch) {
        setDebouncedSearch(filters.search ?? "");
        setPage(1);
      }
    }, debounceMs);

    return () => clearTimeout(id);
  }, [filters.search, debouncedSearch, debounceMs]);

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  const setFilters: AdminListState<F>["setFilters"] = (value) => {
    setFiltersState((prev) =>
      typeof value === "function" ? value(prev) : value,
    );
  };

  return {
    page,
    pageSize,
    filters,
    debouncedSearch,
    setPage,
    setPageSize,
    setFilters,
  };
}
