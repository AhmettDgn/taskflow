import { spawn } from 'node:child_process';
import readline from 'node:readline';

const frontendArgs = process.argv.slice(2);
const pnpmExecPath = process.env.npm_execpath;

if (!pnpmExecPath) {
  console.error('Unable to resolve pnpm from npm_execpath.');
  process.exit(1);
}

const children = [];
let shuttingDown = false;

function prefixStream(stream, label, isError = false) {
  if (!stream) {
    return;
  }

  const lineReader = readline.createInterface({ input: stream });
  lineReader.on('line', (line) => {
    const output = isError ? process.stderr : process.stdout;
    output.write(`[${label}] ${line}\n`);
  });
}

function runPnpmProcess(label, args) {
  const child = spawn(process.execPath, [pnpmExecPath, ...args], {
    cwd: process.cwd(),
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
  });

  children.push(child);
  prefixStream(child.stdout, label);
  prefixStream(child.stderr, `${label}:error`, true);

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (signal) {
      console.error(`[${label}] exited via signal ${signal}`);
    } else if ((code ?? 0) !== 0) {
      console.error(`[${label}] exited with code ${code}`);
    }

    shutdown(code ?? 0);
  });
}

function killChild(child) {
  if (!child.pid) {
    return Promise.resolve();
  }

  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
      });

      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
    });
  }

  child.kill('SIGTERM');
  return Promise.resolve();
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  await Promise.all(children.map((child) => killChild(child)));
  process.exit(exitCode);
}

process.on('SIGINT', () => {
  shutdown(0);
});

process.on('SIGTERM', () => {
  shutdown(0);
});

runPnpmProcess('frontend', [
  '--filter',
  'frontend',
  'dev',
  '--',
  '--hostname',
  '127.0.0.1',
  '--port',
  '3021',
  ...frontendArgs,
]);

runPnpmProcess('backend', ['--filter', 'backend', 'dev']);
