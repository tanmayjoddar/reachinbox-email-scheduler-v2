import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { parseLeads } from '@/lib/parseLeads';

interface LeadsUploadProps {
  recipients: string[];
  onChange: (recipients: string[]) => void;
}

export function LeadsUpload({ recipients, onChange }: LeadsUploadProps) {
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewText = (text: string, sourceName?: string) => {
    const combined = recipients.length > 0 ? `${recipients.join(', ')}, ${text}` : text;
    const { valid, skipped } = parseLeads(combined);
    onChange(valid);

    if (sourceName) {
      setFileName(sourceName);
      if (valid.length > 0) {
        toast.success(`Loaded ${valid.length} email addresses from ${sourceName}${skipped > 0 ? ` (${skipped} skipped)` : ''}`);
      } else {
        toast.error(`No valid email addresses found in ${sourceName}`);
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text();
      handleNewText(text, file.name);
    } catch {
      toast.error('Failed to read file. Please ensure it is a valid .csv or .txt file.');
    }
  };

  const handleRemove = (emailToRemove: string) => {
    onChange(recipients.filter((r) => r !== emailToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (inputText.trim()) {
        handleNewText(inputText);
        setInputText('');
      }
    }
  };

  return (
    <div className="flex flex-col gap-1 py-1.5 border-b border-border text-xs">
      <div className="flex items-center gap-3 min-h-10">
        <span className="w-14 text-muted shrink-0">To</span>

        <div className="flex-1 flex flex-wrap items-center gap-1.5">
          {recipients.slice(0, 4).map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 rounded-full border border-accent bg-white px-2.5 py-0.5 text-[11px] font-medium text-accent shadow-xs"
            >
              {email}
              <button
                type="button"
                onClick={() => handleRemove(email)}
                className="hover:text-accent-hover text-[11px] leading-none cursor-pointer"
                aria-label={`Remove ${email}`}
              >
                &times;
              </button>
            </span>
          ))}

          {recipients.length > 4 && (
            <span className="rounded-full border border-accent bg-white px-2 py-0.5 text-[11px] font-medium text-accent">
              +{recipients.length - 4}
            </span>
          )}

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputText.trim()) {
                handleNewText(inputText);
                setInputText('');
              }
            }}
            placeholder={recipients.length === 0 ? 'recipients@example.com (or paste emails)' : 'Add another...'}
            className="flex-1 min-w-[150px] bg-transparent text-xs text-primary placeholder:text-muted focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover transition-colors shrink-0 cursor-pointer"
        >
          <UploadArrowIcon />
          <span>Upload List</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,text/plain,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      {fileName && recipients.length > 0 && (
        <div className="flex items-center justify-between text-[11px] pl-16 text-muted">
          <span>File: <strong className="text-primary font-medium">{fileName}</strong> ({recipients.length} leads detected)</span>
          <button type="button" onClick={() => { onChange([]); setFileName(null); }} className="hover:text-danger cursor-pointer">
            Clear list
          </button>
        </div>
      )}
    </div>
  );
}

function UploadArrowIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L6.29 8.53a.75.75 0 01-1.08-1.04l4.25-4.25a.75.75 0 011.08 0l4.25 4.25a.75.75 0 11-1.08 1.04l-2.96-2.918v10.638c0 .414-.336.75-.75.75z" clipRule="evenodd" />
    </svg>
  );
}
