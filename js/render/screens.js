/**
 * 生死烛局 - 非战斗界面渲染
 * 
 * 包含：title, class_select, map, post_battle, card_pick, card_select,
 *       shop, blacksmith, event, treasure, act_transition, victory, game_over
 */

import {
    roundRect,
    wrapText,
    darkenColor,
    drawBackButton,
    drawBackground,
    drawStoneTile,
    drawMetalFrame,
    drawParchment,
    drawGlowText,
    drawButton,
    drawSoulIcon
} from './core.js';
import { CLASS_DEFS, STAGE_CONFIG, KEYWORDS, CARD_DEFS, RELIC_DEFS } from '../data/index.js';
import { getCurrentStageKey } from '../core/state.js';
import { getOrCreateBlacksmithStock } from '../systems/shop.js';
import { getCardBaseValue } from '../systems/board.js';

export function drawTitle(renderer, ctx, state) {
    drawBackground(ctx, renderer.width, renderer.height, renderer.animTime);

    const t = renderer.animTime;
    const cx = renderer.width / 2;
    const cy = renderer.height / 2;

    const glow = ctx.createRadialGradient(cx, cy - 80, 0, cx, cy - 80, 300);
    glow.addColorStop(0, 'rgba(255,200,50,0.15)');
    glow.addColorStop(1, 'rgba(255,200,50,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 64px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255,215,0,0.4)';
    ctx.shadowBlur = 20;
    ctx.fillText('🕯 生死烛局', cx, cy - 60);
    ctx.shadowBlur = 0;

    // 版本号
    ctx.fillStyle = '#666';
    ctx.font = '12px Microsoft YaHei';
    ctx.fillText('v0.6.5', cx, cy + 12);

    const btnW = 280;
    const btnH = 60;
    const btnX = cx - btnW / 2;
    const btnY = cy + 80;
    const hover = state.data.hoverStart;

    ctx.fillStyle = hover ? 'rgba(100,50,50,0.95)' : 'rgba(80,40,40,0.9)';
    ctx.strokeStyle = hover ? '#cc8888' : '#aa6666';
    ctx.lineWidth = 3;
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = hover ? '#ffcccc' : '#ffaaaa';
    ctx.font = 'bold 24px Microsoft YaHei';
    ctx.fillText('开始冒险', cx, btnY + 40);

    if (hover) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(btnX, btnY, btnW, btnH / 2);
    }

    state.data.startBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

    // 重看教程按钮
    const tutBtnW = 160;
    const tutBtnH = 40;
    const tutBtnX = cx - tutBtnW / 2;
    const tutBtnY = btnY + btnH + 20;
    const tutHover = state.data.hoverTutorial;

    ctx.fillStyle = tutHover ? 'rgba(50,70,90,0.95)' : 'rgba(40,55,75,0.9)';
    ctx.strokeStyle = tutHover ? '#88aacc' : '#6688aa';
    ctx.lineWidth = 2;
    ctx.fillRect(tutBtnX, tutBtnY, tutBtnW, tutBtnH);
    ctx.strokeRect(tutBtnX, tutBtnY, tutBtnW, tutBtnH);

    ctx.fillStyle = tutHover ? '#ccddff' : '#aabbdd';
    ctx.font = '16px Microsoft YaHei';
    ctx.fillText('📖 重看教程', cx, tutBtnY + 27);

    if (tutHover) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(tutBtnX, tutBtnY, tutBtnW, tutBtnH / 2);
    }

    state.data.tutorialBtnRect = { x: tutBtnX, y: tutBtnY, w: tutBtnW, h: tutBtnH };
}

export function drawClassSelect(renderer, ctx, state) {
    drawBackground(ctx, renderer.width, renderer.height, renderer.animTime);

    const cx = renderer.width / 2;
    const titleY = 80;

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 36px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText('选择你的职业', cx, titleY);

    const cardW = 280;
    const cardH = 420;
    const gap = 40;
    const totalW = 3 * cardW + 2 * gap;
    const startX = cx - totalW / 2;
    const startY = 140;

    const classes = ['veteran'];
    const classIcons = { veteran: '⚔️' };
    state.data.classCardRects = [];

    for (let i = 0; i < classes.length; i++) {
        const clsId = classes[i];
        const cls = CLASS_DEFS[clsId];
        const x = startX + i * (cardW + gap);
        const y = startY;
        const isAvailable = true;
        const isHover = state.data.hoverClass === clsId;

        const alpha = isAvailable ? (isHover ? 0.95 : 0.85) : 0.4;
        ctx.globalAlpha = alpha;
        const grad = ctx.createLinearGradient(x, y, x, y + cardH);
        grad.addColorStop(0, isAvailable ? '#2a2a4a' : '#1a1a2a');
        grad.addColorStop(1, isAvailable ? '#1a1a2a' : '#0d0d15');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, cardW, cardH);
        ctx.globalAlpha = 1;

        ctx.strokeStyle = isAvailable ? (isHover ? '#ffaa66' : '#666') : '#333';
        ctx.lineWidth = isHover ? 3 : 2;
        ctx.strokeRect(x, y, cardW, cardH);

        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 10, y + 10, cardW - 20, cardH - 20);

        ctx.fillStyle = isAvailable ? '#fff' : '#555';
        ctx.font = '80px serif';
        ctx.textAlign = 'center';
        ctx.fillText(classIcons[clsId], x + cardW / 2, y + 120);

        ctx.fillStyle = isAvailable ? '#ffd700' : '#555';
        ctx.font = 'bold 28px Microsoft YaHei';
        ctx.fillText(cls.name, x + cardW / 2, y + 180);

        ctx.fillStyle = isAvailable ? '#e74c3c' : '#444';
        ctx.font = '20px Microsoft YaHei';
        ctx.fillText(`❤️ ${cls.hearts}`, x + cardW / 2, y + 230);

        ctx.fillStyle = isAvailable ? '#aaa' : '#444';
        ctx.font = '14px Microsoft YaHei';
        const desc = isAvailable ? (cls.startingRelic ? `遗物：${cls.startingRelic.name}` : '无初始遗物') : '（暂未开放）';
        wrapText(ctx, desc, x + cardW / 2, y + 290, cardW - 40, 22);

        if (!isAvailable) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x, y, cardW, cardH);
            ctx.fillStyle = '#666';
            ctx.font = 'bold 20px Microsoft YaHei';
            ctx.fillText('🔒 暂未开放', x + cardW / 2, y + cardH / 2);
        }

        state.data.classCardRects.push({ x, y, w: cardW, h: cardH, id: clsId, available: isAvailable });
    }
}

export function drawMap(renderer, ctx, state) {
    drawBackground(ctx, renderer.width, renderer.height, renderer.animTime);
    const runData = state.data.runData;
    if (!runData) return;

    const cx = renderer.width / 2;
    const t = renderer.animTime;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, renderer.width, 70);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 70);
    ctx.lineTo(renderer.width, 70);
    ctx.stroke();

    const actNames = ['', '第一大关：被污染的农田', '第二大关：幽暗矿洞', '第三大关：鼠王巢穴'];
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px Microsoft YaHei';
    ctx.textAlign = 'left';
    ctx.fillText(actNames[runData.act] || `第${runData.act}大关`, 30, 45);

    ctx.fillStyle = '#aaa';
    ctx.font = '20px Microsoft YaHei';
    ctx.textAlign = 'right';
    ctx.fillText(`💀 ${runData.gold} 金币`, renderer.width - 30, 45);

    const nodeW = 100;
    const nodeH = 130;
    const gap = 40;
    const totalW = 8 * nodeW + 7 * gap;
    const startX = cx - totalW / 2;
    const nodeY = 200;

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
        ctx.moveTo(startX + i * (nodeW + gap) + nodeW, nodeY + nodeH / 2);
        ctx.lineTo(startX + (i + 1) * (nodeW + gap), nodeY + nodeH / 2);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    state.data.nodeRects = [];
    const stageKeys = [];
    for (let i = 1; i <= 8; i++) {
        stageKeys.push(`${runData.act}-${i}`);
    }
    const typeIcons = { normal: '👹', elite: '👺', boss: '👿' };
    const typeLabels = { normal: '普通', elite: '精英', boss: 'BOSS' };

    for (let i = 0; i < 8; i++) {
        const key = stageKeys[i];
        const config = STAGE_CONFIG[key];
        const x = startX + i * (nodeW + gap);
        const y = nodeY;
        const isCompleted = runData.completedStages.includes(key);
        const isCurrent = runData.stageIndex === i && !isCompleted;
        const isLocked = i > runData.stageIndex;
        const isHover = state.data.hoverNode === i;

        const floatY = isCurrent ? Math.sin(t * 2 + i) * 4 : 0;

        if (isLocked) {
            ctx.fillStyle = 'rgba(30,30,40,0.6)';
            ctx.strokeStyle = '#333';
        } else if (isCompleted) {
            ctx.fillStyle = 'rgba(40,60,40,0.6)';
            ctx.strokeStyle = '#446644';
        } else if (isCurrent) {
            ctx.fillStyle = isHover ? 'rgba(60,50,30,0.95)' : 'rgba(50,40,25,0.9)';
            ctx.strokeStyle = isHover ? '#ffaa44' : '#b8860b';
        } else {
            ctx.fillStyle = 'rgba(40,40,50,0.8)';
            ctx.strokeStyle = '#555';
        }
        ctx.lineWidth = isCurrent ? 3 : 2;
        roundRect(ctx, x, y + floatY, nodeW, nodeH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        if (isLocked) {
            ctx.fillStyle = '#333';
            ctx.font = '32px serif';
            ctx.fillText('?', x + nodeW / 2, y + floatY + nodeH / 2 + 10);
        } else {
            ctx.font = '28px serif';
            ctx.fillStyle = isCompleted ? '#66aa66' : '#fff';
            ctx.fillText(typeIcons[config.type], x + nodeW / 2, y + floatY + 40);

            ctx.fillStyle = isCompleted ? '#66aa66' : '#ffd700';
            ctx.font = 'bold 16px Microsoft YaHei';
            ctx.fillText(key, x + nodeW / 2, y + floatY + 68);

            ctx.fillStyle = isCompleted ? '#558855' : '#aaa';
            ctx.font = '12px Microsoft YaHei';
            ctx.fillText(typeLabels[config.type], x + nodeW / 2, y + floatY + 88);

            if (isCompleted) {
                ctx.fillStyle = '#2ecc71';
                ctx.font = 'bold 18px Microsoft YaHei';
                ctx.fillText('✓', x + nodeW / 2, y + floatY + 112);
            }
        }

        state.data.nodeRects.push({ x, y: y + floatY, w: nodeW, h: nodeH, index: i, key, current: isCurrent, locked: isLocked });
    }

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, renderer.height - 100, renderer.width, 100);
    ctx.strokeStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(0, renderer.height - 100);
    ctx.lineTo(renderer.width, renderer.height - 100);
    ctx.stroke();

    const cls = CLASS_DEFS[runData.classId];
    ctx.fillStyle = '#aaa';
    ctx.font = '16px Microsoft YaHei';
    ctx.textAlign = 'left';
    ctx.fillText(`职业: ${cls.name} | 牌库: ${runData.deck.length} 张 | 遗物: ${runData.relics.length} 件 | 倍率格: 3格`, 30, renderer.height - 60);

    if (runData.stageIndex < 8) {
        const curKey = getCurrentStageKey(runData);
        const curConfig = STAGE_CONFIG[curKey];
        ctx.fillStyle = '#ffaa66';
        ctx.font = '18px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(`点击节点进入 ${curKey} - ${typeLabels[curConfig.type]}战斗`, cx, renderer.height - 30);
    }

    // 查看牌组按钮
    const deckBtnRect = drawDeckViewButton(ctx, state, renderer.width - 140, renderer.height - 80, 110, 38);
    if (deckBtnRect) state.data.deckViewBtnRect = deckBtnRect;
}

export function drawBossRelic(renderer, ctx, state) {
    drawBackground(ctx, renderer.width, renderer.height, renderer.animTime);
    const data = state.data;
    const cx = renderer.width / 2;

    drawGlowText(ctx, 'BOSS遗物 - 选择一项奖励', cx, 100, {
        color: '#ffd700',
        glowColor: '#b8860b',
        glowBlur: 15,
        font: 'bold 34px Microsoft YaHei',
        align: 'center'
    });

    if (data.goldGained !== undefined) {
        drawSoulIcon(ctx, cx - 80, 135, 18);
        ctx.fillStyle = '#aaa';
        ctx.font = '18px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(`获得 ${data.goldGained} 金币 | 累计: ${data.runData.gold} 金币`, cx + 10, 140);
    }

    state.data.optionRects = [];
    const options = data.relicOptions || [];
    const cardW = 300;
    const cardH = 380;
    const gap = 40;
    const totalW = options.length * cardW + (options.length - 1) * gap;
    const startX = cx - totalW / 2;
    const startY = 180;

    for (let i = 0; i < options.length; i++) {
        const relic = options[i];
        const x = startX + i * (cardW + gap);
        const y = startY;
        const isHover = state.data.hoverOption === i;

        const alpha = isHover ? 0.95 : 0.85;
        ctx.globalAlpha = alpha;
        const grad = ctx.createLinearGradient(x, y, x, y + cardH);
        grad.addColorStop(0, isHover ? '#3a2a1a' : '#2a1a0a');
        grad.addColorStop(1, isHover ? '#1a0a05' : '#0d0505');
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, cardW, cardH, 14);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = isHover ? '#ffd700' : '#b8860b';
        ctx.lineWidth = isHover ? 3 : 2;
        roundRect(ctx, x, y, cardW, cardH, 14);
        ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.font = '60px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏆', x + cardW / 2, y + 80);

        ctx.fillStyle = '#ffcc66';
        ctx.font = 'bold 20px Microsoft YaHei';
        ctx.fillText(relic.name, x + cardW / 2, y + 130);

        ctx.fillStyle = '#aaa';
        ctx.font = '15px Microsoft YaHei';
        wrapText(ctx, relic.desc, x + cardW / 2, y + 170, cardW - 40, 24);

        ctx.fillStyle = isHover ? '#ffcc88' : '#666';
        ctx.font = '14px Microsoft YaHei';
        ctx.fillText('点击选择', x + cardW / 2, y + cardH - 30);

        state.data.optionRects.push({ x, y, w: cardW, h: cardH, index: i, type: 'relic', data: relic });
    }

    // 查看牌组按钮
    const deckBtnRect = drawDeckViewButton(ctx, state, renderer.width - 140, renderer.height - 80, 110, 38);
    if (deckBtnRect) state.data.deckViewBtnRect = deckBtnRect;
}

export function drawPostBattle(renderer, ctx, state) {
    drawBackground(ctx, renderer.width, renderer.height, renderer.animTime);
    const data = state.data;
    const cx = renderer.width / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    let title = '战后休整';
    if (data.type === 'treasure') title = '遗物宝箱';
    else if (data.type === 'shop_choice') title = '选择你的前路';

    drawGlowText(ctx, title, cx, 100, {
        color: '#ffd700',
        glowColor: '#b8860b',
        glowBlur: 15,
        font: 'bold 34px Microsoft YaHei',
        align: 'center'
    });

    if (data.goldGained !== undefined) {
        drawSoulIcon(ctx, cx - 80, 135, 18);
        ctx.fillStyle = '#aaa';
        ctx.font = '18px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(`获得 ${data.goldGained} 金币 | 累计: ${data.runData.gold} 金币`, cx + 10, 140);
    }

    state.data.optionRects = [];

    if (data.type === 'two_events' || data.type === 'three_events') {
        drawEventOptions(renderer, ctx, state, data.postBattleData.options);
    } else if (data.type === 'treasure') {
        drawTreasureOption(renderer, ctx, state, data.postBattleData.relic);
    } else if (data.type === 'shop_choice') {
        drawShopChoiceOptions(renderer, ctx, state, data.postBattleData.options);
    }

    // 查看牌组按钮
    const deckBtnRect = drawDeckViewButton(ctx, state, renderer.width - 140, renderer.height - 80, 110, 38);
    if (deckBtnRect) state.data.deckViewBtnRect = deckBtnRect;
}

function drawEventOptions(renderer, ctx, state, options) {
    const cx = renderer.width / 2;
    const cardW = 300;
    const cardH = 380;
    const gap = 40;
    const totalW = options.length * cardW + (options.length - 1) * gap;
    const startX = cx - totalW / 2;
    const startY = 200;

    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const x = startX + i * (cardW + gap);
        const y = startY;
        const isHover = state.data.hoverOption === i;

        const alpha = isHover ? 0.95 : 0.85;
        ctx.globalAlpha = alpha;
        const grad = ctx.createLinearGradient(x, y, x, y + cardH);
        grad.addColorStop(0, isHover ? '#3a2a4a' : '#2a1a3a');
        grad.addColorStop(1, isHover ? '#1a0a2a' : '#0d0515');
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, cardW, cardH, 14);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = isHover ? '#aa77cc' : '#664488';
        ctx.lineWidth = isHover ? 3 : 2;
        roundRect(ctx, x, y, cardW, cardH, 14);
        ctx.stroke();

        ctx.fillStyle = '#aa77cc';
        ctx.font = '60px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🜂', x + cardW / 2, y + 90);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 22px Microsoft YaHei';
        ctx.fillText(opt.name, x + cardW / 2, y + 140);

        ctx.fillStyle = '#aaa';
        ctx.font = '15px Microsoft YaHei';
        wrapText(ctx, opt.desc, x + cardW / 2, y + 180, cardW - 40, 24);

        ctx.fillStyle = isHover ? '#ffcc88' : '#666';
        ctx.font = '14px Microsoft YaHei';
        ctx.fillText('点击选择', x + cardW / 2, y + cardH - 30);

        state.data.optionRects.push({ x, y, w: cardW, h: cardH, index: i, type: 'event', data: opt });
    }
}

function drawTreasureOption(renderer, ctx, state, relic) {
    const cx = renderer.width / 2;
    const x = cx - 150;
    const y = 220;
    const w = 300;
    const h = 300;
    const isHover = state.data.hoverTreasure;
    const t = renderer.animTime;

    if (isHover) {
        const pulse = Math.sin(t * 3) * 0.3 + 0.7;
        const g = ctx.createRadialGradient(cx, y + h / 2, w * 0.3, cx, y + h / 2, w);
        g.addColorStop(0, `rgba(255,215,0,${0.3 * pulse})`);
        g.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 20, y - 20, w + 40, h + 40);
    }

    drawStoneTile(ctx, x, y, w, h, { highlight: isHover, glowColor: isHover ? '#ffd700' : null });
    drawMetalFrame(ctx, x, y, w, h, { color: isHover ? '#ffd700' : '#b8860b', thickness: 3, radius: 16 });

    ctx.fillStyle = '#ffd700';
    ctx.font = '80px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎁', cx, y + 120);

    ctx.fillStyle = '#ffcc66';
    ctx.font = 'bold 20px Microsoft YaHei';
    ctx.fillText('点击开启宝箱', cx, y + 170);

    state.data.treasureRect = { x, y, w, h, relic };
}

function drawShopChoiceOptions(renderer, ctx, state, options) {
    const cx = renderer.width / 2;
    const cardW = 280;
    const cardH = 360;
    const gap = 40;
    const totalW = options.length * cardW + (options.length - 1) * gap;
    const startX = cx - totalW / 2;
    const startY = 200;

    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const x = startX + i * (cardW + gap);
        const y = startY;
        const isHover = state.data.hoverOption === i;

        const alpha = isHover ? 0.95 : 0.85;
        ctx.globalAlpha = alpha;
        const grad = ctx.createLinearGradient(x, y, x, y + cardH);
        grad.addColorStop(0, isHover ? '#2a3040' : '#1a2030');
        grad.addColorStop(1, isHover ? '#0d1520' : '#0a0f18');
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, cardW, cardH, 12);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = isHover ? '#66aadd' : '#445577';
        ctx.lineWidth = isHover ? 3 : 2;
        roundRect(ctx, x, y, cardW, cardH, 12);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '60px serif';
        ctx.textAlign = 'center';
        ctx.fillText(opt.icon, x + cardW / 2, y + 100);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px Microsoft YaHei';
        ctx.fillText(opt.name, x + cardW / 2, y + 150);

        ctx.fillStyle = '#aaa';
        ctx.font = '16px Microsoft YaHei';
        wrapText(ctx, opt.desc, x + cardW / 2, y + 190, cardW - 40, 24);

        ctx.fillStyle = isHover ? '#ffcc88' : '#666';
        ctx.font = '14px Microsoft YaHei';
        ctx.fillText('点击进入', x + cardW / 2, y + cardH - 30);

        state.data.optionRects.push({ x, y, w: cardW, h: cardH, index: i, type: opt.type, data: opt });
    }
}

export function drawCardPick(renderer, ctx, state) {
    drawBackground(ctx, renderer.width, renderer.height, renderer.animTime);
    const data = state.data;
    const cx = renderer.width / 2;

    drawGlowText(ctx, '选择一张卡牌加入牌组', cx, 80, {
        color: '#ffd700',
        glowColor: '#b8860b',
        glowBlur: 12,
        font: 'bold 32px Microsoft YaHei',
        align: 'center'
    });

    ctx.fillStyle = '#aaa';
    ctx.font = '18px Microsoft YaHei';
    ctx.fillText('普通怪战利品', cx, 115);

    state.data.optionRects = [];
    const options = data.options || [];
    const cardW = 180;
    const cardH = 260;
    const gap = 40;
    const totalW = options.length * cardW + (options.length - 1) * gap;
    const startX = cx - totalW / 2;
    const startY = 160;

    for (let i = 0; i < options.length; i++) {
        const defId = options[i];
        const def = CARD_DEFS[defId];
        if (!def) continue;
        const x = startX + i * (cardW + gap);
        const y = startY;
        const isHover = state.data.hoverOption === i;

        ctx.globalAlpha = isHover ? 0.95 : 0.85;
        const grad = ctx.createLinearGradient(x, y, x, y + cardH);
        grad.addColorStop(0, def.color);
        grad.addColorStop(1, darkenColor(def.color, -40));
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, cardW, cardH, 10);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = isHover ? '#fff' : def.accentColor;
        ctx.lineWidth = isHover ? 3 : 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(def.name, x + cardW / 2, y + 30);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px Microsoft YaHei';
        ctx.fillText(def.baseValue, x + cardW / 2, y + 70);

        let tagY = y + 100;
        for (const kw of def.keywords) {
            const kwData = KEYWORDS[kw];
            if (!kwData) continue;
            const tagW = ctx.measureText(kwData.name).width + 12;
            const tagX = x + (cardW - tagW) / 2;
            ctx.fillStyle = kwData.color + '33';
            ctx.strokeStyle = kwData.color;
            ctx.lineWidth = 1;
            ctx.fillRect(tagX, tagY, tagW, 18);
            ctx.strokeRect(tagX, tagY, tagW, 18);
            ctx.fillStyle = kwData.color;
            ctx.font = '11px Microsoft YaHei';
            ctx.fillText(kwData.name, x + cardW / 2, tagY + 13);
            tagY += 22;
        }

        ctx.fillStyle = '#ccc';
        ctx.font = '12px Microsoft YaHei';
        wrapText(ctx, def.description, x + cardW / 2, tagY + 10, cardW - 20, 18);

        ctx.fillStyle = isHover ? '#ffcc88' : '#666';
        ctx.font = '14px Microsoft YaHei';
        ctx.fillText('点击选择', x + cardW / 2, y + cardH - 20);

        state.data.optionRects.push({ x, y, w: cardW, h: cardH, index: i, defId });
    }

    const skipW = 160;
    const skipH = 45;
    const skipX = cx - skipW / 2;
    const skipY = startY + cardH + 30;
    const skipHover = state.data.hoverSkip;
    ctx.fillStyle = skipHover ? 'rgba(60,50,50,0.95)' : 'rgba(40,35,35,0.9)';
    ctx.strokeStyle = skipHover ? '#aa6666' : '#554444';
    ctx.lineWidth = skipHover ? 3 : 2;
    roundRect(ctx, skipX, skipY, skipW, skipH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = skipHover ? '#ffcccc' : '#aaa';
    ctx.font = 'bold 16px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText('跳过', cx, skipY + 29);
    state.data.skipRect = { x: skipX, y: skipY, w: skipW, h: skipH };

    // 查看牌组按钮
    const deckBtnRect = drawDeckViewButton(ctx, state, skipX + skipW + 20, skipY, 110, 38);
    if (deckBtnRect) state.data.deckViewBtnRect = deckBtnRect;
}

export function drawCardSelect(renderer, ctx, state) {
    drawBackground(ctx, renderer.width, renderer.height, renderer.animTime);
    const data = state.data;
    const cx = renderer.width / 2;

    drawGlowText(ctx, data.title || '选择一张卡牌', cx, 80, {
        color: '#ffd700',
        glowColor: '#b8860b',
        glowBlur: 10,
        font: 'bold 28px Microsoft YaHei',
        align: 'center'
    });

    ctx.fillStyle = '#aaa';
    ctx.font = '16px Microsoft YaHei';
    ctx.fillText(data.desc || '', cx, 110);

    state.data.optionRects = [];
    const cards = data.cards || [];
    const cardW = 160;
    const cardH = 240;
    const gap = 24;
    const perRow = Math.min(cards.length, 5);
    const totalW = perRow * cardW + (perRow - 1) * gap;
    let startX = cx - totalW / 2;
    let startY = 150;
    const scrollY = state.data.cardSelectScrollY || 0;

    const rows = Math.ceil(cards.length / perRow);
    const contentBottom = startY + rows * (cardH + 30);
    const visibleBottom = renderer.height - 100;
    state.data.cardSelectMaxScroll = Math.max(0, contentBottom - visibleBottom);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 130, renderer.width, visibleBottom - 130);
    ctx.clip();

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = startX + col * (cardW + gap);
        const y = startY + row * (cardH + 30) - scrollY;
        const isHover = state.data.hoverOption === i;

        if (y + cardH < 130 || y > visibleBottom) {
            const originalY = startY + row * (cardH + 30);
            state.data.optionRects.push({ x, y: originalY, w: cardW, h: cardH, index: i, card });
            continue;
        }

        ctx.globalAlpha = isHover ? 0.95 : 0.85;
        const grad = ctx.createLinearGradient(x, y, x, y + cardH);
        grad.addColorStop(0, card.color);
        grad.addColorStop(1, darkenColor(card.color, -40));
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, cardW, cardH, 10);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = isHover ? '#fff' : card.accentColor;
        ctx.lineWidth = isHover ? 3 : 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(card.name, x + cardW / 2, y + 26);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 22px Microsoft YaHei';
        ctx.fillText(getCardBaseValue(card), x + cardW / 2, y + 58);

        let tagY = y + 82;
        for (const kw of card.keywords) {
            const kwData = KEYWORDS[kw];
            if (!kwData) continue;
            const tagW = ctx.measureText(kwData.name).width + 10;
            const tagX = x + (cardW - tagW) / 2;
            ctx.fillStyle = kwData.color + '33';
            ctx.strokeStyle = kwData.color;
            ctx.lineWidth = 1;
            ctx.fillRect(tagX, tagY, tagW, 16);
            ctx.strokeRect(tagX, tagY, tagW, 16);
            ctx.fillStyle = kwData.color;
            ctx.font = '10px Microsoft YaHei';
            ctx.fillText(kwData.name, x + cardW / 2, tagY + 12);
            tagY += 20;
        }

        ctx.fillStyle = isHover ? '#ffcc88' : '#666';
        ctx.font = '12px Microsoft YaHei';
        ctx.fillText('点击选择', x + cardW / 2, y + cardH - 15);

        const originalY = startY + row * (cardH + 30);
        state.data.optionRects.push({ x, y: originalY, w: cardW, h: cardH, index: i, card });
    }

    ctx.restore();

    const maxScroll = state.data.cardSelectMaxScroll;
    if (maxScroll > 0) {
        const scrollBarH = Math.max(40, (visibleBottom - 130) * (visibleBottom - 130) / (contentBottom - 130));
        const scrollBarY = 130 + ((visibleBottom - 130) - scrollBarH) * (scrollY / maxScroll);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(renderer.width - 12, scrollBarY, 6, scrollBarH);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(renderer.width - 12, scrollBarY, 6, scrollBarH);
    }

    const backW = 140;
    const backH = 40;
    const backX = cx - backW / 2;
    const backY = renderer.height - 90;
    const backHover = state.data.hoverBack;
    ctx.fillStyle = backHover ? 'rgba(60,50,50,0.95)' : 'rgba(40,35,35,0.9)';
    ctx.strokeStyle = backHover ? '#aa6666' : '#554444';
    ctx.lineWidth = backHover ? 3 : 2;
    roundRect(ctx, backX, backY, backW, backH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = backHover ? '#ffcccc' : '#aaa';
    ctx.font = 'bold 14px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(data.backText || '取消', cx, backY + 26);
    state.data.backBtnRect = { x: backX, y: backY, w: backW, h: backH };
}

export function drawShop(renderer, ctx, state) {
    drawBackground(ctx, renderer.width, renderer.height, renderer.animTime);
    const data = state.data;
    const runData = data.runData;
    const stock = data.stock;
    const cx = renderer.width / 2;

    drawParchment(ctx, 0, 0, renderer.width, 70, { alpha: 0.5, radius: 0 });
    ctx.strokeStyle = 'rgba(180,150,100,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 70);
    ctx.lineTo(renderer.width, 70);
    ctx.stroke();

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px Microsoft YaHei';
    ctx.textAlign = 'left';
    ctx.fillText('🏪 牌店', 30, 45);

    drawSoulIcon(ctx, renderer.width - 180, 35, 20);
    ctx.fillStyle = '#aaa';
    ctx.font = '20px Microsoft YaHei';
    ctx.textAlign = 'right';
    ctx.fillText(`${runData.gold} 金币`, renderer.width - 30, 45);

    state.data.shopItemRects = [];

    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 18px Microsoft YaHei';
    ctx.textAlign = 'left';
    ctx.fillText('卡牌', 60, 110);

    const cardW = 180;
    const cardH = 260;
    const cardGap = 30;
    let cardStartX = 60;

    for (let i = 0; i < stock.cards.length; i++) {
        const item = stock.cards[i];
        const def = CARD_DEFS[item.defId];
        const x = cardStartX + i * (cardW + cardGap);
        const y = 130;
        const isHover = state.data.hoverShopItem === `card_${i}`;
        const isBought = item.bought;
        const price = runData.relics?.some(r => r.effect?.type === 'free_card_purchase') ? 0 : item.price;

        ctx.globalAlpha = isBought ? 0.4 : (isHover ? 0.95 : 0.85);
        const grad = ctx.createLinearGradient(x, y, x, y + cardH);
        grad.addColorStop(0, def.color);
        grad.addColorStop(1, darkenColor(def.color, -40));
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, cardW, cardH, 10);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = isBought ? '#333' : (isHover ? '#fff' : def.accentColor);
        ctx.lineWidth = isHover ? 3 : 2;
        ctx.stroke();

        if (!isBought) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText(def.name, x + cardW / 2, y + 30);

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 24px Microsoft YaHei';
            ctx.fillText(def.baseValue, x + cardW / 2, y + 70);

            let tagY = y + 100;
            for (const kw of def.keywords) {
                const kwData = KEYWORDS[kw];
                if (!kwData) continue;
                const tagW = ctx.measureText(kwData.name).width + 12;
                const tagX = x + (cardW - tagW) / 2;
                ctx.fillStyle = kwData.color + '33';
                ctx.strokeStyle = kwData.color;
                ctx.lineWidth = 1;
                ctx.fillRect(tagX, tagY, tagW, 18);
                ctx.strokeRect(tagX, tagY, tagW, 18);
                ctx.fillStyle = kwData.color;
                ctx.font = '11px Microsoft YaHei';
                ctx.fillText(kwData.name, x + cardW / 2, tagY + 13);
                tagY += 22;
            }

            const priceColor = runData.gold >= price ? '#2ecc71' : '#e74c3c';
            ctx.fillStyle = priceColor;
            ctx.font = 'bold 18px Microsoft YaHei';
            ctx.fillText(`💀 ${price}`, x + cardW / 2, y + cardH - 40);
        } else {
            ctx.fillStyle = '#555';
            ctx.font = 'bold 16px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText('已购买', x + cardW / 2, y + cardH / 2);
        }

        state.data.shopItemRects.push({ x, y, w: cardW, h: cardH, key: `card_${i}`, item, price, type: 'card' });
    }

    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 18px Microsoft YaHei';
    ctx.textAlign = 'left';
    ctx.fillText('遗物', 60, 505);

    const relicW = 270;
    const relicH = 58;
    const relicGap = 30;
    const relicY = 520;
    for (let i = 0; i < (stock.relics || []).length; i++) {
        const item = stock.relics[i];
        const x = 60 + i * (relicW + relicGap);
        const isHover = state.data.hoverShopItem === `relic_${i}`;
        const isBought = item.bought;
        const price = item.price;

        ctx.fillStyle = isHover ? 'rgba(50,45,35,0.95)' : 'rgba(40,35,25,0.9)';
        ctx.strokeStyle = isBought ? '#333' : (isHover ? '#b8860b' : '#554433');
        ctx.lineWidth = isHover ? 2 : 1;
        roundRect(ctx, x, relicY, relicW, relicH, 6);
        ctx.fill();
        ctx.stroke();

        if (isBought) {
            ctx.fillStyle = '#555';
            ctx.font = '15px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText('已购买', x + relicW / 2, relicY + 35);
        } else {
            ctx.fillStyle = runData.gold >= price ? '#ccc' : '#555';
            ctx.font = '15px Microsoft YaHei';
            ctx.textAlign = 'left';
            ctx.fillText(item.name, x + 12, relicY + 23);

            ctx.fillStyle = '#777';
            ctx.font = '11px Microsoft YaHei';
            const desc = item.desc || item.description || '';
            ctx.fillText(desc.length > 18 ? `${desc.slice(0, 18)}...` : desc, x + 12, relicY + 43);

            ctx.fillStyle = runData.gold >= price ? '#2ecc71' : '#e74c3c';
            ctx.font = 'bold 14px Microsoft YaHei';
            ctx.textAlign = 'right';
            ctx.fillText(`${price}金币`, x + relicW - 12, relicY + 23);
        }

        state.data.shopItemRects.push({ x, y: relicY, w: relicW, h: relicH, key: `relic_${i}`, item, price, type: 'relic' });
    }

    const btnY = 430;
    const btnH = 45;
    const refreshCost = (runData.freeRefreshCount > 0 || runData.shopFriendRefreshAvailable) ? 0 : runData.shopRefreshCost;
    const services = [
        { key: 'remove_card', text: `🗑️ 删牌服务 (${runData.shopRemoveCost || 2}金币)`, x: 60, cost: runData.shopRemoveCost || 2 },
        { key: 'upgrade_card', text: `⬆️ 数值强化 +5 (2金币起)`, x: 240, cost: 0 },
        { key: 'buy_strategy', text: `📜 计策等级提升 (4金币)`, x: 440, cost: 4 },
        { key: 'refresh', text: `🔄 刷新商店 (${refreshCost}金币)`, x: 640, cost: refreshCost },
    ];
    state.data.shopServiceRects = [];
    for (const svc of services) {
        const btnW = 190;
        const isHover = state.data.hoverShopService === svc.key;
        ctx.fillStyle = isHover ? 'rgba(50,50,70,0.95)' : 'rgba(40,40,60,0.9)';
        ctx.strokeStyle = isHover ? '#888' : '#555';
        ctx.lineWidth = isHover ? 3 : 2;
        roundRect(ctx, svc.x, btnY, btnW, btnH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = runData.gold >= svc.cost ? '#ccc' : '#555';
        ctx.font = '14px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(svc.text, svc.x + btnW / 2, btnY + 28);

        state.data.shopServiceRects.push({ x: svc.x, y: btnY, w: btnW, h: btnH, key: svc.key, cost: svc.cost });
    }

    drawBackButton(ctx, state, '返回地图', renderer.width, renderer.height);

    // 查看牌组按钮
    const deckBtnRect = drawDeckViewButton(ctx, state, 190, renderer.height - 80, 110, 38);
    if (deckBtnRect) state.data.deckViewBtnRect = deckBtnRect;

    // 计策二选一弹窗
    if (data.strategyOptions) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, renderer.width, renderer.height);

        const strategyNames = {
            attempt_push: '尝试推进', left_assault: '左侧强袭', right_assault: '右侧强袭',
            mid_assault: '中线强袭', steady_push: '稳重推进', plan_left: '计划左攻',
            plan_right: '计划右攻', plan_mid: '计划中攻', forceful_push: '强硬推进'
        };

        const cx = renderer.width / 2;
        const cardW = 280;
        const cardH = 200;
        const gap = 40;
        const totalW = 2 * cardW + gap;
        const startX = cx - totalW / 2;
        const startY = 220;

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 28px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('📜 选择一项计策提升等级', cx, 170);

        state.data.strategyOptionRects = [];
        for (let i = 0; i < data.strategyOptions.length; i++) {
            const sid = data.strategyOptions[i];
            const x = startX + i * (cardW + gap);
            const y = startY;
            const isHover = state.data.hoverStrategyOption === i;

            ctx.fillStyle = isHover ? 'rgba(60,50,30,0.95)' : 'rgba(40,35,25,0.9)';
            ctx.strokeStyle = isHover ? '#ffd700' : '#b8860b';
            ctx.lineWidth = isHover ? 3 : 2;
            roundRect(ctx, x, y, cardW, cardH, 12);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 22px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText(strategyNames[sid] || sid, x + cardW / 2, y + 60);

            const level = runData.strategyLevels[sid] || 0;
            ctx.fillStyle = '#aaa';
            ctx.font = '16px Microsoft YaHei';
            ctx.fillText(`当前等级: ${level}`, x + cardW / 2, y + 110);

            ctx.fillStyle = isHover ? '#ffcc88' : '#666';
            ctx.font = '14px Microsoft YaHei';
            ctx.fillText('点击提升 +1', x + cardW / 2, y + 150);

            state.data.strategyOptionRects.push({ x, y, w: cardW, h: cardH, index: i, strategyId: sid });
        }
    }
}

export function drawBlacksmith(renderer, ctx, state) {
    drawBackground(ctx, renderer.width, renderer.height, renderer.animTime);
    const data = state.data;
    const runData = data.runData;
    const stock = data.stock || getOrCreateBlacksmithStock(runData);
    data.stock = stock;
    const cx = renderer.width / 2;

    drawParchment(ctx, 0, 0, renderer.width, 70, { alpha: 0.5, radius: 0 });
    ctx.strokeStyle = 'rgba(180,150,100,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 70);
    ctx.lineTo(renderer.width, 70);
    ctx.stroke();

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px Microsoft YaHei';
    ctx.textAlign = 'left';
    ctx.fillText('🔨 铁匠铺', 30, 45);

    drawSoulIcon(ctx, renderer.width - 180, 35, 20);
    ctx.fillStyle = '#aaa';
    ctx.font = '20px Microsoft YaHei';
    ctx.textAlign = 'right';
    ctx.fillText(`${runData.gold} 金币`, renderer.width - 30, 45);

    state.data.blacksmithRects = [];

    const colW = 360;
    const colGap = 40;
    const totalW = 3 * colW + 2 * colGap;
    const startX = cx - totalW / 2;
    const startY = 100;

    const columns = [
        { title: '🎁 遗物', items: [] },
        { title: '⚡ 强化倍率格', items: [] },
        { title: '✨ 服务', items: [] }
    ];

    for (let i = 0; i < stock.relics.length; i++) {
        const item = stock.relics[i];
        columns[0].items.push({ type: 'buy_relic', name: item.name, cost: item.price, data: item, index: i });
    }

    // 第二版：铁匠改为随机强化倍率格
    const slotUpgradeCost = 4;
    let totalSlotUpgrades = 0;
    const maxSlots = 3;
    for (let i = 0; i < maxSlots; i++) {
        totalSlotUpgrades += runData.slotUpgrades[i] || 0;
    }
    columns[1].items.push({
        type: 'upgrade_slot',
        name: runData.blacksmithSlotUpgraded ? '倍率格已强化' : '随机强化倍率格',
        cost: slotUpgradeCost,
        disabled: !!runData.blacksmithSlotUpgraded,
        subText: runData.blacksmithSlotUpgraded ? '同一铁匠仅能使用一次' : `当前累计+${totalSlotUpgrades}倍率`
    });

    // 附魔费用按词条稀有度定价：低级 2 / 中级 4 / 高级 8
    const ENCHANT_COST_MAP = { basic: 2, medium: 4, advanced: 8 };
    const refreshCost = runData.blacksmithFriendRefreshAvailable ? 0 : runData.blacksmithRefreshCost;
    const enchantKeywords = stock.enchantKeywords || [];
    for (const keyword of enchantKeywords) {
        const kwData = KEYWORDS[keyword];
        const cost = runData.blacksmithFirstEnchantFree ? 0 : (kwData ? (ENCHANT_COST_MAP[kwData.tier] || 2) : 2);
        columns[2].items.push({
            type: 'enchant',
            keyword,
            name: kwData ? `附魔【${kwData.name}】` : '附魔词条',
            cost: cost,
            subText: runData.blacksmithFirstEnchantFree ? '新人福利：本次附魔免费' : (kwData ? `效果：${kwData.desc}` : '选定卡牌添加词条')
        });
    }
    columns[2].items.push({
        type: 'refresh',
        name: '刷新遗物+词条',
        cost: refreshCost,
        subText: runData.blacksmithFriendRefreshAvailable ? '朋友证：本次免费' : '重新生成遗物和附魔词条'
    });

    for (let c = 0; c < columns.length; c++) {
        const col = columns[c];
        const x = startX + c * (colW + colGap);
        const y = startY;

        ctx.fillStyle = '#aaa';
        ctx.font = 'bold 18px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(col.title, x + colW / 2, y + 30);

        for (let i = 0; i < col.items.length; i++) {
            const item = col.items[i];
            const itemY = y + 60 + i * 55;
            const itemH = 48;
            const isHover = state.data.hoverBlacksmith === `${c}_${i}`;
            const canAfford = !item.disabled && runData.gold >= item.cost;
            const isBought = item.type === 'buy_relic' && item.data && item.data.bought;

            ctx.fillStyle = isHover ? 'rgba(50,45,35,0.95)' : 'rgba(40,35,25,0.9)';
            ctx.strokeStyle = isBought ? '#333' : (isHover ? '#b8860b' : '#554433');
            ctx.lineWidth = isHover ? 2 : 1;
            roundRect(ctx, x, itemY, colW, itemH, 6);
            ctx.fill();
            ctx.stroke();

            if (isBought) {
                ctx.fillStyle = '#555';
                ctx.font = '15px Microsoft YaHei';
                ctx.textAlign = 'center';
                ctx.fillText('已购买', x + colW / 2, itemY + 28);
            } else {
                ctx.fillStyle = canAfford ? '#ccc' : '#555';
                ctx.font = '15px Microsoft YaHei';
                ctx.textAlign = 'left';
                ctx.fillText(item.name, x + 15, itemY + 22);

                const costColor = canAfford ? '#2ecc71' : '#e74c3c';
                ctx.fillStyle = costColor;
                ctx.font = 'bold 14px Microsoft YaHei';
                ctx.textAlign = 'right';
                ctx.fillText(`${item.cost}金币`, x + colW - 15, itemY + 22);

                ctx.fillStyle = '#666';
                ctx.font = '11px Microsoft YaHei';
                ctx.textAlign = 'left';
                ctx.fillText(item.subText || '', x + 15, itemY + 40);
            }

            state.data.blacksmithRects.push({
                x, y: itemY, w: colW, h: itemH,
                key: `${c}_${i}`, item, canAfford: canAfford && !isBought
            });
        }
    }

    drawBackButton(ctx, state, '返回地图', renderer.width, renderer.height);

    // 查看牌组按钮
    const deckBtnRect = drawDeckViewButton(ctx, state, 190, renderer.height - 80, 110, 38);
    if (deckBtnRect) state.data.deckViewBtnRect = deckBtnRect;
}

export function drawEvent(renderer, ctx, state) {
    drawBackground(ctx, renderer.width, renderer.height, renderer.animTime);
    const data = state.data;
    const cx = renderer.width / 2;

    drawGlowText(ctx, '遭遇事件', cx, 80, {
        color: '#ffd700',
        glowColor: '#b8860b',
        glowBlur: 12,
        font: 'bold 32px Microsoft YaHei',
        align: 'center'
    });

    state.data.optionRects = [];
    const options = data.options || [];
    if (options.length === 0) {
        ctx.fillStyle = '#aaa';
        ctx.font = '18px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('无事发生...', cx, 200);
        return;
    }

    const cardW = 320;
    const cardH = 280;
    const gap = 40;
    const totalW = options.length * cardW + (options.length - 1) * gap;
    const startX = cx - totalW / 2;
    const startY = 140;

    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const x = startX + i * (cardW + gap);
        const y = startY;
        const isHover = state.data.hoverOption === i;

        const alpha = isHover ? 0.95 : 0.85;
        ctx.globalAlpha = alpha;
        const grad = ctx.createLinearGradient(x, y, x, y + cardH);
        grad.addColorStop(0, isHover ? '#3a2a4a' : '#2a1a3a');
        grad.addColorStop(1, isHover ? '#1a0a2a' : '#0d0515');
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, cardW, cardH, 14);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = isHover ? '#aa77cc' : '#664488';
        ctx.lineWidth = isHover ? 3 : 2;
        roundRect(ctx, x, y, cardW, cardH, 14);
        ctx.stroke();

        ctx.fillStyle = '#aa77cc';
        ctx.font = '50px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🜂', x + cardW / 2, y + 70);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 20px Microsoft YaHei';
        ctx.fillText(opt.name, x + cardW / 2, y + 110);

        ctx.fillStyle = '#aaa';
        ctx.font = '14px Microsoft YaHei';
        wrapText(ctx, opt.desc, x + cardW / 2, y + 140, cardW - 40, 22);

        ctx.fillStyle = isHover ? '#ffcc88' : '#666';
        ctx.font = '14px Microsoft YaHei';
        ctx.fillText('点击选择', x + cardW / 2, y + cardH - 30);

        state.data.optionRects.push({ x, y, w: cardW, h: cardH, index: i, type: 'event', data: opt });
    }

    // 离开按钮
    const btnW = 200;
    const btnH = 45;
    const btnX = cx - btnW / 2;
    const btnY = startY + cardH + 30;
    const skipHover = state.data.hoverSkip;
    ctx.fillStyle = skipHover ? 'rgba(60,50,50,0.95)' : 'rgba(40,35,35,0.9)';
    ctx.strokeStyle = skipHover ? '#aa6666' : '#554444';
    ctx.lineWidth = skipHover ? 3 : 2;
    roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = skipHover ? '#ffcccc' : '#aaa';
    ctx.font = 'bold 16px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText('离开', cx, btnY + 29);
    state.data.skipRect = { x: btnX, y: btnY, w: btnW, h: btnH };

    // 查看牌组按钮
    const deckBtnRect = drawDeckViewButton(ctx, state, btnX + btnW + 20, btnY, 110, 38);
    if (deckBtnRect) state.data.deckViewBtnRect = deckBtnRect;
}

export function drawTreasure(renderer, ctx, state) {
    drawBackground(ctx, renderer.width, renderer.height, renderer.animTime);
    const data = state.data;
    const cx = renderer.width / 2;
    const cy = renderer.height / 2;

    if (!data.opened) {
        const boxSize = 200;
        const x = cx - boxSize / 2;
        const y = cy - boxSize / 2 - 50;
        const isHover = state.data.hoverTreasureBox;

        ctx.fillStyle = isHover ? 'rgba(80,60,20,0.95)' : 'rgba(60,45,15,0.9)';
        ctx.strokeStyle = isHover ? '#ffd700' : '#b8860b';
        ctx.lineWidth = isHover ? 5 : 3;
        roundRect(ctx, x, y, boxSize, boxSize, 20);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.font = '100px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎁', cx, cy - 10);

        ctx.fillStyle = '#ffcc66';
        ctx.font = 'bold 20px Microsoft YaHei';
        ctx.fillText('点击开启宝箱', cx, cy + 80);

        state.data.treasureBoxRect = { x, y, w: boxSize, h: boxSize };
    } else {
        const relic = data.relic;

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 28px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('你获得了遗物！', cx, cy - 120);

        const cardW = 360;
        const cardH = 220;
        const x = cx - cardW / 2;
        const y = cy - cardH / 2;

        ctx.fillStyle = 'rgba(50,40,20,0.95)';
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 3;
        roundRect(ctx, x, y, cardW, cardH, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(relic.name, cx, y + 60);

        ctx.fillStyle = '#aaa';
        ctx.font = '16px Microsoft YaHei';
        wrapText(ctx, relic.desc, cx, y + 110, cardW - 60, 24);

        const btnW = 160;
        const btnH = 45;
        const btnX = cx - btnW / 2;
        const btnY = y + cardH + 30;
        const isHover = state.data.hoverTreasureAccept;

        ctx.fillStyle = isHover ? 'rgba(60,50,30,0.95)' : 'rgba(50,40,25,0.9)';
        ctx.strokeStyle = isHover ? '#ffd700' : '#b8860b';
        ctx.lineWidth = isHover ? 3 : 2;
        roundRect(ctx, btnX, btnY, btnW, btnH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isHover ? '#ffcc88' : '#ffd700';
        ctx.font = 'bold 18px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('收下', cx, btnY + 30);

        state.data.treasureAcceptRect = { x: btnX, y: btnY, w: btnW, h: btnH };

        // 查看牌组按钮
        const deckBtnRect = drawDeckViewButton(ctx, state, btnX + btnW + 20, btnY, 110, 38);
        if (deckBtnRect) state.data.deckViewBtnRect = deckBtnRect;
    }
}

export function drawActTransition(renderer, ctx, state) {
    const data = state.data;
    const cx = renderer.width / 2;
    const cy = renderer.height / 2;
    const t = renderer.animTime;
    const runData = data.runData;
    const act = runData ? runData.act : 1;
    const actNames = ['', '第一大关', '第二大关', '第三大关'];
    const nextActNames = ['', '第二大关', '第三大关', '通关'];

    const alpha = Math.min(1, t * 0.5);
    ctx.fillStyle = `rgba(10,5,15,${alpha})`;
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    if (alpha < 0.3) return;

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 48px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(`${actNames[act] || '第' + act + '大关'} 完成`, cx, cy - 120);

    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 200, cy - 90);
    ctx.lineTo(cx + 200, cy - 90);
    ctx.stroke();

    ctx.fillStyle = '#ffaa44';
    ctx.font = 'bold 24px Microsoft YaHei';
    ctx.fillText('获得道具：拓展效率牌桌', cx, cy - 40);

    ctx.fillStyle = '#aaa';
    ctx.font = '18px Microsoft YaHei';
    const nextSlotCount = 3 + act;
    ctx.fillText(`倍率牌桌上限增加一格（${2 + act}格 → ${nextSlotCount}格）`, cx, cy - 5);

    const btnW = 260;
    const btnH = 55;
    const btnX = cx - btnW / 2;
    const btnY = cy + 60;
    const isHover = state.data.hoverTransitionBtn;

    ctx.fillStyle = isHover ? 'rgba(80,50,50,0.95)' : 'rgba(60,40,40,0.9)';
    ctx.strokeStyle = isHover ? '#cc8888' : '#aa6666';
    ctx.lineWidth = isHover ? 3 : 2;
    roundRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHover ? '#ffcccc' : '#ffaaaa';
    ctx.font = 'bold 20px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(`进入${nextActNames[act] || '下一关'}`, cx, btnY + 35);

    state.data.transitionBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

    // 查看牌组按钮
    const deckBtnRect = drawDeckViewButton(ctx, state, btnX + btnW + 20, btnY, 110, 38);
    if (deckBtnRect) state.data.deckViewBtnRect = deckBtnRect;
}

export function drawVictory(renderer, ctx, state) {
    const data = state.data;
    const cx = renderer.width / 2;
    const cy = renderer.height / 2;
    const runData = data.runData;

    ctx.fillStyle = 'rgba(10,15,10,0.95)';
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 56px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 恭喜通关！', cx, cy - 120);

    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 200, cy - 90);
    ctx.lineTo(cx + 200, cy - 90);
    ctx.stroke();

    const actNames = ['', '被污染的农田', '幽暗矿洞', '鼠王巢穴'];
    const act = runData ? runData.act : 1;
    ctx.fillStyle = '#aaa';
    ctx.font = '22px Microsoft YaHei';
    ctx.fillText(`你成功清除了${actNames[act] || '地下城'}！`, cx, cy - 40);

    ctx.fillStyle = '#ffcc66';
    ctx.font = '20px Microsoft YaHei';
    ctx.fillText(`累计获得金币: ${runData ? runData.gold : 0}`, cx, cy + 10);
    ctx.fillText(`牌库数量: ${runData ? runData.deck.length : 0} 张`, cx, cy + 45);
    ctx.fillText(`遗物数量: ${runData ? runData.relics.length : 0} 件`, cx, cy + 80);

    const btnW = 220;
    const btnH = 55;
    const btnX = cx - btnW / 2;
    const btnY = cy + 140;
    const isHover = state.data.hoverRestartBtn;

    ctx.fillStyle = isHover ? 'rgba(80,60,20,0.95)' : 'rgba(60,45,15,0.9)';
    ctx.strokeStyle = isHover ? '#ffd700' : '#b8860b';
    ctx.lineWidth = isHover ? 3 : 2;
    roundRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHover ? '#ffcc88' : '#ffd700';
    ctx.font = 'bold 20px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText('返回主菜单', cx, btnY + 35);

    state.data.restartBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

    // 查看牌组按钮
    const deckBtnRect = drawDeckViewButton(ctx, state, btnX + btnW + 20, btnY, 110, 38);
    if (deckBtnRect) state.data.deckViewBtnRect = deckBtnRect;
}

export function drawGameOver(renderer, ctx, state) {
    const data = state.data;
    const cx = renderer.width / 2;
    const cy = renderer.height / 2;

    ctx.fillStyle = 'rgba(30,5,5,0.95)';
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 56px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText('💀 冒险结束', cx, cy - 100);

    ctx.fillStyle = '#aaa';
    ctx.font = '22px Microsoft YaHei';
    ctx.fillText(`到达关卡: ${data.reachedStage || '1-1'}`, cx, cy - 20);
    ctx.fillText(`累计获得金币: ${data.totalGold || 0}`, cx, cy + 20);

    const btnW = 220;
    const btnH = 55;
    const btnX = cx - btnW / 2;
    const btnY = cy + 80;
    const isHover = state.data.hoverRestartBtn;

    ctx.fillStyle = isHover ? 'rgba(80,40,40,0.95)' : 'rgba(60,30,30,0.9)';
    ctx.strokeStyle = isHover ? '#cc6666' : '#aa4444';
    ctx.lineWidth = isHover ? 3 : 2;
    roundRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHover ? '#ffcccc' : '#ffaaaa';
    ctx.font = 'bold 20px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText('重新开始', cx, btnY + 35);

    state.data.restartBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };
}

function getRunDataFromState(state) {
    if (state.runDataRef) return state.runDataRef;
    if (state.data && state.data.runData) return state.data.runData;
    return null;
}

export function drawDeckViewButton(ctx, state, x, y, w, h) {
    const runData = getRunDataFromState(state);
    if (!runData) return null;

    const isHover = state.data && state.data.hoverDeckViewBtn;
    ctx.fillStyle = isHover ? 'rgba(60,50,30,0.95)' : 'rgba(40,35,25,0.9)';
    ctx.strokeStyle = isHover ? '#ffd700' : '#b8860b';
    ctx.lineWidth = isHover ? 2 : 1;
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHover ? '#ffcc88' : '#ffd700';
    ctx.font = 'bold 14px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(`📜 牌组 ${runData.deck.length}`, x + w / 2, y + h / 2 + 5);

    return { x, y, w, h };
}

export function drawDeckViewOverlay(renderer, ctx, state) {
    if (!state.data || !state.data.viewingDeck) return;

    const runData = getRunDataFromState(state);
    if (!runData) return;

    const width = renderer.width;
    const height = renderer.height;
    const cx = width / 2;

    // 半透明背景
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, width, height);

    // 标题
    drawGlowText(ctx, `📜 当前牌组（${runData.deck.length} 张）`, cx, 60, {
        color: '#ffd700',
        glowColor: '#b8860b',
        glowBlur: 12,
        font: 'bold 30px Microsoft YaHei',
        align: 'center'
    });

    // 提示文字
    ctx.fillStyle = '#888';
    ctx.font = '14px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText('悬停查看详情 | 滚轮滚动 | V键/ESC/点击按钮关闭', cx, 90);

    const cards = runData.deck || [];
    const cardW = 160;
    const cardH = 240;
    const gap = 24;
    const perRow = Math.min(cards.length, 6);
    const totalW = perRow * cardW + (perRow - 1) * gap;
    let startX = cx - totalW / 2;
    let startY = 120;
    const scrollY = state.data.deckViewScrollY || 0;

    const rows = Math.ceil(cards.length / perRow);
    const contentBottom = startY + rows * (cardH + 30);
    const visibleBottom = height - 100;
    state.data.deckViewMaxScroll = Math.max(0, contentBottom - visibleBottom);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 110, width, visibleBottom - 110);
    ctx.clip();

    state.data.deckViewCardRects = [];

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = startX + col * (cardW + gap);
        const y = startY + row * (cardH + 30) - scrollY;
        const isHover = state.data.deckViewHoverCard === i;

        if (y + cardH < 110 || y > visibleBottom) {
            const originalY = startY + row * (cardH + 30);
            state.data.deckViewCardRects.push({ x, y: originalY, w: cardW, h: cardH, index: i, card });
            continue;
        }

        ctx.globalAlpha = isHover ? 0.95 : 0.85;
        const grad = ctx.createLinearGradient(x, y, x, y + cardH);
        grad.addColorStop(0, card.color);
        grad.addColorStop(1, darkenColor(card.color, -40));
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, cardW, cardH, 10);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = isHover ? '#fff' : card.accentColor;
        ctx.lineWidth = isHover ? 3 : 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(card.name, x + cardW / 2, y + 26);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 22px Microsoft YaHei';
        ctx.fillText(getCardBaseValue(card), x + cardW / 2, y + 58);

        let tagY = y + 82;
        for (const kw of card.keywords) {
            const kwData = KEYWORDS[kw];
            if (!kwData) continue;
            const tagW = ctx.measureText(kwData.name).width + 10;
            const tagX = x + (cardW - tagW) / 2;
            ctx.fillStyle = kwData.color + '33';
            ctx.strokeStyle = kwData.color;
            ctx.lineWidth = 1;
            ctx.fillRect(tagX, tagY, tagW, 16);
            ctx.strokeRect(tagX, tagY, tagW, 16);
            ctx.fillStyle = kwData.color;
            ctx.font = '10px Microsoft YaHei';
            ctx.fillText(kwData.name, x + cardW / 2, tagY + 12);
            tagY += 20;
        }

        ctx.fillStyle = '#ccc';
        ctx.font = '11px Microsoft YaHei';
        wrapText(ctx, card.description, x + cardW / 2, tagY + 10, cardW - 16, 18);

        const originalY = startY + row * (cardH + 30);
        state.data.deckViewCardRects.push({ x, y: originalY, w: cardW, h: cardH, index: i, card });
    }

    ctx.restore();

    // 滚动条
    const maxScroll = state.data.deckViewMaxScroll;
    if (maxScroll > 0) {
        const scrollBarH = Math.max(40, (visibleBottom - 110) * (visibleBottom - 110) / (contentBottom - 110));
        const scrollBarY = 110 + ((visibleBottom - 110) - scrollBarH) * (scrollY / maxScroll);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(width - 12, scrollBarY, 6, scrollBarH);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(width - 12, scrollBarY, 6, scrollBarH);
    }

    // 关闭按钮
    const closeW = 160;
    const closeH = 45;
    const closeX = cx - closeW / 2;
    const closeY = height - 70;
    const closeHover = state.data.deckViewHoverClose;
    ctx.fillStyle = closeHover ? 'rgba(80,50,50,0.95)' : 'rgba(60,40,40,0.9)';
    ctx.strokeStyle = closeHover ? '#cc8888' : '#aa6666';
    ctx.lineWidth = closeHover ? 3 : 2;
    roundRect(ctx, closeX, closeY, closeW, closeH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = closeHover ? '#ffcccc' : '#ffaaaa';
    ctx.font = 'bold 16px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText('关闭 (V)', cx, closeY + 29);
    state.data.deckViewCloseRect = { x: closeX, y: closeY, w: closeW, h: closeH };
}

export function drawMessages(ctx, state, width, height) {
    if (state.message && (state.messageTimer > 0 || state.messageTimer === -1)) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, height / 2 - 40, width, 80);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(state.message, width / 2, height / 2 + 8);
    }
}
