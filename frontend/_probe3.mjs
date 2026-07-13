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
const lines=[];
page.on('console', async (m)=>{
  try {
    const args = await Promise.all(m.args().map(a=>a.jsonValue().catch(()=>'<obj>')));
    lines.push(`[${m.type()}] ` + args.map(a=>typeof a==='string'?a:JSON.stringify(a)).join(' '));
  } catch { lines.push(`[${m.type()}] ${m.text()}`); }
});
page.on('pageerror',(e)=>lines.push(`[pageerror] ${e.message}`));
await page.goto('/login');
await page.getByTestId('login-email').fill(EMAIL);
await page.getByTestId('login-password').fill(PASSWORD);
await page.getByTestId('login-submit').click();
await page.waitForURL('**/dashboard',{timeout:15000}).catch(()=>{});
await page.waitForTimeout(3000);
console.log(lines.join('\n----\n'));
await browser.close();
