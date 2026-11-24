import { useRef, useEffect } from 'react';

interface SendLaterPopoverProps {
  open: boolean;
  onClose: () => void;
  startTime: string;
  onSelectTime: (iso: string) => void;
}

export function SendLaterPopover({ open, onClose, startTime, onSelectTime }: SendLaterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  const setPreset = (offsetHours: number, targetHour?: number) => {
    const d = new Date();
    if (targetHour !== undefined) {
      d.setDate(d.getDate() + 1);
      d.setHours(targetHour, 0, 0, 0);
    } else {
      d.setTime(d.getTime() + offsetHours * 60 * 60 * 1000);
    }
    onSelectTime(d.toISOString().slice(0, 16));
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border-dark bg-white p-4 shadow-popover z-50 space-y-3"
    >
      <h3 className="text-xs font-bold text-primary">Send Later</h3>

      <div className="space-y-1">
        <label htmlFor="pick-date-time" className="text-[11px] text-muted">Pick date & time</label>
        <input
          id="pick-date-time"
          type="datetime-local"
          value={startTime}
          onChange={(e) => onSelectTime(e.target.value)}
          className="w-full rounded-md border border-border-dark bg-white px-2 py-1 text-xs text-primary focus:border-accent focus:outline-none"
        />
      </div>

      <div className="space-y-1 pt-1 text-xs text-secondary">
        <button
          type="button"
          onClick={() => setPreset(24)}
          className="w-full text-left py-1 hover:text-primary transition-colors block"
        >
          Tomorrow
        </button>
        <button
          type="button"
          onClick={() => setPreset(0, 10)}
          className="w-full text-left py-1 hover:text-primary transition-colors block"
        >
          Tomorrow, 10:00 AM
        </button>
        <button
          type="button"
          onClick={() => setPreset(0, 11)}
          className="w-full text-left py-1 hover:text-primary transition-colors block"
        >
          Tomorrow, 11:00 AM
        </button>
        <button
          type="button"
          onClick={() => setPreset(0, 20)}
          className="w-full text-left py-1 hover:text-primary transition-colors block"
        >
          Wednesday, 8:00 PM
        </button>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-secondary hover:text-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-accent text-accent px-4 py-1 text-xs font-semibold hover:bg-accent-light transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
