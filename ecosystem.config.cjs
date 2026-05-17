module.exports = {
  apps: [
    {
      name: 'taskflow-frontend',
      cwd: __dirname,
      script: './deploy/scripts/run-frontend-pm2.sh',
      interpreter: 'bash',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'taskflow-backend',
      cwd: __dirname,
      script: './deploy/scripts/run-backend-pm2.sh',
      interpreter: 'bash',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
