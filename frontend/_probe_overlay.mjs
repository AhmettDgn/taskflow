import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { chromium } from '@playwright/test';
loadEnvFile(path.resolve(process.cwd(), '.env.local'));
const BASE='http://127.0.0.1:3021';
const EMAIL=process.env.E2E_TEST_EMAIL ?? 'taskflow.e2e@example.com';
const PASSWORD=process.env.E2E_TEST_PASSWORD ?? 'TaskflowE2E123!';
const browser=await chromium.launch();
const ctx=await browser.newContext({baseURL:BASE});
const page=await ctx.newPage();
await page.goto('/login');
await page.getByTestId('login-email').fill(EMAIL);
await page.getByTestId('login-password').fill(PASSWORD);
await page.getByTestId('login-submit').click();
await page.waitForURL('**/dashboard',{timeout:15000}).catch(()=>{});
await page.waitForTimeout(3500);
// Scrape Next.js dev error overlay (rendered inside a shadow-root portal)
const overlay = await page.evaluate(() => {
  const out = [];
  const portal = document.querySelector('nextjs-portal');
  const root = portal && portal.shadowRoot ? portal.shadowRoot : document;
  // call stack frames usually have file paths
  root.querySelectorAll('[data-nextjs-call-stack-frame], [data-nextjs-codeframe], .nextjs__container_errors__component-stack, h1, h2, p, a, button, span').forEach(el=>{
    const t=(el.textContent||'').trim();
    if (t && t.length<200) out.push(t);
  });
  return out;
});
console.log('OVERLAY TEXT:\n' + [...new Set(overlay)].join('\n'));
await browser.close();
