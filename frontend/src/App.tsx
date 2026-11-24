import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { ScheduledPage, SentPage } from '@/pages/DashboardPage';
import { ComposePage } from '@/pages/ComposePage';
import { RequireAuth } from '@/routes/RequireAuth';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<RequireAuth />}>
        <Route path="scheduled" element={<ScheduledPage />} />
        <Route path="sent" element={<SentPage />} />
      </Route>
      <Route path="/compose" element={<RequireAuth />}>
        <Route index element={<ComposePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
