import { spawn } from 'node:child_process';
import path from 'node:path';

const rawArgs = process.argv.slice(2);
const forwardedArgs = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
const nextScript = path.join(
  process.cwd(),
  'node_modules',
  'next',
  'dist',
  'bin',
  'next'
);

const child = spawn(process.execPath, [nextScript, 'start', ...forwardedArgs], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
