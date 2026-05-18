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

        switch (state.screen) {
            case 'title': this.drawTitle(ctx, state); break;
            case 'class_select': this.drawClassSelect(ctx, state); break;
            case 'map': this.drawMap(ctx, state); break;
            case 'battle': this.drawBattle(ctx, state); break;
            case 'post_battle': this.drawPostBattle(ctx, state); break;
            case 'card_pick': this.drawCardPick(ctx, state); break;
            case 'shop': this.drawShop(ctx, state); break;
            case 'blacksmith': this.drawBlacksmith(ctx, state); break;
            case 'event': this.drawEvent(ctx, state); break;
            case 'treasure': this.drawTreasure(ctx, state); break;
            case 'act_transition': this.drawActTransition(ctx, state); break;
            case 'game_over': this.drawGameOver(ctx, state); break;
        }

        // 全局消息绘制（所有界面共用）
        this.drawMessages(ctx, state);
    },

    // ========== 标题界面 ==========
    drawTitle(ctx, state) {
        this.drawBackground(ctx);

        const t = this.animTime;
        const cx = this.width / 2;
        const cy = this.height / 2;

        // 标题光效
        const glow = ctx.createRadialGradient(cx, cy - 80, 0, cx, cy - 80, 300);
        glow.addColorStop(0, 'rgba(255,200,50,0.15)');
        glow.addColorStop(1, 'rgba(255,200,50,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, this.width, this.height);

        // 主标题
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 64px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(255,215,0,0.4)';
        ctx.shadowBlur = 20;
        ctx.fillText('⚔️ 卡牌地下城', cx, cy - 60);
        ctx.shadowBlur = 0;

        // 副标题
        ctx.fillStyle = '#aaa';
        ctx.font = '24px Microsoft YaHei';
        ctx.fillText('v0.2 地图循环', cx, cy - 10);

        // 开始按钮
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

        // 按钮微光
        if (hover) {
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(btnX, btnY, btnW, btnH / 2);
        }

        // 存储按钮位置供输入检测
        state.data.startBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };
    },

    // ========== 职业选择 ==========
    drawClassSelect(ctx, state) {
        this.drawBackground(ctx);

        const cx = this.width / 2;
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

        const classes = ['soldier', 'mage', 'villager'];
        const classIcons = { soldier: '⚔️', mage: '🔮', villager: '🌾' };
        state.data.classCardRects = [];

        for (let i = 0; i < classes.length; i++) {
            const clsId = classes[i];
            const cls = CLASS_DEFS[clsId];
            const x = startX + i * (cardW + gap);
            const y = startY;
            const isAvailable = clsId === 'soldier';
            const isHover = state.data.hoverClass === clsId;

            // 卡片背景
            const alpha = isAvailable ? (isHover ? 0.95 : 0.85) : 0.4;
            ctx.globalAlpha = alpha;
            const grad = ctx.createLinearGradient(x, y, x, y + cardH);
            grad.addColorStop(0, isAvailable ? '#2a2a4a' : '#1a1a2a');
            grad.addColorStop(1, isAvailable ? '#1a1a2a' : '#0d0d15');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, cardW, cardH);
            ctx.globalAlpha = 1;

            // 边框
            ctx.strokeStyle = isAvailable ? (isHover ? '#ffaa66' : '#666') : '#333';
            ctx.lineWidth = isHover ? 3 : 2;
            ctx.strokeRect(x, y, cardW, cardH);

            // 内部装饰线
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 10, y + 10, cardW - 20, cardH - 20);

            // 职业图标
            ctx.fillStyle = isAvailable ? '#fff' : '#555';
            ctx.font = '80px serif';
            ctx.textAlign = 'center';
            ctx.fillText(classIcons[clsId], x + cardW / 2, y + 120);

            // 职业名
            ctx.fillStyle = isAvailable ? '#ffd700' : '#555';
            ctx.font = 'bold 28px Microsoft YaHei';
            ctx.fillText(cls.name, x + cardW / 2, y + 180);

            // 生命
            ctx.fillStyle = isAvailable ? '#e74c3c' : '#444';
            ctx.font = '20px Microsoft YaHei';
            ctx.fillText(`❤️ ${cls.hearts}`, x + cardW / 2, y + 230);

            // 遗物
            ctx.fillStyle = isAvailable ? '#b8860b' : '#444';
            ctx.font = '16px Microsoft YaHei';
            ctx.fillText(`遗物: ${cls.relic.name}`, x + cardW / 2, y + 270);

            // 描述
            ctx.fillStyle = isAvailable ? '#aaa' : '#444';
            ctx.font = '14px Microsoft YaHei';
            const desc = isAvailable ? cls.relic.description : '（暂未开放）';
            this.wrapText(ctx, desc, x + cardW / 2, y + 310, cardW - 40, 22);

            // 未开放遮罩
            if (!isAvailable) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(x, y, cardW, cardH);
                ctx.fillStyle = '#666';
                ctx.font = 'bold 20px Microsoft YaHei';
                ctx.fillText('🔒 暂未开放', x + cardW / 2, y + cardH / 2);
            }

            state.data.classCardRects.push({ x, y, w: cardW, h: cardH, id: clsId, available: isAvailable });
        }
    },

    // ========== 地图界面 ==========
    drawMap(ctx, state) {
        this.drawBackground(ctx);
        const runData = state.data.runData;
        if (!runData) return;

        const cx = this.width / 2;
        const t = this.animTime;

        // 顶部栏
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, this.width, 70);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 70);
        ctx.lineTo(this.width, 70);
        ctx.stroke();

        // 大关标题
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 22px Microsoft YaHei';
        ctx.textAlign = 'left';
        ctx.fillText(`第一大关：被污染的农田`, 30, 45);

        // 魂数量
        ctx.fillStyle = '#aaa';
        ctx.font = '20px Microsoft YaHei';
        ctx.textAlign = 'right';
        ctx.fillText(`💀 ${runData.souls} 魂`, this.width - 30, 45);

        // 节点区域
        const nodeW = 90;
        const nodeH = 120;
        const gap = 50;
        const totalW = 8 * nodeW + 7 * gap;
        const startX = cx - totalW / 2;
        const nodeY = 200;

        // 连接线
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
        const stageKeys = ['1-1','1-2','1-3','1-4','1-5','1-6','1-7','1-8'];
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

            // 浮动动画（当前节点）
            const floatY = isCurrent ? Math.sin(t * 2 + i) * 4 : 0;

            // 节点背景
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
            this.roundRect(ctx, x, y + floatY, nodeW, nodeH, 10);
            ctx.fill();
            ctx.stroke();

            // 节点内容
            ctx.textAlign = 'center';
            if (isLocked) {
                ctx.fillStyle = '#333';
                ctx.font = '32px serif';
                ctx.fillText('?', x + nodeW / 2, y + floatY + nodeH / 2 + 10);
            } else {
                // 类型图标
                ctx.font = '28px serif';
                ctx.fillStyle = isCompleted ? '#66aa66' : '#fff';
                ctx.fillText(typeIcons[config.type], x + nodeW / 2, y + floatY + 40);

                // 关卡编号
                ctx.fillStyle = isCompleted ? '#66aa66' : '#ffd700';
                ctx.font = 'bold 16px Microsoft YaHei';
                ctx.fillText(key, x + nodeW / 2, y + floatY + 68);

                // 类型标签
                ctx.fillStyle = isCompleted ? '#558855' : '#aaa';
                ctx.font = '12px Microsoft YaHei';
                ctx.fillText(typeLabels[config.type], x + nodeW / 2, y + floatY + 88);

                // 已完成标记
                if (isCompleted) {
                    ctx.fillStyle = '#2ecc71';
                    ctx.font = 'bold 18px Microsoft YaHei';
                    ctx.fillText('✓', x + nodeW / 2, y + floatY + 112);
                }
            }

            state.data.nodeRects.push({ x, y: y + floatY, w: nodeW, h: nodeH, index: i, key, current: isCurrent, locked: isLocked });
        }

        // 底部信息栏
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, this.height - 100, this.width, 100);
        ctx.strokeStyle = '#444';
        ctx.beginPath();
        ctx.moveTo(0, this.height - 100);
        ctx.lineTo(this.width, this.height - 100);
        ctx.stroke();

        const cls = CLASS_DEFS[runData.classId];
        ctx.fillStyle = '#aaa';
        ctx.font = '16px Microsoft YaHei';
        ctx.textAlign = 'left';
        ctx.fillText(`职业: ${cls.name} | 牌库: ${runData.deck.length} 张 | 遗物: ${runData.relics.length} 个 | 倍率格: ${runData.unlockedSlots}/${runData.slotCount} 格`, 30, this.height - 60);

        // 当前关卡提示
        if (runData.stageIndex < 8) {
            const curKey = getCurrentStageKey(runData);
            const curConfig = STAGE_CONFIG[curKey];
            ctx.fillStyle = '#ffaa66';
            ctx.font = '18px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText(`点击节点进入 ${curKey} - ${typeLabels[curConfig.type]}战斗`, cx, this.height - 30);
        }
    },

    // ========== 战后选择面板 ==========
    drawPostBattle(ctx, state) {
        this.drawBackground(ctx);
        const data = state.data;
        const cx = this.width / 2;
        const cy = this.height / 2;

        // 半透明遮罩
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, this.width, this.height);

        // 标题
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 32px Microsoft YaHei';
        ctx.textAlign = 'center';

        let title = '战后休整';
        if (data.type === 'treasure') title = '遗物宝箱';
        else if (data.type === 'shop_choice') title = '选择你的前路';
        ctx.fillText(title, cx, 100);

        // 魂收益提示
        if (data.soulsGained !== undefined) {
            ctx.fillStyle = '#aaa';
            ctx.font = '18px Microsoft YaHei';
            ctx.fillText(`获得 ${data.soulsGained} 魂 | 累计: ${data.runData.souls} 魂`, cx, 140);
        }

        state.data.optionRects = [];

        if (data.type === 'two_events' || data.type === 'three_events') {
            this.drawEventOptions(ctx, state, data.postBattleData.options);
        } else if (data.type === 'treasure') {
            this.drawTreasureOption(ctx, state, data.postBattleData.relic);
        } else if (data.type === 'shop_choice') {
            this.drawShopChoiceOptions(ctx, state, data.postBattleData.options);
        }
    },

    drawEventOptions(ctx, state, options) {
        const cx = this.width / 2;
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

            // 卡片背景
            ctx.fillStyle = isHover ? 'rgba(50,40,60,0.95)' : 'rgba(40,30,50,0.9)';
            ctx.strokeStyle = isHover ? '#aa77cc' : '#664488';
            ctx.lineWidth = isHover ? 3 : 2;
            this.roundRect(ctx, x, y, cardW, cardH, 12);
            ctx.fill();
            ctx.stroke();

            // 事件图标
            ctx.fillStyle = '#aa77cc';
            ctx.font = '60px serif';
            ctx.textAlign = 'center';
            ctx.fillText('🜂', x + cardW / 2, y + 90);

            // 事件名
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 22px Microsoft YaHei';
            ctx.fillText(opt.name, x + cardW / 2, y + 140);

            // 描述
            ctx.fillStyle = '#aaa';
            ctx.font = '15px Microsoft YaHei';
            this.wrapText(ctx, opt.desc, x + cardW / 2, y + 180, cardW - 40, 24);

            // 选择提示
            ctx.fillStyle = isHover ? '#ffcc88' : '#666';
            ctx.font = '14px Microsoft YaHei';
            ctx.fillText('点击选择', x + cardW / 2, y + cardH - 30);

            state.data.optionRects.push({ x, y, w: cardW, h: cardH, index: i, type: 'event', data: opt });
        }
    },

    drawTreasureOption(ctx, state, relic) {
        const cx = this.width / 2;
        const x = cx - 150;
        const y = 220;
        const w = 300;
        const h = 300;
        const isHover = state.data.hoverTreasure;

        // 宝箱图标
        ctx.fillStyle = isHover ? 'rgba(80,60,20,0.95)' : 'rgba(60,45,15,0.9)';
        ctx.strokeStyle = isHover ? '#ffd700' : '#b8860b';
        ctx.lineWidth = isHover ? 4 : 3;
        this.roundRect(ctx, x, y, w, h, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.font = '80px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎁', cx, y + 120);

        ctx.fillStyle = '#ffcc66';
        ctx.font = 'bold 20px Microsoft YaHei';
        ctx.fillText('点击开启宝箱', cx, y + 170);

        state.data.treasureRect = { x, y, w, h, relic };
    },

    drawShopChoiceOptions(ctx, state, options) {
        const cx = this.width / 2;
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

            ctx.fillStyle = isHover ? 'rgba(40,50,60,0.95)' : 'rgba(30,40,50,0.9)';
            ctx.strokeStyle = isHover ? '#66aadd' : '#445577';
            ctx.lineWidth = isHover ? 3 : 2;
            this.roundRect(ctx, x, y, cardW, cardH, 12);
            ctx.fill();
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
            this.wrapText(ctx, opt.desc, x + cardW / 2, y + 190, cardW - 40, 24);

            ctx.fillStyle = isHover ? '#ffcc88' : '#666';
            ctx.font = '14px Microsoft YaHei';
            ctx.fillText('点击进入', x + cardW / 2, y + cardH - 30);

            state.data.optionRects.push({ x, y, w: cardW, h: cardH, index: i, type: opt.type, data: opt });
        }
    },

    // ========== 选牌界面 ==========
    drawCardPick(ctx, state) {
        this.drawBackground(ctx);
        const data = state.data;
        const cx = this.width / 2;

        // 标题
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 32px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('选择一张卡牌加入牌组', cx, 100);

        ctx.fillStyle = '#aaa';
        ctx.font = '18px Microsoft YaHei';
        ctx.fillText('普通怪战利品', cx, 140);

        state.data.optionRects = [];
        const options = data.options || [];
        const cardW = 180;
        const cardH = 260;
        const gap = 40;
        const totalW = options.length * cardW + (options.length - 1) * gap;
        const startX = cx - totalW / 2;
        const startY = 200;

        for (let i = 0; i < options.length; i++) {
            const defId = options[i];
            const def = CARD_DEFS[defId];
            const x = startX + i * (cardW + gap);
            const y = startY;
            const isHover = state.data.hoverOption === i;

            // 卡片背景
            ctx.globalAlpha = isHover ? 0.95 : 0.85;
            const grad = ctx.createLinearGradient(x, y, x, y + cardH);
            grad.addColorStop(0, def.color);
            grad.addColorStop(1, darkenColor(def.color, -40));
            ctx.fillStyle = grad;
            this.roundRect(ctx, x, y, cardW, cardH, 10);
            ctx.fill();
            ctx.globalAlpha = 1;

            ctx.strokeStyle = isHover ? '#fff' : def.accentColor;
            ctx.lineWidth = isHover ? 3 : 2;
            ctx.stroke();

            // 名称
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText(def.name, x + cardW / 2, y + 30);

            // 点数
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 24px Microsoft YaHei';
            ctx.fillText(def.baseValue, x + cardW / 2, y + 70);

            // 关键词
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

            // 描述
            ctx.fillStyle = '#ccc';
            ctx.font = '12px Microsoft YaHei';
            this.wrapText(ctx, def.description, x + cardW / 2, tagY + 10, cardW - 20, 18);

            // 选择提示
            ctx.fillStyle = isHover ? '#ffcc88' : '#666';
            ctx.font = '14px Microsoft YaHei';
            ctx.fillText('点击选择', x + cardW / 2, y + cardH - 20);

            state.data.optionRects.push({ x, y, w: cardW, h: cardH, index: i, defId });
        }
    },

    // ========== 商店占位 ==========
    drawShop(ctx, state) {
        this.drawBackground(ctx);
        const data = state.data;
        const runData = data.runData;
        const stock = data.stock;
        const cx = this.width / 2;

        // 顶部栏
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, this.width, 70);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px Microsoft YaHei';
        ctx.textAlign = 'left';
        ctx.fillText('🏪 牌店', 30, 45);
        ctx.fillStyle = '#aaa';
        ctx.font = '20px Microsoft YaHei';
        ctx.textAlign = 'right';
        ctx.fillText(`💀 ${runData.souls} 魂`, this.width - 30, 45);

        state.data.shopItemRects = [];

        // 卡牌商品
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
            const price = item.discount ? Math.max(1, item.price - 1) : item.price;

            // 卡片背景
            ctx.globalAlpha = isBought ? 0.4 : (isHover ? 0.95 : 0.85);
            const grad = ctx.createLinearGradient(x, y, x, y + cardH);
            grad.addColorStop(0, def.color);
            grad.addColorStop(1, darkenColor(def.color, -40));
            ctx.fillStyle = grad;
            this.roundRect(ctx, x, y, cardW, cardH, 10);
            ctx.fill();
            ctx.globalAlpha = 1;

            ctx.strokeStyle = isBought ? '#333' : (isHover ? '#fff' : def.accentColor);
            ctx.lineWidth = isHover ? 3 : 2;
            ctx.stroke();

            if (!isBought) {
                // 名称
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 16px Microsoft YaHei';
                ctx.textAlign = 'center';
                ctx.fillText(def.name, x + cardW / 2, y + 30);

                // 点数
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 24px Microsoft YaHei';
                ctx.fillText(def.baseValue, x + cardW / 2, y + 70);

                // 关键词
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

                // 价格
                const priceColor = runData.souls >= price ? '#2ecc71' : '#e74c3c';
                ctx.fillStyle = priceColor;
                ctx.font = 'bold 18px Microsoft YaHei';
                ctx.fillText(`💀 ${price}`, x + cardW / 2, y + cardH - 40);

                if (item.discount) {
                    ctx.fillStyle = '#ff6b6b';
                    ctx.font = 'bold 12px Microsoft YaHei';
                    ctx.fillText('🔥 折扣', x + cardW / 2, y + cardH - 20);
                }
            } else {
                ctx.fillStyle = '#555';
                ctx.font = 'bold 16px Microsoft YaHei';
                ctx.textAlign = 'center';
                ctx.fillText('已购买', x + cardW / 2, y + cardH / 2);
            }

            state.data.shopItemRects.push({ x, y, w: cardW, h: cardH, key: `card_${i}`, item, price, type: 'card' });
        }

        // 遗物商品
        ctx.fillStyle = '#aaa';
        ctx.font = 'bold 18px Microsoft YaHei';
        ctx.textAlign = 'left';
        ctx.fillText('遗物', 60, 430);

        const relicW = 180;
        const relicH = 120;
        for (let i = 0; i < stock.relics.length; i++) {
            const item = stock.relics[i];
            const x = cardStartX + i * (relicW + cardGap);
            const y = 450;
            const isHover = state.data.hoverShopItem === `relic_${i}`;
            const isBought = item.bought;
            const price = item.discount ? Math.max(1, item.price - 1) : item.price;

            ctx.fillStyle = isBought ? 'rgba(30,30,40,0.4)' : (isHover ? 'rgba(60,50,30,0.95)' : 'rgba(50,40,25,0.9)');
            ctx.strokeStyle = isBought ? '#333' : (isHover ? '#ffd700' : '#b8860b');
            ctx.lineWidth = isHover ? 3 : 2;
            this.roundRect(ctx, x, y, relicW, relicH, 10);
            ctx.fill();
            ctx.stroke();

            if (!isBought) {
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 16px Microsoft YaHei';
                ctx.textAlign = 'center';
                ctx.fillText(item.name, x + relicW / 2, y + 35);

                ctx.fillStyle = '#888';
                ctx.font = '12px Microsoft YaHei';
                this.wrapText(ctx, item.desc, x + relicW / 2, y + 55, relicW - 20, 18);

                const priceColor = runData.souls >= price ? '#2ecc71' : '#e74c3c';
                ctx.fillStyle = priceColor;
                ctx.font = 'bold 14px Microsoft YaHei';
                ctx.fillText(`💀 ${price}`, x + relicW / 2, y + relicH - 15);
            } else {
                ctx.fillStyle = '#555';
                ctx.font = 'bold 14px Microsoft YaHei';
                ctx.textAlign = 'center';
                ctx.fillText('已购买', x + relicW / 2, y + relicH / 2 + 5);
            }

            state.data.shopItemRects.push({ x, y, w: relicW, h: relicH, key: `relic_${i}`, item, price, type: 'relic' });
        }

        // 服务按钮
        const btnY = 600;
        const btnH = 45;
        const services = [
            { key: 'remove_card', text: '🗑️ 删牌服务 (1魂)', x: 60 },
            { key: 'refresh', text: '🔄 刷新商店 (1魂)', x: 280 },
        ];
        state.data.shopServiceRects = [];
        for (const svc of services) {
            const btnW = 180;
            const isHover = state.data.hoverShopService === svc.key;
            ctx.fillStyle = isHover ? 'rgba(50,50,70,0.95)' : 'rgba(40,40,60,0.9)';
            ctx.strokeStyle = isHover ? '#888' : '#555';
            ctx.lineWidth = isHover ? 3 : 2;
            this.roundRect(ctx, svc.x, btnY, btnW, btnH, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = runData.souls >= 1 ? '#ccc' : '#555';
            ctx.font = '14px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText(svc.text, svc.x + btnW / 2, btnY + 28);

            state.data.shopServiceRects.push({ x: svc.x, y: btnY, w: btnW, h: btnH, key: svc.key });
        }

        // 返回按钮
        this.drawBackButton(ctx, state, '返回地图');
    },

    // ========== 铁匠占位 ==========
    drawBlacksmith(ctx, state) {
        this.drawBackground(ctx);
        const data = state.data;
        const runData = data.runData;
        const cx = this.width / 2;

        // 顶部栏
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, this.width, 70);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px Microsoft YaHei';
        ctx.textAlign = 'left';
        ctx.fillText('🔨 铁匠铺', 30, 45);
        ctx.fillStyle = '#aaa';
        ctx.font = '20px Microsoft YaHei';
        ctx.textAlign = 'right';
        ctx.fillText(`💀 ${runData.souls} 魂`, this.width - 30, 45);

        state.data.blacksmithRects = [];

        // 三栏布局
        const colW = 360;
        const colGap = 40;
        const totalW = 3 * colW + 2 * colGap;
        const startX = cx - totalW / 2;
        const startY = 100;

        const columns = [
            { title: '🗡️ 强化卡牌', items: [] },
            { title: '⚡ 强化倍率格', items: [] },
            { title: '🔄 刷新词条', items: [] }
        ];

        // 填充数据
        for (const card of runData.deck) {
            columns[0].items.push({ type: 'upgrade_card', name: card.name, cost: 1, data: card });
        }
        const availableIndices = getAvailableSlotIndices(runData.slotCount, runData.unlockedSlots);
        for (let idx = 0; idx < availableIndices.length; idx++) {
            const i = availableIndices[idx];
            const cost = runData.blacksmithSlotCosts[idx] || 2 + idx;
            columns[1].items.push({ type: 'upgrade_slot', name: `第${i + 1}格`, cost: cost, slotIndex: i, costIndex: idx });
        }
        columns[2].items.push({ type: 'refresh_keywords', name: '刷新词条', cost: 5 });
        columns[2].items.push({ type: 'refresh_option', name: '刷新选项', cost: 1 });

        for (let c = 0; c < columns.length; c++) {
            const col = columns[c];
            const x = startX + c * (colW + colGap);
            const y = startY;

            // 栏标题
            ctx.fillStyle = '#aaa';
            ctx.font = 'bold 18px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText(col.title, x + colW / 2, y + 30);

            // 项目列表
            for (let i = 0; i < col.items.length; i++) {
                const item = col.items[i];
                const itemY = y + 60 + i * 55;
                const itemH = 48;
                const isHover = state.data.hoverBlacksmith === `${c}_${i}`;
                const canAfford = runData.souls >= item.cost;

                ctx.fillStyle = isHover ? 'rgba(50,45,35,0.95)' : 'rgba(40,35,25,0.9)';
                ctx.strokeStyle = isHover ? '#b8860b' : '#554433';
                ctx.lineWidth = isHover ? 2 : 1;
                this.roundRect(ctx, x, itemY, colW, itemH, 6);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = canAfford ? '#ccc' : '#555';
                ctx.font = '15px Microsoft YaHei';
                ctx.textAlign = 'left';
                ctx.fillText(item.name, x + 15, itemY + 22);

                const costColor = canAfford ? '#2ecc71' : '#e74c3c';
                ctx.fillStyle = costColor;
                ctx.font = 'bold 14px Microsoft YaHei';
                ctx.textAlign = 'right';
                ctx.fillText(`${item.cost}魂`, x + colW - 15, itemY + 22);

                ctx.fillStyle = '#666';
                ctx.font = '11px Microsoft YaHei';
                ctx.textAlign = 'left';
                let subText = '';
                if (item.type === 'upgrade_card') subText = '+2点数';
                else if (item.type === 'upgrade_slot') subText = '+1倍率';
                else if (item.type === 'refresh_keywords') subText = '重新随机词条';
                else if (item.type === 'refresh_option') subText = '刷新一次选项';
                ctx.fillText(subText, x + 15, itemY + 40);

                state.data.blacksmithRects.push({
                    x, y: itemY, w: colW, h: itemH,
                    key: `${c}_${i}`, item, canAfford
                });
            }
        }

        this.drawBackButton(ctx, state, '返回地图');
    },

    // ========== 事件占位 ==========
    drawEvent(ctx, state) {
        this.drawBackground(ctx);
        const data = state.data;
        const cx = this.width / 2;
        const cy = this.height / 2;

        // 事件卡片
        const cardW = 600;
        const cardH = 400;
        const x = cx - cardW / 2;
        const y = cy - cardH / 2 - 30;

        ctx.fillStyle = 'rgba(40,30,50,0.95)';
        ctx.strokeStyle = '#664488';
        ctx.lineWidth = 3;
        this.roundRect(ctx, x, y, cardW, cardH, 16);
        ctx.fill();
        ctx.stroke();

        // 事件名
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 32px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(data.eventName, cx, y + 60);

        // 描述
        ctx.fillStyle = '#aaa';
        ctx.font = '18px Microsoft YaHei';
        this.wrapText(ctx, data.eventDesc, cx, y + 120, cardW - 80, 30);

        // 选项按钮
        const btnW = 220;
        const btnH = 50;
        const btnGap = 30;
        const options = ['接受', '离开'];
        const totalBtnW = options.length * btnW + (options.length - 1) * btnGap;
        const btnStartX = cx - totalBtnW / 2;
        const btnY = y + cardH - 90;

        state.data.eventOptionRects = [];
        for (let i = 0; i < options.length; i++) {
            const bx = btnStartX + i * (btnW + btnGap);
            const isHover = state.data.hoverEventOption === i;

            ctx.fillStyle = isHover ? 'rgba(60,50,80,0.95)' : 'rgba(50,40,70,0.9)';
            ctx.strokeStyle = isHover ? '#aa77cc' : '#664488';
            ctx.lineWidth = isHover ? 3 : 2;
            this.roundRect(ctx, bx, btnY, btnW, btnH, 10);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isHover ? '#ffcc88' : '#ccc';
            ctx.font = 'bold 18px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText(options[i], bx + btnW / 2, btnY + 33);

            state.data.eventOptionRects.push({ x: bx, y: btnY, w: btnW, h: btnH, index: i, text: options[i] });
        }
    },

    // ========== 宝箱占位 ==========
    drawTreasure(ctx, state) {
        this.drawBackground(ctx);
        const data = state.data;
        const cx = this.width / 2;
        const cy = this.height / 2;

        if (!data.opened) {
            // 未开启的宝箱
            const boxSize = 200;
            const x = cx - boxSize / 2;
            const y = cy - boxSize / 2 - 50;
            const isHover = state.data.hoverTreasureBox;

            ctx.fillStyle = isHover ? 'rgba(80,60,20,0.95)' : 'rgba(60,45,15,0.9)';
            ctx.strokeStyle = isHover ? '#ffd700' : '#b8860b';
            ctx.lineWidth = isHover ? 5 : 3;
            this.roundRect(ctx, x, y, boxSize, boxSize, 20);
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
            // 已开启，展示遗物
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
            this.roundRect(ctx, x, y, cardW, cardH, 16);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 24px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText(relic.name, cx, y + 60);

            ctx.fillStyle = '#aaa';
            ctx.font = '16px Microsoft YaHei';
            this.wrapText(ctx, relic.desc, cx, y + 110, cardW - 60, 24);

            // 收下按钮
            const btnW = 160;
            const btnH = 45;
            const btnX = cx - btnW / 2;
            const btnY = y + cardH + 30;
            const isHover = state.data.hoverTreasureAccept;

            ctx.fillStyle = isHover ? 'rgba(60,50,30,0.95)' : 'rgba(50,40,25,0.9)';
            ctx.strokeStyle = isHover ? '#ffd700' : '#b8860b';
            ctx.lineWidth = isHover ? 3 : 2;
            this.roundRect(ctx, btnX, btnY, btnW, btnH, 10);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isHover ? '#ffcc88' : '#ffd700';
            ctx.font = 'bold 18px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText('收下', cx, btnY + 30);

            state.data.treasureAcceptRect = { x: btnX, y: btnY, w: btnW, h: btnH };
        }
    },

    // ========== 大关过渡 ==========
    drawActTransition(ctx, state) {
        const data = state.data;
        const cx = this.width / 2;
        const cy = this.height / 2;
        const t = this.animTime;

        // 黑色背景渐变
        const alpha = Math.min(1, t * 0.5);
        ctx.fillStyle = `rgba(10,5,15,${alpha})`;
        ctx.fillRect(0, 0, this.width, this.height);

        if (alpha < 0.3) return;

        // 标题
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 48px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('第一大关 完成', cx, cy - 120);

        // 分隔线
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 200, cy - 90);
        ctx.lineTo(cx + 200, cy - 90);
        ctx.stroke();

        // 获得道具展示
        ctx.fillStyle = '#ffaa44';
        ctx.font = 'bold 24px Microsoft YaHei';
        ctx.fillText('获得道具：拓展效率牌桌', cx, cy - 40);

        ctx.fillStyle = '#aaa';
        ctx.font = '18px Microsoft YaHei';
        ctx.fillText('倍率牌桌上限增加一格（3格 → 4格）', cx, cy - 5);

        // 按钮
        const btnW = 260;
        const btnH = 55;
        const btnX = cx - btnW / 2;
        const btnY = cy + 60;
        const isHover = state.data.hoverTransitionBtn;

        ctx.fillStyle = isHover ? 'rgba(80,50,50,0.95)' : 'rgba(60,40,40,0.9)';
        ctx.strokeStyle = isHover ? '#cc8888' : '#aa6666';
        ctx.lineWidth = isHover ? 3 : 2;
        this.roundRect(ctx, btnX, btnY, btnW, btnH, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isHover ? '#ffcccc' : '#ffaaaa';
        ctx.font = 'bold 20px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('进入第二大关', cx, btnY + 35);

        state.data.transitionBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };
    },

    // ========== 失败画面 ==========
    drawGameOver(ctx, state) {
        const data = state.data;
        const cx = this.width / 2;
        const cy = this.height / 2;

        ctx.fillStyle = 'rgba(30,5,5,0.95)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 56px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('💀 冒险结束', cx, cy - 100);

        ctx.fillStyle = '#aaa';
        ctx.font = '22px Microsoft YaHei';
        ctx.fillText(`到达关卡: ${data.reachedStage || '1-1'}`, cx, cy - 20);
        ctx.fillText(`累计获得魂: ${data.totalSouls || 0}`, cx, cy + 20);

        // 重新开始按钮
        const btnW = 220;
        const btnH = 55;
        const btnX = cx - btnW / 2;
        const btnY = cy + 80;
        const isHover = state.data.hoverRestartBtn;

        ctx.fillStyle = isHover ? 'rgba(80,40,40,0.95)' : 'rgba(60,30,30,0.9)';
        ctx.strokeStyle = isHover ? '#cc6666' : '#aa4444';
        ctx.lineWidth = isHover ? 3 : 2;
        this.roundRect(ctx, btnX, btnY, btnW, btnH, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isHover ? '#ffcccc' : '#ffaaaa';
        ctx.font = 'bold 20px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('重新开始', cx, btnY + 35);

        state.data.restartBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };
    },

    // ========== 战斗界面（保留现有逻辑） ==========
    drawBattle(ctx, state) {
        this.drawBackground(ctx);
        this.drawMonsterArea(ctx, state);
        this.drawPlayerArea(ctx, state);
        this.drawBoardArea(ctx, state);
        this.drawHandArea(ctx, state);
        this.drawUI(ctx, state);
        this.drawDragCard(ctx, state);
        this.drawSlotFlashes(ctx, state);
        this.drawMonsterFlash(ctx, state);
        this.drawPreview(ctx, state);
    },

    // ========== 通用绘制辅助 ==========
    drawBackground(ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#1a1520');
        grad.addColorStop(0.5, '#0d0b12');
        grad.addColorStop(1, '#1a1520');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

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

    drawBackButton(ctx, state, text) {
        const btnW = 140;
        const btnH = 45;
        const btnX = 30;
        const btnY = this.height - 80;
        const isHover = state.data.hoverBack;

        ctx.fillStyle = isHover ? 'rgba(60,50,50,0.95)' : 'rgba(40,35,35,0.9)';
        ctx.strokeStyle = isHover ? '#aa6666' : '#554444';
        ctx.lineWidth = isHover ? 3 : 2;
        this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isHover ? '#ffcccc' : '#aaa';
        ctx.font = 'bold 16px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('← ' + (text || '返回'), btnX + btnW / 2, btnY + 29);

        state.data.backBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };
    },

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split('');
        let line = '';
        let currentY = y;
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line !== '') {
                ctx.fillText(line, x, currentY);
                line = words[i];
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    },

    // ========== 怪物区域（含变色） ==========
    drawMonsterArea(ctx, state) {
        const mx = this.width * 0.5;
        const my = 120;
        const monster = state.monster;
        const colors = MONSTER_COLOR_THEMES[monster.theme] || MONSTER_COLOR_THEMES.normal;

        ctx.fillStyle = colors.shadow;
        ctx.beginPath();
        ctx.ellipse(mx, my + 75, 70, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        this.drawMonster(ctx, monster, mx, my, colors);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(monster.name, mx, my - 70);

        ctx.fillStyle = '#aaa';
        ctx.font = '13px Microsoft YaHei';
        ctx.fillText(monster.description, mx, my - 50);

        // 类型标签
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
    },

    drawMonster(ctx, monster, x, y, colors) {
        const t = this.animTime;

        // 身体
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.ellipse(x, y + 20, 55, 45, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = colors.bodyHighlight;
        ctx.beginPath();
        ctx.ellipse(x - 10, y + 10, 30, 25, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // 头部
        ctx.fillStyle = colors.head;
        ctx.beginPath();
        ctx.ellipse(x, y - 15, 35, 30, 0, 0, Math.PI * 2);
        ctx.fill();

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

        // 眼睛
        const eyeOffset = Math.sin(t * 2) * 1;
        ctx.fillStyle = colors.eyes;
        ctx.beginPath();
        ctx.ellipse(x - 12, y - 18 + eyeOffset, 8, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 12, y - 18 + eyeOffset, 8, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // 瞳孔
        ctx.fillStyle = colors.pupil;
        ctx.beginPath();
        ctx.arc(x - 10, y - 18 + eyeOffset, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 14, y - 18 + eyeOffset, 4, 0, Math.PI * 2);
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
    },

    // ========== 玩家区域 ==========
    drawPlayerArea(ctx, state) {
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
            this.drawHeart(ctx, heartX + i * 38, heartY, filled);
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

    // ========== 牌桌区域 ==========
    drawBoardArea(ctx, state) {
        const startX = this.width * 0.5 - (state.slots.length * 220 + (state.slots.length - 1) * 20) / 2;
        const startY = 280;
        const slotW = 220;
        const slotH = 160;
        const gap = 20;

        for (let i = 0; i < state.slots.length; i++) {
            const slot = state.slots[i];
            const x = startX + i * (slotW + gap);
            const y = startY;

            // 不可用格子（未解锁）
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
                this.drawMiniCard(ctx, card, cx, cy, cw, ch, slot.multiplier, state);
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
    },

    drawMiniCard(ctx, card, x, y, w, h, multiplier, state) {
        ctx.fillStyle = card.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;

        ctx.strokeStyle = card.accentColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        const boardCards = state.slots.flatMap(s => s.cards);
        const cardSlotMap = buildCardSlotMap(state);
        const finalVal = getCardFinalValue(card, boardCards, cardSlotMap, state);
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
    },

    // ========== 手牌区域 ==========
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

        this.drawCardIcon(ctx, card.iconType, x + w / 2, artY + artH / 2, 50);

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
    },

    drawCardIcon(ctx, type, cx, cy, size) {
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
        }
        ctx.restore();
    },

    // ========== 战斗UI ==========
    drawUI(ctx, state) {
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

        if (state.phase === 'playing') {
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
            const r = this.getSlotRect(flash.slotIndex, state.slots.length);
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

    // ========== 位置工具方法 ==========
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

    getSlotRect(index, slotCount) {
        const slotW = 220;
        const slotH = 160;
        const gap = 20;
        const totalW = slotCount * slotW + (slotCount - 1) * gap;
        const startX = this.width * 0.5 - totalW / 2;
        const startY = 280;
        return {
            x: startX + index * (slotW + gap),
            y: startY,
            w: slotW,
            h: slotH
        };
    },

    getSlotIndexAt(px, py, slotCount) {
        for (let i = 0; i < slotCount; i++) {
            const r = this.getSlotRect(i, slotCount);
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
