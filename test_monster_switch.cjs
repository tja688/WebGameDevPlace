const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    // 进入 Playground
    await page.click('#btn-playground');
    await page.waitForTimeout(800);
    
    // 进入对战测试场
    await page.evaluate(() => {
        const canvas = document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        const event = new MouseEvent('mousedown', {
            clientX: rect.left + (640 * rect.width / 1280),
            clientY: rect.top + (230 * rect.height / 720),
            bubbles: true
        });
        canvas.dispatchEvent(event);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/debug_01_initial.png' });
    
    // 获取初始怪物名称
    const initialMonster = await page.evaluate(() => {
        return window.gameState?.monster?.name;
    });
    console.log('Initial monster:', initialMonster);
    
    // 选择并切换怪物
    await page.selectOption('#pg-monster-select', 'polluted_flower');
    await page.waitForTimeout(300);
    await page.click('#pg-change-monster');
    await page.waitForTimeout(1500);
    
    const afterMonster = await page.evaluate(() => {
        return {
            name: window.gameState?.monster?.name,
            hp: window.gameState?.monster?.hp,
            maxHp: window.gameState?.monster?.maxHp,
            pgMonsterId: window.gameState?.data?.pgMonsterId
        };
    });
    console.log('After switch:', afterMonster);
    
    await page.screenshot({ path: 'screenshots/debug_02_after_switch.png' });
    
    await browser.close();
})();
