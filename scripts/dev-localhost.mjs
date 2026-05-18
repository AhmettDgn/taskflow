import { spawn } from 'node:child_process';
import path from 'node:path';

const scriptPath = path.join(process.cwd(), 'scripts', 'dev.mjs');
const forwardedArgs = process.argv.slice(2);

const child = spawn(process.execPath, [scriptPath, ...forwardedArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    FRONTEND_HOST: process.env.FRONTEND_HOST || 'localhost',
    FRONTEND_PORT: process.env.FRONTEND_PORT || '3121',
    BACKEND_HOST: process.env.BACKEND_HOST || 'localhost',
    BACKEND_PORT: process.env.BACKEND_PORT || '5121',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
