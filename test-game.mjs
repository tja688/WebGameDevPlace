import { chromium } from 'playwright-core';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

page.on('console', msg => {
  const type = msg.type();
  if (type === 'error' || type === 'warning') {
    console.log(`[${type.toUpperCase()}] ${msg.text()}`);
  }
});

page.on('pageerror', err => {
  console.log(`[PAGE ERROR] ${err.message}`);
});

await page.goto('http://127.0.0.1:5173/');
await page.waitForTimeout(4000);

// 截图
await page.screenshot({ path: 'test-screenshot.png' });

await browser.close();
