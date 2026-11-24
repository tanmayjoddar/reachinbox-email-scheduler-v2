import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchEmails, searchEmails } from '@/lib/api';

export function useEmails(status: 'scheduled' | 'sent', page: number) {
  return useQuery({
    queryKey: ['emails', status, page],
    queryFn: () => fetchEmails(status, page),
    refetchInterval: 5000,
    placeholderData: keepPreviousData,
  });
}

export function useEmailSearch(q: string, status: 'scheduled' | 'sent') {
  return useQuery({
    queryKey: ['email-search', q, status],
    queryFn: () => searchEmails(q, status),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
  });
}
