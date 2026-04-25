module.exports = {
  apps: [
    {
      name: 'unifi-api',
      script: 'server.js',
      cwd: '.next/standalone',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        HOSTNAME: '0.0.0.0',
        PORT: 3000,
      },
    },
  ],
};
