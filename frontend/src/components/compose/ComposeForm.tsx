import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { scheduleEmails, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';
import { LeadsUpload } from './LeadsUpload';
import { SendLaterPopover } from './SendLaterPopover';
import { RichToolbar } from './RichToolbar';
import { AttachmentList, type Attachment } from './AttachmentList';
import { BackArrowIcon, ClockIcon, PaperclipIcon } from '@/components/ui/icons';

export function ComposeForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useAuth();
  const clockTriggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [delaySec, setDelaySec] = useState('2');
  const [hourlyLimit, setHourlyLimit] = useState('100');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedFutureTime, setSelectedFutureTime] = useState<string | null>(null);
  const [pickerTime, setPickerTime] = useState(() => {
    const d = new Date(Date.now() + 2 * 60 * 1000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const delayMs = Math.max(0, Number(delaySec) || 0) * 1000;
  const hourlyLimitNum = Math.max(1, Math.floor(Number(hourlyLimit) || 1));

  const validate = (): boolean => {
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient email address or click "Upload List"');
      return false;
    }
    if (!subject.trim()) {
      toast.error('Please enter an email subject');
      return false;
    }
    if (!body.trim()) {
      toast.error('Please type your message in "Type Your Reply..."');
      return false;
    }
    return true;
  };

  const scheduleMutation = useMutation({
    mutationFn: () => {
      const sendAt = selectedFutureTime ? new Date(selectedFutureTime).toISOString() : new Date().toISOString();
      return scheduleEmails({
        subject: subject.trim(),
        body: body.trim(),
        recipients,
        startTime: sendAt,
        delayBetweenMs: delayMs,
        hourlyLimit: hourlyLimitNum,
      });
    },
    onSuccess: (res) => {
      const isScheduled = Boolean(selectedFutureTime);
      const label = isScheduled ? 'Scheduled' : 'Sent';
      toast.success(`${label} ${res.total} emails (${formatDateTime(res.firstSendAt)} \u2013 ${formatDateTime(res.lastSendAt)})`);
      // Reset selected future time so next send defaults to immediate
      setSelectedFutureTime(null);
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      navigate(isScheduled ? '/dashboard/scheduled' : '/dashboard/sent');
    },
    onError: (err) => {
      const msg = err instanceof ApiError && err.status === 409
        ? 'No senders configured. Run npm run seed:senders in the backend.'
        : err instanceof ApiError ? err.message : 'Failed to send emails';
      toast.error(msg);
    },
  });

  const handleSend = () => {
    if (validate()) scheduleMutation.mutate();
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const sizeStr = f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`;
      newItems.push({ id: `${Date.now()}-${i}`, name: f.name, size: sizeStr, url: URL.createObjectURL(f) });
    }
    setAttachments((prev) => [...prev, ...newItems]);
    toast.success(`Attached ${files.length} file${files.length > 1 ? 's' : ''}`);
    e.target.value = '';
  };

  const handleFormat = (command: string) => {
    toast.info(`${command.charAt(0).toUpperCase() + command.slice(1)} applied`);
  };

  const isComplete = subject.trim() && body.trim() && recipients.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <button
          type="button"
          onClick={() => navigate('/dashboard/scheduled')}
          className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-accent transition-colors cursor-pointer"
        >
          <BackArrowIcon /><span>Compose New Email</span>
        </button>

        <div className="relative flex items-center gap-2.5">
          {/* Paperclip attachment icon */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-full text-muted hover:text-primary transition-colors cursor-pointer"
            title="Attach file"
          >
            <PaperclipIcon className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileAttach}
          />

          {/* Clock icon to pick date & time for send later */}
          <button
            ref={clockTriggerRef}
            type="button"
            onClick={() => setPopoverOpen((prev) => !prev)}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              selectedFutureTime
                ? 'bg-accent text-white shadow-xs'
                : 'text-muted hover:text-accent hover:bg-accent-light'
            }`}
            title={selectedFutureTime ? `Scheduled: ${new Date(selectedFutureTime).toLocaleString()}` : 'Pick date & time (Send Later)'}
          >
            <ClockIcon className="h-4 w-4" />
          </button>

          {/* If future time selected, show indicator chip with clear button */}
          {selectedFutureTime && (
            <div className="hidden sm:inline-flex items-center gap-1.5 bg-accent-light/80 border border-accent/40 rounded-full px-2.5 py-0.5 text-[11px] text-accent font-medium">
              <span>{formatDateTime(new Date(selectedFutureTime).toISOString())}</span>
              <button
                type="button"
                onClick={() => setSelectedFutureTime(null)}
                className="hover:text-danger text-xs font-bold leading-none cursor-pointer"
                title="Reset to send immediately"
              >
                &times;
              </button>
            </div>
          )}

          <SendLaterPopover
            open={popoverOpen}
            onClose={() => setPopoverOpen(false)}
            startTime={pickerTime}
            onSelectTime={(t) => {
              setPickerTime(t);
              setSelectedFutureTime(t);
            }}
            onClearTime={() => setSelectedFutureTime(null)}
            triggerRef={clockTriggerRef}
          />

          {/* Single Send Button */}
          <button
            type="button"
            disabled={scheduleMutation.isPending}
            onClick={handleSend}
            className={`rounded-full border border-accent px-6 py-1.5 text-xs font-semibold transition-colors shadow-xs cursor-pointer ${
              isComplete
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'bg-white text-accent hover:bg-accent-light'
            }`}
          >
            {scheduleMutation.isPending ? 'Sending...' : 'Send'}
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
          <input
            id="subject-field"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 bg-transparent text-xs text-primary placeholder:text-muted focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-6 py-2.5 text-xs text-secondary">
          <div className="flex items-center gap-2">
            <label htmlFor="delay-field" className="text-muted">Delay between 2 emails</label>
            <input
              id="delay-field"
              type="number"
              min={0}
              value={delaySec}
              onChange={(e) => setDelaySec(e.target.value)}
              className="w-12 h-6 text-center text-xs border border-border-dark rounded-md bg-[#FAFAFA] focus:border-accent focus:outline-none"
            />
            <span className="text-muted">sec</span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="hourly-field" className="text-muted">Hourly Limit</label>
            <input
              id="hourly-field"
              type="number"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value)}
              className="w-12 h-6 text-center text-xs border border-border-dark rounded-md bg-[#FAFAFA] focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-[#F8F9FA] p-4 min-h-[380px] flex flex-col gap-2 mt-2">
          <RichToolbar onFormat={handleFormat} />
          <label htmlFor="reply-body" className="sr-only">Type Your Reply</label>
          <textarea
            id="reply-body"
            rows={9}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type Your Reply..."
            className="w-full flex-1 p-2 text-xs text-primary placeholder:text-muted bg-transparent focus:outline-none resize-y"
          />
          <AttachmentList
            attachments={attachments}
            onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
          />
        </div>
      </div>
    </div>
  );
}
