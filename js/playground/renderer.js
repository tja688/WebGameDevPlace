/**
 * 卡牌地下城 - Playground 渲染器
 *
 * 简化版渲染：
 * - menu 视图：Canvas 绘制类型选择菜单
 * - effect 视图：Canvas 绘制牌桌+手牌，右侧信息由 DOM 面板处理
 */

import { PlaygroundState } from './index.js';

const COLORS = {
    bg: '#0f0a14',
    panelBg: '#1a1025',
    panelBorder: '#444',
    slotBg: '#2d1b3d',
    slotBorder: '#555',
    slotBorderHover: '#3498db',
    cardBg: '#34495e',
    cardBgHover: '#3d5a80',
    text: '#ffffff',
    textDim: '#aaaaaa',
    accent: '#f39c12',
    success: '#2ecc71',
    danger: '#e74c3c',
    primary: '#3498db',
    buttonBg: '#2c3e50',
    buttonBorder: '#3498db'
};

export function drawPlayground(renderer, ctx, state) {
    const pgView = state.data?.pgView || 'menu';

    // 清屏
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    if (pgView === 'menu') {
        drawMenu(renderer, ctx, state);
    } else if (pgView === 'effect') {
        drawEffectSandbox(renderer, ctx, state);
    }
}

// ===== Menu 视图 =====

function drawMenu(renderer, ctx, state) {
    const cx = renderer.width / 2;

    // 标题
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 48px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText('🧪 Playground', cx, 120);

    ctx.fillStyle = COLORS.textDim;
    ctx.font = '20px Microsoft YaHei';
    ctx.fillText('选择要测试的内容', cx, 170);

    // 按钮列表
    const buttons = [
        { id: 'battle', label: '🎮 对战测试场', y: 230 },
        { id: 'effect', label: '🃏 词条效果测试（AI）', y: 310 },
        { id: 'back', label: '← 返回主菜单', y: 390 }
    ];

    state.data.pgMenuButtons = [];

    for (const btn of buttons) {
        const bw = 320;
        const bh = 60;
        const bx = cx - bw / 2;
        const by = btn.y;
        const isHover = PlaygroundState.ui.hoverButton === btn.id;

        ctx.fillStyle = isHover ? '#3d5a80' : COLORS.buttonBg;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = isHover ? '#5dade2' : COLORS.buttonBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = COLORS.text;
        ctx.font = '20px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(btn.label, cx, by + bh / 2 + 8);

        state.data.pgMenuButtons.push({ id: btn.id, x: bx, y: by, w: bw, h: bh });
    }

    // 版本信息
    ctx.fillStyle = '#666';
    ctx.font = '14px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText('卡牌地下城 Playground v3.3', cx, renderer.height - 40);
}

// ===== Effect 沙盒视图 =====

function drawEffectSandbox(renderer, ctx, state) {
    const scenario = state.data?.pgScenario;
    const result = PlaygroundState.lastResult;
    const sandboxState = PlaygroundState.sandboxState;

    // 顶部信息栏
    ctx.fillStyle = COLORS.panelBg;
    ctx.fillRect(0, 0, renderer.width, 60);
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, renderer.width, 60);

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px Microsoft YaHei';
    ctx.textAlign = 'left';
    ctx.fillText(scenario ? `🃏 ${scenario.name}` : '词条效果测试台', 20, 38);

    if (result) {
        const status = result.passed ? '✓ 通过' : '✗ 失败';
        const statusColor = result.passed ? COLORS.success : COLORS.danger;
        ctx.fillStyle = statusColor;
        ctx.font = 'bold 16px Microsoft YaHei';
        ctx.textAlign = 'right';
        ctx.fillText(status, renderer.width - 340, 38);
    }

    // 左侧牌桌区域
    const boardX = 20;
    const boardY = 80;
    const boardW = 800;
    const boardH = 500;

    ctx.fillStyle = COLORS.panelBg;
    ctx.fillRect(boardX, boardY, boardW, boardH);
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.strokeRect(boardX, boardY, boardW, boardH);

    // 绘制3个格子
    const slotW = 240;
    const slotH = 420;
    const slotGap = 16;
    const slotStartX = boardX + 20;
    const slotStartY = boardY + 20;

    const slots = sandboxState?.slots || [];
    state.data.pgSlotRects = [];

    for (let i = 0; i < 3; i++) {
        const sx = slotStartX + i * (slotW + slotGap);
        const sy = slotStartY;
        const slot = slots[i] || { multiplier: 1, cards: [] };

        // 格子背景
        ctx.fillStyle = COLORS.slotBg;
        ctx.fillRect(sx, sy, slotW, slotH);
        ctx.strokeStyle = COLORS.slotBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, slotW, slotH);

        // 倍率标题
        ctx.fillStyle = COLORS.accent;
        ctx.font = 'bold 18px Microsoft YaHei';
        ctx.textAlign = 'center';
        const mulText = slot.roundMultiplierBonus
            ? `${slot.multiplier}+${slot.roundMultiplierBonus} = ${slot.multiplier + slot.roundMultiplierBonus}X`
            : `${slot.multiplier}X`;
        ctx.fillText(mulText, sx + slotW / 2, sy + 28);

        // 格子中的卡牌
        const cardH = 48;
        const cardGap = 6;
        const cardsStartY = sy + 44;

        for (let c = 0; c < slot.cards.length; c++) {
            const card = slot.cards[c];
            const cy = cardsStartY + c * (cardH + cardGap);
            const cw = slotW - 16;

            ctx.fillStyle = COLORS.cardBg;
            ctx.fillRect(sx + 8, cy, cw, cardH);
            ctx.strokeStyle = card.accentColor || '#888';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + 8, cy, cw, cardH);

            // 名称 + 基础值
            ctx.fillStyle = COLORS.text;
            ctx.font = 'bold 13px Microsoft YaHei';
            ctx.textAlign = 'left';
            let valueText = `${card.baseValue}`;
            if (card.permanentBonus) valueText += `+${card.permanentBonus}`;
            if (card.battleBonus) valueText += card.battleBonus > 0 ? `+${card.battleBonus}` : `${card.battleBonus}`;
            if (card.tempBonus) valueText += `(+${card.tempBonus})`;
            ctx.fillText(`${card.name} [${valueText}]`, sx + 14, cy + 18);

            // 词条
            if (card.keywords && card.keywords.length > 0) {
                ctx.fillStyle = COLORS.textDim;
                ctx.font = '11px Microsoft YaHei';
                ctx.fillText(card.keywords.join(' '), sx + 14, cy + 34);
            }

            // 最终计算值
            if (card._finalValue !== undefined) {
                ctx.fillStyle = COLORS.success;
                ctx.font = 'bold 13px Microsoft YaHei';
                ctx.textAlign = 'right';
                ctx.fillText(`→ ${card._finalValue}`, sx + cw, cy + 18);
            }
        }

        // 空格子提示
        if (slot.cards.length === 0) {
            ctx.fillStyle = '#444';
            ctx.font = '14px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText('(空)', sx + slotW / 2, sy + slotH / 2);
        }

        state.data.pgSlotRects.push({ index: i, x: sx, y: sy, w: slotW, h: slotH });
    }

    // 底部手牌区
    const handY = boardY + boardH + 12;
    const handH = 100;

    ctx.fillStyle = COLORS.panelBg;
    ctx.fillRect(boardX, handY, boardW, handH);
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.strokeRect(boardX, handY, boardW, handH);

    ctx.fillStyle = COLORS.textDim;
    ctx.font = '14px Microsoft YaHei';
    ctx.textAlign = 'left';
    ctx.fillText('手牌:', boardX + 10, handY + 20);

    const hand = sandboxState?.hand || [];
    const handCardW = 110;
    const handCardH = 70;
    state.data.pgHandCardRects = [];

    for (let i = 0; i < hand.length; i++) {
        const hx = boardX + 10 + i * (handCardW + 8);
        const hy = handY + 26;
        const card = hand[i];

        ctx.fillStyle = COLORS.cardBg;
        ctx.fillRect(hx, hy, handCardW, handCardH);
        ctx.strokeStyle = card.accentColor || '#888';
        ctx.lineWidth = 1;
        ctx.strokeRect(hx, hy, handCardW, handCardH);

        ctx.fillStyle = COLORS.text;
        ctx.font = '12px Microsoft YaHei';
        ctx.textAlign = 'left';
        ctx.fillText(card.name, hx + 6, hy + 18);

        ctx.fillStyle = COLORS.textDim;
        ctx.font = '10px Microsoft YaHei';
        ctx.fillText(card.keywords?.join(' ') || '', hx + 6, hy + 34);

        ctx.fillStyle = COLORS.accent;
        ctx.font = 'bold 12px Microsoft YaHei';
        ctx.textAlign = 'right';
        ctx.fillText(card.baseValue, hx + handCardW - 6, hy + 18);

        state.data.pgHandCardRects.push({ index: i, x: hx, y: hy, w: handCardW, h: handCardH });
    }

    // 右侧信息面板（简要，详细由 DOM 面板处理）
    const infoX = boardX + boardW + 12;
    const infoW = renderer.width - infoX - 20;
    const infoY = boardY;
    const infoH = boardH + handH + 12;

    ctx.fillStyle = COLORS.panelBg;
    ctx.fillRect(infoX, infoY, infoW, infoH);
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.strokeRect(infoX, infoY, infoW, infoH);

    if (result) {
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 14px Microsoft YaHei';
        ctx.textAlign = 'left';
        ctx.fillText('断言结果:', infoX + 10, infoY + 24);

        const assertions = result.assertionResults || [];
        const itemH = 18;
        const startY = infoY + 44;
        const maxVisible = Math.min(assertions.length, Math.floor((infoH - 60) / itemH));

        for (let i = 0; i < maxVisible; i++) {
            const a = assertions[i];
            const ay = startY + i * itemH;
            const icon = a.passed ? '✓' : '✗';
            const color = a.passed ? COLORS.success : COLORS.danger;

            ctx.fillStyle = color;
            ctx.font = '12px Microsoft YaHei';
            ctx.fillText(`${icon} ${a.desc}`, infoX + 10, ay);

            if (!a.passed) {
                ctx.fillStyle = COLORS.textDim;
                ctx.font = '10px Microsoft YaHei';
                ctx.fillText(`  期望=${JSON.stringify(a.expected)} 实际=${JSON.stringify(a.actual)}`, infoX + 10, ay + 12);
            }
        }

        // 总伤害
        if (sandboxState?._totalDamage !== undefined) {
            ctx.fillStyle = COLORS.accent;
            ctx.font = 'bold 14px Microsoft YaHei';
            ctx.fillText(`总伤害: ${sandboxState._totalDamage}`, infoX + 10, infoY + infoH - 20);
        }
    } else {
        ctx.fillStyle = COLORS.textDim;
        ctx.font = '14px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('点击「运行测试」查看结果', infoX + infoW / 2, infoY + infoH / 2);
    }
}
