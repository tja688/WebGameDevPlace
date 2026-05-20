/**
 * 卡牌地下城 - 战斗界面渲染
 */

import { roundRect, darkenColor } from './core.js';
import { KEYWORDS } from '../data/index.js';
import { getCardBaseValue, getCardFinalValue, buildCardSlotMap, canPlaceCard, getSlotEffectiveMultiplier } from '../systems/board.js';
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

function drawBackground(ctx, width, height, animTime) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#1a1520');
    grad.addColorStop(0.5, '#0d0b12');
    grad.addColorStop(1, '#1a1520');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const brickW = 80;
    const brickH = 40;
    for (let y = 0; y < height; y += brickH) {
        const offset = (y / brickH) % 2 === 0 ? 0 : brickW / 2;
        for (let x = -brickW; x < width + brickW; x += brickW) {
            ctx.strokeRect(x + offset, y, brickW, brickH);
        }
    }

    const torchGlow = ctx.createRadialGradient(width * 0.3, 80, 0, width * 0.3, 80, 200);
    torchGlow.addColorStop(0, 'rgba(255,160,50,0.08)');
    torchGlow.addColorStop(1, 'rgba(255,160,50,0)');
    ctx.fillStyle = torchGlow;
    ctx.fillRect(0, 0, width, height);

    const torchGlow2 = ctx.createRadialGradient(width * 0.7, 80, 0, width * 0.7, 80, 200);
    torchGlow2.addColorStop(0, 'rgba(255,160,50,0.06)');
    torchGlow2.addColorStop(1, 'rgba(255,160,50,0)');
    ctx.fillStyle = torchGlow2;
    ctx.fillRect(0, 0, width, height);
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
    ctx.fillText(monster.name, mx, my - 70);

    ctx.fillStyle = '#aaa';
    ctx.font = '13px Microsoft YaHei';
    ctx.fillText(monster.description, mx, my - 50);

    const typeLabels = { normal: '普通', elite: '精英', boss: 'BOSS' };
    const typeColors = { normal: '#8B4513', elite: '#8B008B', boss: '#8B0000' };
    ctx.fillStyle = typeColors[monster.type] || '#555';
    ctx.font = 'bold 12px Microsoft YaHei';
    ctx.fillText(`[${typeLabels[monster.type] || ''}]`, mx, my - 35);

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

    if (monster.keywords.length > 0) {
        const tagX = mx + 90;
        const tagY = my + 20;
        ctx.fillStyle = '#8B0000';
        ctx.strokeStyle = '#cc4444';
        ctx.lineWidth = 1;
        const tagW = 280;
        const tagH = 36;
        ctx.fillRect(tagX, tagY - tagH / 2, tagW, tagH);
        ctx.strokeRect(tagX, tagY - tagH / 2, tagW, tagH);
        ctx.fillStyle = '#ffaaaa';
        ctx.font = '13px Microsoft YaHei';
        ctx.textAlign = 'left';
        ctx.fillText(monster.keywordDesc, tagX + 10, tagY + 5);
        ctx.textAlign = 'center';
    }
}

function drawMonster(ctx, monster, x, y, colors, t) {
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

    const cardW = 140;
    const cardH = 200;
    const totalW = hand.length * cardW + (hand.length - 1) * 16;
    const startX = (renderer.width - totalW) / 2;
    const startY = 480;

    for (let i = 0; i < hand.length; i++) {
        const card = hand[i];
        const x = startX + i * (cardW + 16);
        const y = startY;

        const isSelected = state.selectedCard && state.selectedCard.uuid === card.uuid;
        const isDragged = state.draggedCard && state.draggedCard.uuid === card.uuid;
        if (isDragged) continue;

        const hoverOffset = isSelected ? -20 : 0;
        drawCard(ctx, card, x, y + hoverOffset, cardW, cardH, state);
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

export function getHandCardRect(renderer, index, total) {
    const cardW = 140;
    const cardH = 200;
    const totalW = total * cardW + (total - 1) * 16;
    const startX = (renderer.width - totalW) / 2;
    const startY = 480;
    return {
        x: startX + index * (cardW + 16),
        y: startY,
        w: cardW,
        h: cardH
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
    for (let i = 0; i < handLength; i++) {
        const r = getHandCardRect(renderer, i, handLength);
        if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
            return i;
        }
    }
    return null;
}
