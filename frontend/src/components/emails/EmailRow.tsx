import { formatDateTime } from '@/lib/format';
import type { EmailItem } from '@/types/api';

interface EmailRowProps {
  email: EmailItem;
  tab: 'scheduled' | 'sent';
}

export function EmailRow({ email, tab }: EmailRowProps) {
  const time = tab === 'scheduled' ? email.scheduledAt : email.sentAt;

  return (
    <div className="flex items-center gap-4 py-3 px-2 border-b border-border/80 hover:bg-[#FAFAFA] transition-colors group">
      {/* Recipient */}
      <div className="w-36 sm:w-44 shrink-0 text-xs text-primary truncate">
        <span className="font-semibold">To: </span>
        <span className="text-secondary">{email.recipient}</span>
      </div>

      {/* Status / Time Badge */}
      <div className="shrink-0">
        {tab === 'scheduled' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-status-scheduled-bg px-2.5 py-0.5 text-[11px] font-medium text-status-scheduled-text">
            <ClockIcon />
            <span>{formatDateTime(time)}</span>
          </span>
        ) : (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
            email.status === 'failed' ? 'bg-status-failed-bg text-status-failed-text' : 'bg-status-sent-bg text-status-sent-text'
          }`}>
            {email.status}
          </span>
        )}
      </div>

      {/* Subject and Preview */}
      <div className="min-w-0 flex-1 text-xs truncate">
        <span className="font-semibold text-primary mr-1.5">{email.subject}</span>
        <span className="text-muted font-normal">- Scheduled job via {email.senderEmail}</span>
      </div>

      {/* Decorative Star Icon from Figma */}
      <div className="shrink-0 text-muted/60 group-hover:text-muted">
        <StarIcon />
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
