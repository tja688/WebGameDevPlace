/**
 * 卡牌地下城 - 战斗界面渲染
 */

import { roundRect, darkenColor, wrapText, drawBackground } from './core.js';
import { KEYWORDS } from '../data/index.js';
import { getCardBaseValue, getCardFinalValue, buildCardSlotMap, canPlaceCard, getSlotEffectiveMultiplier, getPlacementPreview } from '../systems/board.js';
import { calculateTotalBoardDamage } from '../systems/board.js';
import { MONSTER_COLOR_THEMES } from '../data/index.js';

export function drawBattle(renderer, ctx, state) {
    drawBackground(ctx, renderer.width, renderer.height, renderer.animTime);
    drawMonsterArea(renderer, ctx, state);
    drawPlayerArea(renderer, ctx, state);
    drawBoardArea(renderer, ctx, state);
    drawHandArea(renderer, ctx, state);
    drawUI(renderer, ctx, state);
    drawDragCard(renderer, ctx, state);
    drawSlotFlashes(renderer, ctx, state);
    drawMonsterFlash(renderer, ctx, state);
    drawPreview(renderer, ctx, state);
}

function drawMonsterArea(renderer, ctx, state) {
    const mx = renderer.width * 0.5;
    const my = 120;
    const monster = state.monster;
    const colors = MONSTER_COLOR_THEMES[monster.theme] || MONSTER_COLOR_THEMES.normal;

    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.ellipse(mx, my + 75, 70, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    drawMonster(ctx, monster, mx, my, colors, renderer.animTime);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(monster.name, mx, my - 78);

    const typeLabels = { normal: '普通', elite: '精英', boss: 'BOSS' };
    const typeColors = { normal: '#8B4513', elite: '#8B008B', boss: '#8B0000' };
    ctx.fillStyle = typeColors[monster.type] || '#555';
    ctx.font = 'bold 12px Microsoft YaHei';
    ctx.fillText(`[${typeLabels[monster.type] || ''}]`, mx, my + 82);

    const barW = 240;
    const barH = 24;
    const barX = mx - barW / 2;
    const barY = my + 95;
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);

    const hpRatio = Math.max(0, monster.hp / monster.maxHp);
    const hpGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    hpGrad.addColorStop(0, '#e74c3c');
    hpGrad.addColorStop(1, '#c0392b');
    ctx.fillStyle = hpGrad;
    ctx.fillRect(barX + 2, barY + 2, (barW - 4) * hpRatio, barH - 4);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.max(0, monster.hp)} / ${monster.maxHp}`, mx, barY + 17);

    ctx.fillStyle = '#aaa';
    ctx.font = '13px Microsoft YaHei';
    ctx.fillText(monster.description, mx, my - 58);

    if (monster.keywords.length > 0 && monster.keywordDesc) {
        const tagW = 420;
        const tagX = mx - tagW / 2;
        const tagY = my - 42;
        ctx.font = 'bold 12px Microsoft YaHei';
        ctx.textAlign = 'left';
        const lineHeight = 16;
        const maxWidth = tagW - 20;
        const lines = estimateLines(ctx, monster.keywordDesc, maxWidth);
        const tagH = 10 + lines * lineHeight;

        ctx.fillStyle = 'rgba(100,10,10,0.85)';
        ctx.strokeStyle = '#cc4444';
        ctx.lineWidth = 1;
        roundRect(ctx, tagX, tagY, tagW, tagH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffaaaa';
        wrapText(ctx, monster.keywordDesc, tagX + 10, tagY + 18, maxWidth, lineHeight);
        ctx.textAlign = 'center';
    }
}

function estimateLines(ctx, text, maxWidth) {
    const words = text.split('');
    let line = '';
    let lines = 1;
    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
            line = words[i];
            lines++;
        } else {
            line = testLine;
        }
    }
    return lines;
}

function drawMonster(ctx, monster, x, y, colors, t) {
    const shape = monster.shape || 'rat';
    switch (shape) {
        case 'bat': drawMonsterBat(ctx, x, y, colors, t); break;
        case 'slime': drawMonsterSlime(ctx, x, y, colors, t); break;
        case 'flower': drawMonsterFlower(ctx, x, y, colors, t); break;
        case 'golem': drawMonsterGolem(ctx, x, y, colors, t); break;
        default: drawMonsterRat(ctx, x, y, colors, t); break;
    }
}

function drawMonsterRat(ctx, x, y, colors, t) {
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.ellipse(x, y + 20, 55, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.bodyHighlight;
    ctx.beginPath();
    ctx.ellipse(x - 10, y + 10, 30, 25, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.head;
    ctx.beginPath();
    ctx.ellipse(x, y - 15, 35, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.ears;
    ctx.beginPath();
    ctx.ellipse(x - 22, y - 38, 14, 18, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 22, y - 38, 14, 18, 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.earInner;
    ctx.beginPath();
    ctx.ellipse(x - 22, y - 38, 8, 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 22, y - 38, 8, 10, 0.4, 0, Math.PI * 2);
    ctx.fill();

    const eyeOffset = Math.sin(t * 2) * 1;
    ctx.fillStyle = colors.eyes;
    ctx.beginPath();
    ctx.ellipse(x - 12, y - 18 + eyeOffset, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 12, y - 18 + eyeOffset, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.pupil;
    ctx.beginPath();
    ctx.arc(x - 10, y - 18 + eyeOffset, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 14, y - 18 + eyeOffset, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.nose;
    ctx.beginPath();
    ctx.arc(x, y - 5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = colors.whiskers;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 5);
    ctx.lineTo(x - 35, y - 10);
    ctx.moveTo(x - 5, y - 2);
    ctx.lineTo(x - 32, y + 2);
    ctx.moveTo(x + 5, y - 5);
    ctx.lineTo(x + 35, y - 10);
    ctx.moveTo(x + 5, y - 2);
    ctx.lineTo(x + 32, y + 2);
    ctx.stroke();

    ctx.fillStyle = colors.teeth;
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 2);
    ctx.lineTo(x - 2, y + 12);
    ctx.lineTo(x, y + 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + 2);
    ctx.lineTo(x + 2, y + 12);
    ctx.lineTo(x + 4, y + 2);
    ctx.fill();

    ctx.strokeStyle = colors.tail;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x + 50, y + 30);
    ctx.quadraticCurveTo(x + 80, y + 10 + Math.sin(t * 3) * 10, x + 90, y + 40);
    ctx.stroke();

    ctx.fillStyle = colors.claws;
    ctx.beginPath();
    ctx.ellipse(x - 30, y + 55, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 30, y + 55, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawMonsterBat(ctx, x, y, colors, t) {
    const floatY = Math.sin(t * 2) * 6;
    const wingFlap = Math.sin(t * 5) * 0.4;
    const by = y + floatY;

    // 翅膀（后层）
    ctx.fillStyle = colors.ears;
    ctx.beginPath();
    ctx.moveTo(x - 20, by + 5);
    ctx.quadraticCurveTo(x - 70, by - 30 + wingFlap * 30, x - 60, by + 25);
    ctx.quadraticCurveTo(x - 40, by + 10, x - 20, by + 15);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 20, by + 5);
    ctx.quadraticCurveTo(x + 70, by - 30 + wingFlap * 30, x + 60, by + 25);
    ctx.quadraticCurveTo(x + 40, by + 10, x + 20, by + 15);
    ctx.fill();

    // 身体
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.ellipse(x, by + 15, 35, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.bodyHighlight;
    ctx.beginPath();
    ctx.ellipse(x - 8, by + 8, 18, 16, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 头
    ctx.fillStyle = colors.head;
    ctx.beginPath();
    ctx.ellipse(x, by - 12, 28, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // 耳朵（尖大）
    ctx.fillStyle = colors.ears;
    ctx.beginPath();
    ctx.moveTo(x - 18, by - 22);
    ctx.lineTo(x - 32, by - 55);
    ctx.lineTo(x - 8, by - 28);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 18, by - 22);
    ctx.lineTo(x + 32, by - 55);
    ctx.lineTo(x + 8, by - 28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.earInner;
    ctx.beginPath();
    ctx.moveTo(x - 16, by - 24);
    ctx.lineTo(x - 26, by - 46);
    ctx.lineTo(x - 10, by - 28);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 16, by - 24);
    ctx.lineTo(x + 26, by - 46);
    ctx.lineTo(x + 10, by - 28);
    ctx.closePath();
    ctx.fill();

    // 眼睛（发红光）
    const eyeGlow = Math.sin(t * 3) * 0.3 + 0.7;
    ctx.fillStyle = colors.eyes;
    ctx.globalAlpha = eyeGlow;
    ctx.beginPath();
    ctx.ellipse(x - 10, by - 14, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 10, by - 14, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = colors.pupil;
    ctx.beginPath();
    ctx.arc(x - 8, by - 14, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 12, by - 14, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 鼻子
    ctx.fillStyle = colors.nose;
    ctx.beginPath();
    ctx.moveTo(x, by - 4);
    ctx.lineTo(x - 4, by + 2);
    ctx.lineTo(x + 4, by + 2);
    ctx.closePath();
    ctx.fill();

    // 尖牙
    ctx.fillStyle = colors.teeth;
    ctx.beginPath();
    ctx.moveTo(x - 5, by + 2);
    ctx.lineTo(x - 3, by + 14);
    ctx.lineTo(x - 1, by + 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 1, by + 2);
    ctx.lineTo(x + 3, by + 14);
    ctx.lineTo(x + 5, by + 2);
    ctx.fill();

    // 脚（爪子）
    ctx.fillStyle = colors.claws;
    ctx.beginPath();
    ctx.ellipse(x - 15, by + 38, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 15, by + 38, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawMonsterSlime(ctx, x, y, colors, t) {
    const pulse = Math.sin(t * 2) * 0.05;
    const bounce = Math.sin(t * 1.5) * 4;
    const sy = y + bounce;

    // 身体（blob）
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.ellipse(x, sy + 10, 50 * (1 + pulse), 42 * (1 - pulse), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.bodyHighlight;
    ctx.beginPath();
    ctx.ellipse(x - 12, sy - 5, 22, 18, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 小气泡
    ctx.fillStyle = colors.bodyHighlight;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x + 25, sy + 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 20, sy + 20, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 眼睛（在身体上）
    const eyeBounce = Math.sin(t * 4) * 1.5;
    ctx.fillStyle = colors.eyes;
    ctx.beginPath();
    ctx.ellipse(x - 14, sy - 8 + eyeBounce, 9, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 14, sy - 8 + eyeBounce, 9, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.pupil;
    ctx.beginPath();
    ctx.arc(x - 12, sy - 8 + eyeBounce, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 16, sy - 8 + eyeBounce, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(x - 16, sy - 12 + eyeBounce, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 12, sy - 12 + eyeBounce, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 嘴巴（小波浪）
    ctx.strokeStyle = colors.nose;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, sy + 8);
    ctx.quadraticCurveTo(x, sy + 14, x + 8, sy + 8);
    ctx.stroke();
}

function drawMonsterFlower(ctx, x, y, colors, t) {
    const sway = Math.sin(t * 1.2) * 3;
    const petalBreath = Math.sin(t * 2) * 0.1;

    // 茎
    ctx.strokeStyle = '#4A6B2A';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x, y + 70);
    ctx.quadraticCurveTo(x + sway, y + 30, x + sway * 0.5, y - 10);
    ctx.stroke();

    // 叶子
    ctx.fillStyle = '#558822';
    ctx.beginPath();
    ctx.ellipse(x - 18 + sway * 0.7, y + 40, 16, 7, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 18 + sway * 0.7, y + 25, 14, 6, 0.6, 0, Math.PI * 2);
    ctx.fill();

    // 花瓣（后层）
    const petalCount = 6;
    ctx.fillStyle = colors.body;
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2 + t * 0.3;
        const px = x + Math.cos(angle) * (28 + petalBreath * 10);
        const py = y - 10 + Math.sin(angle) * (28 + petalBreath * 10);
        ctx.beginPath();
        ctx.ellipse(px + sway * 0.5, py, 14, 22, angle + Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // 花盘（头）
    ctx.fillStyle = colors.head;
    ctx.beginPath();
    ctx.ellipse(x + sway * 0.5, y - 10, 28, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // 花盘纹理
    ctx.fillStyle = colors.bodyHighlight;
    ctx.beginPath();
    ctx.ellipse(x + sway * 0.5 - 5, y - 15, 10, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    const blink = Math.sin(t * 2.5) > 0.9 ? 0.2 : 1;
    ctx.fillStyle = colors.eyes;
    ctx.beginPath();
    ctx.ellipse(x + sway * 0.5 - 10, y - 12, 7 * blink, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + sway * 0.5 + 10, y - 12, 7 * blink, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.pupil;
    ctx.beginPath();
    ctx.arc(x + sway * 0.5 - 8, y - 12, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + sway * 0.5 + 12, y - 12, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 嘴巴（锯齿状）
    ctx.fillStyle = colors.teeth;
    ctx.beginPath();
    ctx.moveTo(x + sway * 0.5 - 10, y + 2);
    ctx.lineTo(x + sway * 0.5 - 6, y - 4);
    ctx.lineTo(x + sway * 0.5 - 2, y + 2);
    ctx.lineTo(x + sway * 0.5 + 2, y - 4);
    ctx.lineTo(x + sway * 0.5 + 6, y + 2);
    ctx.lineTo(x + sway * 0.5 + 10, y - 4);
    ctx.lineTo(x + sway * 0.5 + 10, y + 2);
    ctx.closePath();
    ctx.fill();
}

function drawMonsterGolem(ctx, x, y, colors, t) {
    const heavyBounce = Math.sin(t * 1) * 2;
    const gy = y + heavyBounce;
    const eyeGlow = Math.sin(t * 1.5) * 0.3 + 0.7;

    // 腿
    ctx.fillStyle = colors.claws;
    ctx.fillRect(x - 28, gy + 45, 20, 22);
    ctx.fillRect(x + 8, gy + 45, 20, 22);

    // 身体（方壮）
    ctx.fillStyle = colors.body;
    roundRect(ctx, x - 45, gy - 10, 90, 60, 8);
    ctx.fill();

    // 身体高光
    ctx.fillStyle = colors.bodyHighlight;
    roundRect(ctx, x - 38, gy - 5, 30, 20, 4);
    ctx.fill();

    // 裂缝纹理
    ctx.strokeStyle = colors.claws;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 20, gy + 10);
    ctx.lineTo(x - 10, gy + 20);
    ctx.lineTo(x - 5, gy + 15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 15, gy + 5);
    ctx.lineTo(x + 25, gy + 15);
    ctx.stroke();

    // 手臂
    ctx.fillStyle = colors.claws;
    roundRect(ctx, x - 58, gy + 5, 16, 35, 5);
    ctx.fill();
    roundRect(ctx, x + 42, gy + 5, 16, 35, 5);
    ctx.fill();

    // 头（方）
    ctx.fillStyle = colors.head;
    ctx.fillRect(x - 28, gy - 42, 56, 36);

    // 头高光
    ctx.fillStyle = colors.bodyHighlight;
    ctx.fillRect(x - 22, gy - 38, 18, 10);

    // 眼睛（发光矩形）
    ctx.fillStyle = colors.eyes;
    ctx.globalAlpha = eyeGlow;
    ctx.fillRect(x - 16, gy - 30, 10, 8);
    ctx.fillRect(x + 6, gy - 30, 10, 8);
    ctx.globalAlpha = 1;

    ctx.fillStyle = colors.pupil;
    ctx.fillRect(x - 13, gy - 28, 4, 4);
    ctx.fillRect(x + 9, gy - 28, 4, 4);

    // 鼻子
    ctx.fillStyle = colors.nose;
    ctx.fillRect(x - 3, gy - 18, 6, 5);

    // 嘴巴（横线）
    ctx.strokeStyle = colors.teeth;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, gy - 8);
    ctx.lineTo(x + 10, gy - 8);
    ctx.stroke();
}

function drawPlayerArea(renderer, ctx, state) {
    const x = 80;
    const y = 80;

    ctx.fillStyle = 'rgba(40,30,20,0.8)';
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 3;
    ctx.fillRect(x - 50, y - 40, 100, 100);
    ctx.strokeRect(x - 50, y - 40, 100, 100);

    ctx.fillStyle = '#b8860b';
    ctx.font = '40px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚔️', x, y + 10);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px Microsoft YaHei';
    ctx.fillText(state.player.relic.name, x, y + 35);

    const heartX = x - 50;
    const heartY = y + 80;
    for (let i = 0; i < state.player.maxHearts; i++) {
        const filled = i < state.player.hearts;
        drawHeart(ctx, heartX + i * 38, heartY, filled);
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '16px Microsoft YaHei';
    ctx.textAlign = 'left';
    ctx.fillText(`第 ${state.turn} 回合`, x - 50, heartY + 45);

    ctx.fillStyle = '#ff8888';
    ctx.font = 'bold 16px Microsoft YaHei';
    ctx.fillText(`累计伤害: ${state.totalDamage + state.turnDamage}`, x - 50, heartY + 68);

    ctx.fillStyle = '#ffaa66';
    ctx.fillText(`本回合: ${state.turnDamage}`, x - 50, heartY + 90);

    ctx.fillStyle = '#888';
    ctx.font = '13px Microsoft YaHei';
    ctx.fillText(`牌库: ${state.deck.length} | 弃牌: ${state.discard.length}`, x - 50, heartY + 112);
}

function drawHeart(ctx, x, y, filled) {
    ctx.save();
    ctx.translate(x + 15, y + 15);
    ctx.scale(0.6, 0.6);
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-15, -15, -25, 0, 0, 20);
    ctx.bezierCurveTo(25, 0, 15, -15, 0, 5);
    ctx.closePath();
    if (filled) {
        ctx.fillStyle = '#e74c3c';
        ctx.fill();
        ctx.strokeStyle = '#c0392b';
    } else {
        ctx.fillStyle = 'rgba(100,50,50,0.3)';
        ctx.fill();
        ctx.strokeStyle = '#555';
    }
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

function drawBoardArea(renderer, ctx, state) {
    const startX = renderer.width * 0.5 - (state.slots.length * 220 + (state.slots.length - 1) * 20) / 2;
    const startY = 280;
    const slotW = 220;
    const slotH = 160;
    const gap = 20;

    for (let i = 0; i < state.slots.length; i++) {
        const slot = state.slots[i];
        const x = startX + i * (slotW + gap);
        const y = startY;

        if (!slot.available) {
            ctx.fillStyle = 'rgba(20,20,30,0.5)';
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.fillRect(x, y - 40, slotW, 36);
            ctx.strokeRect(x, y - 40, slotW, 36);
            ctx.fillStyle = '#555';
            ctx.font = 'bold 14px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText('🔒', x + slotW / 2, y - 16);

            ctx.fillStyle = 'rgba(20,20,30,0.4)';
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.fillRect(x, y, slotW, slotH);
            ctx.strokeRect(x, y, slotW, slotH);
            ctx.setLineDash([]);

            ctx.fillStyle = '#444';
            ctx.font = 'bold 16px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText('未解锁', x + slotW / 2, y + slotH / 2 + 5);
            continue;
        }

        const effMul = getSlotEffectiveMultiplier(slot, state);
        const mulLabel = `${effMul}X`;
        ctx.fillStyle = 'rgba(30,30,50,0.9)';
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y - 40, slotW, 36);
        ctx.strokeRect(x, y - 40, slotW, 36);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(`倍率 ${mulLabel}`, x + slotW / 2, y - 16);

        const isHovered = state.hoveredSlot === i;
        const canDrop = state.draggedCard && canPlaceCard(state.draggedCard, slot, state).ok;
        ctx.fillStyle = isHovered && canDrop ? 'rgba(40,80,60,0.8)' :
                        isHovered ? 'rgba(80,40,40,0.8)' :
                        'rgba(30,30,50,0.7)';
        ctx.strokeStyle = isHovered && canDrop ? '#4ecdc4' :
                          isHovered ? '#ff6b6b' :
                          slot.cards.length > 0 && !slot.cards[slot.cards.length - 1].keywords.includes('stack') ? '#aa4444' :
                          '#444';
        ctx.lineWidth = isHovered ? 4 : 3;
        ctx.fillRect(x, y, slotW, slotH);
        ctx.strokeRect(x, y, slotW, slotH);

        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 8, y + 8, slotW - 16, slotH - 16);

        for (let c = 0; c < slot.cards.length; c++) {
            const card = slot.cards[c];
            const cx = x + 10;
            const cy = y + 10 + c * 38;
            const cw = slotW - 20;
            const ch = 34;
            drawMiniCard(ctx, card, cx, cy, cw, ch, effMul, state);
        }

        if (slot.cards.length > 0) {
            const top = slot.cards[slot.cards.length - 1];
            if (!top.keywords.includes('stack') && !top.keywords.includes('agile')) {
                ctx.fillStyle = 'rgba(200,50,50,0.3)';
                ctx.fillRect(x, y, slotW, slotH);
                ctx.fillStyle = '#ff6666';
                ctx.font = 'bold 14px Microsoft YaHei';
                ctx.textAlign = 'center';
                ctx.fillText('🔒 已锁定', x + slotW / 2, y + slotH - 10);
            }
        }
    }
}

function drawMiniCard(ctx, card, x, y, w, h, multiplier, state) {
    ctx.fillStyle = card.color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = card.accentColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    const finalVal = getCardFinalValue(card, state);
    const output = finalVal * multiplier;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Microsoft YaHei';
    ctx.textAlign = 'left';
    ctx.fillText(card.name, x + 6, y + 16);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px Microsoft YaHei';
    ctx.textAlign = 'right';
    ctx.fillText(`${finalVal}→${output}`, x + w - 6, y + 16);

    ctx.textAlign = 'left';
    let tagX = x + 6;
    for (const kw of card.keywords) {
        const kwData = KEYWORDS[kw];
        if (!kwData) continue;
        ctx.fillStyle = kwData.color + '44';
        ctx.fillRect(tagX, y + 20, 34, 12);
        ctx.fillStyle = kwData.color;
        ctx.font = '9px Microsoft YaHei';
        ctx.fillText(kwData.name, tagX + 2, y + 29);
        tagX += 38;
    }
}

function drawHandArea(renderer, ctx, state) {
    const hand = state.hand;
    if (hand.length === 0) return;

    const layout = getHandLayout(renderer, hand.length);

    // 绘制抽卡动画
    if (state.drawAnimations && state.drawAnimations.length > 0) {
        for (let i = state.drawAnimations.length - 1; i >= 0; i--) {
            const anim = state.drawAnimations[i];
            anim.timer -= 1;
            const progress = 1 - (anim.timer / anim.maxTimer);
            const deckX = renderer.width - 100;
            const deckY = renderer.height - 100;
            const targetX = layout.startX + anim.handIndex * (layout.cardW + layout.gap);
            const targetY = layout.startY;
            const curX = deckX + (targetX - deckX) * progress;
            const curY = deckY + (targetY - deckY) * progress;
            const scale = 0.5 + 0.5 * progress;
            drawCard(ctx, anim.card, curX - layout.cardW * scale / 2 + layout.cardW / 2, curY - layout.cardH * scale / 2 + layout.cardH / 2, layout.cardW * scale, layout.cardH * scale, state);
            if (anim.timer <= 0) {
                state.drawAnimations.splice(i, 1);
            }
        }
    }

    for (let i = 0; i < hand.length; i++) {
        const card = hand[i];
        const x = layout.startX + i * (layout.cardW + layout.gap);
        const y = layout.startY;

        const isSelected = state.selectedCard && state.selectedCard.uuid === card.uuid;
        const isDragged = state.draggedCard && state.draggedCard.uuid === card.uuid;
        if (isDragged) continue;

        const hoverOffset = isSelected ? -20 : 0;
        drawCard(ctx, card, x, y + hoverOffset, layout.cardW, layout.cardH, state);
    }
}

function drawCard(ctx, card, x, y, w, h, state, options = {}) {
    const { ghost = false, highlight = false } = options;

    ctx.save();
    if (ghost) ctx.globalAlpha = 0.5;

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, card.color);
    grad.addColorStop(1, darkenColor(card.color, -30));
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = highlight ? '#fff' : card.accentColor;
    ctx.lineWidth = highlight ? 3 : 2;
    ctx.strokeRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);

    const artY = y + 10;
    const artH = 70;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 10, artY, w - 20, artH);

    drawCardIcon(ctx, card.iconType, x + w / 2, artY + artH / 2, 50);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(card.name, x + w / 2, y + 105);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 28px Microsoft YaHei';
    ctx.fillText(getCardBaseValue(card), x + w / 2, y + 140);

    let tagY = y + 155;
    for (const kw of card.keywords) {
        const kwData = KEYWORDS[kw];
        if (!kwData) continue;
        const tagW = ctx.measureText(kwData.name).width + 12;
        const tagX = x + (w - tagW) / 2;
        ctx.fillStyle = kwData.color + '33';
        ctx.strokeStyle = kwData.color;
        ctx.lineWidth = 1;
        ctx.fillRect(tagX, tagY, tagW, 18);
        ctx.strokeRect(tagX, tagY, tagW, 18);
        ctx.fillStyle = kwData.color;
        ctx.font = '11px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(kwData.name, x + w / 2, tagY + 13);
        tagY += 22;
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '11px Microsoft YaHei';
    ctx.textAlign = 'right';
    ctx.fillText(`${card.size}格`, x + w - 10, y + h - 10);

    ctx.restore();
}

function drawCardIcon(ctx, type, cx, cy, size) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;

    switch (type) {
        case 'sword':
            ctx.beginPath();
            ctx.moveTo(0, -size / 2);
            ctx.lineTo(0, size / 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-size / 4, size / 3);
            ctx.lineTo(size / 4, size / 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-size / 6, size / 5);
            ctx.lineTo(size / 6, size / 5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-size / 5, -size / 3);
            ctx.lineTo(0, -size / 2);
            ctx.lineTo(size / 5, -size / 3);
            ctx.fill();
            ctx.stroke();
            break;
        case 'shadow':
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(-8, -size / 2);
            ctx.lineTo(-8, size / 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(8, -size / 2);
            ctx.lineTo(8, size / 3);
            ctx.stroke();
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, size / 3, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'gear':
            ctx.beginPath();
            ctx.arc(0, 0, size / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * size / 5, Math.sin(angle) * size / 5);
                ctx.lineTo(Math.cos(angle) * size / 2.5, Math.sin(angle) * size / 2.5);
                ctx.stroke();
            }
            break;
        case 'shield':
            ctx.beginPath();
            ctx.moveTo(0, -size / 2);
            ctx.bezierCurveTo(size / 2, -size / 3, size / 2, size / 4, 0, size / 2);
            ctx.bezierCurveTo(-size / 2, size / 4, -size / 2, -size / 3, 0, -size / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, -size / 3);
            ctx.lineTo(0, size / 3);
            ctx.moveTo(-size / 4, -size / 6);
            ctx.lineTo(size / 4, -size / 6);
            ctx.stroke();
            break;
        case 'star':
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                const r = i === 0 ? size / 2 : size / 4;
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 'fire':
            ctx.beginPath();
            ctx.moveTo(0, size / 2);
            ctx.bezierCurveTo(-size / 3, size / 4, -size / 2, -size / 4, 0, -size / 2);
            ctx.bezierCurveTo(size / 2, -size / 4, size / 3, size / 4, 0, size / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 'magic':
            ctx.beginPath();
            ctx.moveTo(0, -size / 2);
            ctx.lineTo(size / 3, 0);
            ctx.lineTo(0, size / 2);
            ctx.lineTo(-size / 3, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, size / 6, 0, Math.PI * 2);
            ctx.fill();
            break;
    }
    ctx.restore();
}

function drawUI(renderer, ctx, state) {
    const btnX = renderer.width - 160;
    const btnY = renderer.height - 90;
    const btnW = 140;
    const btnH = 50;

    const totalDmg = calculateTotalBoardDamage(state);
    const canKill = totalDmg >= state.monster.hp && state.phase === 'playing';
    ctx.fillStyle = canKill ? 'rgba(40,100,40,0.9)' :
                    state.phase === 'playing' ? 'rgba(80,40,40,0.9)' : 'rgba(60,60,60,0.5)';
    ctx.strokeStyle = canKill ? '#66cc66' :
                      state.phase === 'playing' ? '#cc6666' : '#555';
    ctx.lineWidth = canKill ? 3 : 2;
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = canKill ? '#ccffcc' :
                    state.phase === 'playing' ? '#ffcccc' : '#888';
    ctx.font = 'bold 18px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(canKill ? '✓ 结束回合（击杀）' : '结束回合', btnX + btnW / 2, btnY + 32);

    if (state.phase === 'playing') {
        if (totalDmg >= state.monster.hp) {
            ctx.fillStyle = '#2ecc71';
            ctx.font = 'bold 16px Microsoft YaHei';
            ctx.fillText('✓ 已达成目标！点击结束回合', renderer.width / 2, renderer.height - 30);
        } else {
            const need = state.monster.hp - totalDmg;
            ctx.fillStyle = '#e74c3c';
            ctx.font = '14px Microsoft YaHei';
            ctx.fillText(`还需 ${need} 伤害`, renderer.width / 2, renderer.height - 30);
        }
    }
}

function drawMonsterFlash(renderer, ctx, state) {
    if (state.monsterFlash > 0) {
        const mx = renderer.width * 0.5;
        const my = 120;
        const alpha = state.monsterFlash / 15 * 0.5;
        ctx.fillStyle = `rgba(255,0,0,${alpha})`;
        ctx.beginPath();
        ctx.ellipse(mx, my + 10, 80, 70, 0, 0, Math.PI * 2);
        ctx.fill();
        state.monsterFlash--;
    }
}

function drawDragCard(renderer, ctx, state) {
    if (!state.draggedCard) return;
    const card = state.draggedCard;
    drawCard(ctx, card, state.dragX - 70, state.dragY - 100, 140, 200, state, { highlight: true });
}

function drawSlotFlashes(renderer, ctx, state) {
    for (let i = state.slotFlashes.length - 1; i >= 0; i--) {
        const flash = state.slotFlashes[i];
        const r = getSlotRect(renderer, flash.slotIndex, state.slots.length);
        const alpha = flash.timer / 20 * 0.4;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        flash.timer--;
        if (flash.timer <= 0) {
            state.slotFlashes.splice(i, 1);
        }
    }
}

function drawPreview(renderer, ctx, state) {
    if (!state.draggedCard || state.hoveredSlot === null) return;
    const preview = getPlacementPreview(state.draggedCard, state.hoveredSlot, state);
    if (!preview) return;

    const mx = renderer.width / 2;
    const my = 180;
    ctx.fillStyle = preview.willKill ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.1)';
    ctx.fillRect(mx - 150, my - 30, 300, 60);

    ctx.fillStyle = preview.willKill ? '#2ecc71' : '#ffd700';
    ctx.font = 'bold 16px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(`预计伤害: ${preview.cardOutput} | 总计: ${preview.totalDamage}`, mx, my - 5);

    if (preview.willKill) {
        ctx.fillStyle = '#2ecc71';
        ctx.fillText('☠️ 这将击杀怪物！', mx, my + 20);
    } else {
        ctx.fillStyle = '#ff8888';
        ctx.fillText(`怪物剩余: ${preview.monsterRemaining}`, mx, my + 20);
    }
}

// ===== 位置工具 =====

export function getEndTurnButtonRect(renderer) {
    return { x: renderer.width - 160, y: renderer.height - 90, w: 140, h: 50 };
}

function getHandLayout(renderer, total) {
    const cardW = 140;
    const cardH = 200;
    const maxWidth = renderer.width - 40;
    const defaultGap = 16;
    const totalW = total * cardW + (total - 1) * defaultGap;
    let gap = defaultGap;
    let startX = (renderer.width - totalW) / 2;
    if (totalW > maxWidth) {
        gap = (maxWidth - total * cardW) / Math.max(1, total - 1);
        startX = 20;
    }
    const startY = 480;
    return { cardW, cardH, gap, startX, startY };
}

export function getHandCardRect(renderer, index, total) {
    const layout = getHandLayout(renderer, total);
    return {
        x: layout.startX + index * (layout.cardW + layout.gap),
        y: layout.startY,
        w: layout.cardW,
        h: layout.cardH
    };
}

export function getSlotRect(renderer, index, slotCount) {
    const slotW = 220;
    const slotH = 160;
    const gap = 20;
    const totalW = slotCount * slotW + (slotCount - 1) * gap;
    const startX = renderer.width * 0.5 - totalW / 2;
    const startY = 280;
    return {
        x: startX + index * (slotW + gap),
        y: startY,
        w: slotW,
        h: slotH
    };
}

export function getSlotIndexAt(renderer, px, py, slotCount) {
    for (let i = 0; i < slotCount; i++) {
        const r = getSlotRect(renderer, i, slotCount);
        if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
            return i;
        }
    }
    return null;
}

export function getHandCardIndexAt(renderer, px, py, handLength) {
    const layout = getHandLayout(renderer, handLength);
    for (let i = 0; i < handLength; i++) {
        const x = layout.startX + i * (layout.cardW + layout.gap);
        const y = layout.startY;
        if (px >= x && px <= x + layout.cardW && py >= y && py <= y + layout.cardH) {
            return i;
        }
    }
    return null;
}
