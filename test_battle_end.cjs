const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    
    await page.goto('http://localhost:9137/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
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
    
    // 切换到一个弱小的怪物以便快速击杀测试
    await page.selectOption('#pg-monster-select', 'training_dummy');
    await page.waitForTimeout(200);
    await page.click('#pg-change-monster');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'screenshots/battle_01_before.png' });
    
    // 连续结束回合直到失败或胜利
    for (let i = 0; i < 8; i++) {
        const state = await page.evaluate(() => ({
            phase: window.gameState?.phase,
            result: window.gameState?.result,
            turn: window.gameState?.turn,
            monsterHp: window.gameState?.monster?.hp,
            playerHearts: window.gameState?.player?.hearts
        }));
        console.log(`Turn ${state.turn}, phase=${state.phase}, result=${state.result}, monsterHp=${state.monsterHp}, hearts=${state.playerHearts}`);
        
        if (state.phase === 'ended') {
            await page.waitForTimeout(2500);
            const after = await page.evaluate(() => ({
                phase: window.gameState?.phase,
                turn: window.gameState?.turn,
                monsterHp: window.gameState?.monster?.hp,
                playerHearts: window.gameState?.player?.hearts,
                message: window.gameState?.message
            }));
            console.log('After end:', after);
            await page.screenshot({ path: 'screenshots/battle_02_after_end.png' });
            break;
        }
        
        // 点击结束回合按钮
        await page.evaluate(() => {
            const canvas = document.getElementById('gameCanvas');
            const rect = canvas.getBoundingClientRect();
            const event = new MouseEvent('mousedown', {
                clientX: rect.left + (1150 * rect.width / 1280),
                clientY: rect.top + (650 * rect.height / 720),
                bubbles: true
            });
            canvas.dispatchEvent(event);
        });
        await page.waitForTimeout(1200);
    }
    
    await browser.close();
})();
