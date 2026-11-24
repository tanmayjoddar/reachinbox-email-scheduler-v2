import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { logout } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import type { User } from '@/types/api';

export function UserMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    navigate('/login');
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 w-full rounded-2xl bg-[#F4F5F7] p-2 hover:bg-[#EBEDF0] transition-colors text-left"
        aria-label="User menu"
      >
        <Avatar name={user.name} url={user.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-primary truncate leading-tight">{user.name}</p>
          <p className="text-[10px] text-muted truncate leading-tight">{user.email}</p>
        </div>
        <ChevronDownIcon />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-56 rounded-xl border border-border-dark bg-card shadow-popover z-50 p-1">
          <a
            href="/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-secondary hover:bg-border hover:text-primary"
          >
            Open queue dashboard
          </a>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-danger hover:bg-border"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-muted shrink-0 mr-1" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
  );
}
