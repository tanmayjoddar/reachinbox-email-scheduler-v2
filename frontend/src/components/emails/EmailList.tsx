import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEmails, useEmailSearch } from '@/hooks/useEmails';
import { EmailRow } from './EmailRow';
import { EmailDetailView } from './EmailDetailView';
import { SearchBox } from './SearchBox';
import { Pagination } from './Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { ApiError, toggleStarEmail, deleteEmail } from '@/lib/api';
import type { EmailItem } from '@/types/api';

interface EmailListProps {
  tab: 'scheduled' | 'sent';
}

type FilterOption = 'all' | 'scheduled' | 'sending';

const emptyText = {
  scheduled: {
    title: 'No scheduled emails',
    description: 'Compose a new email to get started. Your scheduled emails will appear here.',
  },
  sent: {
    title: 'No sent emails',
    description: 'Emails that have been sent will appear here.',
  },
};

const emptyFilterText = {
  title: 'No matching emails',
  description: 'Try a different search or filter.',
};

export function EmailList({ tab }: EmailListProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterOption>(tab === 'scheduled' ? 'scheduled' : 'all');
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);

  const listQuery = useEmails(tab, page);
  const searchQuery = useEmailSearch(search, tab);

  const isSearching = search.trim().length > 0;
  const searchUnavailable = searchQuery.error instanceof ApiError && searchQuery.error.status === 503;

  let items: EmailItem[] = isSearching && searchQuery.data
    ? searchQuery.data.items
    : listQuery.data?.items ?? [];

  if (filter !== 'all' && !isSearching) {
    if (filter === 'scheduled') {
      items = items.filter((e) => e.status === 'scheduled');
    } else if (filter === 'sending') {
      items = items.filter((e) => e.status === 'processing' || e.status === 'sent');
    }
  }

  const starMutation = useMutation({
    mutationFn: (id: string) => toggleStarEmail(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      if (selectedEmail && selectedEmail.id === res.id) {
        setSelectedEmail((prev) => prev ? { ...prev, isStarred: res.isStarred } : null);
      }
      toast.success(res.isStarred ? 'Starred email' : 'Unstarred email');
    },
    onError: () => toast.error('Failed to update star'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmail(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      setSelectedEmail(null);
      toast.success('Email deleted');
    },
    onError: () => toast.error('Failed to delete email'),
  });

  if (selectedEmail) {
    return (
      <EmailDetailView
        email={selectedEmail}
        onBack={() => setSelectedEmail(null)}
        onToggleStar={(id) => starMutation.mutate(id)}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    );
  }

  const total = listQuery.data?.total ?? 0;
  const limit = listQuery.data?.limit ?? 20;

  const isLoading = !isSearching && listQuery.isLoading;
  const isError = !isSearching && listQuery.isError;
  const hasActiveFilter = filter !== 'all';

  return (
    <div className="space-y-6">
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Search"
        onRefresh={() => listQuery.refetch()}
        filter={filter}
        onFilterChange={setFilter}
      />

      {searchUnavailable && (
        <div className="px-4 py-2 text-xs text-status-scheduled-text bg-status-scheduled-bg rounded-lg">
          Search is temporarily unavailable. Showing standard list.
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-xs text-danger">Failed to load emails</p>
          <Button variant="secondary" onClick={() => listQuery.refetch()} className="text-xs px-3 py-1">
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<MailIcon />}
          title={hasActiveFilter ? emptyFilterText.title : emptyText[tab].title}
          description={hasActiveFilter ? emptyFilterText.description : emptyText[tab].description}
        />
      ) : (
        <div className="divide-y divide-border/80 border-t border-border/80 mt-2">
          {items.map((email) => (
            <EmailRow
              key={email.id}
              email={email}
              tab={tab}
              onClick={() => setSelectedEmail(email)}
              onToggleStar={(id) => starMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {!isSearching && !isLoading && !isError && items.length > 0 && (
        <Pagination page={page} limit={limit} total={total} onPageChange={setPage} />
      )}
    </div>
  );
}

function MailIcon() {
  return (
    <svg className="h-10 w-10 mx-auto text-muted/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}
