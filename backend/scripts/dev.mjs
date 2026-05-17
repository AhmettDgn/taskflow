import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['--watch', 'server.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: '5021',
    FRONTEND_HOST: '127.0.0.1',
    FRONTEND_PORT: '3021',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
