/**
 * 卡牌地下城 - 战斗界面渲染（视觉升级版）
 */

import {
    roundRect, darkenColor, wrapText, drawBackground,
    drawStoneTile, drawMetalFrame, drawParchment, drawGlowText,
    drawButton, drawHealthBar, drawHeartIcon, drawRarityGlow,
    drawTorchLight, flickerIntensity
} from './core.js';
import { KEYWORDS } from '../data/index.js';
import {
    getCardBaseValue, getCardFinalValue, buildCardSlotMap,
    canPlaceCard, getSlotEffectiveMultiplier, getPlacementPreview
} from '../systems/board.js';
import { calculateTotalBoardDamage } from '../systems/board.js';
import { MONSTER_COLOR_THEMES } from '../data/index.js';
import { FX } from './fx.js';

export function drawBattle(renderer, ctx, state) {
    drawBackground(ctx, renderer.width, renderer.height, renderer.animTime);
    FX.draw(ctx, renderer.width, renderer.height);
    drawMonsterArea(renderer, ctx, state);
    drawPlayerArea(renderer, ctx, state);
    drawRelicsBar(renderer, ctx, state);
    drawBoardArea(renderer, ctx, state);
    drawHandArea(renderer, ctx, state);
    drawUI(renderer, ctx, state);
    drawDragCard(renderer, ctx, state);
    drawSlotFlashes(renderer, ctx, state);
    drawMonsterFlash(renderer, ctx, state);
    drawPreview(renderer, ctx, state);
    drawPendingRecall(renderer, ctx, state);
}

// ============================================================
// 怪物区域
// ============================================================

function drawMonsterArea(renderer, ctx, state) {
    const mx = renderer.width * 0.5;
    const my = 115;
    const monster = state.monster;
    const colors = MONSTER_COLOR_THEMES[monster.theme] || MONSTER_COLOR_THEMES.normal;
    const t = renderer.animTime;

    // 动态阴影
    const breathScale = 1 + Math.sin(t * 1.5) * 0.03;
    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.ellipse(mx, my + 75, 70 * breathScale, 18 * breathScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 怪物绘制
    drawMonster(ctx, monster, mx, my, colors, t);

    // 名称 - 发光文字
    drawGlowText(ctx, monster.name, mx, my - 82, {
        color: '#ffcccc',
        glowColor: colors.head,
        glowBlur: 12,
        font: 'bold 22px Microsoft YaHei',
        align: 'center'
    });

    // 类型徽章
    const typeLabels = { normal: '普通', elite: '精英', boss: 'BOSS' };
    const typeColors = { normal: '#8B4513', elite: '#8B008B', boss: '#8B0000' };
    const typeBgColors = { normal: '#3a2211', elite: '#3a113a', boss: '#3a1111' };
    const typeLabel = typeLabels[monster.type] || '';
    const badgeW = ctx.measureText(`[${typeLabel}]`).width + 20;
    const badgeX = mx - badgeW / 2;
    const badgeY = my + 78;

    ctx.fillStyle = typeBgColors[monster.type] || '#222';
    roundRect(ctx, badgeX, badgeY - 12, badgeW, 22, 4);
    ctx.fill();
    ctx.strokeStyle = typeColors[monster.type] || '#555';
    ctx.lineWidth = 1;
    roundRect(ctx, badgeX, badgeY - 12, badgeW, 22, 4);
    ctx.stroke();

    ctx.fillStyle = typeColors[monster.type] || '#555';
    ctx.font = 'bold 12px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(`[${typeLabel}]`, mx, badgeY + 4);

    // 血条
    const barW = 260;
    const barH = 20;
    const barX = mx - barW / 2;
    const barY = my + 100;
    const hpFlash = monster.hp > 0 && monster.hp / monster.maxHp < 0.3 && Math.sin(t * 8) > 0;

    drawHealthBar(ctx, barX, barY, barW, barH, monster.hp, monster.maxHp, {
        flash: hpFlash,
        label: `${Math.max(0, monster.hp)} / ${monster.maxHp}`
    });

    // 描述
    ctx.fillStyle = '#999';
    ctx.font = '13px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(monster.description, mx, my - 58);

    // 关键词面板
    if (monster.keywords.length > 0 && monster.keywordDesc) {
        const tagW = 340;
        const tagX = mx + 75;
        const tagY = my - 30;
        ctx.font = 'bold 12px Microsoft YaHei';
        ctx.textAlign = 'left';
        const lineHeight = 18;
        const maxWidth = tagW - 20;
        const lines = estimateLines(ctx, monster.keywordDesc, maxWidth);
        const tagH = 12 + lines * lineHeight;

        drawParchment(ctx, tagX, tagY, tagW, tagH, { alpha: 0.85, radius: 6 });

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

// ============================================================
// 怪物绘制（保留原有形状，增强质感）
// ============================================================

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
    const breath = 1 + Math.sin(t * 1.5) * 0.02;

    // 身体
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.ellipse(x, y + 20, 55 * breath, 45 * breath, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = darkenColor(colors.body, -30);
    ctx.lineWidth = 1;
    ctx.stroke();

    // 身体高光
    ctx.fillStyle = colors.bodyHighlight;
    ctx.beginPath();
    ctx.ellipse(x - 10, y + 10, 30, 25, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 头
    ctx.fillStyle = colors.head;
    ctx.beginPath();
    ctx.ellipse(x, y - 15, 35, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = darkenColor(colors.head, -20);
    ctx.lineWidth = 1;
    ctx.stroke();

    // 耳朵
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

    // 眼睛（带发光）
    const eyeOffset = Math.sin(t * 2) * 1;
    const eyeGlow = Math.sin(t * 3) * 0.2 + 0.8;

    ctx.fillStyle = colors.eyes;
    ctx.globalAlpha = eyeGlow;
    ctx.beginPath();
    ctx.ellipse(x - 12, y - 18 + eyeOffset, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 12, y - 18 + eyeOffset, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = colors.pupil;
    ctx.beginPath();
    ctx.arc(x - 10, y - 18 + eyeOffset, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 14, y - 18 + eyeOffset, 4, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛高光
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(x - 12, y - 20 + eyeOffset, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 10, y - 20 + eyeOffset, 2, 0, Math.PI * 2);
    ctx.fill();

    // 鼻子
    ctx.fillStyle = colors.nose;
    ctx.beginPath();
    ctx.arc(x, y - 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // 胡须
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

    // 牙齿
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

    // 尾巴
    ctx.strokeStyle = colors.tail;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x + 50, y + 30);
    ctx.quadraticCurveTo(x + 80, y + 10 + Math.sin(t * 3) * 10, x + 90, y + 40);
    ctx.stroke();

    // 爪子
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

    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.ellipse(x, by + 15, 35, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.bodyHighlight;
    ctx.beginPath();
    ctx.ellipse(x - 8, by + 8, 18, 16, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.head;
    ctx.beginPath();
    ctx.ellipse(x, by - 12, 28, 24, 0, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.fillStyle = colors.nose;
    ctx.beginPath();
    ctx.moveTo(x, by - 4);
    ctx.lineTo(x - 4, by + 2);
    ctx.lineTo(x + 4, by + 2);
    ctx.closePath();
    ctx.fill();

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

    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.ellipse(x, sy + 10, 50 * (1 + pulse), 42 * (1 - pulse), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.bodyHighlight;
    ctx.beginPath();
    ctx.ellipse(x - 12, sy - 5, 22, 18, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.bodyHighlight;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x + 25, sy + 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 20, sy + 20, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

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

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(x - 16, sy - 12 + eyeBounce, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 12, sy - 12 + eyeBounce, 2.5, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.strokeStyle = '#4A6B2A';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x, y + 70);
    ctx.quadraticCurveTo(x + sway, y + 30, x + sway * 0.5, y - 10);
    ctx.stroke();

    ctx.fillStyle = '#558822';
    ctx.beginPath();
    ctx.ellipse(x - 18 + sway * 0.7, y + 40, 16, 7, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 18 + sway * 0.7, y + 25, 14, 6, 0.6, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.fillStyle = colors.head;
    ctx.beginPath();
    ctx.ellipse(x + sway * 0.5, y - 10, 28, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.bodyHighlight;
    ctx.beginPath();
    ctx.ellipse(x + sway * 0.5 - 5, y - 15, 10, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.fillStyle = colors.claws;
    ctx.fillRect(x - 28, gy + 45, 20, 22);
    ctx.fillRect(x + 8, gy + 45, 20, 22);

    ctx.fillStyle = colors.body;
    roundRect(ctx, x - 45, gy - 10, 90, 60, 8);
    ctx.fill();

    ctx.fillStyle = colors.bodyHighlight;
    roundRect(ctx, x - 38, gy - 5, 30, 20, 4);
    ctx.fill();

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

    ctx.fillStyle = colors.claws;
    roundRect(ctx, x - 58, gy + 5, 16, 35, 5);
    ctx.fill();
    roundRect(ctx, x + 42, gy + 5, 16, 35, 5);
    ctx.fill();

    ctx.fillStyle = colors.head;
    ctx.fillRect(x - 28, gy - 42, 56, 36);

    ctx.fillStyle = colors.bodyHighlight;
    ctx.fillRect(x - 22, gy - 38, 18, 10);

    ctx.fillStyle = colors.eyes;
    ctx.globalAlpha = eyeGlow;
    ctx.fillRect(x - 16, gy - 30, 10, 8);
    ctx.fillRect(x + 6, gy - 30, 10, 8);
    ctx.globalAlpha = 1;

    ctx.fillStyle = colors.pupil;
    ctx.fillRect(x - 13, gy - 28, 4, 4);
    ctx.fillRect(x + 9, gy - 28, 4, 4);

    ctx.fillStyle = colors.nose;
    ctx.fillRect(x - 3, gy - 18, 6, 5);

    ctx.strokeStyle = colors.teeth;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, gy - 8);
    ctx.lineTo(x + 10, gy - 8);
    ctx.stroke();
}

// ============================================================
// 玩家区域
// ============================================================

function drawPlayerArea(renderer, ctx, state) {
    const x = 50;
    const y = 60;

    // 玩家信息面板 - 羊皮纸背景
    drawParchment(ctx, x - 10, y - 10, 140, 180, { alpha: 0.7, radius: 8 });

    // 角色徽章（圆形金属）
    const badgeY = y + 30;
    ctx.save();
    ctx.translate(x + 60, badgeY);

    // 外圈
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 内圈高光
    ctx.fillStyle = '#4a3a2a';
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    ctx.fillStyle = '#b8860b';
    ctx.font = '36px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚔️', x + 60, badgeY + 12);

    // 遗物名称
    ctx.fillStyle = '#cc9955';
    ctx.font = 'bold 11px Microsoft YaHei';
    ctx.fillText(state.player.relic.name, x + 60, badgeY + 48);

    // 心形
    const heartX = x + 15;
    const heartY = y + 95;
    const heartPulse = state.player.hearts <= 1 ? renderer.animTime : 0;
    for (let i = 0; i < state.player.maxHearts; i++) {
        const filled = i < state.player.hearts;
        drawHeartIcon(ctx, heartX + i * 36, heartY, 28, filled, filled && state.player.hearts <= 1 ? heartPulse : 0);
    }

    // 信息文字
    const infoX = x + 10;
    const infoY = heartY + 35;

    ctx.fillStyle = '#aa9988';
    ctx.font = '14px Microsoft YaHei';
    ctx.textAlign = 'left';
    ctx.fillText(`第 ${state.turn} 回合`, infoX, infoY);

    ctx.fillStyle = '#cc8877';
    ctx.font = 'bold 14px Microsoft YaHei';
    ctx.fillText(`累计: ${state.totalDamage + state.turnDamage}`, infoX, infoY + 22);

    ctx.fillStyle = '#ddaa66';
    ctx.fillText(`本回合: ${state.turnDamage}`, infoX, infoY + 44);

    ctx.fillStyle = '#777';
    ctx.font = '12px Microsoft YaHei';
    ctx.fillText(`牌库: ${state.deck.length} | 弃牌: ${state.discard.length}`, infoX, infoY + 66);
}

// ============================================================
// 遗物栏（右上角，类似杀戮尖塔）
// ============================================================

function drawRelicsBar(renderer, ctx, state) {
    const runData = state.runDataRef;
    if (!runData || !runData.relics || runData.relics.length === 0) return;

    const relics = runData.relics;
    const iconSize = 36;
    const gap = 6;
    const startX = renderer.width - 20 - iconSize;
    const startY = 20;

    state.data = state.data || {};
    state.data.relicRects = [];

    for (let i = 0; i < relics.length; i++) {
        const relic = relics[i];
        const x = startX;
        const y = startY + i * (iconSize + gap);
        const isHovered = state.data.hoverRelic === i;

        // 背景
        ctx.fillStyle = isHovered ? 'rgba(80,60,30,0.95)' : 'rgba(50,40,20,0.85)';
        roundRect(ctx, x, y, iconSize, iconSize, 6);
        ctx.fill();

        // 边框
        ctx.strokeStyle = isHovered ? '#ffd700' : '#b8860b';
        ctx.lineWidth = isHovered ? 2 : 1;
        roundRect(ctx, x, y, iconSize, iconSize, 6);
        ctx.stroke();

        // 图标文字（取名字第一个字符）
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayChar = relic.name ? relic.name.charAt(0) : '?';
        ctx.fillText(displayChar, x + iconSize / 2, y + iconSize / 2 + 1);
        ctx.textBaseline = 'alphabetic';

        state.data.relicRects.push({ x, y, w: iconSize, h: iconSize, index: i, relic });
    }
}

// ============================================================
// 倍率牌桌
// ============================================================

function drawBoardArea(renderer, ctx, state) {
    const startX = renderer.width * 0.5 - (state.slots.length * 220 + (state.slots.length - 1) * 20) / 2;
    const startY = 280;
    const slotW = 220;
    const slotH = 160;
    const gap = 20;
    const t = renderer.animTime;

    for (let i = 0; i < state.slots.length; i++) {
        const slot = state.slots[i];
        const x = startX + i * (slotW + gap);
        const y = startY;

        if (!slot.available) {
            // 未解锁格子
            drawStoneTile(ctx, x, y - 40, slotW, 36, { locked: true });
            ctx.fillStyle = '#444';
            ctx.font = 'bold 14px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText('🔒', x + slotW / 2, y - 16);

            drawStoneTile(ctx, x, y, slotW, slotH, { locked: true });
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.strokeRect(x, y, slotW, slotH);
            ctx.setLineDash([]);

            ctx.fillStyle = '#3a3a4a';
            ctx.font = 'bold 16px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText('未解锁', x + slotW / 2, y + slotH / 2 + 5);
            continue;
        }

        const effMul = getSlotEffectiveMultiplier(slot, state);
        const mulLabel = `${effMul}X`;

        // 倍率标签 - 金属铭牌
        drawStoneTile(ctx, x, y - 40, slotW, 36, {});
        drawMetalFrame(ctx, x, y - 40, slotW, 36, { color: '#665544', thickness: 1.5, radius: 4 });

        // 倍率文字
        const isHighMul = effMul >= 3;
        drawGlowText(ctx, `倍率 ${mulLabel}`, x + slotW / 2, y - 16, {
            color: isHighMul ? '#ffaa44' : '#ffd700',
            glowColor: isHighMul ? '#ff6600' : '#b8860b',
            glowBlur: isHighMul ? 8 : 4,
            font: 'bold 17px Microsoft YaHei',
            align: 'center'
        });

        // 格子底座
        const isHovered = state.hoveredSlot === i;
        const canDrop = state.draggedCard && canPlaceCard(state.draggedCard, slot, state).ok;

        const tileOptions = {
            highlight: isHovered && canDrop,
            glowColor: isHovered && canDrop ? '#4ecdc4' : (isHovered ? '#ff6b6b' : null)
        };

        if (!isHovered && slot.cards.length > 0 && !slot.cards[slot.cards.length - 1].keywords.includes('stack')) {
            tileOptions.locked = true;
        }

        drawStoneTile(ctx, x, y, slotW, slotH, tileOptions);

        // 格子边框
        if (isHovered && canDrop) {
            drawMetalFrame(ctx, x, y, slotW, slotH, { color: '#4ecdc4', glowColor: '#4ecdc4', thickness: 2, radius: 2 });
        } else if (isHovered) {
            drawMetalFrame(ctx, x, y, slotW, slotH, { color: '#ff6b6b', glowColor: '#ff6b6b', thickness: 2, radius: 2 });
        } else {
            drawMetalFrame(ctx, x, y, slotW, slotH, { color: '#443322', thickness: 1.5, radius: 2 });
        }

        // 内部装饰线
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 8, y + 8, slotW - 16, slotH - 16);

        // 卡牌
        for (let c = 0; c < slot.cards.length; c++) {
            const card = slot.cards[c];
            const cx = x + 10;
            const cy = y + 10 + c * 38;
            const cw = slotW - 20;
            const ch = 34;
            drawMiniCard(ctx, card, cx, cy, cw, ch, effMul, state, c);
        }

        // 锁定提示
        if (slot.cards.length > 0) {
            const top = slot.cards[slot.cards.length - 1];
            if (!top.keywords.includes('stack') && !top.keywords.includes('agile')) {
                ctx.fillStyle = 'rgba(80,20,20,0.4)';
                ctx.fillRect(x, y, slotW, slotH);

                ctx.fillStyle = '#ff6666';
                ctx.font = 'bold 13px Microsoft YaHei';
                ctx.textAlign = 'center';
                ctx.fillText('🔒 已锁定', x + slotW / 2, y + slotH - 12);
            }
        }
    }
}

function drawMiniCard(ctx, card, x, y, w, h, multiplier, state, stackIndex) {
    // 堆叠偏移阴影
    if (stackIndex > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + 2, y + 2, w, h);
    }

    // 卡牌背景
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, card.color);
    grad.addColorStop(1, darkenColor(card.color, -35));
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;

    // 边框
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
    ctx.font = 'bold 13px Microsoft YaHei';
    ctx.textAlign = 'right';
    ctx.fillText(`${finalVal}→${output}`, x + w - 6, y + 16);

    ctx.textAlign = 'left';
    let tagX = x + 6;
    for (const kw of card.keywords) {
        const kwData = KEYWORDS[kw];
        if (!kwData) continue;
        const tagW = 32;
        ctx.fillStyle = kwData.color + '33';
        ctx.fillRect(tagX, y + 20, tagW, 12);
        ctx.fillStyle = kwData.color;
        ctx.font = '9px Microsoft YaHei';
        ctx.fillText(kwData.name, tagX + 2, y + 29);
        tagX += 36;
    }
}

// ============================================================
// 手牌区域
// ============================================================

function drawHandArea(renderer, ctx, state) {
    const hand = state.hand;
    if (hand.length === 0) return;

    const layout = getHandLayout(renderer, hand.length);

    // 抽卡动画（美化版：ease-out 缓动、旋转、缩放曲线、拖尾粒子）
    if (state.drawAnimations && state.drawAnimations.length > 0) {
        for (let i = state.drawAnimations.length - 1; i >= 0; i--) {
            const anim = state.drawAnimations[i];
            if (anim.delay > 0) {
                anim.delay -= 1;
                continue;
            }
            anim.timer -= 1;
            const rawProgress = 1 - (anim.timer / anim.maxTimer);
            // ease-out cubic
            const progress = 1 - Math.pow(1 - rawProgress, 3);
            const deckX = renderer.width - 100;
            const deckY = renderer.height - 100;
            const targetX = layout.startX + anim.handIndex * (layout.cardW + layout.gap);
            const targetY = layout.startY;
            const curX = deckX + (targetX - deckX) * progress;
            const curY = deckY + (targetY - deckY) * progress;
            // 弹性缩放：先大后小再稳定
            const scale = 0.4 + 0.7 * progress + 0.15 * Math.sin(progress * Math.PI);
            // 旋转：从随机角度到 0
            const rot = anim.rotation * (1 - progress);

            // 拖尾粒子（飞行中段）
            if (rawProgress > 0.2 && rawProgress < 0.8 && anim.timer % 3 === 0) {
                FX.particles.emit({
                    x: curX + layout.cardW / 2,
                    y: curY + layout.cardH / 2,
                    count: 2,
                    type: 'spark',
                    color: '#ffd700',
                    speed: 1,
                    speedVar: 0.5,
                    life: 12,
                    size: 1.5,
                    gravity: 0,
                    spread: Math.PI * 2,
                    glow: true
                });
            }

            ctx.save();
            ctx.translate(curX + layout.cardW / 2, curY + layout.cardH / 2);
            ctx.rotate(rot);
            ctx.translate(-layout.cardW * scale / 2, -layout.cardH * scale / 2);
            drawCard(ctx, anim.card, 0, 0, layout.cardW * scale, layout.cardH * scale, state);
            ctx.restore();

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

        const hoverOffset = isSelected ? -15 : 0;
        drawCard(ctx, card, x, y + hoverOffset, layout.cardW, layout.cardH, state, { isHovered: isSelected });
    }
}

function drawCard(ctx, card, x, y, w, h, state, options = {}) {
    const { ghost = false, highlight = false, isHovered = false } = options;
    const t = state.animTime || 0;

    ctx.save();
    if (ghost) ctx.globalAlpha = 0.5;

    // 悬浮放大
    if (isHovered) {
        const hoverScale = 1.03;
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.translate(cx, cy);
        ctx.scale(hoverScale, hoverScale);
        ctx.translate(-cx, -cy);
    }

    // 阴影
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = isHovered ? 20 : 12;
    ctx.shadowOffsetY = isHovered ? 8 : 5;

    // 稀有度光效背景
    const rarity = card.rarity || 'white';
    if (rarity === 'gold') {
        const pulse = Math.sin(t * 2.5) * 0.3 + 0.7;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15 * pulse;
    } else if (rarity === 'blue') {
        ctx.shadowColor = '#4488ff';
        ctx.shadowBlur = 10;
    }

    // 卡牌主体 - 圆角矩形
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, card.color);
    grad.addColorStop(1, darkenColor(card.color, -35));
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 边框
    ctx.strokeStyle = highlight ? '#fff' : card.accentColor;
    ctx.lineWidth = highlight ? 3 : 2;
    roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();

    // 内框装饰
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 6);
    ctx.stroke();

    // 图标区域
    const artY = y + 10;
    const artH = 70;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, x + 10, artY, w - 20, artH, 6);
    ctx.fill();

    drawCardIcon(ctx, card.iconType, x + w / 2, artY + artH / 2, 50);

    // 名称
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(card.name, x + w / 2, y + 105);

    // 数值
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 28px Microsoft YaHei';
    ctx.fillText(getCardBaseValue(card), x + w / 2, y + 140);

    // 词条标签
    let tagY = y + 155;
    for (const kw of card.keywords) {
        const kwData = KEYWORDS[kw];
        if (!kwData) continue;
        const tagW = ctx.measureText(kwData.name).width + 12;
        const tagX = x + (w - tagW) / 2;

        ctx.fillStyle = kwData.color + '22';
        ctx.strokeStyle = kwData.color;
        ctx.lineWidth = 1;
        roundRect(ctx, tagX, tagY, tagW, 18, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = kwData.color;
        ctx.font = '11px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(kwData.name, x + w / 2, tagY + 13);
        tagY += 22;
    }

    // 格子数
    ctx.fillStyle = '#aaa';
    ctx.font = '11px Microsoft YaHei';
    ctx.textAlign = 'right';
    ctx.fillText(`${card.size}格`, x + w - 10, y + h - 10);

    // 稀有度光效覆盖
    if (rarity === 'gold') {
        const pulse = Math.sin(t * 2.5) * 0.3 + 0.7;
        const g = ctx.createRadialGradient(x + w / 2, y + h / 2, w * 0.3, x + w / 2, y + h / 2, w * 0.7);
        g.addColorStop(0, `rgba(255,215,0,${0.1 * pulse})`);
        g.addColorStop(1, `rgba(255,215,0,0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
    }

    ctx.restore();
}

function drawCardIcon(ctx, type, cx, cy, size) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2.5;

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

// ============================================================
// UI
// ============================================================

function drawUI(renderer, ctx, state) {
    const totalDmg = calculateTotalBoardDamage(state);
    const canKill = totalDmg >= state.monster.hp && state.phase === 'playing';

    // 结束回合按钮
    const btnX = renderer.width - 170;
    const btnY = renderer.height - 95;
    const btnW = 150;
    const btnH = 55;

    const btnText = '结束回合';
    const btnOptions = {
        hover: false,
        primary: canKill,
        disabled: state.phase !== 'playing',
        radius: 10,
        fontSize: 16,
        glow: canKill
    };

    drawButton(ctx, btnX, btnY, btnW, btnH, btnText, btnOptions);

    // 伤害预览面板已移除
}

// ============================================================
// 特效层
// ============================================================

function drawMonsterFlash(renderer, ctx, state) {
    if (state.monsterFlash > 0) {
        const mx = renderer.width * 0.5;
        const my = 120;
        const alpha = state.monsterFlash / 15 * 0.6;

        // 闪光
        const grad = ctx.createRadialGradient(mx, my + 10, 0, mx, my + 10, 120);
        grad.addColorStop(0, `rgba(255,100,50,${alpha})`);
        grad.addColorStop(0.5, `rgba(255,50,0,${alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(mx - 120, my - 110, 240, 240);

        state.monsterFlash--;

        // 结束时触发粒子
        if (state.monsterFlash === 0) {
            FX.spawnMonsterHit(mx, my + 20);
        }
    }
}

function drawDragCard(renderer, ctx, state) {
    if (!state.draggedCard) return;
    const card = state.draggedCard;

    // 拖拽倾斜
    ctx.save();
    const tiltX = (state.dragX - renderer.width / 2) / renderer.width * 10;
    ctx.translate(state.dragX, state.dragY);
    ctx.rotate(tiltX * Math.PI / 180);
    ctx.translate(-70, -100);

    drawCard(ctx, card, 0, 0, 140, 200, state, { highlight: true });

    // 拖拽光效
    const rgb = hexToRgb(card.color);
    const g = ctx.createRadialGradient(70, 100, 20, 70, 100, 100);
    g.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`);
    g.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-30, -30, 200, 260);

    ctx.restore();
}

function drawSlotFlashes(renderer, ctx, state) {
    // 处理待生成的放置特效
    if (state.pendingPlaceEffects && state.pendingPlaceEffects.length > 0) {
        for (const eff of state.pendingPlaceEffects) {
            const r = getSlotRect(renderer, eff.slotIndex, state.slots.length);
            FX.spawnCardPlace(r.x + r.w / 2, r.y + r.h / 2, eff.color);
        }
        state.pendingPlaceEffects = [];
    }

    // 处理待生成的生长特效
    if (state.pendingGrowthEffects && state.pendingGrowthEffects.length > 0) {
        for (const eff of state.pendingGrowthEffects) {
            const r = getSlotRect(renderer, eff.slotIndex, state.slots.length);
            FX.spawnGrowth(r.x + r.w / 2, r.y + r.h / 2);
        }
        state.pendingGrowthEffects = [];
    }

    for (let i = state.slotFlashes.length - 1; i >= 0; i--) {
        const flash = state.slotFlashes[i];
        const r = getSlotRect(renderer, flash.slotIndex, state.slots.length);
        const alpha = flash.timer / 20 * 0.5;

        // 闪光效果
        const grad = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, 0, r.x + r.w / 2, r.y + r.h / 2, r.w);
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(r.x, r.y, r.w, r.h);

        // 边缘高亮
        ctx.strokeStyle = `rgba(255,255,200,${alpha * 1.5})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x, r.y, r.w, r.h);

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
    const my = 200;

    ctx.fillStyle = preview.willKill ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.08)';
    roundRect(ctx, mx - 150, my - 25, 300, 50, 8);
    ctx.fill();

    ctx.strokeStyle = preview.willKill ? 'rgba(46,204,113,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, mx - 150, my - 25, 300, 50, 8);
    ctx.stroke();

    ctx.fillStyle = preview.willKill ? '#2ecc71' : '#ffd700';
    ctx.font = 'bold 15px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(`预计: ${preview.cardOutput} | 总计: ${preview.totalDamage}`, mx, my);
}

// ============================================================
// 位置工具
// ============================================================

export function getEndTurnButtonRect(renderer) {
    return { x: renderer.width - 170, y: renderer.height - 95, w: 150, h: 55 };
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

function drawPendingRecall(renderer, ctx, state) {
    if (!state.pendingRecall) return;

    const w = renderer.width;
    const h = renderer.height;

    // 暗色遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, w, h);

    const title = state.pendingRecall.message || '请选择弃牌堆中的一张卡牌';
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 80);

    const cards = state.pendingRecall.cards;
    const cardW = 140;
    const cardH = 200;
    const gap = 20;
    const totalW = cards.length * cardW + (cards.length - 1) * gap;
    let startX = (w - totalW) / 2;
    const startY = 120;

    state.pendingRecall.cardRects = [];

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const x = startX + i * (cardW + gap);
        const y = startY;

        const isHover = state.pendingRecall.hoverIndex === i;

        // 卡牌背景
        ctx.fillStyle = card.color || '#444';
        roundRect(ctx, x, y, cardW, cardH, 8);
        ctx.fill();
        ctx.strokeStyle = isHover ? '#fff' : (card.accentColor || '#888');
        ctx.lineWidth = isHover ? 3 : 2;
        ctx.stroke();

        // 卡牌名称
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(card.name, x + cardW / 2, y + 22);

        // 点数
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px Microsoft YaHei';
        ctx.fillText((card.baseValue + card.permanentBonus + (card.tempBonus || 0)), x + cardW / 2, y + 50);

        // 关键词标签
        let tagY = y + 72;
        for (const kw of card.keywords.slice(0, 3)) {
            const kwData = KEYWORDS[kw];
            if (!kwData) continue;
            const tagW = ctx.measureText(kwData.name).width + 8;
            const tagX = x + (cardW - tagW) / 2;
            ctx.fillStyle = kwData.color + '33';
            ctx.strokeStyle = kwData.color;
            ctx.lineWidth = 1;
            ctx.fillRect(tagX, tagY, tagW, 14);
            ctx.strokeRect(tagX, tagY, tagW, 14);
            ctx.fillStyle = kwData.color;
            ctx.font = '9px Microsoft YaHei';
            ctx.fillText(kwData.name, x + cardW / 2, tagY + 11);
            tagY += 18;
        }

        // 点击提示
        ctx.fillStyle = isHover ? '#ffcc88' : '#888';
        ctx.font = '11px Microsoft YaHei';
        ctx.fillText('点击选择', x + cardW / 2, y + cardH - 12);

        state.pendingRecall.cardRects.push({ x, y, w: cardW, h: cardH, index: i, card });
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}
