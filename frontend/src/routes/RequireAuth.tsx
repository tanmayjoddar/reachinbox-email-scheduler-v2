import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api';

export function RequireAuth() {
  const { data: user, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 401) {
    return <Navigate to="/login" replace />;
  }

  if (!user) return <Navigate to="/login" replace />;

  return <DashboardLayout user={user} />;
}
