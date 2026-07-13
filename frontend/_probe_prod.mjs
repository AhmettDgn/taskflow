import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

loadEnvFile(path.resolve(process.cwd(), '.env.local'));

const BASE = 'http://127.0.0.1:3022';
const EMAIL = process.env.E2E_TEST_EMAIL ?? 'taskflow.e2e@example.com';
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'TaskflowE2E123!';
const FULL_NAME = 'TaskFlow E2E';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Ensure user + team exist
const { data: prof } = await admin.from('profiles').select('id').eq('email', EMAIL).maybeSingle();
let userId = prof?.id;
if (!userId) {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { full_name: FULL_NAME },
  });
  if (error) throw error;
  userId = data.user.id;
} else {
  await admin.auth.admin.updateUserById(userId, { password: PASSWORD });
}
await admin.from('profiles').upsert({ id: userId, email: EMAIL, full_name: FULL_NAME, avatar_url: null }, { onConflict: 'id' });

const { data: team } = await admin.from('teams').select('id').eq('created_by', userId).maybeSingle();
let teamId = team?.id;
if (!teamId) {
  const { data } = await admin.from('teams').insert({ name: 'Probe Team', created_by: userId }).select('id').single();
  teamId = data.id;
}
await admin.from('team_members').upsert({ team_id: teamId, user_id: userId, role: 'admin' }, { onConflict: 'team_id,user_id' });

console.log('user', userId, 'team', teamId);

const browser = await chromium.launch();
const ctx = await browser.newContext({ baseURL: BASE });
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

// Login
await page.goto('/login');
await page.getByTestId('login-email').fill(EMAIL);
await page.getByTestId('login-password').fill(PASSWORD);
await page.getByTestId('login-submit').click();
try {
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  console.log('LOGIN OK -> dashboard');
} catch {
  console.log('LOGIN FAILED, url=', page.url());
  console.log('errors so far:', errors.join('\n'));
}

const routes = [
  ['/dashboard', 'dashboard-heading'],
  ['/teams', 'teams-heading'],
  ['/tasks', 'tasks-heading'],
  ['/notifications', 'notifications-heading'],
  ['/profile', 'profile-heading'],
  [`/teams/${teamId}/board`, 'team-header'],
  [`/teams/${teamId}/list`, 'team-list-heading'],
  [`/teams/${teamId}/boards`, null],
  [`/teams/${teamId}/members`, 'team-members-heading'],
  [`/teams/${teamId}/settings`, 'team-settings-heading'],
  [`/teams/${teamId}/tasks/new`, 'new-task-heading'],
];

for (const [route, testid] of routes) {
  errors.length = 0;
  let status = '?';
  const resp = await page.goto(route, { waitUntil: 'networkidle', timeout: 20000 }).catch((e) => { errors.push(`[nav] ${e.message}`); return null; });
  if (resp) status = resp.status();
  let rendered = 'n/a';
  if (testid) {
    rendered = await page.getByTestId(testid).isVisible().catch(() => false);
  }
  const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 120).replace(/\n/g, ' ');
  const mark = (testid && rendered !== true) || errors.length ? 'FAIL' : 'ok';
  console.log(`\n=== ${mark} ${route} [HTTP ${status}] heading=${rendered} ===`);
  console.log('  body:', bodyText);
  if (errors.length) console.log('  errors:\n   ' + errors.join('\n   '));
}

await browser.close();
