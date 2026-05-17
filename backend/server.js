const http = require('node:http');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 5021);
const FRONTEND_HOST = process.env.FRONTEND_HOST || '127.0.0.1';
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 3021);
const FRONTEND_ORIGIN = `http://${FRONTEND_HOST}:${FRONTEND_PORT}`;

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function writeJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on('data', (chunk) => {
      chunks.push(chunk);
    });

    request.on('end', () => {
      resolve(chunks.length > 0 ? Buffer.concat(chunks) : undefined);
    });

    request.on('error', reject);
  });
}

function buildProxyHeaders(request) {
  const headers = new Headers();

  for (const [headerName, headerValue] of Object.entries(request.headers)) {
    const normalizedName = headerName.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(normalizedName) || normalizedName === 'host') {
      continue;
    }

    if (Array.isArray(headerValue)) {
      for (const value of headerValue) {
        headers.append(headerName, value);
      }
      continue;
    }

    if (typeof headerValue === 'string') {
      headers.set(headerName, headerValue);
    }
  }

  headers.set('x-forwarded-host', request.headers.host || `${HOST}:${PORT}`);
  headers.set('x-forwarded-proto', 'http');
  headers.set('x-forwarded-for', request.socket.remoteAddress || '');

  return headers;
}

async function proxyToFrontend(request, response, requestUrl) {
  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : await readRequestBody(request);

  const upstreamResponse = await fetch(`${FRONTEND_ORIGIN}${requestUrl.pathname}${requestUrl.search}`, {
    method: request.method,
    headers: buildProxyHeaders(request),
    body,
    redirect: 'manual',
  });

  response.statusCode = upstreamResponse.status;

  upstreamResponse.headers.forEach((value, headerName) => {
    if (HOP_BY_HOP_HEADERS.has(headerName.toLowerCase()) || headerName.toLowerCase() === 'set-cookie') {
      return;
    }

    response.setHeader(headerName, value);
  });

  if (typeof upstreamResponse.headers.getSetCookie === 'function') {
    const setCookies = upstreamResponse.headers.getSetCookie();
    if (setCookies.length > 0) {
      response.setHeader('set-cookie', setCookies);
    }
  }

  const payload = Buffer.from(await upstreamResponse.arrayBuffer());
  response.end(payload);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || `${HOST}:${PORT}`}`);

  if (requestUrl.pathname === '/health' || requestUrl.pathname === '/api/health') {
    return writeJson(response, 200, {
      status: 'ok',
      service: 'taskflow-backend',
      frontendOrigin: FRONTEND_ORIGIN,
    });
  }

  if (requestUrl.pathname === '/api' || requestUrl.pathname.startsWith('/api/')) {
    try {
      await proxyToFrontend(request, response, requestUrl);
      return;
    } catch (error) {
      console.error('Proxy error:', error);
      return writeJson(response, 502, {
        error: 'Bad Gateway',
        message: 'Frontend API proxy request failed.',
      });
    }
  }

  return writeJson(response, 404, {
    error: 'Not Found',
    message: 'Only /health and /api/* are exposed by this backend service.',
  });
});

server.listen(PORT, HOST, () => {
  console.log(`TaskFlow backend listening on http://${HOST}:${PORT}`);
  console.log(`Proxying /api/* requests to ${FRONTEND_ORIGIN}`);
});
