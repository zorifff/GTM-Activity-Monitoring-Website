// Entry point backend GTM Activity Monitoring (dipakai npm run dev / npm run backend / pm2).
// Struktur aplikasi ada di src/: routes → controllers → services (lihat src/app.js).
const { PORT } = require('./src/config/env');
const app = require('./src/app');

// Error yang lolos dari alur request dicatat lengkap, bukan hilang diam-diam
process.on('unhandledRejection', (reason) => {
  console.error('❌ [Unhandled Rejection]', reason);
});
process.on('uncaughtException', (error) => {
  console.error('❌ [Uncaught Exception]', error);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
