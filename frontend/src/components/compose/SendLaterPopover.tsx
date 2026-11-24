import { useRef, useEffect } from 'react';

interface SendLaterPopoverProps {
  open: boolean;
  onClose: () => void;
  startTime: string;
  onSelectTime: (iso: string) => void;
  onClearTime?: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function SendLaterPopover({
  open,
  onClose,
  startTime,
  onSelectTime,
  onClearTime,
  triggerRef,
}: SendLaterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        (!triggerRef?.current || !triggerRef.current.contains(target))
      ) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  const setPreset = (targetHour?: number) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if (targetHour !== undefined) {
      d.setHours(targetHour, 0, 0, 0);
    } else {
      d.setHours(9, 0, 0, 0);
    }
    onSelectTime(d.toISOString().slice(0, 16));
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border bg-white p-4 shadow-xl z-50 space-y-3"
    >
      <h3 className="text-xs font-bold text-primary">Send Later</h3>

      <div className="space-y-1">
        <label htmlFor="pick-date-time" className="text-[11px] text-muted">Pick date &amp; time</label>
        <div className="relative">
          <input
            id="pick-date-time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => onSelectTime(e.target.value)}
            className="w-full rounded-md border border-border-dark bg-white px-2 py-1.5 text-xs text-primary focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-1 pt-1 text-xs text-secondary">
        <button
          type="button"
          onClick={() => setPreset(9)}
          className="w-full text-left py-1 hover:text-primary transition-colors block cursor-pointer"
        >
          Tomorrow
        </button>
        <button
          type="button"
          onClick={() => setPreset(10)}
          className="w-full text-left py-1 hover:text-primary transition-colors block cursor-pointer"
        >
          Tomorrow, 10:00 AM
        </button>
        <button
          type="button"
          onClick={() => setPreset(11)}
          className="w-full text-left py-1 hover:text-primary transition-colors block cursor-pointer"
        >
          Tomorrow, 11:00 AM
        </button>
        <button
          type="button"
          onClick={() => setPreset(15)}
          className="w-full text-left py-1 hover:text-primary transition-colors block cursor-pointer"
        >
          Tomorrow, 3:00 PM
        </button>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            onClearTime?.();
            onClose();
          }}
          className="text-xs text-secondary hover:text-primary cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-accent text-accent px-4 py-1 text-xs font-semibold hover:bg-accent-light transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}
