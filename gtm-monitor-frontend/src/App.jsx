// Peta halaman aplikasi (React Router). Hak akses diatur deklaratif oleh guard:
//   pengunjung  : /, /login
//   login       : /dashboard, /upload
//   ADMIN saja  : /branch/:branchName, /admin
import { Routes, Route } from 'react-router';
import AppLayout from './routes/AppLayout';
import { RequireAuth, GuestOnly, FallbackRedirect } from './routes/guards';
import { LandingRoute, LoginRoute, DashboardRoute, BranchRoute, UploadRoute, AdminRoute } from './routes/pages';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route element={<GuestOnly />}>
          <Route index element={<LandingRoute />} />
          <Route path="login" element={<LoginRoute />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="dashboard" element={<DashboardRoute />} />
          <Route path="upload" element={<UploadRoute />} />
        </Route>

        <Route element={<RequireAuth roles={['ADMIN']} />}>
          <Route path="branch/:branchName" element={<BranchRoute />} />
          <Route path="admin" element={<AdminRoute />} />
        </Route>

        <Route path="*" element={<FallbackRedirect />} />
      </Route>
    </Routes>
  );
}
