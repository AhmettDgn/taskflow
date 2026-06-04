import { spawn } from 'node:child_process';
import path from 'node:path';

// Note: we intentionally do NOT delete `.next` here. Preserving `.next/cache`
// lets Next reuse its incremental build cache, which speeds up repeat builds
// (CI and server deploys). `next build` overwrites stale outputs safely.
const nextScript = path.join(
  process.cwd(),
  'node_modules',
  'next',
  'dist',
  'bin',
  'next'
);

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
