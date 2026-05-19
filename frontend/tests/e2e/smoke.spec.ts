import { test as base, expect } from '@playwright/test';
import { AUTH_STATE_PATH, BACKEND_BASE_URL, readSeededState } from './support/config';
import { ROUTES, TEST_IDS } from './selectors';

const authenticated = base.extend({});
authenticated.use({ storageState: AUTH_STATE_PATH });

base('@smoke login page renders the form', async ({ page }) => {
  await page.goto(ROUTES.login);

  await expect(page.getByTestId(TEST_IDS.loginEmail)).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.loginPassword)).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.loginSubmit)).toBeVisible();
});

authenticated('@smoke dashboard renders for an authenticated user', async ({ page }) => {
  await page.goto(ROUTES.dashboard);

  await expect(page.getByTestId(TEST_IDS.dashboardHeading)).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.dashboardNewTeam)).toBeVisible();
});

authenticated('@smoke team board renders for the seeded team', async ({ page }) => {
  const state = readSeededState();
  await page.goto(`/teams/${state.teamId}/board`);

  await expect(page.getByTestId(TEST_IDS.teamHeader)).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.boardNewTask)).toBeVisible();
});

base('@smoke backend health endpoint responds', async ({ request }) => {
  const response = await request.get(`${BACKEND_BASE_URL}/health`);
  expect(response.ok()).toBe(true);
  await expect.poll(async () => (await response.json()).status).toBe('ok');
});
