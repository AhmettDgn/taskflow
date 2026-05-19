import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, type FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  AUTH_STATE_PATH,
  E2E_BASE_URL,
  E2E_TEST_EMAIL,
  E2E_TEST_FULL_NAME,
  E2E_TEST_PASSWORD,
  SEEDED_STATE_PATH,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from './support/config';
import { TEST_IDS } from './selectors';

const TEAM_NAME = 'TaskFlow E2E Team';
const TASK_TITLE = 'TaskFlow E2E Gorevi';
const NOTIFICATION_CONTENT = 'TaskFlow E2E bildirimi';

async function ensureUser(admin: ReturnType<typeof createClient>) {
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', E2E_TEST_EMAIL)
    .maybeSingle();

  let userId = existingProfile?.id as string | undefined;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: E2E_TEST_EMAIL,
      password: E2E_TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: E2E_TEST_FULL_NAME },
    });

    if (error || !data.user) {
      throw error ?? new Error('E2E test user could not be created.');
    }

    userId = data.user.id;
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password: E2E_TEST_PASSWORD,
    user_metadata: { full_name: E2E_TEST_FULL_NAME },
  });

  if (updateError) {
    throw updateError;
  }

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      email: E2E_TEST_EMAIL,
      full_name: E2E_TEST_FULL_NAME,
      avatar_url: null,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    throw profileError;
  }

  return userId;
}

async function ensureTeam(admin: ReturnType<typeof createClient>, userId: string) {
  const { data: existingTeam } = await admin
    .from('teams')
    .select('id')
    .eq('created_by', userId)
    .eq('name', TEAM_NAME)
    .maybeSingle();

  let teamId = existingTeam?.id as string | undefined;

  if (!teamId) {
    const { data, error } = await admin
      .from('teams')
      .insert({ name: TEAM_NAME, created_by: userId })
      .select('id')
      .single();

    if (error || !data) {
      throw error ?? new Error('E2E team could not be created.');
    }

    teamId = data.id;
  }

  const { error: memberError } = await admin.from('team_members').upsert(
    {
      team_id: teamId,
      user_id: userId,
      role: 'admin',
    },
    { onConflict: 'team_id,user_id' }
  );

  if (memberError) {
    throw memberError;
  }

  return teamId;
}

async function ensureTask(admin: ReturnType<typeof createClient>, userId: string, teamId: string) {
  const { data: existingTask } = await admin
    .from('tasks')
    .select('id')
    .eq('team_id', teamId)
    .eq('title', TASK_TITLE)
    .maybeSingle();

  let taskId = existingTask?.id as string | undefined;

  if (!taskId) {
    const { data, error } = await admin
      .from('tasks')
      .insert({
        team_id: teamId,
        title: TASK_TITLE,
        description: 'E2E test gorevi',
        status: 'todo',
        priority: 'medium',
        created_by: userId,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw error ?? new Error('E2E task could not be created.');
    }

    taskId = data.id;
  }

  return taskId;
}

async function ensureNotification(admin: ReturnType<typeof createClient>, userId: string, taskId: string) {
  const { data: existingNotification } = await admin
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .eq('content', NOTIFICATION_CONTENT)
    .maybeSingle();

  if (!existingNotification) {
    const { error } = await admin.from('notifications').insert({
      user_id: userId,
      type: 'task_assigned',
      content: NOTIFICATION_CONTENT,
      task_id: taskId,
      is_read: false,
    });

    if (error) {
      throw error;
    }
  }
}

export default async function globalSetup(config: FullConfig) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables are required for E2E setup.');
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userId = await ensureUser(admin);
  const teamId = await ensureTeam(admin, userId);
  const taskId = await ensureTask(admin, userId, teamId);
  await ensureNotification(admin, userId, taskId);

  await mkdir(path.dirname(AUTH_STATE_PATH), { recursive: true });
  await writeFile(
    SEEDED_STATE_PATH,
    JSON.stringify({ teamId, taskId, notificationContent: NOTIFICATION_CONTENT }, null, 2),
    'utf8'
  );

  const browser = await chromium.launch();
  const page = await browser.newPage({
    baseURL: config.projects[0]?.use?.baseURL?.toString() ?? E2E_BASE_URL,
  });

  await page.goto('/login');
  await page.getByTestId(TEST_IDS.loginEmail).fill(E2E_TEST_EMAIL);
  await page.getByTestId(TEST_IDS.loginPassword).fill(E2E_TEST_PASSWORD);
  await page.getByTestId(TEST_IDS.loginSubmit).click();
  await page.waitForURL('**/dashboard');
  await page.context().storageState({ path: AUTH_STATE_PATH });
  await browser.close();
}
