import { useSlack } from '@/hooks/useSlack';
import { Button } from '@/components/ui/Button';

export function SlackConnect() {
  const { status, connect, disconnect } = useSlack();

  if (status.isLoading) return null;

  if (status.data?.connected) {
    return (
      <div className="flex items-center justify-between w-full px-2.5 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          <SlackIcon />
          <span className="text-emerald-950 font-semibold truncate text-[11px]">
            {status.data.channel || status.data.team}
          </span>
        </div>
        <button
          type="button"
          onClick={() => disconnect.mutate()}
          disabled={disconnect.isPending}
          className="text-xs text-muted hover:text-danger cursor-pointer px-1 font-bold leading-none"
          title="Disconnect Slack"
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <Button
      variant="secondary"
      onClick={() => connect.mutate()}
      loading={connect.isPending}
      className="w-full text-xs py-1.5 flex items-center justify-center gap-2 shadow-2xs"
    >
      <SlackIcon />
      Connect Slack
    </Button>
  );
}

function SlackIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}
