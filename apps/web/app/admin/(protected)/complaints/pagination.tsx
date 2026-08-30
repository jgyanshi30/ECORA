import Link from "next/link";

import { Button } from "@/components/ui/button";

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  searchParams: Record<string, string | undefined>;
}

/** Plain links, no client JS — preserves every other filter/sort param while only changing `page`. */
export function Pagination({ page, pageSize, totalCount, searchParams }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  function hrefForPage(target: number): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(target));
    return `/admin/complaints?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Page {page} of {totalPages} ({totalCount} total)
      </span>
      <div className="flex gap-2">
        {page <= 1 ? (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefForPage(page - 1)}>Previous</Link>
          </Button>
        )}
        {page >= totalPages ? (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefForPage(page + 1)}>Next</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
