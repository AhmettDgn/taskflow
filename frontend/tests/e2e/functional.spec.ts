import { test as base, expect, request as playwrightRequest } from '@playwright/test';
import {
  AUTH_STATE_PATH,
  E2E_BASE_URL,
  E2E_TEST_EMAIL,
  E2E_TEST_PASSWORD,
  readSeededState,
} from './support/config';
import { ROUTES, TEST_IDS } from './selectors';

const unauthenticated = base.extend({});
const authenticated = base.extend({});
unauthenticated.use({ storageState: { cookies: [], origins: [] } });
authenticated.use({ storageState: AUTH_STATE_PATH });

unauthenticated('@functional unauthenticated root redirects to login', async () => {
  const requestContext = await playwrightRequest.newContext({
    baseURL: E2E_BASE_URL,
    storageState: { cookies: [], origins: [] },
  });
  const response = await requestContext.get(ROUTES.root, { maxRedirects: 0 });

  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain('/login');
  await requestContext.dispose();
});

authenticated('@functional authenticated root redirects to dashboard', async ({ page }) => {
  await page.goto(ROUTES.root);
  await expect(page).toHaveURL(/\/dashboard$/);
});

base('@functional login flow succeeds with the seeded account', async ({ page }) => {
  await page.goto(ROUTES.login);
  await page.getByTestId(TEST_IDS.loginEmail).fill(E2E_TEST_EMAIL);
  await page.getByTestId(TEST_IDS.loginPassword).fill(E2E_TEST_PASSWORD);
  await page.getByTestId(TEST_IDS.loginSubmit).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId(TEST_IDS.dashboardHeading)).toBeVisible();
});

authenticated('@functional command palette opens with Ctrl+K', async ({ page }) => {
  await page.goto(ROUTES.dashboard);
  await page.keyboard.press('Control+K');

  await expect(page.getByTestId(TEST_IDS.commandPaletteInput)).toBeVisible();
});

authenticated('@functional notification dropdown shows seeded content', async ({ page }) => {
  const state = readSeededState();
  await page.goto(ROUTES.dashboard);
  await page.getByTestId(TEST_IDS.notificationBellButton).click();

  await expect(page.getByTestId(TEST_IDS.notificationDropdown)).toBeVisible();
  await expect(page.getByText(state.notificationContent)).toBeVisible();
});

authenticated('@functional dashboard shell routes render without error boundaries', async ({ page }) => {
  const state = readSeededState();
  const routeChecks = [
    { route: ROUTES.dashboard, locator: page.getByTestId(TEST_IDS.dashboardHeading) },
    { route: ROUTES.teams, locator: page.getByTestId(TEST_IDS.teamsHeading) },
    { route: ROUTES.teamsCreate, locator: page.getByTestId(TEST_IDS.teamCreateHeading) },
    { route: ROUTES.teamsJoin, locator: page.getByTestId(TEST_IDS.teamJoinHeading) },
    { route: ROUTES.tasks, locator: page.getByTestId(TEST_IDS.tasksHeading) },
    { route: ROUTES.notifications, locator: page.getByTestId(TEST_IDS.notificationsHeading) },
    { route: ROUTES.profile, locator: page.getByTestId(TEST_IDS.profileHeading) },
    { route: `/teams/${state.teamId}/board`, locator: page.getByTestId(TEST_IDS.boardNewTask) },
    { route: `/teams/${state.teamId}/list`, locator: page.getByTestId(TEST_IDS.teamListHeading) },
    { route: `/teams/${state.teamId}/members`, locator: page.getByTestId(TEST_IDS.teamMembersHeading) },
    { route: `/teams/${state.teamId}/settings`, locator: page.getByTestId(TEST_IDS.teamSettingsHeading) },
    { route: `/teams/${state.teamId}/tasks/new`, locator: page.getByTestId(TEST_IDS.newTaskHeading) },
    { route: `/teams/${state.teamId}/tasks/${state.taskId}`, locator: page.getByTestId(TEST_IDS.taskDetailTitle) },
  ];

  for (const check of routeChecks) {
    const response = await page.goto(check.route, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await expect(check.locator).toBeVisible();
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
    await expect(page.getByText(/Bir .* ters gitti/i)).toHaveCount(0);
  }
});

authenticated('@functional logout returns the user to login', async ({ page }) => {
  await page.goto(ROUTES.dashboard);
  await page.getByTestId(TEST_IDS.sidebarLogout).click();

  await expect(page).toHaveURL(/\/login$/);
});
