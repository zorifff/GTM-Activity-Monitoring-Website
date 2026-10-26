// Alamat halaman aplikasi (React Router). `view` = nama halaman yang dipakai komponen lama (menu aktif, animasi).
export const PATHS = {
  landing: '/',
  login: '/login',
  dashboard: '/dashboard',
  branch: (name) => `/branch/${encodeURIComponent(name)}`,
  upload: '/upload',
  admin: '/admin'
};

export function viewFromPath(pathname) {
  if (pathname === '/' || pathname === '') return 'landing';
  if (pathname.startsWith('/login')) return 'login';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/branch/')) return 'branch';
  if (pathname.startsWith('/upload')) return 'upload';
  if (pathname.startsWith('/admin')) return 'admin';
  return null;
}

// URL lama berbasis hash (#dashboard, #upload, …) sebelum memakai router → alamat baru
export const LEGACY_HASH_PATHS = {
  '#dashboard': PATHS.dashboard,
  '#monitoring': PATHS.dashboard,
  '#upload': PATHS.upload,
  '#admin': PATHS.admin,
  '#login': PATHS.login,
  '#landing': PATHS.landing,
  '#overview': PATHS.landing
};
