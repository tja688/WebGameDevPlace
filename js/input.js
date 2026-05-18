/**
 * 卡牌地下城 - 输入处理
 */

const Input = {
    state: null,
    renderer: null,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,

    init(gameState, renderer) {
        this.state = gameState;
        this.renderer = renderer;
        this.canvas = renderer.canvas;
        this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', e => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', e => this.onMouseUp(e));
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        this.canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            const t = e.touches[0];
            this.onMouseDown({ clientX: t.clientX, clientY: t.clientY });
        }, { passive: false });
        this.canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const t = e.touches[0];
            this.onMouseMove({ clientX: t.clientX, clientY: t.clientY });
        }, { passive: false });
        this.canvas.addEventListener('touchend', e => {
            e.preventDefault();
            this.onMouseUp(e);
        }, { passive: false });
    },

    getCanvasPos(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.renderer.width / rect.width;
        const scaleY = this.renderer.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    },

    onMouseDown(e) {
        const pos = this.getCanvasPos(e.clientX, e.clientY);
        const state = this.state;

        switch (state.screen) {
            case 'title':
                this.handleTitleClick(pos);
                break;
            case 'class_select':
                this.handleClassSelectClick(pos);
                break;
            case 'map':
                this.handleMapClick(pos);
                break;
            case 'battle':
                this.handleBattleMouseDown(pos);
                break;
            case 'post_battle':
                this.handlePostBattleClick(pos);
                break;
            case 'card_pick':
                this.handleCardPickClick(pos);
                break;
            case 'shop':
                this.handleShopClick(pos);
                break;
            case 'blacksmith':
                this.handleBlacksmithClick(pos);
                break;
            case 'event':
                this.handleEventClick(pos);
                break;
            case 'treasure':
                this.handleTreasureClick(pos);
                break;
            case 'act_transition':
                this.handleActTransitionClick(pos);
                break;
            case 'game_over':
                this.handleGameOverClick(pos);
                break;
        }
    },

    onMouseMove(e) {
        const pos = this.getCanvasPos(e.clientX, e.clientY);
        const state = this.state;

        // 清除所有 hover 状态
        this.clearAllHovers(state);

        switch (state.screen) {
            case 'title':
                this.handleTitleHover(pos, state);
                break;
            case 'class_select':
                this.handleClassSelectHover(pos, state);
                break;
            case 'map':
                this.handleMapHover(pos, state);
                break;
            case 'battle':
                this.handleBattleMouseMove(pos);
                break;
            case 'post_battle':
                this.handlePostBattleHover(pos, state);
                break;
            case 'card_pick':
                this.handleCardPickHover(pos, state);
                break;
            case 'shop':
                this.handleShopHover(pos, state);
                break;
            case 'blacksmith':
                this.handleBlacksmithHover(pos, state);
                break;
            case 'event':
                this.handleEventHover(pos, state);
                break;
            case 'treasure':
                this.handleTreasureHover(pos, state);
                break;
            case 'act_transition':
                this.handleActTransitionHover(pos, state);
                break;
            case 'game_over':
                this.handleGameOverHover(pos, state);
                break;
        }
    },

    onMouseUp(e) {
        if (!this.isDragging || !this.state.draggedCard) {
            this.isDragging = false;
            return;
        }

        const pos = this.getCanvasPos(e.clientX || 0, e.clientY || 0);
        const slotIdx = this.renderer.getSlotIndexAt(pos.x, pos.y, this.state.slots.length);

        if (slotIdx !== null && this.state.draggedCard) {
            const success = playCardToSlot(this.state.draggedCard, slotIdx, this.state);
            if (success) {
                this.state.turnDamage = calculateTotalBoardDamage(this.state);
                if (this.state.turnDamage >= this.state.monster.hp) {
                    this.state.message = '伤害已达标！结束回合击败怪物';
                    this.state.messageTimer = 120;
                }
            } else {
                this.state.message = '无法放置到此格子';
                this.state.messageTimer = 60;
            }
        }

        this.state.draggedCard = null;
        this.state.hoveredSlot = null;
        this.isDragging = false;

        this.checkBattleEnd();
    },

    clearAllHovers(state) {
        if (!state.data) state.data = {};
        state.data.hoverStart = false;
        state.data.hoverClass = null;
        state.data.hoverNode = null;
        state.data.hoverOption = null;
        state.data.hoverTreasure = false;
        state.data.hoverShopItem = null;
        state.data.hoverShopService = null;
        state.data.hoverBlacksmith = null;
        state.data.hoverEventOption = null;
        state.data.hoverTreasureBox = false;
        state.data.hoverTreasureAccept = false;
        state.data.hoverTransitionBtn = false;
        state.data.hoverRestartBtn = false;
        state.data.hoverBack = false;
    },

    hitTest(pos, rect) {
        return pos.x >= rect.x && pos.x <= rect.x + rect.w &&
               pos.y >= rect.y && pos.y <= rect.y + rect.h;
    },

    // ========== 标题界面 ==========
    handleTitleHover(pos, state) {
        if (state.data.startBtnRect && this.hitTest(pos, state.data.startBtnRect)) {
            state.data.hoverStart = true;
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'default';
        }
    },

    handleTitleClick(pos) {
        if (this.state.data.startBtnRect && this.hitTest(pos, this.state.data.startBtnRect)) {
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            switchScreen(this.state, 'class_select', {});
        }
    },

    // ========== 职业选择 ==========
    handleClassSelectHover(pos, state) {
        if (!state.data.classCardRects) return;
        for (const rect of state.data.classCardRects) {
            if (this.hitTest(pos, rect) && rect.available) {
                state.data.hoverClass = rect.id;
                this.canvas.style.cursor = 'pointer';
                return;
            }
        }
        this.canvas.style.cursor = 'default';
    },

    handleClassSelectClick(pos) {
        if (!this.state.data.classCardRects) return;
        for (const rect of this.state.data.classCardRects) {
            if (this.hitTest(pos, rect) && rect.available) {
                if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                const runData = createRunData(rect.id);
                switchScreen(this.state, 'map', { runData });
                return;
            }
        }
    },

    // ========== 地图界面 ==========
    handleMapHover(pos, state) {
        if (!state.data.nodeRects) return;
        for (const rect of state.data.nodeRects) {
            if (this.hitTest(pos, rect) && rect.current && !rect.locked) {
                state.data.hoverNode = rect.index;
                this.canvas.style.cursor = 'pointer';
                return;
            }
        }
        this.canvas.style.cursor = 'default';
    },

    handleMapClick(pos) {
        if (!this.state.data.nodeRects) return;
        for (const rect of this.state.data.nodeRects) {
            if (this.hitTest(pos, rect) && rect.current && !rect.locked) {
                if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                const runData = this.state.data.runData;
                // 进入战斗
                const battleState = initBattleFromRun(runData);
                // 将战斗状态合并到主 state
                Object.assign(this.state, battleState);
                this.state.screen = 'battle';
                this.state.data = {};
                return;
            }
        }
    },

    // ========== 选牌界面 ==========
    handleCardPickHover(pos, state) {
        if (state.data.optionRects) {
            for (const rect of state.data.optionRects) {
                if (this.hitTest(pos, rect)) {
                    state.data.hoverOption = rect.index;
                    this.canvas.style.cursor = 'pointer';
                    return;
                }
            }
        }
        this.canvas.style.cursor = 'default';
    },

    handleCardPickClick(pos) {
        const data = this.state.data;
        const runData = data.runData;

        if (data.optionRects) {
            for (const rect of data.optionRects) {
                if (this.hitTest(pos, rect)) {
                    if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    // 将选中的牌加入牌组
                    const newCard = createCardInstance(rect.defId);
                    runData.deck.push(newCard);
                    showPlaceholderToast(`获得卡牌：${newCard.name}`);

                    // 继续战后流程
                    setTimeout(() => {
                        const result = resolveBattleEnd(this.state);
                        if (result.postBattleType === 'act_clear') {
                            switchScreen(this.state, 'act_transition', {
                                runData,
                                reward: result.postBattleData.reward,
                                desc: result.postBattleData.desc
                            });
                        } else {
                            switchScreen(this.state, 'post_battle', {
                                runData,
                                type: result.postBattleType,
                                soulsGained: result.soulsGained,
                                postBattleData: result.postBattleData
                            });
                        }
                    }, 300);
                    return;
                }
            }
        }
    },

    // ========== 战后选择 ==========
    handlePostBattleHover(pos, state) {
        if (state.data.optionRects) {
            for (const rect of state.data.optionRects) {
                if (this.hitTest(pos, rect)) {
                    state.data.hoverOption = rect.index;
                    this.canvas.style.cursor = 'pointer';
                    return;
                }
            }
        }
        if (state.data.treasureRect && this.hitTest(pos, state.data.treasureRect)) {
            state.data.hoverTreasure = true;
            this.canvas.style.cursor = 'pointer';
            return;
        }
        this.canvas.style.cursor = 'default';
    },

    handlePostBattleClick(pos) {
        const data = this.state.data;
        const runData = data.runData;

        // 处理事件选项
        if (data.optionRects) {
            for (const rect of data.optionRects) {
                if (this.hitTest(pos, rect)) {
                    if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();

                    if (rect.type === 'event') {
                        // 进入事件占位
                        switchScreen(this.state, 'event', {
                            runData,
                            eventName: rect.data.name,
                            eventDesc: rect.data.desc
                        });
                        return;
                    } else if (rect.type === 'shop') {
                        const stock = getOrCreateShopStock(runData);
                        switchScreen(this.state, 'shop', { runData, stock });
                        return;
                    } else if (rect.type === 'blacksmith') {
                        switchScreen(this.state, 'blacksmith', { runData });
                        return;
                    }
                }
            }
        }

        // 处理宝箱
        if (data.treasureRect && this.hitTest(pos, data.treasureRect)) {
            if (typeof GameAudio !== 'undefined') GameAudio.playWin();
            // 直接获得遗物，进入地图
            runData.relics.push(data.postBattleData.relic);
            runData.stageIndex++;
            switchScreen(this.state, 'map', { runData });
        }
    },

    // ========== 商店 ==========
    handleShopHover(pos, state) {
        if (state.data.shopItemRects) {
            for (const rect of state.data.shopItemRects) {
                if (this.hitTest(pos, rect) && !rect.item.bought) {
                    state.data.hoverShopItem = rect.key;
                    this.canvas.style.cursor = 'pointer';
                    return;
                }
            }
        }
        if (state.data.shopServiceRects) {
            for (const rect of state.data.shopServiceRects) {
                if (this.hitTest(pos, rect)) {
                    state.data.hoverShopService = rect.key;
                    this.canvas.style.cursor = 'pointer';
                    return;
                }
            }
        }
        if (state.data.backBtnRect && this.hitTest(pos, state.data.backBtnRect)) {
            state.data.hoverBack = true;
            this.canvas.style.cursor = 'pointer';
            return;
        }
        this.canvas.style.cursor = 'default';
    },

    handleShopClick(pos) {
        const data = this.state.data;
        const runData = data.runData;

        // 商品购买
        if (data.shopItemRects) {
            for (const rect of data.shopItemRects) {
                if (this.hitTest(pos, rect) && !rect.item.bought) {
                    if (runData.souls >= rect.price) {
                        runData.souls -= rect.price;
                        rect.item.bought = true;
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                        showPlaceholderToast('购买成功！');
                    } else {
                        showPlaceholderToast('魂不足！');
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
                    }
                    return;
                }
            }
        }

        // 服务
        if (data.shopServiceRects) {
            for (const rect of data.shopServiceRects) {
                if (this.hitTest(pos, rect)) {
                    if (runData.souls >= 1) {
                        runData.souls -= 1;
                        if (rect.key === 'refresh') {
                            refreshShopStock(runData);
                            data.stock = runData.shopStock;
                        }
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                        showPlaceholderToast(rect.key === 'remove_card' ? '删牌服务' : '商店已刷新');
                    } else {
                        showPlaceholderToast('魂不足！');
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
                    }
                    return;
                }
            }
        }

        // 返回
        if (data.backBtnRect && this.hitTest(pos, data.backBtnRect)) {
            runData.stageIndex++;
            runData.shopStock = null;
            switchScreen(this.state, 'map', { runData });
        }
    },

    // ========== 铁匠 ==========
    handleBlacksmithHover(pos, state) {
        if (state.data.blacksmithRects) {
            for (const rect of state.data.blacksmithRects) {
                if (this.hitTest(pos, rect)) {
                    state.data.hoverBlacksmith = rect.key;
                    this.canvas.style.cursor = 'pointer';
                    return;
                }
            }
        }
        if (state.data.backBtnRect && this.hitTest(pos, state.data.backBtnRect)) {
            state.data.hoverBack = true;
            this.canvas.style.cursor = 'pointer';
            return;
        }
        this.canvas.style.cursor = 'default';
    },

    handleBlacksmithClick(pos) {
        const data = this.state.data;
        const runData = data.runData;

        if (data.blacksmithRects) {
            for (const rect of data.blacksmithRects) {
                if (this.hitTest(pos, rect)) {
                    if (rect.canAfford) {
                        runData.souls -= rect.item.cost;
                        if (rect.item.type === 'upgrade_slot') {
                            const costIdx = rect.item.costIndex !== undefined ? rect.item.costIndex : rect.item.slotIndex;
                            runData.blacksmithSlotCosts[costIdx] = (runData.blacksmithSlotCosts[costIdx] || 2) + 1;
                        }
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                        showPlaceholderToast('强化成功！（效果占位）');
                    } else {
                        showPlaceholderToast('魂不足！');
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
                    }
                    return;
                }
            }
        }

        if (data.backBtnRect && this.hitTest(pos, data.backBtnRect)) {
            runData.stageIndex++;
            switchScreen(this.state, 'map', { runData });
        }
    },

    // ========== 事件 ==========
    handleEventHover(pos, state) {
        if (state.data.eventOptionRects) {
            for (const rect of state.data.eventOptionRects) {
                if (this.hitTest(pos, rect)) {
                    state.data.hoverEventOption = rect.index;
                    this.canvas.style.cursor = 'pointer';
                    return;
                }
            }
        }
        this.canvas.style.cursor = 'default';
    },

    handleEventClick(pos) {
        const data = this.state.data;
        const runData = data.runData;

        if (data.eventOptionRects) {
            for (const rect of data.eventOptionRects) {
                if (this.hitTest(pos, rect)) {
                    if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    showPlaceholderToast('事件效果');
                    // 延迟后返回地图
                    setTimeout(() => {
                        runData.stageIndex++;
                        switchScreen(this.state, 'map', { runData });
                    }, 1200);
                    return;
                }
            }
        }
    },

    // ========== 宝箱 ==========
    handleTreasureHover(pos, state) {
        if (!state.data.opened && state.data.treasureBoxRect) {
            if (this.hitTest(pos, state.data.treasureBoxRect)) {
                state.data.hoverTreasureBox = true;
                this.canvas.style.cursor = 'pointer';
                return;
            }
        }
        if (state.data.opened && state.data.treasureAcceptRect) {
            if (this.hitTest(pos, state.data.treasureAcceptRect)) {
                state.data.hoverTreasureAccept = true;
                this.canvas.style.cursor = 'pointer';
                return;
            }
        }
        this.canvas.style.cursor = 'default';
    },

    handleTreasureClick(pos) {
        const data = this.state.data;
        const runData = data.runData;

        if (!data.opened && data.treasureBoxRect && this.hitTest(pos, data.treasureBoxRect)) {
            if (typeof GameAudio !== 'undefined') GameAudio.playWin();
            data.opened = true;
            return;
        }

        if (data.opened && data.treasureAcceptRect && this.hitTest(pos, data.treasureAcceptRect)) {
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            runData.relics.push(data.relic);
            runData.stageIndex++;
            switchScreen(this.state, 'map', { runData });
        }
    },

    // ========== 大关过渡 ==========
    handleActTransitionHover(pos, state) {
        if (state.data.transitionBtnRect && this.hitTest(pos, state.data.transitionBtnRect)) {
            state.data.hoverTransitionBtn = true;
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'default';
        }
    },

    handleActTransitionClick(pos) {
        const data = this.state.data;
        const runData = data.runData;

        if (data.transitionBtnRect && this.hitTest(pos, data.transitionBtnRect)) {
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            // 拓展牌桌：增加可用格数
            runData.unlockedSlots = Math.min(SLOT_COUNT, runData.unlockedSlots + 1);
            runData.stageIndex++;
            runData.act = 2;
            switchScreen(this.state, 'map', { runData });
        }
    },

    // ========== 失败画面 ==========
    handleGameOverHover(pos, state) {
        if (state.data.restartBtnRect && this.hitTest(pos, state.data.restartBtnRect)) {
            state.data.hoverRestartBtn = true;
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'default';
        }
    },

    handleGameOverClick(pos) {
        if (this.state.data.restartBtnRect && this.hitTest(pos, this.state.data.restartBtnRect)) {
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            switchScreen(this.state, 'title', {});
        }
    },

    // ========== 战斗输入（保留现有逻辑） ==========
    handleBattleMouseDown(pos) {
        if (this.state.phase !== 'playing') return;

        const btnRect = this.renderer.getEndTurnButtonRect();
        if (this.hitTest(pos, btnRect)) {
            endTurn(this.state);
            this.checkBattleEnd();
            return;
        }

        const handIdx = this.renderer.getHandCardIndexAt(pos.x, pos.y, this.state.hand.length);
        if (handIdx !== null) {
            const card = this.state.hand[handIdx];
            this.state.selectedCard = card;
            this.state.draggedCard = card;
            this.state.dragX = pos.x;
            this.state.dragY = pos.y;
            this.isDragging = true;
        }
    },

    handleBattleMouseMove(pos) {
        if (this.isDragging && this.state.draggedCard) {
            this.state.dragX = pos.x;
            this.state.dragY = pos.y;
            this.state.hoveredSlot = this.renderer.getSlotIndexAt(pos.x, pos.y, this.state.slots.length);
        } else {
            this.state.hoveredSlot = this.renderer.getSlotIndexAt(pos.x, pos.y, this.state.slots.length);
            const handIdx = this.renderer.getHandCardIndexAt(pos.x, pos.y, this.state.hand.length);
            if (handIdx !== null) {
                this.state.selectedCard = this.state.hand[handIdx];
                this.updateTooltip(this.state.hand[handIdx], pos.x, pos.y);
            } else {
                this.state.selectedCard = null;
                this.hideTooltip();
            }
        }
    },

    checkBattleEnd() {
        if (this.state.phase === 'ended') {
            const isWin = this.state.result === 'win';
            if (typeof GameAudio !== 'undefined') {
                setTimeout(() => isWin ? GameAudio.playWin() : GameAudio.playLose(), 300);
            }

            // 使用战后结算系统替代原有弹窗
            setTimeout(() => {
                if (isWin) {
                    const result = resolveBattleEnd(this.state);
                    const runData = this.state.runDataRef;
                    if (result.postBattleType === 'card_pick') {
                        switchScreen(this.state, 'card_pick', {
                            runData,
                            soulsGained: result.soulsGained,
                            options: result.postBattleData.options
                        });
                    } else if (result.postBattleType === 'act_clear') {
                        switchScreen(this.state, 'act_transition', {
                            runData,
                            reward: result.postBattleData.reward,
                            desc: result.postBattleData.desc
                        });
                    } else {
                        switchScreen(this.state, 'post_battle', {
                            runData,
                            type: result.postBattleType,
                            soulsGained: result.soulsGained,
                            postBattleData: result.postBattleData
                        });
                    }
                } else {
                    // 失败
                    const runData = this.state.runDataRef;
                    switchScreen(this.state, 'game_over', {
                        reachedStage: getCurrentStageKey(runData),
                        totalSouls: runData.souls
                    });
                }
            }, 800);
        }
    },

    updateTooltip(card, clientX, clientY) {
        const tooltip = document.getElementById('tooltip');
        if (!card) {
            tooltip.classList.add('hidden');
            return;
        }

        let html = `<h4>${card.name}</h4>`;
        html += `<p>基础点数: <b>${getCardBaseValue(card)}</b> | 尺寸: ${card.size}格</p>`;
        html += `<p>${card.description}</p>`;
        html += '<div style="margin-top:8px">';
        for (const kw of card.keywords) {
            const data = KEYWORDS[kw];
            if (data) {
                html += `<span class="keyword-tag" style="border-color:${data.color};color:${data.color};background:${data.color}22">${data.name}</span>`;
            }
        }
        html += '</div>';

        tooltip.innerHTML = html;
        tooltip.classList.remove('hidden');

        const x = Math.min(clientX + 20, window.innerWidth - 300);
        const y = Math.min(clientY + 20, window.innerHeight - 200);
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    },

    hideTooltip() {
        document.getElementById('tooltip').classList.add('hidden');
    }
};

// Modal 系统（保留，但战斗结束后不再使用模态框）
function showModal(title, text, buttons) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const textEl = document.getElementById('modal-text');
    const buttonsEl = document.getElementById('modal-buttons');

    titleEl.textContent = title;
    textEl.textContent = text;
    buttonsEl.innerHTML = '';

    for (const btn of buttons) {
        const b = document.createElement('button');
        b.textContent = btn.text;
        if (btn.primary) b.classList.add('primary');
        b.onclick = () => {
            overlay.classList.add('hidden');
            if (btn.action) btn.action();
        };
        buttonsEl.appendChild(b);
    }

    overlay.classList.remove('hidden');
}

function showLogModal() {
    const log = window.gameState ? window.gameState.combatLog.join('\n') : '无日志';
    showModal('📜 战斗日志', log, [{ text: '关闭', action: null }]);
}

function restartGame() {
    window.gameState = startBattle();
    Input.state = window.gameState;
    if (typeof AutoTest !== 'undefined') {
        AutoTest.state = window.gameState;
    }
}
