import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

const envPath = path.resolve(process.cwd(), '.env.local');

if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

export const E2E_BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3021';
export const BACKEND_BASE_URL = process.env.E2E_BACKEND_BASE_URL ?? 'http://127.0.0.1:5021';
export const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'taskflow.e2e@example.com';
export const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'TaskflowE2E123!';
export const E2E_TEST_FULL_NAME = process.env.E2E_TEST_FULL_NAME ?? 'TaskFlow E2E';
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const PLAYWRIGHT_DIR = path.resolve(process.cwd(), '.playwright');
export const AUTH_STATE_PATH = path.join(PLAYWRIGHT_DIR, 'auth.json');
export const SEEDED_STATE_PATH = path.join(PLAYWRIGHT_DIR, 'seed-state.json');

export interface SeededState {
  teamId: string;
  taskId: string;
  notificationContent: string;
}

export function readSeededState(): SeededState {
  return JSON.parse(readFileSync(SEEDED_STATE_PATH, 'utf8')) as SeededState;
}
