type HeaderReader = Pick<Headers, 'get'>;

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, '');
}

function firstHeaderValue(value: string | null) {
  return value?.split(',')[0]?.trim() ?? '';
}

function getConfiguredOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() ?? '';
}

export function getPublicOrigin({
  headers,
  requestUrl,
}: {
  headers: HeaderReader;
  requestUrl?: string;
}) {
  const forwardedHost = firstHeaderValue(headers.get('x-forwarded-host'));
  const forwardedProto = firstHeaderValue(headers.get('x-forwarded-proto'));

  if (forwardedHost) {
    return `${forwardedProto || 'https'}://${forwardedHost}`;
  }

  const configuredOrigin = getConfiguredOrigin();
  if (configuredOrigin) {
    return normalizeOrigin(configuredOrigin);
  }

  if (requestUrl) {
    return new URL(requestUrl).origin;
  }

  const host = firstHeaderValue(headers.get('host'));
  return host ? `https://${host}` : '';
}

export function getPublicRedirectUrl(path: string, options: Parameters<typeof getPublicOrigin>[0]) {
  const origin = getPublicOrigin(options);
  return origin ? new URL(path, origin).toString() : path;
}
