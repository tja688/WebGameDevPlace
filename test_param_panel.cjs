const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    try {
        // 1. 打开游戏并进入对战测试场
        await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
        await page.click('#btn-playground');
        await page.waitForTimeout(800);
        // 点击进入对战测试场（Canvas 中间按钮）
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
        await page.waitForTimeout(1200);

        // 2. 打开参数配置面板
        await page.click('#pg-toggle-param');
        await page.waitForTimeout(500);

        // 3. 搜索"齐心"并修改数值
        await page.fill('#pg-param-search', '齐心');
        await page.waitForTimeout(300);

        // 找到齐心协力输入框并修改
        const input = await page.locator('input[data-id="unity_strike"]');
        await input.fill('99');
        await page.waitForTimeout(200);

        // 4. 点击保存
        const saveBtn = await page.locator('input[data-id="unity_strike"]').locator('xpath=../../..').locator('button.pg-save-field');
        await saveBtn.click();
        await page.waitForTimeout(500);

        // 5. 验证 localStorage 中已有覆盖
        const overrides = await page.evaluate(() => {
            const raw = localStorage.getItem('card_dungeon_data_overrides');
            return raw ? JSON.parse(raw) : null;
        });
        console.log('Overrides after save:', JSON.stringify(overrides));
        if (overrides?.cards?.unity_strike?.baseValue === 99) {
            console.log('✅ 保存到 localStorage 成功');
        } else {
            console.log('❌ 保存到 localStorage 失败');
        }

        // 6. 验证下拉框中的卡牌数值已热更新（显示 99点）
        const cardText = await page.locator('#pg-card-select option[value="unity_strike"]').textContent();
        console.log('Card select text:', cardText);
        if (cardText.includes('99')) {
            console.log('✅ 热改动已生效（下拉框显示 99点）');
        } else {
            console.log('❌ 热改动未生效');
        }

        // 7. 测试导出 JSON
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.click('#pg-export-overrides')
        ]);
        const downloadPath = await download.path();
        if (downloadPath && fs.existsSync(downloadPath)) {
            const content = fs.readFileSync(downloadPath, 'utf8');
            const exported = JSON.parse(content);
            console.log('Exported JSON:', JSON.stringify(exported));
            if (exported?.cards?.unity_strike?.baseValue === 99) {
                console.log('✅ JSON 导出成功且内容正确');
            } else {
                console.log('❌ JSON 导出内容不正确');
            }
        } else {
            console.log('❌ JSON 导出失败');
        }

        // 8. 点击恢复按钮，验证单字段恢复
        const resetBtn = await page.locator('input[data-id="unity_strike"]').locator('xpath=../../..').locator('button.pg-reset-field');
        await resetBtn.click();
        await page.waitForTimeout(500);

        const overridesAfterReset = await page.evaluate(() => {
            const raw = localStorage.getItem('card_dungeon_data_overrides');
            return raw ? JSON.parse(raw) : null;
        });
        console.log('Overrides after reset:', JSON.stringify(overridesAfterReset));
        if (!overridesAfterReset?.cards?.unity_strike?.baseValue) {
            console.log('✅ 单字段恢复成功');
        } else {
            console.log('❌ 单字段恢复失败');
        }

        // 9. 验证下拉框数值已恢复
        const cardTextAfterReset = await page.locator('#pg-card-select option[value="unity_strike"]').textContent();
        console.log('Card select text after reset:', cardTextAfterReset);
        if (!cardTextAfterReset.includes('99')) {
            console.log('✅ 热改动已恢复');
        } else {
            console.log('❌ 热改动未恢复');
        }

        // 10. 关闭面板
        await page.click('#pg-close-param');
        await page.waitForTimeout(300);

        // 11. 再次修改一个数值并刷新页面，验证持久化
        await page.click('#pg-toggle-param');
        await page.waitForTimeout(300);
        await page.fill('#pg-param-search', '辅助');
        await page.waitForTimeout(300);
        const input2 = await page.locator('input[data-id="support_strike"]');
        await input2.fill('88');
        await page.waitForTimeout(200);
        const saveBtn2 = await page.locator('input[data-id="support_strike"]').locator('xpath=../../..').locator('button.pg-save-field');
        await saveBtn2.click();
        await page.waitForTimeout(500);

        // 刷新页面
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
        await page.click('#btn-playground');
        await page.waitForTimeout(800);
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
        await page.waitForTimeout(1200);
        await page.click('#pg-toggle-param');
        await page.waitForTimeout(300);
        await page.fill('#pg-param-search', '辅助');
        await page.waitForTimeout(300);

        const inputAfterReload = await page.locator('input[data-id="support_strike"]');
        const valueAfterReload = await inputAfterReload.inputValue();
        console.log('Value after reload:', valueAfterReload);
        if (valueAfterReload === '88') {
            console.log('✅ 持久化验证成功（刷新后数值仍为 88）');
        } else {
            console.log('❌ 持久化验证失败');
        }

        // 清理：恢复默认值
        const resetBtn2 = await page.locator('input[data-id="support_strike"]').locator('xpath=../../..').locator('button.pg-reset-field');
        await resetBtn2.click();
        await page.waitForTimeout(500);
        console.log('✅ 测试结束，已清理修改');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
