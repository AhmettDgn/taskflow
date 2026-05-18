import { rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const nextBuildCache = path.join(process.cwd(), '.next');
const nextScript = path.join(
  process.cwd(),
  'node_modules',
  'next',
  'dist',
  'bin',
  'next'
);

await rm(nextBuildCache, { recursive: true, force: true });

const child = spawn(process.execPath, [nextScript, 'build'], {
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
