module.exports = {
  apps: [
    {
      // Redis di WSL Ubuntu untuk antrean kerja BullMQ (lihat gtm-monitor-backend/scripts/redis-wsl.js)
      name: 'gtm-redis',
      script: 'scripts/redis-wsl.js',
      cwd: './gtm-monitor-backend',
      autorestart: true,
      restart_delay: 5000
    },
    {
      name: 'gtm-backend',
      script: 'server.js',
      cwd: './gtm-monitor-backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      // Worker latar belakang: OCR gambar program & import Excel ODP (ETL)
      name: 'gtm-worker',
      script: 'worker.js',
      cwd: './gtm-monitor-backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 3000,
      kill_timeout: 10000,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'gtm-watchdog',
      script: 'watchdog.js',
      cwd: './gtm-monitor-backend',
      autorestart: true,
      restart_delay: 10000,
      env: {
        PORT: 3001
      }
    }

    /* 
    // OPTIONAL: Jika Anda memilih mengelola Cloudflared via PM2 (Bukan Windows Service)
    {
      name: 'cloudflared-tunnel',
      script: 'cloudflared',
      args: 'tunnel run --token TOKEN_CLOUDFLARE_KAMU',
      autorestart: true,
      restart_delay: 5000,
      exp_backoff_restart_delay: 200
    }
    */
  ]
};
