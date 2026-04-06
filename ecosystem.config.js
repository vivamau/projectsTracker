module.exports = {
  apps: [
    {
      name: 'projectstracker-api',
      script: 'index.js',
      cwd: './backend',

      // Single instance — SQLite does not support concurrent writes safely
      instances: 1,
      exec_mode: 'fork',

      // Restart policy
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      // Log files (relative to project root)
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      env: {
        NODE_ENV: 'development',
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
