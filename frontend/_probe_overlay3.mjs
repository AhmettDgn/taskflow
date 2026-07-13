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
// click the collapsed error indicator inside the shadow root
const clicked = await page.evaluate(() => {
  const portal=document.querySelector('nextjs-portal');
  if(!portal||!portal.shadowRoot) return 'no portal';
  const btn = portal.shadowRoot.querySelector('[data-nextjs-toast], button, [role="button"]');
  if(btn){ btn.click(); return 'clicked '+btn.tagName; }
  return 'no btn';
});
console.log('CLICK:', clicked);
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const portal=document.querySelector('nextjs-portal');
  const sr=portal&&portal.shadowRoot;
  if(!sr) return {err:'no sr'};
  const grab=(sel)=>[...sr.querySelectorAll(sel)].map(e=>e.textContent.trim()).filter(Boolean);
  return {
    h: grab('h1,h2,[data-nextjs-dialog-header] *').slice(0,10),
    frames: grab('[data-nextjs-call-stack-frame]').slice(0,30),
    codeframe: grab('[data-nextjs-codeframe]').slice(0,3),
    anchors: grab('a').slice(0,20),
  };
});
console.log(JSON.stringify(info,null,2));
await browser.close();
