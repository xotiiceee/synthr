module.exports = {
  apps: [
    {
      name: "synthr",
      cwd: "/opt/synthr",
      script: "node",
      args: ".next/standalone/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NODE_OPTIONS: "--max-old-space-size=384",
      },
      autorestart: true,
      max_memory_restart: "450M",
      out_file: "/var/log/pm2/synthr-out.log",
      error_file: "/var/log/pm2/synthr-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      min_uptime: "10s",
      max_restarts: 5,
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
