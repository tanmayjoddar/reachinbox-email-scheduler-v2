import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { scheduleEmails, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';
import { LeadsUpload } from './LeadsUpload';
import { SendLaterPopover } from './SendLaterPopover';
import { BackArrowIcon, ClockIcon, PaperclipIcon } from '@/components/ui/icons';

function defaultStartTime(): string {
  const d = new Date(Date.now() + 2 * 60 * 1000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

export function ComposeForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useAuth();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [delaySec, setDelaySec] = useState('2');
  const [hourlyLimit, setHourlyLimit] = useState('100');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const delayMs = Math.max(0, Number(delaySec) || 0) * 1000;
  const hourlyLimitNum = Math.max(1, Math.floor(Number(hourlyLimit) || 1));

  const mutation = useMutation({
    mutationFn: () => scheduleEmails({
      subject: subject.trim(), body: body.trim(), recipients,
      startTime: new Date(startTime).toISOString(), delayBetweenMs: delayMs, hourlyLimit: hourlyLimitNum,
    }),
    onSuccess: (res) => {
      toast.success(`Scheduled ${res.total} emails (${formatDateTime(res.firstSendAt)} \u2013 ${formatDateTime(res.lastSendAt)})`);
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      navigate('/dashboard/scheduled');
    },
    onError: (err) => {
      const msg = err instanceof ApiError && err.status === 409
        ? 'No senders configured. Run npm run seed:senders in the backend.'
        : err instanceof ApiError ? err.message : 'Failed to schedule emails';
      toast.error(msg);
    },
  });

  const handleScheduleClick = () => {
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient email address or upload a list');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter an email subject');
      return;
    }
    if (!body.trim()) {
      toast.error('Please type an email body in "Type Your Reply"');
      return;
    }
    mutation.mutate();
  };

  const isComplete = subject.trim() && body.trim() && recipients.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <button type="button" onClick={() => navigate('/dashboard/scheduled')} className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-accent transition-colors">
          <BackArrowIcon /><span>Compose New Email</span>
        </button>
        <div className="relative flex items-center gap-3">
          <PaperclipIcon className="h-4 w-4 text-muted cursor-pointer hover:text-primary transition-colors" />
          <button
            type="button"
            onClick={() => setPopoverOpen(!popoverOpen)}
            className="p-1.5 rounded-full text-muted hover:text-accent hover:bg-accent-light transition-colors"
            title="Pick date & time"
            aria-label="Pick date & time"
          >
            <ClockIcon className="h-4 w-4" />
          </button>
          <SendLaterPopover open={popoverOpen} onClose={() => setPopoverOpen(false)} startTime={startTime} onSelectTime={setStartTime} />
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={handleScheduleClick}
            className={`rounded-full border border-accent px-5 py-1.5 text-xs font-semibold transition-colors shadow-sm cursor-pointer ${
              isComplete
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'bg-white text-accent hover:bg-accent-light'
            }`}
          >
            {mutation.isPending ? 'Scheduling...' : 'Send Later'}
          </button>
        </div>
      </div>

      <div className="space-y-0.5">
        <div className="flex items-center gap-3 py-2 border-b border-border text-xs">
          <span className="w-14 text-muted">From</span>
          <span className="rounded-md bg-[#F4F5F7] px-2.5 py-1 text-xs font-medium text-primary inline-flex items-center gap-1">
            {user?.email ?? 'loading...'}<span className="text-[10px] text-muted">&or;</span>
          </span>
        </div>

        <LeadsUpload recipients={recipients} onChange={setRecipients} />

        <div className="flex items-center gap-3 py-2 border-b border-border text-xs">
          <label htmlFor="subject-field" className="w-14 text-muted">Subject</label>
          <input id="subject-field" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="flex-1 bg-transparent text-xs text-primary placeholder:text-muted focus:outline-none" />
        </div>

        <div className="flex items-center gap-6 py-2.5 text-xs text-secondary">
          <div className="flex items-center gap-2">
            <label htmlFor="delay-field" className="text-muted">Delay between 2 emails (s):</label>
            <input id="delay-field" type="number" min={0} value={delaySec} onChange={(e) => setDelaySec(e.target.value)} className="w-12 h-6 text-center text-xs border border-border-dark rounded-md bg-[#FAFAFA] focus:border-accent focus:outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="hourly-field" className="text-muted">Hourly Limit:</label>
            <input id="hourly-field" type="number" min={1} value={hourlyLimit} onChange={(e) => setHourlyLimit(e.target.value)} className="w-12 h-6 text-center text-xs border border-border-dark rounded-md bg-[#FAFAFA] focus:border-accent focus:outline-none" />
          </div>
          <div className="text-[11px] text-muted">
            Start: {new Date(startTime).toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl bg-[#F8F9FA] p-4 min-h-[380px] flex flex-col gap-2 mt-2">
          <div className="rounded-xl bg-white shadow-sm border border-border-dark px-3 py-1.5 flex items-center gap-3 text-xs text-muted w-fit">
            <span>&larr;</span><span>&rarr;</span><span className="font-semibold text-primary">Tt</span><span>|</span><span className="font-bold">B</span><span className="italic">I</span><span className="underline">U</span><span>&bull;</span><span>1.</span>
          </div>
          <label htmlFor="reply-body" className="sr-only">Type Your Reply</label>
          <textarea id="reply-body" rows={12} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type Your Reply..." className="w-full flex-1 p-2 text-xs text-primary placeholder:text-muted bg-transparent focus:outline-none resize-y" />
        </div>
      </div>
    </div>
  );
}
