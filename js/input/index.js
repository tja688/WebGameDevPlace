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
import { resolveBattleEnd, generatePostBattleEvents } from '../systems/post-battle.js';
import { playCardToSlot, calculateTotalBoardDamage, getCardBaseValue } from '../systems/board.js';
import { getOrCreateShopStock, refreshShopStock, getOrCreateBlacksmithStock, refreshBlacksmithStock } from '../systems/shop.js';
import { createCardInstance, addKeywordToCard, KEYWORDS, CARD_DEFS, MONSTER_DEFS, createCardRewardOptions } from '../data/index.js';
import { showPlaceholderToast } from '../core/battle-core.js';
import { AnimationEngine } from '../systems/animation.js';
import { STAGE_CONFIG } from '../data/index.js';
import { Renderer, getEndTurnButtonRect, getHandCardIndexAt, getSlotIndexAt } from '../render/renderer.js';
import { PlaygroundState, enterEffectSandbox, backToPlaygroundMenu, getAllScenarios, enterPlaygroundBattle, resetPlaygroundBattle } from '../playground/index.js';

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

        if (state.data && state.data.viewingDeck) {
            this.handleDeckViewMouseDown(pos);
            return;
        }

        // 通用查看牌组按钮检测
        if (state.data && state.data.deckViewBtnRect && this.hitTest(pos, state.data.deckViewBtnRect)) {
            this.toggleDeckView();
            return;
        }

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
            case 'boss_relic': this.handleBossRelicClick(pos); break;
            case 'act_transition': this.handleActTransitionClick(pos); break;
            case 'victory': this.handleGameOverClick(pos); break;
            case 'game_over': this.handleGameOverClick(pos); break;
            case 'playground':
    if (this.state.data?.pgView === 'battle') {
        this.handleBattleMouseDown(pos);
    } else {
        this.handlePlaygroundClick(pos);
    }
    break;
        }
    },

    onMouseMove(e) {
        const pos = this.getCanvasPos(e.clientX, e.clientY);
        const state = this.state;

        this.clearAllHovers(state);

        if (state.data && state.data.viewingDeck) {
            this.handleDeckViewMouseMove(pos);
            return;
        }

        // 通用查看牌组按钮悬停检测
        if (state.data && state.data.deckViewBtnRect && this.hitTest(pos, state.data.deckViewBtnRect)) {
            state.data.hoverDeckViewBtn = true;
            this.canvas.style.cursor = 'pointer';
            return;
        }

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
            case 'boss_relic': this.handlePostBattleHover(pos, state); break;
            case 'act_transition': this.handleActTransitionHover(pos, state); break;
            case 'victory': this.handleGameOverHover(pos, state); break;
            case 'game_over': this.handleGameOverHover(pos, state); break;
            case 'playground':
    if (state.data?.pgView === 'battle') {
        this.handleBattleMouseMove(pos);
    } else {
        this.handlePlaygroundHover(pos, state);
    }
    break;
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
                AnimationEngine.enqueueFromTimeline(this.state);
            } else {
                this.state.message = '无法放置到此格子';
                this.state.messageTimer = 60;
                if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
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
        state.data.hoverDeckViewBtn = false;
        state.data.deckViewHoverCard = null;
        state.data.deckViewHoverClose = false;
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
                AnimationEngine.reset();
                AnimationEngine.enqueueFromTimeline(this.state);
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
                        const removeCost = runData.shopRemoveCost || 2;
                        if (runData.gold < removeCost) {
                            showPlaceholderToast('金币不足！');
                            data.processing = false;
                            return;
                        }
                        runData.gold -= removeCost;
                        runData.shopRemoveCost = removeCost * 2;
                        const idx = runData.deck.findIndex(c => c.uuid === card.uuid);
                        if (idx !== -1) runData.deck.splice(idx, 1);
                        showPlaceholderToast(`已移除 ${card.name}（消耗${removeCost}金币）`);
                        data.processing = false;
                        switchScreen(this.state, 'shop', data.returnData || { runData, stock: getOrCreateShopStock(runData) });
                        return;
                    }

                    if (data.selectMode === 'shop_upgrade') {
                        const cardCost = runData.shopUpgradeCosts[card.uuid] || 2;
                        const upgradeCost = Math.max(0, cardCost - (runData.firstUpgradeDiscount ? 1 : 0));
                        if (runData.gold < upgradeCost) {
                            showPlaceholderToast(`金币不足！需要${upgradeCost}金币`);
                            data.processing = false;
                            return;
                        }
                        runData.gold -= upgradeCost;
                        if (runData.firstUpgradeDiscount) runData.firstUpgradeDiscount = false;
                        card.permanentBonus += 5;
                        runData.shopUpgradeCosts[card.uuid] = cardCost + 1;
                        showPlaceholderToast(`${card.name} 数值+5（消耗${upgradeCost}金币）！`);
                        data.processing = false;
                        switchScreen(this.state, 'shop', data.returnData || { runData, stock: getOrCreateShopStock(runData) });
                        return;
                    }

                    if (data.selectMode === 'event_buff') {
                        const bonus = data.eventParam || 2;
                        card.permanentBonus += bonus;
                        showPlaceholderToast(`${card.name} 数值+${bonus}！`);
                        setTimeout(() => {
                            data.processing = false;
                            this._finishEvent(runData);
                        }, 600);
                        return;
                    }

                    if (data.selectMode === 'event_enchant_grow') {
                        const result = addKeywordToCard(card, 'grow', { growAmount: 1 });
                        if (!result.ok) {
                            showPlaceholderToast(result.reason);
                            data.processing = false;
                            return;
                        }
                        showPlaceholderToast(`${card.name} 获得【成长1】！`);
                        setTimeout(() => {
                            data.processing = false;
                            this._finishEvent(runData);
                        }, 600);
                        return;
                    }

                    if (data.selectMode === 'event_remove_for_souls') {
                        const gain = data.eventParam || 3;
                        runData.gold += gain;
                        const idx = runData.deck.findIndex(c => c.uuid === card.uuid);
                        if (idx !== -1) runData.deck.splice(idx, 1);
                        showPlaceholderToast(`移除 ${card.name}，获得 ${gain} 金币！`);
                        setTimeout(() => {
                            data.processing = false;
                            this._finishEvent(runData);
                        }, 600);
                        return;
                    }

                    if (data.selectMode === 'event_duplicate') {
                        const copy = JSON.parse(JSON.stringify(card));
                        copy.uuid = Math.random().toString(36).substr(2, 9);
                        runData.deck.push(copy);
                        showPlaceholderToast(`复制了 ${card.name}！`);
                        setTimeout(() => {
                            data.processing = false;
                            this._finishEvent(runData);
                        }, 600);
                        return;
                    }

                    if (data.selectMode === 'event_pick_card') {
                        runData.deck.push(card);
                        showPlaceholderToast(`获得卡牌：${card.name}`);
                        setTimeout(() => {
                            data.processing = false;
                            this._finishEvent(runData);
                        }, 600);
                        return;
                    }

                    if (data.selectMode === 'event_enchant_mighty') {
                        const result = addKeywordToCard(card, 'mighty');
                        if (!result.ok) {
                            showPlaceholderToast(result.reason);
                            data.processing = false;
                            return;
                        }
                        showPlaceholderToast(`${card.name} 获得【伟力】！`);
                        setTimeout(() => {
                            data.processing = false;
                            this._finishEvent(runData);
                        }, 600);
                        return;
                    }

                    if (data.selectMode === 'blacksmith_enchant') {
                        const keyword = data.enchantKeyword;
                        const cost = data.enchantCost;
                        if (runData.gold < cost) {
                            showPlaceholderToast('金币不足！');
                            data.processing = false;
                            return;
                        }
                        const result = addKeywordToCard(card, keyword);
                        if (result.ok) {
                            runData.gold -= cost;
                            const kwName = KEYWORDS[keyword] ? KEYWORDS[keyword].name : keyword;
                            showPlaceholderToast(`${card.name} 获得【${kwName}】！`);
                        } else {
                            showPlaceholderToast(result.reason);
                        }
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
                        goldGained: result.goldGained, postBattleData: result.postBattleData
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
                                goldGained: result.goldGained, postBattleData: result.postBattleData
                            });
                        }
                    }, 300);
                    return;
                }
            }
        }
    },

    // ===== BOSS装备选择 =====
    handleBossRelicClick(pos) {
        const data = this.state.data;
        const runData = data.runData;
        if (data.processing) return;

        if (data.optionRects) {
            for (const rect of data.optionRects) {
                if (this.hitTest(pos, rect)) {
                    if (typeof GameAudio !== 'undefined') GameAudio.playWin();
                    runData.relics.push(rect.data);
                    showPlaceholderToast(`获得BOSS装备：${rect.data.name}`);
                    data.processing = true;
                    setTimeout(() => {
                        data.processing = false;
                        // BOSS战后进入事件
                        const eventOptions = generatePostBattleEvents(runData);
                        switchScreen(this.state, 'event', {
                            runData, options: eventOptions, postBattle: true
                        });
                    }, 400);
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
                    if (rect.type === 'card') {
                        const def = CARD_DEFS[rect.item.defId];
                        if (def) {
                            const pseudoCard = {
                                name: def.name, baseValue: def.baseValue, permanentBonus: 0, tempBonus: 0,
                                size: def.size, keywords: def.keywords, description: def.description
                            };
                            this.updateTooltip(pseudoCard, pos.x, pos.y);
                        }
                    } else if (rect.type === 'relic') {
                        this.updateRelicTooltip(rect.item, pos.x, pos.y);
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
                    if (runData.gold >= rect.price) {
                        runData.gold -= rect.price;
                        rect.item.bought = true;
                        if (rect.type === 'card') {
                            const newCard = createCardInstance(rect.item.defId);
                            runData.deck.push(newCard);
                            showPlaceholderToast(`获得卡牌：${newCard.name}`);
                        } else if (rect.type === 'relic') {
                            const relic = { ...rect.item };
                            delete relic.price;
                            delete relic.bought;
                            runData.relics.push(relic);
                            showPlaceholderToast(`获得装备：${relic.name}`);
                        }
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    } else {
                        showPlaceholderToast('金币不足！');
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
                    }
                    return;
                }
            }
        }

        if (data.shopServiceRects) {
            for (const rect of data.shopServiceRects) {
                if (this.hitTest(pos, rect)) {
                    if (runData.gold >= rect.cost) {
                        if (rect.key === 'refresh') {
                            runData.gold -= rect.cost;
                            refreshShopStock(runData);
                            data.stock = runData.shopStock;
                            runData.shopRefreshCost += 1;
                            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                            showPlaceholderToast('商店已刷新');
                        } else if (rect.key === 'remove_card') {
                            if (runData.deck.length === 0) { showPlaceholderToast('牌组为空！'); return; }
                            const removeCost = runData.shopRemoveCost || 2;
                            switchScreen(this.state, 'card_select', {
                                runData, title: '🗑️ 删牌服务', desc: `选择牌组内一张卡牌移除（消耗${removeCost}金币，每次翻倍）`,
                                cards: runData.deck, backText: '取消', selectMode: 'shop_remove',
                                returnScreen: 'shop', returnData: data
                            });
                        } else if (rect.key === 'upgrade_card') {
                            if (runData.deck.length === 0) { showPlaceholderToast('牌组为空！'); return; }
                            switchScreen(this.state, 'card_select', {
                                runData, title: '⬆️ 数值强化', desc: '选择牌组内一张卡牌，数值永久+5（费用按单卡独立计算）',
                                cards: runData.deck, backText: '取消', selectMode: 'shop_upgrade',
                                returnScreen: 'shop', returnData: data
                            });
                        } else if (rect.key === 'buy_strategy') {
                            if (runData.gold < 4) { showPlaceholderToast('金币不足！'); return; }
                            runData.gold -= 4;
                            const strategies = ['attempt_push', 'left_assault', 'right_assault', 'mid_assault', 'steady_push', 'plan_left', 'plan_right', 'plan_mid', 'forceful_push'];
                            const randomStrategy = strategies[Math.floor(Math.random() * strategies.length)];
                            runData.strategyLevels[randomStrategy] = (runData.strategyLevels[randomStrategy] || 0) + 1;
                            const strategyNames = {
                                attempt_push: '尝试推进', left_assault: '左侧强袭', right_assault: '右侧强袭',
                                mid_assault: '中线强袭', steady_push: '稳重推进', plan_left: '计划左攻',
                                plan_right: '计划右攻', plan_mid: '计划中攻', forceful_push: '强硬推进'
                            };
                            showPlaceholderToast(`计策【${strategyNames[randomStrategy]}】等级+1！`);
                            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                            return;
                        }
                    } else {
                        showPlaceholderToast('金币不足！');
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
                    }
                    return;
                }
            }
        }

        if (data.backBtnRect && this.hitTest(pos, data.backBtnRect)) {
            runData.shopStock = null;
            if (data.postBattle && runData.pendingEventPool) {
                // 战后流程：商店结束后进入事件
                const eventOptions = generatePostBattleEvents(runData);
                switchScreen(this.state, 'event', {
                    runData, options: eventOptions, postBattle: true
                });
            } else {
                runData.stageIndex++;
                switchScreen(this.state, 'map', { runData });
            }
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
                    if (rect.item.type === 'upgrade_slot' && runData.blacksmithSlotUpgraded) {
                        showPlaceholderToast('同一铁匠仅能强化一次倍率格');
                        return;
                    }
                    if (!rect.canAfford) {
                        showPlaceholderToast('金币不足！');
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
                        return;
                    }
                    if (rect.item.type === 'buy_relic') {
                        const item = rect.item.data;
                        if (item.bought) { showPlaceholderToast('已购买！'); return; }
                        runData.gold -= rect.item.cost;
                        item.bought = true;
                        const relic = { ...item };
                        delete relic.price;
                        delete relic.bought;
                        runData.relics.push(relic);
                        showPlaceholderToast(`获得装备：${item.name}`);
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    } else if (rect.item.type === 'upgrade_slot') {
                        if (runData.blacksmithSlotUpgraded) {
                            showPlaceholderToast('同一铁匠仅能强化一次倍率格');
                            return;
                        }
                        runData.gold -= rect.item.cost;
                        // 第二版：固定三格，随机强化其中一格
                        const availableSlots = [0, 1, 2];
                        const slotIndex = availableSlots[Math.floor(Math.random() * availableSlots.length)];
                        runData.slotUpgrades[slotIndex] = (runData.slotUpgrades[slotIndex] || 0) + 1;
                        runData.blacksmithSlotUpgraded = true;
                        showPlaceholderToast(`第${slotIndex + 1}格倍率+1！（随机）`);
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    } else if (rect.item.type === 'enchant') {
                        if (runData.deck.length === 0) { showPlaceholderToast('牌组为空！'); return; }
                        const keyword = rect.item.keyword || null;
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
                            runData.gold -= rect.item.cost;
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
            runData.blacksmithStock = null;
            if (data.postBattle && runData.pendingEventPool) {
                // 战后流程：铁匠结束后进入事件
                const eventOptions = generatePostBattleEvents(runData);
                switchScreen(this.state, 'event', {
                    runData, options: eventOptions, postBattle: true
                });
            } else {
                runData.stageIndex++;
                switchScreen(this.state, 'map', { runData });
            }
        }
    },

    // ===== 事件 =====
    handleEventHover(pos, state) {
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

    handleEventClick(pos) {
        const data = this.state.data;
        const runData = data.runData;
        if (data.processing) return;

        if (data.skipRect && this.hitTest(pos, data.skipRect)) {
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            runData.pendingEventPool = null;
            runData.stageIndex++;
            if (runData.stageIndex >= 8) {
                if (runData.act >= 3) {
                    switchScreen(this.state, 'victory', { runData });
                } else {
                    switchScreen(this.state, 'act_transition', { runData });
                }
            } else {
                switchScreen(this.state, 'map', { runData });
            }
            return;
        }

        if (data.optionRects) {
            for (const rect of data.optionRects) {
                if (this.hitTest(pos, rect)) {
                    if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    const opt = rect.data;
                    this._handleEventEffect(runData, opt);
                    return;
                }
            }
        }
    },

    _handleEventEffect(runData, opt) {
        const data = this.state.data;
        const effect = opt.effect;
        const param = opt.param;

        switch (effect) {
            case 'buff_card':
                if (runData.deck.length === 0) { showPlaceholderToast('牌组为空！'); return; }
                switchScreen(this.state, 'card_select', {
                    runData, title: opt.name,
                    desc: `选择牌组内一张卡牌，数值永久+${param || 5}`,
                    cards: runData.deck, backText: '离开', selectMode: 'event_buff',
                    returnScreen: 'map', returnData: data, eventParam: param || 5
                });
                return;
            case 'enchant_grow':
                if (runData.deck.length === 0) { showPlaceholderToast('牌组为空！'); return; }
                switchScreen(this.state, 'card_select', {
                    runData, title: opt.name,
                    desc: '选择一张卡牌，使其获得【成长1】',
                    cards: runData.deck, backText: '离开', selectMode: 'event_enchant_grow',
                    returnScreen: 'map', returnData: data
                });
                return;
            case 'gain_gold':
                runData.gold += (param || 4);
                showPlaceholderToast(`获得 ${param || 4} 金币！`);
                this._finishEvent(runData);
                return;
            case 'gain_souls':
                runData.gold += (param || 1);
                showPlaceholderToast(`获得 ${param || 1} 金币！`);
                this._finishEvent(runData);
                return;
            case 'gamble':
                if (Math.random() < 0.5) {
                    runData.gold += 3;
                    showPlaceholderToast('赌局胜利！获得 3 金币！');
                } else {
                    runData.gold = Math.max(0, runData.gold - 2);
                    showPlaceholderToast('赌局失败...失去 2 金币');
                }
                this._finishEvent(runData);
                return;
            case 'gain_relic':
                runData.relics.push({ name: '随机装备', desc: '获得一个低级装备（占位）' });
                showPlaceholderToast('获得随机低级装备！');
                this._finishEvent(runData);
                return;
            case 'gain_rare_relic':
                runData.relics.push({ name: '高级装备', desc: '获得一个高级装备（占位）' });
                showPlaceholderToast('获得随机高级装备！');
                this._finishEvent(runData);
                return;
            case 'random_strategy_level':
                {
                    const strategies = ['attempt_push', 'left_assault', 'right_assault', 'mid_assault', 'steady_push', 'plan_left', 'plan_right', 'plan_mid', 'forceful_push'];
                    const randomStrategy = strategies[Math.floor(Math.random() * strategies.length)];
                    runData.strategyLevels[randomStrategy] = (runData.strategyLevels[randomStrategy] || 0) + 1;
                    const strategyNames = {
                        attempt_push: '尝试推进', left_assault: '左侧强袭', right_assault: '右侧强袭',
                        mid_assault: '中线强袭', steady_push: '稳重推进', plan_left: '计划左攻',
                        plan_right: '计划右攻', plan_mid: '计划中攻', forceful_push: '强硬推进'
                    };
                    showPlaceholderToast(`计策【${strategyNames[randomStrategy] || randomStrategy}】等级+1！`);
                    this._finishEvent(runData);
                }
                return;
            case 'self_blacksmith':
                {
                    const sbParam = param || { goldCost: 2, slotBonus: 1 };
                    if (runData.gold < sbParam.goldCost) { showPlaceholderToast('金币不足！'); return; }
                    runData.gold -= sbParam.goldCost;
                    const availSlots = [0, 1, 2];
                    const randSlot = availSlots[Math.floor(Math.random() * availSlots.length)];
                    runData.slotUpgrades[randSlot] = (runData.slotUpgrades[randSlot] || 0) + sbParam.slotBonus;
                    showPlaceholderToast(`第${randSlot + 1}格倍率+${sbParam.slotBonus}！（消耗${sbParam.goldCost}金币）`);
                    this._finishEvent(runData);
                }
                return;
            case 'card_pick_three':
                {
                    const cardDefs = createCardRewardOptions();
                    const cardInstances = cardDefs.map(defId => createCardInstance(defId));
                    switchScreen(this.state, 'card_select', {
                        runData, title: opt.name || '及时的帮助',
                        desc: '选择一张卡牌加入牌组',
                        cards: cardInstances, backText: '放弃', selectMode: 'event_pick_card',
                        returnScreen: 'map', returnData: data
                    });
                }
                return;
            case 'pick_rare_relic':
                {
                    const relicPool = RELIC_DEFS.filter(r => r.rarity === 'rare' || r.rarity === 'epic');
                    const shuffled = [...relicPool].sort(() => Math.random() - 0.5);
                    const options = shuffled.slice(0, 3).map(r => ({ name: r.name, desc: r.desc || r.description, effect: 'direct_relic', param: r }));
                    switchScreen(this.state, 'event', {
                        runData, title: opt.name || '出土装备',
                        desc: '选择一件中级装备',
                        options,
                        returnScreen: 'map', returnData: data
                    });
                }
                return;
            case 'max_hearts_plus':
                runData.maxHearts = (runData.maxHearts || 3) + 1;
                showPlaceholderToast('最大人群+1！');
                this._finishEvent(runData);
                return;
            case 'enchant_mighty':
                if (runData.deck.length === 0) { showPlaceholderToast('牌组为空！'); return; }
                switchScreen(this.state, 'card_select', {
                    runData, title: opt.name || '轻语岩壁',
                    desc: '选择一张卡牌获得【伟力】词条',
                    cards: runData.deck, backText: '离开', selectMode: 'event_enchant_mighty',
                    returnScreen: 'map', returnData: data
                });
                return;
            case 'fight_monster':
                this._startEventBattle(runData, 'normal');
                return;
            case 'fight_elite':
                this._startEventBattle(runData, 'elite');
                return;
            case 'remove_for_souls':
                if (runData.deck.length === 0) { showPlaceholderToast('牌组为空！'); return; }
                switchScreen(this.state, 'card_select', {
                    runData, title: opt.name,
                    desc: `选择一张卡牌移除，获得 ${param || 3} 金币`,
                    cards: runData.deck, backText: '离开', selectMode: 'event_remove_for_souls',
                    returnScreen: 'map', returnData: data, eventParam: param || 3
                });
                return;
            case 'buy_random_card':
                if (runData.gold < (param || 1)) { showPlaceholderToast('金币不足！'); return; }
                runData.gold -= (param || 1);
                const pool = ['war_training', 'brute_force', 'ponder', 'vine_climb', 'clear_mind'];
                const randomDef = pool[Math.floor(Math.random() * pool.length)];
                const newCard = createCardInstance(randomDef);
                runData.deck.push(newCard);
                showPlaceholderToast(`获得卡牌：${newCard.name}`);
                this._finishEvent(runData);
                return;
            case 'gain_random_card':
                const freePool = ['war_training', 'brute_force', 'ponder', 'vine_climb', 'clear_mind'];
                const freeRandomDef = freePool[Math.floor(Math.random() * freePool.length)];
                const freeCard = createCardInstance(freeRandomDef);
                runData.deck.push(freeCard);
                showPlaceholderToast(`获得卡牌：${freeCard.name}`);
                this._finishEvent(runData);
                return;
            case 'duplicate_card':
                if (runData.deck.length === 0) { showPlaceholderToast('牌组为空！'); return; }
                switchScreen(this.state, 'card_select', {
                    runData, title: opt.name,
                    desc: '选择牌组内一张卡牌复制加入牌组',
                    cards: runData.deck, backText: '离开', selectMode: 'event_duplicate',
                    returnScreen: 'map', returnData: data
                });
                return;
            case 'direct_relic':
                if (param) {
                    runData.relics.push(param);
                    showPlaceholderToast(`获得装备：${param.name}`);
                }
                this._finishEvent(runData);
                return;
            default:
                showPlaceholderToast('该事件尚未实现');
                this._finishEvent(runData);
                return;
        }
    },

    _finishEvent(runData) {
        runData.pendingEventPool = null;
        runData.stageIndex++;
        if (runData.stageIndex >= 8) {
            if (runData.act >= 3) {
                switchScreen(this.state, 'victory', { runData });
            } else {
                switchScreen(this.state, 'act_transition', { runData });
            }
        } else {
            switchScreen(this.state, 'map', { runData });
        }
    },

    _startEventBattle(runData, type) {
        const actPrefix = `${runData.act}-`;
        const stageKeys = Object.keys(STAGE_CONFIG).filter(k => k.startsWith(actPrefix) && STAGE_CONFIG[k].type === type);
        if (stageKeys.length === 0) {
            showPlaceholderToast('附近没有合适的怪物！');
            this._finishEvent(runData);
            return;
        }
        const key = stageKeys[Math.floor(Math.random() * stageKeys.length)];
        const config = STAGE_CONFIG[key];
        const monsterDefId = config.monsterPool[Math.floor(Math.random() * config.monsterPool.length)];
        const tempStageIndex = parseInt(key.split('-')[1]) - 1;
        const originalStageIndex = runData.stageIndex;
        runData.stageIndex = tempStageIndex;
        const battleState = initBattleFromRun(runData);
        battleState._eventBattle = true;
        battleState._eventBattleReward = config.goldReward || (type === 'elite' ? 8 : 6);
        battleState._originalStageIndex = originalStageIndex;
        Object.assign(this.state, battleState);
        this.state.screen = 'battle';
        this.state.data = {};
        AnimationEngine.reset();
        AnimationEngine.enqueueFromTimeline(this.state);
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
            runData.act++;
            runData.stageIndex = 0;
            runData.completedStages = [];
            runData.shopStock = null;
            runData.blacksmithStock = null;
            runData.blacksmithSlotUpgraded = false;
            switchScreen(this.state, 'map', { runData });
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
        // 检测查看牌组按钮（任何阶段都可点击）
        if (this.state.data && this.state.data.deckViewBtnRect && this.hitTest(pos, this.state.data.deckViewBtnRect)) {
            this.toggleDeckView();
            return;
        }

        if (this.state.phase !== 'playing') {
            this.canvas.style.cursor = 'default';
            return;
        }

        const btnRect = getEndTurnButtonRect(this.renderer);
        if (this.hitTest(pos, btnRect)) {
            endTurn(this.state);
            AnimationEngine.enqueueFromTimeline(this.state);
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
        // 检测查看牌组按钮悬停
        if (this.state.data && this.state.data.deckViewBtnRect && this.hitTest(pos, this.state.data.deckViewBtnRect)) {
            this.state.data.hoverDeckViewBtn = true;
            this.canvas.style.cursor = 'pointer';
            this.hideTooltip();
            return;
        }

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
                // 检测装备悬停
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

            // Playground 对战测试场：自动重置，不跳屏
            if (this.state.screen === 'playground' || this.state._playgroundBattle) {
                setTimeout(() => {
                    if (this.state.phase !== 'ended') return;
                    if (isWin) {
                        this.state.message = '💀 击杀成功！自动重置战斗';
                    } else {
                        this.state.message = '💔 战斗失败！已自动恢复血量';
                    }
                    this.state.messageTimer = 90;
                    setTimeout(() => {
                        resetPlaygroundBattle(this.state);
                    }, 1200);
                }, 800);
                return;
            }

            setTimeout(() => {
                if (this.state.phase !== 'ended' || this.state.result !== (isWin ? 'win' : 'lose')) {
                    return;
                }
                if (isWin) {
                    const runData = this.state.runDataRef;
                    if (this.state._eventBattle) {
                        const reward = this.state._eventBattleReward || 4;
                        runData.gold += reward;
                        const allCards = [
                            ...this.state.deck, ...this.state.hand, ...this.state.discard,
                            ...this.state.slots.flatMap(s => s.cards)
                        ];
                        for (const c of allCards) {
                            c.tempBonus = 0;
                            c.dedicateTriggered = false;
                        }
                        runData.deck = allCards.filter(c => !c.isDerived);
                        if (this.state._originalStageIndex !== undefined) {
                            runData.stageIndex = this.state._originalStageIndex;
                        }
                        showPlaceholderToast(`战斗胜利！获得 ${reward} 金币`);
                        this._finishEvent(runData);
                        return;
                    }
                    const result = resolveBattleEnd(this.state);
                    if (result.nextScreen === 'shop') {
                        const stock = getOrCreateShopStock(runData);
                        switchScreen(this.state, 'shop', { runData, stock, postBattle: true });
                    } else if (result.nextScreen === 'blacksmith') {
                        switchScreen(this.state, 'blacksmith', { runData, postBattle: true });
                    } else if (result.nextScreen === 'boss_relic') {
                        switchScreen(this.state, 'boss_relic', {
                            runData, relicOptions: result.postBattleData.relicOptions, postBattle: true
                        });
                    } else if (result.nextScreen === 'act_transition') {
                        switchScreen(this.state, 'act_transition', {
                            runData, reward: result.postBattleData.reward, desc: result.postBattleData.desc
                        });
                    } else {
                        runData.stageIndex++;
                        switchScreen(this.state, 'map', { runData });
                    }
                } else {
                    const runData = this.state.runDataRef;
                    switchScreen(this.state, 'game_over', {
                        reachedStage: getCurrentStageKey(runData), totalGold: runData.gold
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
        html += `<p style="color:#4ecdc4">✋ 拖拽卡牌至此</p>`;
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
            html += `<p style="color:#ff6666;margin-top:4px">⚠️ 未击杀将失去 1 人群</p>`;
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
        html += `<p>🏛️ 装备: <b style="color:#cc9955">${player.relic.name}</b></p>`;
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
        if (state.data && state.data.viewingDeck) {
            e.preventDefault();
            const scrollY = state.data.deckViewScrollY || 0;
            const maxScroll = state.data.deckViewMaxScroll || 0;
            let newScroll = scrollY + e.deltaY;
            newScroll = Math.max(0, Math.min(newScroll, maxScroll));
            state.data.deckViewScrollY = newScroll;
        }
    },

    toggleDeckView() {
        const state = this.state;
        if (!state.data) state.data = {};
        const canView = this._canViewDeck(state);
        if (!canView) return;

        if (state.data.viewingDeck) {
            state.data.viewingDeck = false;
            state.data.deckViewScrollY = 0;
            this.hideTooltip();
        } else {
            state.data.viewingDeck = true;
            state.data.deckViewScrollY = 0;
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
        }
    },

    _canViewDeck(state) {
        const screen = state.screen;
        const runData = state.runDataRef || (state.data && state.data.runData);
        if (!runData) return false;
        // 在以下界面可以查看牌组
        const allowedScreens = ['battle', 'map', 'shop', 'blacksmith', 'event', 'treasure', 'post_battle', 'card_pick', 'boss_relic', 'act_transition', 'card_select'];
        return allowedScreens.includes(screen);
    },

    handleDeckViewMouseDown(pos) {
        const state = this.state;
        if (!state.data) return;

        // 关闭按钮
        if (state.data.deckViewCloseRect && this.hitTest(pos, state.data.deckViewCloseRect)) {
            this.toggleDeckView();
            return;
        }

        // 点击卡牌不做选择，只播放音效
        const scrollY = state.data.deckViewScrollY || 0;
        const adjustedPos = { x: pos.x, y: pos.y + scrollY };
        if (state.data.deckViewCardRects) {
            for (const rect of state.data.deckViewCardRects) {
                if (this.hitTest(adjustedPos, rect)) {
                    if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    return;
                }
            }
        }
    },

    handleDeckViewMouseMove(pos) {
        const state = this.state;
        if (!state.data) return;

        const scrollY = state.data.deckViewScrollY || 0;
        const adjustedPos = { x: pos.x, y: pos.y + scrollY };

        // 检测卡牌悬停
        if (state.data.deckViewCardRects) {
            for (const rect of state.data.deckViewCardRects) {
                if (this.hitTest(adjustedPos, rect)) {
                    state.data.deckViewHoverCard = rect.index;
                    this.canvas.style.cursor = 'default';
                    this.updateTooltip(rect.card, pos.x, pos.y);
                    return;
                }
            }
        }

        // 检测关闭按钮悬停
        if (state.data.deckViewCloseRect && this.hitTest(pos, state.data.deckViewCloseRect)) {
            state.data.deckViewHoverClose = true;
            this.canvas.style.cursor = 'pointer';
            return;
        }

        this.canvas.style.cursor = 'default';
        this.hideTooltip();
    },

    // ===== Playground =====

    handlePlaygroundClick(pos) {
        const pgView = this.state.data?.pgView || 'menu';

        if (pgView === 'menu') {
            const buttons = this.state.data?.pgMenuButtons || [];
            for (const btn of buttons) {
                if (this.hitTest(pos, btn)) {
                    if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    if (btn.id === 'battle') {
                        const monsterIds = Object.keys(MONSTER_DEFS);
                        const defaultMonster = monsterIds.length > 0 ? monsterIds[0] : 'face_plant';
                        enterPlaygroundBattle(this.state, defaultMonster);
                    } else if (btn.id === 'effect') {
                        // 进入词条效果沙盒，默认选中第一个场景
                        const scenarios = (typeof getAllScenarios !== 'undefined' ? getAllScenarios() : []);
                        const firstId = scenarios.length > 0 ? scenarios[0].id : 'mighty_basic';
                        enterEffectSandbox(this.state, firstId);
                    } else if (btn.id === 'back') {
                        backToPlaygroundMenu(this.state);
                        // 返回主菜单
                        switchScreen(this.state, 'title', {});
                    }
                    return;
                }
            }
        }
    },

    handlePlaygroundHover(pos, state) {
        const pgView = state.data?.pgView || 'menu';

        if (pgView === 'menu') {
            const buttons = state.data?.pgMenuButtons || [];
            let hovered = false;
            for (const btn of buttons) {
                if (this.hitTest(pos, btn)) {
                    PlaygroundState.ui.hoverButton = btn.id;
                    this.canvas.style.cursor = 'pointer';
                    hovered = true;
                    break;
                }
            }
            if (!hovered) {
                PlaygroundState.ui.hoverButton = null;
                this.canvas.style.cursor = 'default';
            }
        }
    }
};
