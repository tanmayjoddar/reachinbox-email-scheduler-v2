import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSlackStatus, connectSlack, disconnectSlack } from '@/lib/api';

export function useSlack() {
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: ['slack-status'],
    queryFn: fetchSlackStatus,
    staleTime: 60 * 1000,
  });

  const connect = useMutation({
    mutationFn: connectSlack,
    onSuccess: (data) => {
      window.location.assign(data.url);
    },
  });

  const disconnect = useMutation({
    mutationFn: disconnectSlack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-status'] });
    },
  });

  return { status, connect, disconnect };
}
