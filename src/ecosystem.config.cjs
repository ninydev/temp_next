module.exports = {
  apps: [
    {
      name: 'next-https',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      node_args: '--enable-source-maps',
      env: {
        NODE_ENV: 'production',
        HOST: process.env.HOST || '0.0.0.0',
        PORT_HTTP: process.env.PORT_HTTP || 80,
        PORT_HTTPS: process.env.PORT_HTTPS || 443,
        SSL_KEY_PATH: process.env.SSL_KEY_PATH || '/etc/letsencrypt/live/pv32itstep.northeurope.cloudapp.azure.com/privkey.pem',
        SSL_CERT_PATH: process.env.SSL_CERT_PATH || '/etc/letsencrypt/live/pv32itstep.northeurope.cloudapp.azure.com/fullchain.pem',
      },
      watch: false,
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
