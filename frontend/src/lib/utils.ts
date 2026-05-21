import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, '');
}

export function getAppOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredOrigin) {
    return normalizeOrigin(configuredOrigin);
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return normalizeOrigin(window.location.origin);
  }

  return '';
}

export function getAuthRedirectOrigin() {
  return getAppOrigin();
}

export function formatDate(date: null | string): string {
  if (!date?.trim()) return '';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(parsedDate);
}

export function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
