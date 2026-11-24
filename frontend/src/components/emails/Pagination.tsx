import { Button } from '@/components/ui/Button';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, limit, total, onPageChange }: PaginationProps) {
  if (total <= limit) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <p className="text-sm text-secondary">
        {start}&ndash;{end} of {total}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="text-xs px-3 py-1.5">
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="text-xs px-3 py-1.5">
          Next
        </Button>
      </div>
    </div>
  );
}
