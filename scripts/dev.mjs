import { spawn } from 'node:child_process';
import net from 'node:net';
import readline from 'node:readline';

const frontendArgs = process.argv.slice(2);
const pnpmExecPath = process.env.npm_execpath;
const frontendHost = process.env.FRONTEND_HOST || '127.0.0.1';
const frontendPort = process.env.FRONTEND_PORT || '3021';
const backendHost = process.env.BACKEND_HOST || '127.0.0.1';
const backendPort = process.env.BACKEND_PORT || process.env.PORT || '5021';

if (!pnpmExecPath) {
  console.error('Unable to resolve pnpm from npm_execpath.');
  process.exit(1);
}

const children = [];
let shuttingDown = false;

function checkPortAvailability(host, port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }

      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(Number(port), host);
  });
}

async function ensurePortsAreAvailable() {
  const checks = await Promise.all([
    checkPortAvailability(frontendHost, frontendPort),
    checkPortAvailability(backendHost, backendPort),
  ]);

  const unavailable = [];

  if (!checks[0]) {
    unavailable.push(`frontend dev port ${frontendHost}:${frontendPort}`);
  }

  if (!checks[1]) {
    unavailable.push(`backend dev port ${backendHost}:${backendPort}`);
  }

  if (unavailable.length === 0) {
    return;
  }

  console.error(`Cannot start TaskFlow dev because these ports are already in use: ${unavailable.join(', ')}.`);
  console.error('Close the process using those ports or override them for this session.');
  console.error('Quick localhost fallback: pnpm dev:localhost --turbo');
  console.error('PowerShell example: $env:FRONTEND_PORT=3121; $env:BACKEND_PORT=5121; pnpm dev --turbo');
  console.error('Bash example: FRONTEND_PORT=3121 BACKEND_PORT=5121 pnpm dev --turbo');
  process.exit(1);
}

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

await ensurePortsAreAvailable();

runPnpmProcess('frontend', [
  '--filter',
  'frontend',
  'dev',
  '--',
  '--hostname',
  frontendHost,
  '--port',
  frontendPort,
  ...frontendArgs,
]);

runPnpmProcess('backend', ['--filter', 'backend', 'dev']);
