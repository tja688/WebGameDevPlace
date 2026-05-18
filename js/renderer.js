/**
 * 卡牌地下城 - Canvas 渲染器
 */

const Renderer = {
    canvas: null,
    ctx: null,
    width: 1280,
    height: 720,
    animTime: 0,

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        const container = document.getElementById('game-container');
        const w = container.clientWidth;
        const h = container.clientHeight;
        const scale = Math.min(w / this.width, h / this.height);
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = `${this.width * scale}px`;
        this.canvas.style.height = `${this.height * scale}px`;
        this.scale = scale;
    },

    render(state) {
        this.animTime += 0.016;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        this.drawBackground(ctx);
        this.drawMonsterArea(ctx, state);
        this.drawPlayerArea(ctx, state);
        this.drawBoardArea(ctx, state);
        this.drawHandArea(ctx, state);
        this.drawUI(ctx, state);
        this.drawDragCard(ctx, state);
        this.drawSlotFlashes(ctx, state);
        this.drawMonsterFlash(ctx, state);
        this.drawMessages(ctx, state);
        this.drawPreview(ctx, state);
    },

    drawBackground(ctx) {
        // 石砖背景
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#1a1520');
        grad.addColorStop(0.5, '#0d0b12');
        grad.addColorStop(1, '#1a1520');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 石砖纹理
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        const brickW = 80;
        const brickH = 40;
        for (let y = 0; y < this.height; y += brickH) {
            const offset = (y / brickH) % 2 === 0 ? 0 : brickW / 2;
            for (let x = -brickW; x < this.width + brickW; x += brickW) {
                ctx.strokeRect(x + offset, y, brickW, brickH);
            }
        }

        // 顶部火把光效
        const torchGlow = ctx.createRadialGradient(this.width * 0.3, 80, 0, this.width * 0.3, 80, 200);
        torchGlow.addColorStop(0, 'rgba(255,160,50,0.08)');
        torchGlow.addColorStop(1, 'rgba(255,160,50,0)');
        ctx.fillStyle = torchGlow;
        ctx.fillRect(0, 0, this.width, this.height);

        const torchGlow2 = ctx.createRadialGradient(this.width * 0.7, 80, 0, this.width * 0.7, 80, 200);
        torchGlow2.addColorStop(0, 'rgba(255,160,50,0.06)');
        torchGlow2.addColorStop(1, 'rgba(255,160,50,0)');
        ctx.fillStyle = torchGlow2;
        ctx.fillRect(0, 0, this.width, this.height);
    },

    drawMonsterArea(ctx, state) {
        const mx = this.width * 0.5;
        const my = 120;

        // 怪物阴影
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(mx, my + 75, 70, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // 绘制怪物
        this.drawMonster(ctx, state.monster, mx, my);

        // 怪物名称
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(state.monster.name, mx, my - 70);

        // 怪物描述
        ctx.fillStyle = '#aaa';
        ctx.font = '13px Microsoft YaHei';
        ctx.fillText(state.monster.description, mx, my - 50);

        // 血条背景
        const barW = 240;
        const barH = 24;
        const barX = mx - barW / 2;
        const barY = my + 95;
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        // 血条
        const hpRatio = Math.max(0, state.monster.hp / state.monster.maxHp);
        const hpGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
        hpGrad.addColorStop(0, '#e74c3c');
        hpGrad.addColorStop(1, '#c0392b');
        ctx.fillStyle = hpGrad;
        ctx.fillRect(barX + 2, barY + 2, (barW - 4) * hpRatio, barH - 4);

        // 血量文字
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.max(0, state.monster.hp)} / ${state.monster.maxHp}`, mx, barY + 17);

        // 怪物词条
        if (state.monster.keywords.length > 0) {
            const tagY = barY + 42;
            ctx.fillStyle = '#8B0000';
            ctx.strokeStyle = '#cc4444';
            ctx.lineWidth = 1;
            const tagW = 280;
            const tagH = 36;
            ctx.fillRect(mx - tagW / 2, tagY - tagH / 2, tagW, tagH);
            ctx.strokeRect(mx - tagW / 2, tagY - tagH / 2, tagW, tagH);
            ctx.fillStyle = '#ffaaaa';
            ctx.font = '13px Microsoft YaHei';
            ctx.fillText(state.monster.keywordDesc, mx, tagY + 5);
        }
    },

    drawMonster(ctx, monster, x, y) {
        const t = this.animTime;

        // 老鼠身体
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.ellipse(x, y + 20, 55, 45, 0, 0, Math.PI * 2);
        ctx.fill();

        // 身体高光
        ctx.fillStyle = '#777';
        ctx.beginPath();
        ctx.ellipse(x - 10, y + 10, 30, 25, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // 头部
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.ellipse(x, y - 15, 35, 30, 0, 0, Math.PI * 2);
        ctx.fill();

        // 耳朵
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.ellipse(x - 22, y - 38, 14, 18, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 22, y - 38, 14, 18, 0.4, 0, Math.PI * 2);
        ctx.fill();

        // 耳朵内部
        ctx.fillStyle = '#aa6688';
        ctx.beginPath();
        ctx.ellipse(x - 22, y - 38, 8, 10, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 22, y - 38, 8, 10, 0.4, 0, Math.PI * 2);
        ctx.fill();

        // 眼睛
        const eyeOffset = Math.sin(t * 2) * 1;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x - 12, y - 18 + eyeOffset, 8, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 12, y - 18 + eyeOffset, 8, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // 瞳孔（红眼）
        ctx.fillStyle = monster.eyeColor;
        ctx.beginPath();
        ctx.arc(x - 10, y - 18 + eyeOffset, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 14, y - 18 + eyeOffset, 4, 0, Math.PI * 2);
        ctx.fill();

        // 鼻子
        ctx.fillStyle = '#ff9999';
        ctx.beginPath();
        ctx.arc(x, y - 5, 5, 0, Math.PI * 2);
        ctx.fill();

        // 胡须
        ctx.strokeStyle = '#888';
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
        ctx.fillStyle = '#ffffcc';
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
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x + 50, y + 30);
        ctx.quadraticCurveTo(x + 80, y + 10 + Math.sin(t * 3) * 10, x + 90, y + 40);
        ctx.stroke();

        // 爪子
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.ellipse(x - 30, y + 55, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 30, y + 55, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    },

    drawPlayerArea(ctx, state) {
        const x = 80;
        const y = 80;

        // 遗物框
        ctx.fillStyle = 'rgba(40,30,20,0.8)';
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 3;
        ctx.fillRect(x - 50, y - 40, 100, 100);
        ctx.strokeRect(x - 50, y - 40, 100, 100);

        // 遗物图标
        ctx.fillStyle = '#b8860b';
        ctx.font = '40px serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚔️', x, y + 10);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px Microsoft YaHei';
        ctx.fillText(state.player.relic.name, x, y + 35);

        // 心
        const heartX = x - 50;
        const heartY = y + 80;
        for (let i = 0; i < state.player.maxHearts; i++) {
            const filled = i < state.player.hearts;
            this.drawHeart(ctx, heartX + i * 38, heartY, filled);
        }

        // 回合信息
        ctx.fillStyle = '#aaa';
        ctx.font = '16px Microsoft YaHei';
        ctx.textAlign = 'left';
        ctx.fillText(`第 ${state.turn} 回合`, x - 50, heartY + 45);

        // 总伤害
        ctx.fillStyle = '#ff8888';
        ctx.font = 'bold 16px Microsoft YaHei';
        ctx.fillText(`累计伤害: ${state.totalDamage + state.turnDamage}`, x - 50, heartY + 68);

        // 本回合伤害
        ctx.fillStyle = '#ffaa66';
        ctx.fillText(`本回合: ${state.turnDamage}`, x - 50, heartY + 90);

        // 牌库信息
        ctx.fillStyle = '#888';
        ctx.font = '13px Microsoft YaHei';
        ctx.fillText(`牌库: ${state.deck.length} | 弃牌: ${state.discard.length}`, x - 50, heartY + 112);
    },

    drawHeart(ctx, x, y, filled) {
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
    },

    drawBoardArea(ctx, state) {
        const startX = this.width * 0.5 - 360;
        const startY = 280;
        const slotW = 220;
        const slotH = 160;
        const gap = 20;

        for (let i = 0; i < state.slots.length; i++) {
            const slot = state.slots[i];
            const x = startX + i * (slotW + gap);
            const y = startY;

            // 格子的倍率标签
            const mulLabel = `${slot.multiplier}X`;
            ctx.fillStyle = 'rgba(30,30,50,0.9)';
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.fillRect(x, y - 40, slotW, 36);
            ctx.strokeRect(x, y - 40, slotW, 36);

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 18px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText(`倍率 ${mulLabel}`, x + slotW / 2, y - 16);

            // 格子背景
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

            // 格子内部装饰
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 8, y + 8, slotW - 16, slotH - 16);

            // 绘制格子中的卡牌
            for (let c = 0; c < slot.cards.length; c++) {
                const card = slot.cards[c];
                const cx = x + 10;
                const cy = y + 10 + c * 38;
                const cw = slotW - 20;
                const ch = 34;
                this.drawMiniCard(ctx, card, cx, cy, cw, ch, slot.multiplier, state);
            }

            // 格子锁定标记
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
    },

    drawMiniCard(ctx, card, x, y, w, h, multiplier, state) {
        // 背景
        ctx.fillStyle = card.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;

        // 边框
        ctx.strokeStyle = card.accentColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        // 计算最终数值
        const boardCards = state.slots.flatMap(s => s.cards);
        const cardSlotMap = buildCardSlotMap(state);
        const finalVal = getCardFinalValue(card, boardCards, cardSlotMap);
        const output = finalVal * multiplier;

        // 名称
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Microsoft YaHei';
        ctx.textAlign = 'left';
        ctx.fillText(card.name, x + 6, y + 16);

        // 数值
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 14px Microsoft YaHei';
        ctx.textAlign = 'right';
        ctx.fillText(`${finalVal}→${output}`, x + w - 6, y + 16);

        // 关键词标签
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
    },

    drawHandArea(ctx, state) {
        const hand = state.hand;
        if (hand.length === 0) return;

        const cardW = 140;
        const cardH = 200;
        const totalW = hand.length * cardW + (hand.length - 1) * 16;
        const startX = (this.width - totalW) / 2;
        const startY = 480;

        for (let i = 0; i < hand.length; i++) {
            const card = hand[i];
            const x = startX + i * (cardW + 16);
            const y = startY;

            const isSelected = state.selectedCard && state.selectedCard.uuid === card.uuid;
            const isDragged = state.draggedCard && state.draggedCard.uuid === card.uuid;
            if (isDragged) continue;

            const hoverOffset = isSelected ? -20 : 0;
            this.drawCard(ctx, card, x, y + hoverOffset, cardW, cardH, state);
        }
    },

    drawCard(ctx, card, x, y, w, h, state, options = {}) {
        const { ghost = false, highlight = false } = options;

        ctx.save();
        if (ghost) ctx.globalAlpha = 0.5;

        // 阴影
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        // 卡背/背景
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, card.color);
        grad.addColorStop(1, darkenColor(card.color, -30));
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);

        ctx.shadowColor = 'transparent';

        // 边框
        ctx.strokeStyle = highlight ? '#fff' : card.accentColor;
        ctx.lineWidth = highlight ? 3 : 2;
        ctx.strokeRect(x, y, w, h);

        // 内部装饰边框
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);

        // 卡图区域
        const artY = y + 10;
        const artH = 70;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + 10, artY, w - 20, artH);

        // 绘制卡图图标
        this.drawCardIcon(ctx, card.iconType, x + w / 2, artY + artH / 2, 50);

        // 卡牌名称
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(card.name, x + w / 2, y + 105);

        // 基础数值
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 28px Microsoft YaHei';
        ctx.fillText(getCardBaseValue(card), x + w / 2, y + 140);

        // 关键词
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

        // 尺寸标记
        ctx.fillStyle = '#aaa';
        ctx.font = '11px Microsoft YaHei';
        ctx.textAlign = 'right';
        ctx.fillText(`${card.size}格`, x + w - 10, y + h - 10);

        ctx.restore();
    },

    drawCardIcon(ctx, type, cx, cy, size) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;

        switch (type) {
            case 'sword':
                // 剑
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
                // 剑刃
                ctx.beginPath();
                ctx.moveTo(-size / 5, -size / 3);
                ctx.lineTo(0, -size / 2);
                ctx.lineTo(size / 5, -size / 3);
                ctx.fill();
                ctx.stroke();
                break;
            case 'shadow':
                // 虚影/双剑
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
                // 齿轮
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
        }
        ctx.restore();
    },

    drawUI(ctx, state) {
        // 结束回合按钮
        const btnX = this.width - 160;
        const btnY = this.height - 90;
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

        // 提示文字
        if (state.phase === 'playing') {
            const totalDmg = calculateTotalBoardDamage(state);
            if (totalDmg >= state.monster.hp) {
                ctx.fillStyle = '#2ecc71';
                ctx.font = 'bold 16px Microsoft YaHei';
                ctx.fillText('✓ 已达成目标！点击结束回合', this.width / 2, this.height - 30);
            } else {
                const need = state.monster.hp - totalDmg;
                ctx.fillStyle = '#e74c3c';
                ctx.font = '14px Microsoft YaHei';
                ctx.fillText(`还需 ${need} 伤害`, this.width / 2, this.height - 30);
            }
        }
    },

    drawMonsterFlash(ctx, state) {
        if (state.monsterFlash > 0) {
            const mx = this.width * 0.5;
            const my = 120;
            const alpha = state.monsterFlash / 15 * 0.5;
            ctx.fillStyle = `rgba(255,0,0,${alpha})`;
            ctx.beginPath();
            ctx.ellipse(mx, my + 10, 80, 70, 0, 0, Math.PI * 2);
            ctx.fill();
            state.monsterFlash--;
        }
    },

    drawDragCard(ctx, state) {
        if (!state.draggedCard) return;
        const card = state.draggedCard;
        this.drawCard(ctx, card, state.dragX - 70, state.dragY - 100, 140, 200, state, { highlight: true });
    },

    drawMessages(ctx, state) {
        if (state.message && (state.messageTimer > 0 || state.messageTimer === -1)) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, this.height / 2 - 40, this.width, 80);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 24px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText(state.message, this.width / 2, this.height / 2 + 8);
        }
    },

    drawSlotFlashes(ctx, state) {
        for (let i = state.slotFlashes.length - 1; i >= 0; i--) {
            const flash = state.slotFlashes[i];
            const r = this.getSlotRect(flash.slotIndex);
            const alpha = flash.timer / 20 * 0.4;
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.fillRect(r.x, r.y, r.w, r.h);
            flash.timer--;
            if (flash.timer <= 0) {
                state.slotFlashes.splice(i, 1);
            }
        }
    },

    drawPreview(ctx, state) {
        if (!state.draggedCard || state.hoveredSlot === null) return;
        const preview = getPlacementPreview(state.draggedCard, state.hoveredSlot, state);
        if (!preview) return;

        const mx = this.width / 2;
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
    },

    // 获取UI元素的位置信息，供输入处理使用
    getEndTurnButtonRect() {
        return { x: this.width - 160, y: this.height - 90, w: 140, h: 50 };
    },

    getHandCardRect(index, total) {
        const cardW = 140;
        const cardH = 200;
        const totalW = total * cardW + (total - 1) * 16;
        const startX = (this.width - totalW) / 2;
        const startY = 480;
        return {
            x: startX + index * (cardW + 16),
            y: startY,
            w: cardW,
            h: cardH
        };
    },

    getSlotRect(index) {
        const startX = this.width * 0.5 - 360;
        const startY = 280;
        const slotW = 220;
        const slotH = 160;
        const gap = 20;
        return {
            x: startX + index * (slotW + gap),
            y: startY,
            w: slotW,
            h: slotH
        };
    },

    getSlotIndexAt(px, py) {
        for (let i = 0; i < SLOT_COUNT; i++) {
            const r = this.getSlotRect(i);
            if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
                return i;
            }
        }
        return null;
    },

    getHandCardIndexAt(px, py, handLength) {
        for (let i = 0; i < handLength; i++) {
            const r = this.getHandCardRect(i, handLength);
            if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
                return i;
            }
        }
        return null;
    }
};

function darkenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `rgb(${r},${g},${b})`;
}
