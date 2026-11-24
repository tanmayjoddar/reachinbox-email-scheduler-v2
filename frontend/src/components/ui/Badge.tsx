import type { EmailStatus } from '@/types/api';

const styles: Record<EmailStatus, string> = {
  scheduled: 'bg-status-scheduled-bg text-status-scheduled-text',
  processing: 'bg-status-processing-bg text-status-processing-text',
  sent: 'bg-status-sent-bg text-status-sent-text',
  failed: 'bg-status-failed-bg text-status-failed-text',
};

export function Badge({ status }: { status: EmailStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}
