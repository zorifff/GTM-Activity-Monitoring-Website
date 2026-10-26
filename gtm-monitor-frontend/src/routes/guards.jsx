// Route Guard deklaratif berbasis status login & peran (ADMIN / USER branch)
import { Navigate, Outlet, useOutletContext } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { PATHS } from './paths';

// Halaman khusus akun yang sudah login. `roles` (opsional) = peran yang diizinkan, mis. ['ADMIN'].
// Belum login → Overview; peran tidak sesuai (mis. akun branch membuka /admin) → Dashboard.
export function RequireAuth({ roles }) {
  const { user } = useAuth();
  const context = useOutletContext();
  if (!user) return <Navigate to={PATHS.landing} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={PATHS.dashboard} replace />;
  return <Outlet context={context} />;
}

// Halaman pengunjung (Overview & Login): akun yang sudah login langsung diarahkan ke Dashboard
export function GuestOnly() {
  const { user } = useAuth();
  const context = useOutletContext();
  if (user) return <Navigate to={PATHS.dashboard} replace />;
  return <Outlet context={context} />;
}

// Alamat tidak dikenal → Dashboard (sudah login) atau Overview
export function FallbackRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? PATHS.dashboard : PATHS.landing} replace />;
}
