const DEFAULT_API_BASE_PATH = '/api';

function normalizeBasePath(basePath?: string) {
  const trimmed = (basePath || DEFAULT_API_BASE_PATH).trim();
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '') || DEFAULT_API_BASE_PATH;
}

export function getApiPath(path: string) {
  const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_API_BASE_PATH);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}
