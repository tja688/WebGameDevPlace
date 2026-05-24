const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir);

    try {
        // 1. 打开游戏主菜单
        await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotsDir, '01_title.png') });
        console.log('Screenshot 01_title.png saved');

        // 2. 进入 Playground 菜单
        await page.click('#btn-playground');
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(screenshotsDir, '02_playground_menu.png') });
        console.log('Screenshot 02_playground_menu.png saved');

        // 3. 进入对战测试场
        // 按钮在 Canvas 上，需要通过 evaluate 来模拟点击
        await page.evaluate(() => {
            const canvas = document.getElementById('gameCanvas');
            const rect = canvas.getBoundingClientRect();
            const scaleX = 1280 / rect.width;
            const scaleY = 720 / rect.height;
            const event = new MouseEvent('mousedown', {
                clientX: rect.left + (640 / scaleX),
                clientY: rect.top + (260 / scaleY),
                bubbles: true
            });
            canvas.dispatchEvent(event);
        });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(screenshotsDir, '03_battle_test.png') });
        console.log('Screenshot 03_battle_test.png saved');

        // 4. 切换怪物为食人花
        await page.selectOption('#pg-monster-select', 'polluted_flower');
        await page.waitForTimeout(200);
        await page.click('#pg-change-monster');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotsDir, '04_monster_changed.png') });
        console.log('Screenshot 04_monster_changed.png saved');

        // 5. 展开参数配置面板
        await page.evaluate(() => {
            const details = document.querySelector('#pg-battle-panel details');
            if (details) details.open = true;
        });
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(screenshotsDir, '05_data_editor.png') });
        console.log('Screenshot 05_data_editor.png saved');

        // 6. 添加卡牌到手牌
        await page.selectOption('#pg-card-select', 'veteran_ambition');
        await page.waitForTimeout(200);
        await page.click('#pg-add-card');
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(screenshotsDir, '06_card_added.png') });
        console.log('Screenshot 06_card_added.png saved');

        console.log('\nAll screenshots saved to screenshots/');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
