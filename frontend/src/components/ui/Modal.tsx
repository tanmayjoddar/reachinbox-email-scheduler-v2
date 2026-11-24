import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => onClose();
    el.addEventListener('close', handleClose);
    return () => el.removeEventListener('close', handleClose);
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/50 bg-card rounded-xl shadow-modal w-full max-w-2xl p-0 border-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <button onClick={onClose} className="text-muted hover:text-primary" aria-label="Close">
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
