import { useEffect } from 'react';
import { NavLink, Outlet, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useEmails } from '@/hooks/useEmails';
import { UserMenu } from './UserMenu';
import { SlackConnect } from './SlackConnect';
import { ClockIcon, SendIcon } from '@/components/ui/icons';
import type { User } from '@/types/api';

export function DashboardLayout({ user }: { user: User }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const scheduledQuery = useEmails('scheduled', 1);
  const sentQuery = useEmails('sent', 1);

  useEffect(() => {
    if (location.pathname === '/dashboard') {
      navigate(`/dashboard/scheduled${location.search}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const slack = params.get('slack');
    if (!slack) return;
    if (slack === 'connected') {
      toast.success('Slack connected successfully');
      queryClient.invalidateQueries({ queryKey: ['slack-status'] });
    } else if (slack === 'error') {
      toast.error('Failed to connect Slack');
    }
    params.delete('slack');
    setParams(params, { replace: true });
  }, [params, setParams, queryClient]);

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Left Sidebar */}
      <aside className="w-full md:w-60 p-5 shrink-0 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-border">
        {/* Brand Logo */}
        <div className="px-1 py-1">
          <span className="text-2xl font-black tracking-tight text-primary font-sans">ONE</span>
        </div>

        {/* User Card */}
        <UserMenu user={user} />

        {/* Compose Button */}
        <NavLink
          to="/compose"
          className="flex items-center justify-center rounded-full border border-accent text-accent font-medium py-2 px-4 hover:bg-accent-light transition-colors text-xs text-center shadow-sm"
        >
          Compose
        </NavLink>

        {/* Navigation */}
        <div className="space-y-1 pt-2">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider px-3 mb-1.5">Core</p>
          <SidebarNav to="/dashboard/scheduled" icon={<ClockIcon className="h-3.5 w-3.5" />} label="Scheduled" count={scheduledQuery.data?.total} />
          <SidebarNav to="/dashboard/sent" icon={<SendIcon className="h-3.5 w-3.5" />} label="Sent" count={sentQuery.data?.total} />
        </div>

        <div className="mt-auto hidden md:block pt-4">
          <SlackConnect />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

function SidebarNav({ to, icon, label, count }: { to: string; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center justify-between px-3.5 py-2 rounded-full text-xs transition-colors ${
          isActive ? 'bg-accent-light text-primary font-semibold' : 'text-secondary hover:bg-border hover:text-primary font-medium'
        }`
      }
    >
      <div className="flex items-center gap-2.5">
        <span className="text-muted">{icon}</span>
        <span>{label}</span>
      </div>
      {count !== undefined && <span className="text-xs font-normal text-muted tabular-nums">{count}</span>}
    </NavLink>
  );
}
