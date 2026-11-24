import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '@/lib/api';

export function useAuth() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
