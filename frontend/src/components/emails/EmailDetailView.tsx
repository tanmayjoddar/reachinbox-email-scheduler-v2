import { useState } from 'react';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';
import type { EmailItem } from '@/types/api';

interface EmailDetailViewProps {
  email: EmailItem;
  onBack: () => void;
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
}

export function EmailDetailView({ email, onBack, onToggleStar, onDelete }: EmailDetailViewProps) {
  const { data: user } = useAuth();
  const [starred, setStarred] = useState(Boolean(email.isStarred));

  const handleStarClick = () => {
    setStarred((prev) => !prev);
    onToggleStar(email.id);
  };

  const senderInitial = (email.senderEmail[0] ?? 'S').toUpperCase();
  const dateFormatted = formatDateTime(email.sentAt ?? email.scheduledAt);
  const codeSnippet = email.id.replace(/-/g, '').slice(0, 14).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top action header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-[#F4F5F7] text-primary transition-colors cursor-pointer"
            aria-label="Back to emails"
            title="Back to emails"
          >
            <BackArrowIcon />
          </button>
          <h2 className="text-sm font-semibold text-primary truncate">
            {email.subject} <span className="text-muted font-normal">| {codeSnippet}</span>
          </h2>
        </div>

        <div className="flex items-center gap-3 text-muted">
          <button
            type="button"
            onClick={handleStarClick}
            className={`p-1.5 rounded-full hover:bg-[#F4F5F7] transition-colors cursor-pointer ${
              starred ? 'text-amber-400' : 'text-muted hover:text-amber-400'
            }`}
            title={starred ? 'Unstar' : 'Star'}
            aria-label="Star email"
          >
            <StarIcon filled={starred} />
          </button>

          <button
            type="button"
            className="p-1.5 rounded-full hover:bg-[#F4F5F7] hover:text-primary transition-colors cursor-pointer"
            title="Archive"
            aria-label="Archive"
          >
            <ArchiveIcon />
          </button>

          <button
            type="button"
            onClick={() => onDelete(email.id)}
            className="p-1.5 rounded-full hover:bg-[#F4F5F7] hover:text-danger transition-colors cursor-pointer"
            title="Delete email"
            aria-label="Delete"
          >
            <TrashIcon />
          </button>

          <div className="h-4 w-px bg-border" />

          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name ?? 'Avatar'} className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
              {(user?.name?.[0] ?? 'U').toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Email Sender info row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm shrink-0">
            {senderInitial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-primary">
                {email.senderEmail.split('@')[0]}
              </span>
              <span className="text-xs text-muted">
                &lt;{email.senderEmail}&gt;
              </span>
            </div>
            <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
              <span>to {email.recipient}</span>
              <span className="text-[10px]">&or;</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted shrink-0 pt-1">
          {dateFormatted}
        </div>
      </div>

      {/* Email Message Content */}
      <div className="text-xs text-secondary leading-relaxed space-y-3 pt-2">
        <p className="text-primary font-medium">Hey {email.recipient.split('@')[0]},</p>

        {email.body ? (
          <div className="whitespace-pre-line text-xs text-primary/90">
            {email.body}
          </div>
        ) : (
          <p>You&apos;ve just RECEIVED something</p>
        )}

        {/* Exclusive transformation highlight banner from Figma */}
        <div className="rounded-md border-l-4 border-amber-400 bg-amber-50/70 p-3.5 text-xs text-amber-950 space-y-1.5 my-3">
          <p className="font-semibold flex items-center gap-1.5">
            <span>⚡</span>
            <span>Extremely Exclusive—Only 4 Spots Worldwide Per Year | $25,000 investment</span>
            <span>⚡</span>
          </p>
          <p className="text-[11px] text-amber-900/90">
            To explore securing your private transformation, simply reply right now with <strong className="font-bold underline">&quot;FLY OUT FIX&quot;</strong>.
          </p>
        </div>

        <p className="pt-2 text-muted">Your coach for world-class performance,</p>
        <p className="font-semibold text-primary">Grant</p>
        <p className="text-[11px] italic text-muted pt-1">
          P.S. Always remember that you can develop world class technique! 🚀
        </p>
      </div>

      {/* Attachments Section with Figma tennis coach thumbnails */}
      <div className="pt-4 border-t border-border/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
          <AttachmentCard
            title="Tennis_Coach_Profile.png"
            size="1.2 MB"
            courtHue="from-blue-600 to-sky-400"
          />
          <AttachmentCard
            title="Tennis_Coach_Profile2.png"
            size="1.2 MB"
            courtHue="from-sky-500 to-blue-700"
          />
        </div>
      </div>
    </div>
  );
}

function AttachmentCard({ title, size, courtHue }: { title: string; size: string; courtHue: string }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-white hover:shadow-md transition-shadow cursor-pointer group">
      <div className={`h-28 bg-gradient-to-br ${courtHue} relative flex items-center justify-center overflow-hidden`}>
        {/* Tennis net simulation graphic */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
        <div className="absolute bottom-0 inset-x-0 h-4 bg-white/30 backdrop-blur-xs flex items-center justify-center">
          <div className="h-0.5 w-full bg-white/60" />
        </div>
        <div className="h-10 w-10 rounded-full bg-red-500/90 text-white flex items-center justify-center text-xs font-bold shadow-lg transform group-hover:scale-105 transition-transform">
          🎾
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium text-primary truncate">{title}</p>
        <p className="text-[10px] text-muted">{size}</p>
      </div>
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
    </svg>
  );
}

function StarIcon({ filled }: { filled?: boolean }) {
  if (filled) {
    return (
      <svg className="h-4 w-4 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
