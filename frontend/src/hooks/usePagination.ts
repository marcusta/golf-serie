import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";

const DEFAULT_PAGE_SIZE = 100;

export interface UsePaginationOptions {
  /** Page size (default: 100) */
  pageSize?: number;
  /** Whether to persist current page in URL params */
  persistInUrl?: boolean;
  /** URL param name for page (default: "page") */
  pageParam?: string;
}

export interface UsePaginationResult<T> {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Set the current page */
  setCurrentPage: (page: number) => void;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalItems: number;
  /** Items for the current page */
  paginatedItems: T[];
  /** Page info string (e.g., "Showing 1-100 of 250") */
  pageInfo: string;
  /** Whether there's a previous page */
  hasPreviousPage: boolean;
  /** Whether there's a next page */
  hasNextPage: boolean;
  /** Go to previous page */
  goToPreviousPage: () => void;
  /** Go to next page */
  goToNextPage: () => void;
  /** Go to first page */
  goToFirstPage: () => void;
  /** Go to last page */
  goToLastPage: () => void;
  /** Page size */
  pageSize: number;
  /** Reset to page 1 (useful when filters change) */
  resetPage: () => void;
}

/**
 * A hook for client-side pagination of arrays.
 *
 * @param items - The full array of items to paginate
 * @param options - Pagination options
 * @returns Pagination state and helpers
 *
 * @example
 * ```tsx
 * const { paginatedItems, currentPage, setCurrentPage, totalPages, pageInfo } = usePagination(users, {
 *   pageSize: 100,
 *   persistInUrl: true,
 * });
 * ```
 */
export function usePagination<T>(
  items: T[] | undefined,
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    persistInUrl = false,
    pageParam = "page",
  } = options;

  // Get current page from URL if persistInUrl is enabled
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();

  const urlPage = persistInUrl && search[pageParam]
    ? parseInt(search[pageParam] as string, 10)
    : 1;

  const [internalPage, setInternalPage] = useState(urlPage);

  // Use URL page if persisting, otherwise internal state
  const currentPage = persistInUrl ? urlPage : internalPage;

  const totalItems = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure current page is within valid range
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Update page state
  const setCurrentPage = useCallback(
    (page: number) => {
      const validPage = Math.min(Math.max(1, page), totalPages);

      if (persistInUrl) {
        // Update URL param - use type assertion for TanStack Router compatibility
        void navigate({
          search: ((prev: Record<string, unknown>) => ({
            ...prev,
            [pageParam]: validPage > 1 ? validPage.toString() : undefined,
          })) as unknown as undefined,
          replace: true,
        });
      } else {
        setInternalPage(validPage);
      }

      // Smooth scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [totalPages, persistInUrl, pageParam, navigate]
  );

  // Reset to page 1 when total pages changes (e.g., when filters change)
  useEffect(() => {
    if (validCurrentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, validCurrentPage, setCurrentPage]);

  // Calculate paginated items
  const paginatedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    const startIndex = (validCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return items.slice(startIndex, endIndex);
  }, [items, validCurrentPage, pageSize]);

  // Calculate page info
  const pageInfo = useMemo(() => {
    if (totalItems === 0) return "No items";
    const startItem = (validCurrentPage - 1) * pageSize + 1;
    const endItem = Math.min(validCurrentPage * pageSize, totalItems);
    return `Showing ${startItem}-${endItem} of ${totalItems}`;
  }, [validCurrentPage, pageSize, totalItems]);

  const hasPreviousPage = validCurrentPage > 1;
  const hasNextPage = validCurrentPage < totalPages;

  const goToPreviousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(validCurrentPage - 1);
    }
  }, [hasPreviousPage, validCurrentPage, setCurrentPage]);

  const goToNextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(validCurrentPage + 1);
    }
  }, [hasNextPage, validCurrentPage, setCurrentPage]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, [setCurrentPage]);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [setCurrentPage, totalPages]);

  const resetPage = useCallback(() => {
    setCurrentPage(1);
  }, [setCurrentPage]);

  return {
    currentPage: validCurrentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    paginatedItems,
    pageInfo,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    goToFirstPage,
    goToLastPage,
    pageSize,
    resetPage,
  };
}
