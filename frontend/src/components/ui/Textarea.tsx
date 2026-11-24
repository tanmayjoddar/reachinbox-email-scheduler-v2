import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-primary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`rounded-md border border-border bg-card px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-border-focus focus:outline-none resize-y min-h-24 ${error ? 'border-danger' : ''} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
