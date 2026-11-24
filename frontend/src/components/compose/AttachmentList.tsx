export interface Attachment {
  id: string;
  name: string;
  size: string;
  url: string;
  type?: string;
}

interface AttachmentListProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

export function AttachmentList({ attachments, onRemove }: AttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 pt-3 border-t border-border/80">
      {attachments.map((att) => (
        <div key={att.id} className="relative rounded-xl border border-border bg-white p-2 shadow-xs flex items-center gap-2.5 max-w-xs group">
          <img
            src={att.url}
            alt={att.name}
            className="h-12 w-12 rounded-lg object-cover bg-surface shrink-0"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-primary truncate">{att.name}</p>
            <p className="text-[11px] text-muted">{att.size}</p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(att.id)}
            className="text-muted hover:text-danger p-1 text-xs cursor-pointer"
            aria-label="Remove attachment"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
