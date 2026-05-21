/**
 * 卡牌地下城 - 输入处理系统
 * 
 * 架构：
 * - 核心层：坐标转换、hover状态管理、拖拽基础
 * - 分发层：根据 state.screen 分发到各处理函数
 * - 战斗层：卡牌拖拽、格子检测、结束回合
 */

import { switchScreen, getCurrentStageKey } from '../core/state.js';
import { createRunData } from '../core/state.js';
import { initBattleFromRun, endTurn } from '../systems/battle.js';
import { resolveBattleEnd } from '../systems/post-battle.js';
import { playCardToSlot, calculateTotalBoardDamage, getCardBaseValue } from '../systems/board.js';
import { getOrCreateShopStock, refreshShopStock, getOrCreateBlacksmithStock, refreshBlacksmithStock } from '../systems/shop.js';
import { createCardInstance, KEYWORDS, CARD_DEFS } from '../data/index.js';
import { showPlaceholderToast } from '../core/battle-core.js';
import { STAGE_CONFIG } from '../data/index.js';
import { Renderer, getEndTurnButtonRect, getHandCardIndexAt, getSlotIndexAt } from '../render/renderer.js';

export const Input = {
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
        this.canvas.addEventListener('mouseleave', e => this.onMouseLeave(e));
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
        this.canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });

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
            case 'title': this.handleTitleClick(pos); break;
            case 'class_select': this.handleClassSelectClick(pos); break;
            case 'map': this.handleMapClick(pos); break;
            case 'battle': this.handleBattleMouseDown(pos); break;
            case 'post_battle': this.handlePostBattleClick(pos); break;
            case 'card_pick': this.handleCardPickClick(pos); break;
            case 'card_select': this.handleCardSelectClick(pos); break;
            case 'shop': this.handleShopClick(pos); break;
            case 'blacksmith': this.handleBlacksmithClick(pos); break;
            case 'event': this.handleEventClick(pos); break;
            case 'treasure': this.handleTreasureClick(pos); break;
            case 'act_transition': this.handleActTransitionClick(pos); break;
            case 'victory': this.handleGameOverClick(pos); break;
            case 'game_over': this.handleGameOverClick(pos); break;
        }
    },

    onMouseMove(e) {
        const pos = this.getCanvasPos(e.clientX, e.clientY);
        const state = this.state;

        this.clearAllHovers(state);

        switch (state.screen) {
            case 'title': this.handleTitleHover(pos, state); break;
            case 'class_select': this.handleClassSelectHover(pos, state); break;
            case 'map': this.handleMapHover(pos, state); break;
            case 'battle': this.handleBattleMouseMove(pos); break;
            case 'post_battle': this.handlePostBattleHover(pos, state); break;
            case 'card_pick': this.handleCardPickHover(pos, state); break;
            case 'card_select': this.handleCardSelectHover(pos, state); break;
            case 'shop': this.handleShopHover(pos, state); break;
            case 'blacksmith': this.handleBlacksmithHover(pos, state); break;
            case 'event': this.handleEventHover(pos, state); break;
            case 'treasure': this.handleTreasureHover(pos, state); break;
            case 'act_transition': this.handleActTransitionHover(pos, state); break;
            case 'victory': this.handleGameOverHover(pos, state); break;
            case 'game_over': this.handleGameOverHover(pos, state); break;
        }
    },

    onMouseUp(e) {
        if (!this.isDragging || !this.state.draggedCard) {
            this.isDragging = false;
            return;
        }

        const pos = this.getCanvasPos(e.clientX || 0, e.clientY || 0);
        const slotIdx = getSlotIndexAt(this.renderer, pos.x, pos.y, this.state.slots.length);

        if (slotIdx !== null && this.state.draggedCard) {
            const success = playCardToSlot(this.state.draggedCard, slotIdx, this.state);
            if (success) {
                this.state.turnDamage = calculateTotalBoardDamage(this.state);
            } else {
                this.state.message = '无法放置到此格子';
                this.state.messageTimer = 60;
            }
        }

        this.state.draggedCard = null;
        this.state.hoveredSlot = null;
        this.isDragging = false;
        this.canvas.style.cursor = 'default';

        this.checkBattleEnd();
    },

    onMouseLeave(e) {
        this.canvas.style.cursor = 'default';
        this.hideTooltip();

        if (this.isDragging) {
            this.onMouseUp(e);
            return;
        }

        this.state.selectedCard = null;
        this.state.hoveredSlot = null;
        this.state.hoveredMonster = false;
        this.state.hoveredEndTurn = false;
    },

    clearAllHovers(state) {
        if (!state.data) state.data = {};
        state.data.hoverStart = false;
        state.data.hoverClass = null;
        state.data.hoverNode = null;
        state.data.hoverOption = null;
        state.data.hoverSkip = false;
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
        state.data.hoverRelic = null;
    },

    hitTest(pos, rect) {
        return pos.x >= rect.x && pos.x <= rect.x + rect.w &&
               pos.y >= rect.y && pos.y <= rect.y + rect.h;
    },

    // ===== 标题界面 =====
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

    // ===== 职业选择 =====
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

    // ===== 地图界面 =====
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
        if (this.state.data.processing) return;
        for (const rect of this.state.data.nodeRects) {
            if (this.hitTest(pos, rect) && rect.current && !rect.locked) {
                this.state.data.processing = true;
                if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                const runData = this.state.data.runData;
                const battleState = initBattleFromRun(runData);
                Object.assign(this.state, battleState);
                this.state.screen = 'battle';
                this.state.data = {};
                return;
            }
        }
    },

    // ===== 通用卡牌选择界面 =====
    handleCardSelectHover(pos, state) {
        const scrollY = state.data.cardSelectScrollY || 0;
        const adjustedPos = { x: pos.x, y: pos.y + scrollY };
        if (state.data.optionRects) {
            for (const rect of state.data.optionRects) {
                if (this.hitTest(adjustedPos, rect)) {
                    state.data.hoverOption = rect.index;
                    this.canvas.style.cursor = 'pointer';
                    this.updateTooltip(rect.card, pos.x, pos.y);
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
        this.hideTooltip();
    },

    handleCardSelectClick(pos) {
        const data = this.state.data;
        const runData = data.runData;
        if (data.processing) return;

        const scrollY = data.cardSelectScrollY || 0;
        const adjustedPos = { x: pos.x, y: pos.y + scrollY };
        if (data.optionRects) {
            for (const rect of data.optionRects) {
                if (this.hitTest(adjustedPos, rect)) {
                    const card = rect.card;
                    data.processing = true;
                    if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();

                    if (data.selectMode === 'shop_remove') {
                        runData.souls -= 1;
                        const idx = runData.deck.findIndex(c => c.uuid === card.uuid);
                        if (idx !== -1) runData.deck.splice(idx, 1);
                        showPlaceholderToast(`已移除 ${card.name}`);
                        data.processing = false;
                        switchScreen(this.state, 'shop', data.returnData || { runData, stock: getOrCreateShopStock(runData) });
                        return;
                    }

                    if (data.selectMode === 'shop_upgrade') {
                        const upgradeCost = runData.shopUpgradeCost - (runData.firstUpgradeDiscount ? 1 : 0);
                        runData.souls -= upgradeCost;
                        if (runData.firstUpgradeDiscount) runData.firstUpgradeDiscount = false;
                        card.permanentBonus += 2;
                        runData.shopUpgradeCost = Math.min(3, runData.shopUpgradeCost + 1);
                        showPlaceholderToast(`${card.name} 数值+2！`);
                        data.processing = false;
                        switchScreen(this.state, 'shop', data.returnData || { runData, stock: getOrCreateShopStock(runData) });
                        return;
                    }

                    if (data.selectMode === 'event_buff') {
                        card.permanentBonus += 2;
                        showPlaceholderToast(`${card.name} 数值+2！`);
                        setTimeout(() => {
                            data.processing = false;
                            runData.stageIndex++;
                            switchScreen(this.state, 'map', { runData });
                        }, 600);
                        return;
                    }

                    if (data.selectMode === 'blacksmith_enchant') {
                        const keyword = data.enchantKeyword;
                        const cost = data.enchantCost;
                        runData.souls -= cost;
                        if (keyword && !card.keywords.includes(keyword)) {
                            card.keywords.push(keyword);
                            const kwName = KEYWORDS[keyword] ? KEYWORDS[keyword].name : keyword;
                            showPlaceholderToast(`${card.name} 获得【${kwName}】！`);
                        } else {
                            showPlaceholderToast('该卡牌已有相同词条');
                        }
                        runData.blacksmithEnchantCost += 1;
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                        data.processing = false;
                        switchScreen(this.state, 'blacksmith', data.returnData || { runData });
                        return;
                    }

                    data.processing = false;
                    return;
                }
            }
        }

        if (data.backBtnRect && this.hitTest(pos, data.backBtnRect)) {
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            if (data.returnScreen === 'shop') {
                switchScreen(this.state, 'shop', data.returnData || { runData, stock: getOrCreateShopStock(runData) });
            } else if (data.returnScreen === 'map') {
                runData.stageIndex++;
                switchScreen(this.state, 'map', { runData });
            } else {
                switchScreen(this.state, data.returnScreen || 'map', data.returnData || { runData });
            }
        }
    },

    // ===== 选牌界面 =====
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
        if (state.data.skipRect && this.hitTest(pos, state.data.skipRect)) {
            state.data.hoverSkip = true;
            this.canvas.style.cursor = 'pointer';
            return;
        }
        this.canvas.style.cursor = 'default';
    },

    handleCardPickClick(pos) {
        const data = this.state.data;
        const runData = data.runData;
        if (data.processing) return;

        if (data.skipRect && this.hitTest(pos, data.skipRect)) {
            data.processing = true;
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            setTimeout(() => {
                const result = resolveBattleEnd(this.state);
                data.processing = false;
                if (result.postBattleType === 'act_clear') {
                    switchScreen(this.state, 'act_transition', {
                        runData, reward: result.postBattleData.reward, desc: result.postBattleData.desc
                    });
                } else {
                    switchScreen(this.state, 'post_battle', {
                        runData, type: result.postBattleType,
                        soulsGained: result.soulsGained, postBattleData: result.postBattleData
                    });
                }
            }, 300);
            return;
        }

        if (data.optionRects) {
            for (const rect of data.optionRects) {
                if (this.hitTest(pos, rect)) {
                    data.processing = true;
                    if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    const newCard = createCardInstance(rect.defId);
                    runData.deck.push(newCard);
                    showPlaceholderToast(`获得卡牌：${newCard.name}`);

                    setTimeout(() => {
                        data.processing = false;
                        const result = resolveBattleEnd(this.state);
                        if (result.postBattleType === 'act_clear') {
                            switchScreen(this.state, 'act_transition', {
                                runData, reward: result.postBattleData.reward, desc: result.postBattleData.desc
                            });
                        } else {
                            switchScreen(this.state, 'post_battle', {
                                runData, type: result.postBattleType,
                                soulsGained: result.soulsGained, postBattleData: result.postBattleData
                            });
                        }
                    }, 300);
                    return;
                }
            }
        }
    },

    // ===== 战后选择 =====
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
        if (data.processing) return;

        if (data.optionRects) {
            for (const rect of data.optionRects) {
                if (this.hitTest(pos, rect)) {
                    if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();

                    if (rect.type === 'event') {
                        switchScreen(this.state, 'event', {
                            runData, eventName: rect.data.name, eventDesc: rect.data.desc, effect: rect.data.effect
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

        if (data.treasureRect && this.hitTest(pos, data.treasureRect)) {
            if (typeof GameAudio !== 'undefined') GameAudio.playWin();
            runData.relics.push(data.postBattleData.relic);
            runData.stageIndex++;
            switchScreen(this.state, 'map', { runData });
        }
    },

    // ===== 商店 =====
    handleShopHover(pos, state) {
        if (state.data.shopItemRects) {
            for (const rect of state.data.shopItemRects) {
                if (this.hitTest(pos, rect) && !rect.item.bought) {
                    state.data.hoverShopItem = rect.key;
                    this.canvas.style.cursor = 'pointer';
                    const def = CARD_DEFS[rect.item.defId];
                    if (def) {
                        const pseudoCard = {
                            name: def.name, baseValue: def.baseValue, permanentBonus: 0, tempBonus: 0,
                            size: def.size, keywords: def.keywords, description: def.description
                        };
                        this.updateTooltip(pseudoCard, pos.x, pos.y);
                    }
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
        this.hideTooltip();
    },

    handleShopClick(pos) {
        const data = this.state.data;
        const runData = data.runData;
        if (data.processing) return;

        if (data.shopItemRects) {
            for (const rect of data.shopItemRects) {
                if (this.hitTest(pos, rect) && !rect.item.bought) {
                    if (runData.souls >= rect.price) {
                        runData.souls -= rect.price;
                        rect.item.bought = true;
                        const newCard = createCardInstance(rect.item.defId);
                        runData.deck.push(newCard);
                        showPlaceholderToast(`获得卡牌：${newCard.name}`);
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    } else {
                        showPlaceholderToast('魂不足！');
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
                    }
                    return;
                }
            }
        }

        if (data.shopServiceRects) {
            for (const rect of data.shopServiceRects) {
                if (this.hitTest(pos, rect)) {
                    if (runData.souls >= rect.cost) {
                        if (rect.key === 'refresh') {
                            runData.souls -= rect.cost;
                            refreshShopStock(runData);
                            data.stock = runData.shopStock;
                            runData.shopRefreshCost += 1;
                            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                            showPlaceholderToast('商店已刷新');
                        } else if (rect.key === 'remove_card') {
                            if (runData.deck.length === 0) { showPlaceholderToast('牌组为空！'); return; }
                            switchScreen(this.state, 'card_select', {
                                runData, title: '🗑️ 删牌服务', desc: '选择牌组内一张卡牌移除（消耗1魂）',
                                cards: runData.deck, backText: '取消', selectMode: 'shop_remove',
                                returnScreen: 'shop', returnData: data
                            });
                        } else if (rect.key === 'upgrade_card') {
                            if (runData.deck.length === 0) { showPlaceholderToast('牌组为空！'); return; }
                            switchScreen(this.state, 'card_select', {
                                runData, title: '⬆️ 数值强化', desc: '选择牌组内一张卡牌，数值永久+2',
                                cards: runData.deck, backText: '取消', selectMode: 'shop_upgrade',
                                returnScreen: 'shop', returnData: data
                            });
                        }
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
            runData.shopStock = null;
            switchScreen(this.state, 'map', { runData });
        }
    },

    // ===== 铁匠 =====
    handleBlacksmithHover(pos, state) {
        if (state.data.blacksmithRects) {
            for (const rect of state.data.blacksmithRects) {
                if (this.hitTest(pos, rect)) {
                    state.data.hoverBlacksmith = rect.key;
                    this.canvas.style.cursor = 'pointer';
                    this.updateBlacksmithTooltip(rect.item, pos.x, pos.y);
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
        this.hideTooltip();
    },

    handleBlacksmithClick(pos) {
        const data = this.state.data;
        const runData = data.runData;
        if (data.processing) return;

        if (data.blacksmithRects) {
            for (const rect of data.blacksmithRects) {
                if (this.hitTest(pos, rect)) {
                    if (!rect.canAfford) {
                        showPlaceholderToast('魂不足！');
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
                        return;
                    }
                    if (rect.item.type === 'buy_relic') {
                        const item = rect.item.data;
                        if (item.bought) { showPlaceholderToast('已购买！'); return; }
                        runData.souls -= rect.item.cost;
                        item.bought = true;
                        runData.relics.push({ name: item.name, desc: item.desc });
                        showPlaceholderToast(`获得遗物：${item.name}`);
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    } else if (rect.item.type === 'upgrade_slot') {
                        runData.souls -= rect.item.cost;
                        const slotIndex = rect.item.slotIndex;
                        runData.blacksmithSlotCosts[slotIndex] = (runData.blacksmithSlotCosts[slotIndex] || 2) + 1;
                        runData.slotUpgrades[slotIndex] = (runData.slotUpgrades[slotIndex] || 0) + 1;
                        showPlaceholderToast(`第${slotIndex + 1}格倍率+1！`);
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    } else if (rect.item.type === 'enchant') {
                        if (runData.deck.length === 0) { showPlaceholderToast('牌组为空！'); return; }
                        const stock = data.stock || getOrCreateBlacksmithStock(runData);
                        const keyword = stock.enchantKeyword;
                        const kwName = KEYWORDS[keyword] ? KEYWORDS[keyword].name : keyword;
                        switchScreen(this.state, 'card_select', {
                            runData, title: `✨ 附魔【${kwName}】`, desc: '选择牌组内一张卡牌，为其添加词条',
                            cards: runData.deck, backText: '取消', selectMode: 'blacksmith_enchant',
                            returnScreen: 'blacksmith', returnData: data,
                            enchantKeyword: keyword, enchantCost: rect.item.cost
                        });
                    } else if (rect.item.type === 'refresh') {
                        if (runData.firstBlacksmithRefreshFree) {
                            runData.firstBlacksmithRefreshFree = false;
                        } else {
                            runData.souls -= rect.item.cost;
                        }
                        refreshBlacksmithStock(runData);
                        data.stock = runData.blacksmithStock;
                        runData.blacksmithRefreshCost += 1;
                        showPlaceholderToast('铁匠铺已刷新！');
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    }
                    return;
                }
            }
        }

        if (data.backBtnRect && this.hitTest(pos, data.backBtnRect)) {
            runData.stageIndex++;
            runData.blacksmithStock = null;
            switchScreen(this.state, 'map', { runData });
        }
    },

    // ===== 事件 =====
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
        if (data.processing) return;

        if (data.eventOptionRects) {
            for (const rect of data.eventOptionRects) {
                if (this.hitTest(pos, rect)) {
                    if (rect.text === '离开') {
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                        runData.stageIndex++;
                        switchScreen(this.state, 'map', { runData });
                        return;
                    }
                    if (runData.deck.length === 0) { showPlaceholderToast('牌组为空！'); return; }
                    if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    switchScreen(this.state, 'card_select', {
                        runData, title: data.eventName || '神秘力量',
                        desc: '选择牌组内一张卡牌，使其数值永久+2',
                        cards: runData.deck, backText: '离开', selectMode: 'event_buff',
                        returnScreen: 'map', returnData: data
                    });
                    return;
                }
            }
        }
    },

    // ===== 宝箱 =====
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
        if (data.processing) return;

        if (!data.opened && data.treasureBoxRect && this.hitTest(pos, data.treasureBoxRect)) {
            if (typeof GameAudio !== 'undefined') GameAudio.playWin();
            data.opened = true;
            return;
        }

        if (data.opened && data.treasureAcceptRect && this.hitTest(pos, data.treasureAcceptRect)) {
            data.processing = true;
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            runData.relics.push(data.relic);
            runData.stageIndex++;
            switchScreen(this.state, 'map', { runData });
        }
    },

    // ===== 大关过渡 =====
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
        if (data.processing) return;

        if (data.transitionBtnRect && this.hitTest(pos, data.transitionBtnRect)) {
            data.processing = true;
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            runData.unlockedSlots = Math.min(5, runData.unlockedSlots + 1);
            runData.stageIndex++;
            if (runData.stageIndex >= 8) {
                switchScreen(this.state, 'victory', { runData });
            } else {
                runData.act = 2;
                switchScreen(this.state, 'map', { runData });
            }
        }
    },

    // ===== 失败画面 =====
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

    // ===== 战斗输入 =====
    handleBattleMouseDown(pos) {
        if (this.state.phase !== 'playing') {
            this.canvas.style.cursor = 'default';
            return;
        }

        const btnRect = getEndTurnButtonRect(this.renderer);
        if (this.hitTest(pos, btnRect)) {
            endTurn(this.state);
            this.canvas.style.cursor = 'default';
            this.checkBattleEnd();
            return;
        }

        const handIdx = getHandCardIndexAt(this.renderer, pos.x, pos.y, this.state.hand.length);
        if (handIdx !== null) {
            const card = this.state.hand[handIdx];
            this.state.selectedCard = card;
            this.state.draggedCard = card;
            this.state.dragX = pos.x;
            this.state.dragY = pos.y;
            this.isDragging = true;
            this.canvas.style.cursor = 'grabbing';
        }
    },

    handleBattleMouseMove(pos) {
        if (this.state.phase !== 'playing') {
            this.state.selectedCard = null;
            this.state.hoveredSlot = null;
            this.state.hoveredMonster = false;
            this.state.hoveredEndTurn = false;
            this.canvas.style.cursor = 'default';
            this.hideTooltip();
            return;
        }

        if (this.isDragging && this.state.draggedCard) {
            this.state.dragX = pos.x;
            this.state.dragY = pos.y;
            this.state.hoveredSlot = getSlotIndexAt(this.renderer, pos.x, pos.y, this.state.slots.length);
            this.canvas.style.cursor = 'grabbing';
            this.hideTooltip();
            this.state.hoveredMonster = false;
            this.state.hoveredEndTurn = false;
        } else {
            const slotIdx = getSlotIndexAt(this.renderer, pos.x, pos.y, this.state.slots.length);
            this.state.hoveredSlot = slotIdx;
            const handIdx = getHandCardIndexAt(this.renderer, pos.x, pos.y, this.state.hand.length);
            const endTurnRect = getEndTurnButtonRect(this.renderer);
            const isOverEndTurn = this.hitTest(pos, endTurnRect);
            const isOverMonster = pos.x >= this.renderer.width * 0.5 - 150 && pos.x <= this.renderer.width * 0.5 + 150 && pos.y >= 0 && pos.y <= 220;
            const isOverPlayer = pos.x >= 0 && pos.x <= 200 && pos.y >= 40 && pos.y <= 240;

            if (handIdx !== null) {
                this.state.selectedCard = this.state.hand[handIdx];
                this.state.hoveredMonster = false;
                this.state.hoveredEndTurn = false;
                this.canvas.style.cursor = 'grab';
                this.updateTooltip(this.state.hand[handIdx], pos.x, pos.y);
                this._playHoverSound();
            } else if (isOverEndTurn) {
                this.state.selectedCard = null;
                this.state.hoveredMonster = false;
                this.state.hoveredEndTurn = true;
                this.canvas.style.cursor = 'pointer';
                this.updateEndTurnTooltip(pos.x, pos.y);
                this._playHoverSound();
            } else if (isOverMonster) {
                this.state.selectedCard = null;
                this.state.hoveredMonster = true;
                this.state.hoveredEndTurn = false;
                this.canvas.style.cursor = 'help';
                this.updateMonsterTooltip(pos.x, pos.y);
                this._playHoverSound();
            } else if (slotIdx !== null) {
                this.state.selectedCard = null;
                this.state.hoveredMonster = false;
                this.state.hoveredEndTurn = false;
                this.canvas.style.cursor = 'pointer';
                this.updateSlotTooltip(slotIdx, pos.x, pos.y);
                this._playHoverSound();
            } else if (isOverPlayer) {
                this.state.selectedCard = null;
                this.state.hoveredMonster = false;
                this.state.hoveredEndTurn = false;
                this.canvas.style.cursor = 'help';
                this.updatePlayerTooltip(pos.x, pos.y);
                this._playHoverSound();
            } else {
                // 检测遗物悬停
                const relicHover = this._checkRelicHover(pos);
                if (relicHover) {
                    this.state.selectedCard = null;
                    this.state.hoveredMonster = false;
                    this.state.hoveredEndTurn = false;
                    this.canvas.style.cursor = 'help';
                    this.updateRelicTooltip(relicHover.relic, pos.x, pos.y);
                    this._playHoverSound();
                } else {
                    this.state.selectedCard = null;
                    this.state.hoveredMonster = false;
                    this.state.hoveredEndTurn = false;
                    this.canvas.style.cursor = 'default';
                    this.hideTooltip();
                }
            }
        }
    },

    _lastHoverSoundTime: 0,
    _playHoverSound() {
        const now = Date.now();
        if (now - this._lastHoverSoundTime > 120) {
            this._lastHoverSoundTime = now;
            if (typeof GameAudio !== 'undefined') GameAudio.playTooltip();
        }
    },

    checkBattleEnd() {
        if (this.state.phase === 'ended') {
            if (this.state.data && this.state.data.battleEndProcessing) return;
            if (!this.state.data) this.state.data = {};
            this.state.data.battleEndProcessing = true;

            const isWin = this.state.result === 'win';
            if (typeof GameAudio !== 'undefined') {
                setTimeout(() => isWin ? GameAudio.playWin() : GameAudio.playLose(), 300);
            }

            setTimeout(() => {
                if (this.state.phase !== 'ended' || this.state.result !== (isWin ? 'win' : 'lose')) {
                    return;
                }
                if (isWin) {
                    const result = resolveBattleEnd(this.state);
                    const runData = this.state.runDataRef;
                    if (result.postBattleType === 'card_pick') {
                        switchScreen(this.state, 'card_pick', {
                            runData, soulsGained: result.soulsGained, options: result.postBattleData.options
                        });
                    } else if (result.postBattleType === 'act_clear') {
                        switchScreen(this.state, 'act_transition', {
                            runData, reward: result.postBattleData.reward, desc: result.postBattleData.desc
                        });
                    } else {
                        switchScreen(this.state, 'post_battle', {
                            runData, type: result.postBattleType,
                            soulsGained: result.soulsGained, postBattleData: result.postBattleData
                        });
                    }
                } else {
                    const runData = this.state.runDataRef;
                    switchScreen(this.state, 'game_over', {
                        reachedStage: getCurrentStageKey(runData), totalSouls: runData.souls
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

        const rarityLabels = { white: '普通', blue: '稀有', gold: '传说' };
        const rarityColors = { white: '#ccc', blue: '#4488ff', gold: '#ffd700' };
        const rLabel = rarityLabels[card.rarity] || '';
        const rColor = rarityColors[card.rarity] || '#ccc';

        let html = `<h4>${card.name} <span style="color:${rColor};font-size:13px;font-weight:normal">[${rLabel}]</span></h4>`;
        html += `<p>基础点数: <b>${getCardBaseValue(card)}</b> | 尺寸: ${card.size}格</p>`;
        html += `<p style="color:#ddd">${card.description}</p>`;
        if (card.keywords && card.keywords.length > 0) {
            html += '<div style="margin-top:10px;border-top:1px solid #443322;padding-top:8px">';
            html += '<p style="font-size:12px;color:#998866;margin-bottom:6px">📖 词条说明</p>';
            for (const kw of card.keywords) {
                const data = KEYWORDS[kw];
                if (data) {
                    html += `<div style="margin-bottom:6px">`;
                    html += `<span class="keyword-tag" style="border-color:${data.color};color:${data.color};background:${data.color}22">${data.name}</span>`;
                    html += `<span style="color:#aaa;font-size:12px;margin-left:6px">${data.desc}</span>`;
                    html += `</div>`;
                }
            }
            html += '</div>';
        }

        tooltip.innerHTML = html;
        tooltip.classList.remove('hidden');

        const x = Math.min(clientX + 20, window.innerWidth - 320);
        const y = Math.min(clientY + 20, window.innerHeight - 250);
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    },

    hideTooltip() {
        document.getElementById('tooltip').classList.add('hidden');
    },

    updateMonsterTooltip(clientX, clientY) {
        const tooltip = document.getElementById('tooltip');
        const monster = this.state.monster;
        let html = `<h4>${monster.name}</h4>`;
        html += `<p>类型: ${monster.type === 'boss' ? 'BOSS' : monster.type === 'elite' ? '精英' : '普通'} | HP: ${monster.hp}/${monster.maxHp}</p>`;
        html += `<p>${monster.description}</p>`;
        if (monster.keywordDesc) {
            html += `<p style="color:#ffaaaa;margin-top:6px;">☠️ ${monster.keywordDesc}</p>`;
        }
        tooltip.innerHTML = html;
        tooltip.classList.remove('hidden');
        const x = Math.min(clientX + 20, window.innerWidth - 300);
        const y = Math.min(clientY + 20, window.innerHeight - 200);
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    },

    updateSlotTooltip(slotIdx, clientX, clientY) {
        const tooltip = document.getElementById('tooltip');
        const slot = this.state.slots[slotIdx];
        let html = `<h4>倍率格 ${slotIdx + 1}</h4>`;
        html += `<p>当前倍率: <b style="color:#ffd700">${slot.multiplier}X</b></p>`;
        if (!slot.available) {
            html += `<p style="color:#ff6666">🔒 未解锁（击败BOSS后开放）</p>`;
        } else if (slot.locked) {
            html += `<p style="color:#ff6666">🔒 已锁定（本回合无法继续放置）</p>`;
        } else if (slot.isStacking) {
            html += `<p style="color:#2ecc71">📚 可堆叠（可以继续往上放牌）</p>`;
        } else {
            html += `<p style="color:#4ecdc4">✋ 空位（拖拽卡牌至此）</p>`;
        }
        if (slot.cards.length > 0) {
            const top = slot.cards[slot.cards.length - 1];
            html += `<p style="margin-top:6px">顶部卡牌: <b>${top.name}</b> (${top.baseValue + top.permanentBonus}点)</p>`;
        }
        tooltip.innerHTML = html;
        tooltip.classList.remove('hidden');
        const x = Math.min(clientX + 20, window.innerWidth - 300);
        const y = Math.min(clientY + 20, window.innerHeight - 200);
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    },

    updateEndTurnTooltip(clientX, clientY) {
        const tooltip = document.getElementById('tooltip');
        const state = this.state;
        const totalDmg = state.turnDamage;
        const remaining = Math.max(0, state.monster.hp - totalDmg);
        let html = `<h4>结束回合</h4>`;
        if (totalDmg >= state.monster.hp) {
            html += `<p style="color:#2ecc71">💀 伤害足够击杀怪物！</p>`;
        } else {
            html += `<p>本回合伤害: <b>${totalDmg}</b></p>`;
            html += `<p>怪物剩余: <b style="color:#ff6666">${remaining}</b> HP</p>`;
            html += `<p style="color:#ff6666;margin-top:4px">⚠️ 未击杀将扣除 1 颗心</p>`;
        }
        tooltip.innerHTML = html;
        tooltip.classList.remove('hidden');
        const x = Math.min(clientX + 20, window.innerWidth - 300);
        const y = Math.min(clientY + 20, window.innerHeight - 200);
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    },

    updatePlayerTooltip(clientX, clientY) {
        const tooltip = document.getElementById('tooltip');
        const player = this.state.player;
        let html = `<h4>${player.name}</h4>`;
        html += `<p>❤️ 生命: ${player.hearts}/${player.maxHearts}</p>`;
        html += `<p>🏛️ 遗物: <b style="color:#cc9955">${player.relic.name}</b></p>`;
        html += `<p style="color:#aaa;font-size:12px;margin-top:4px">${player.relic.description || ''}</p>`;
        tooltip.innerHTML = html;
        tooltip.classList.remove('hidden');
        const x = Math.min(clientX + 20, window.innerWidth - 300);
        const y = Math.min(clientY + 20, window.innerHeight - 200);
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    },

    _checkRelicHover(pos) {
        const relicRects = this.state.data && this.state.data.relicRects;
        if (!relicRects) return null;
        for (const rect of relicRects) {
            if (this.hitTest(pos, rect)) {
                this.state.data.hoverRelic = rect.index;
                return rect;
            }
        }
        this.state.data.hoverRelic = null;
        return null;
    },

    updateRelicTooltip(relic, clientX, clientY) {
        const tooltip = document.getElementById('tooltip');
        if (!relic) {
            tooltip.classList.add('hidden');
            return;
        }
        let html = `<h4>${relic.name}</h4>`;
        html += `<p style="color:#ccc">${relic.desc || relic.description || ''}</p>`;
        tooltip.innerHTML = html;
        tooltip.classList.remove('hidden');
        const x = Math.min(clientX + 20, window.innerWidth - 320);
        const y = Math.min(clientY + 20, window.innerHeight - 250);
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    },

    updateBlacksmithTooltip(item, clientX, clientY) {
        const tooltip = document.getElementById('tooltip');
        let html = '';
        if (item.type === 'buy_relic') {
            html = `<h4>${item.data.name}</h4><p>${item.data.desc}</p>`;
        } else if (item.type === 'upgrade_slot') {
            html = `<h4>强化倍率格：${item.name}</h4><p>将该格子的倍率永久+1</p>`;
        } else if (item.type === 'enchant') {
            html = `<h4>${item.name}</h4><p>${item.subText}</p>`;
        } else if (item.type === 'refresh') {
            html = `<h4>${item.name}</h4><p>${item.subText}</p>`;
        }
        tooltip.innerHTML = html;
        tooltip.classList.remove('hidden');
        const x = Math.min(clientX + 20, window.innerWidth - 300);
        const y = Math.min(clientY + 20, window.innerHeight - 200);
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    },

    onWheel(e) {
        const state = this.state;
        if (state.screen === 'card_select') {
            e.preventDefault();
            const scrollY = state.data.cardSelectScrollY || 0;
            const maxScroll = state.data.cardSelectMaxScroll || 0;
            let newScroll = scrollY + e.deltaY;
            newScroll = Math.max(0, Math.min(newScroll, maxScroll));
            state.data.cardSelectScrollY = newScroll;
        }
    }
};
