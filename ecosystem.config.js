module.exports = {
  apps: [
    {
      name: "synthr",
      cwd: "/var/www/synthr",
      script: "node",
      args: ".next/standalone/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // Reduce Node.js memory ceiling for 1GB RAM VPS
        NODE_OPTIONS: "--max-old-space-size=384",
      },
      // Auto-restart on failure
      autorestart: true,
      // Restart if using more than 450MB RAM (leaves room for PostgreSQL + Nginx)
      max_memory_restart: "450M",
      // Log files
      out_file: "/var/log/pm2/synthr-out.log",
      error_file: "/var/log/pm2/synthr-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      // Don't restart if crashing too fast
      min_uptime: "10s",
      max_restarts: 5,
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
