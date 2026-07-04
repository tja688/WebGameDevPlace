/**
 * Heave! - 输入处理系统
 * 
 * 架构：
 * - 核心层：坐标转换、hover状态管理、拖拽基础
 * - 分发层：根据 state.screen 分发到各处理函数
 * - 战斗层：矿石拖拽、格子检测、结束回合
 */

import { switchScreen, getCurrentStageKey } from '../core/state.js';
import { createRunData } from '../core/state.js';
import { initBattleFromRun, endTurn } from '../systems/battle.js';
import { drawCards } from '../core/battle-core.js';
import { resolveBattleEnd, generatePostBattleEvents, pickExcavatedRelicOptions } from '../systems/post-battle.js';
import { playCardToSlot, calculateTotalBoardDamage, getCardBaseValue, isCardDraggableFromSlot, moveSlotCard } from '../systems/board.js';
import { getCardDamageBreakdown, getExternalDamageSources } from '../systems/damage-breakdown.js';
import { getOrCreateShopStock, refreshShopStock, getOrCreateBlacksmithStock, refreshBlacksmithStock } from '../systems/shop.js';
import { createCardInstance, addKeywordToCard, KEYWORDS, CARD_DEFS, MONSTER_DEFS, RELIC_DEFS, createCardRewardOptions } from '../data/index.js';
import { showPlaceholderToast } from '../core/battle-core.js';
import { HAND_LIMIT } from '../core/constants.js';
import { STAGE_CONFIG } from '../data/index.js';
import { Renderer, getEndTurnButtonRect, getHandCardIndexAt, getSlotRect, getSlotIndexAt, getSlotCardAt } from '../render/renderer.js';
import { PlaygroundState, enterEffectSandbox, backToPlaygroundMenu, getAllScenarios, enterPlaygroundBattle, resetPlaygroundBattle } from '../playground/index.js';
import { Tutorial } from '../tutorial.js';

export const Input = {
    state: null,
    renderer: null,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    _windowMouseUpHandler: null,
    _windowTouchEndHandler: null,
    _windowTouchCancelHandler: null,

    // 入场矿石拖动状态
    isDraggingSlotCard: false,
    draggedSlotCard: null,
    draggedSlotCardFromIndex: -1,
    draggedSlotCardIndex: -1,
    dragInsertSlotIndex: -1,
    dragInsertCardIndex: -1,

    _getSlotHeaderAt(pos) {
        const rects = this.state?.data?.slotHeaderRects || [];
        for (const rect of rects) {
            if (this.hitTest(pos, rect)) return rect;
        }
        return null;
    },

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
        this.canvas.addEventListener('touchcancel', e => {
            e.preventDefault();
            this.onMouseUp(e);
        }, { passive: false });

        if (this._windowMouseUpHandler) {
            window.removeEventListener('mouseup', this._windowMouseUpHandler);
        }
        if (this._windowTouchEndHandler) {
            window.removeEventListener('touchend', this._windowTouchEndHandler);
        }
        if (this._windowTouchCancelHandler) {
            window.removeEventListener('touchcancel', this._windowTouchCancelHandler);
        }

        this._windowMouseUpHandler = e => this.onMouseUp(e);
        this._windowTouchEndHandler = e => this.onMouseUp(e);
        this._windowTouchCancelHandler = e => this.onMouseUp(e);

        window.addEventListener('mouseup', this._windowMouseUpHandler);
        window.addEventListener('touchend', this._windowTouchEndHandler, { passive: false });
        window.addEventListener('touchcancel', this._windowTouchCancelHandler, { passive: false });
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

    getEventCanvasPos(e) {
        const touch = e?.changedTouches?.[0] || e?.touches?.[0];
        const clientX = touch ? touch.clientX : e?.clientX;
        const clientY = touch ? touch.clientY : e?.clientY;
        if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
            return this.getCanvasPos(clientX, clientY);
        }
        if (this.isDragging && Number.isFinite(this.state?.dragX) && Number.isFinite(this.state?.dragY)) {
            return { x: this.state.dragX, y: this.state.dragY };
        }
        return null;
    },

    onMouseDown(e) {
        if (Tutorial.isActive()) return;

        const pos = this.getEventCanvasPos(e);
        if (!pos) return;
        const state = this.state;

        if (state.data && state.data.viewingDeck) {
            this.handleDeckViewMouseDown(pos);
            return;
        }

        // 通用查看矿舱按钮检测
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
        if (Tutorial.isActive()) {
            this.canvas.style.cursor = 'default';
            this.hideTooltip();
            return;
        }

        const pos = this.getEventCanvasPos(e);
        if (!pos) return;
        const state = this.state;

        this.clearAllHovers(state);

        if (state.data && state.data.viewingDeck) {
            this.handleDeckViewMouseMove(pos);
            return;
        }

        // 通用查看矿舱按钮悬停检测
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
        if (Tutorial.isActive()) {
            this.isDragging = false;
            this.isDraggingSlotCard = false;
            if (this.state) {
                this.state.draggedCard = null;
                this.state.hoveredSlot = null;
            }
            this.canvas.style.cursor = 'default';
            return;
        }

        // 处理入场矿石拖动释放
        if (this.isDraggingSlotCard && this.draggedSlotCard) {
            const pos = this.getEventCanvasPos(e) || { x: this.state.dragX, y: this.state.dragY };
            let slotIdx = this.dragInsertSlotIndex;
            let insertIdx = this.dragInsertCardIndex;

            if (slotIdx < 0 && pos) {
                const hoveredSlot = getSlotIndexAt(this.renderer, pos.x, pos.y, this.state.slots.length);
                if (hoveredSlot !== null) {
                    slotIdx = hoveredSlot;
                    insertIdx = this._calculateInsertIndex(hoveredSlot, pos.y);
                }
            }

            if (slotIdx >= 0 && insertIdx >= 0) {
                const success = moveSlotCard(
                    this.draggedSlotCard,
                    this.draggedSlotCardFromIndex,
                    slotIdx,
                    insertIdx,
                    this.state
                );
                if (success) {
                    this.state.turnDamage = calculateTotalBoardDamage(this.state);
                    if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                }
            }

            this._clearSlotDragState();
            this.checkBattleEnd();
            return;
        }

        if (!this.isDragging || !this.state.draggedCard) {
            this.isDragging = false;
            return;
        }

        const pos = this.getEventCanvasPos(e) || { x: this.state.dragX, y: this.state.dragY };
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

    _clearSlotDragState() {
        this.isDraggingSlotCard = false;
        this.draggedSlotCard = null;
        this.draggedSlotCardFromIndex = -1;
        this.draggedSlotCardIndex = -1;
        this.dragInsertSlotIndex = -1;
        this.dragInsertCardIndex = -1;
        this.state.dragX = 0;
        this.state.dragY = 0;
        this.state.hoveredSlot = null;
        this.canvas.style.cursor = 'default';
    },

    _calculateInsertIndex(slotIndex, py) {
        const slot = this.state.slots[slotIndex];
        const sr = getSlotRect(this.renderer, slotIndex, this.state.slots.length);
        const cardH = 34;
        const cardGap = 4;
        const startY = sr.y + 10;
        const visibleCards = (this.isDraggingSlotCard && this.draggedSlotCard && slotIndex === this.draggedSlotCardFromIndex)
            ? slot.cards.filter(card => card.uuid !== this.draggedSlotCard.uuid)
            : slot.cards;

        // 如果没有矿石，插入到开头
        if (visibleCards.length === 0) return 0;

        // 根据Y坐标判断插入位置
        for (let i = 0; i < visibleCards.length; i++) {
            const cardCenterY = startY + i * (cardH + cardGap) + cardH / 2;
            if (py < cardCenterY) {
                return i;
            }
        }
        return visibleCards.length;
    },

    onMouseLeave(e) {
        this.canvas.style.cursor = 'default';
        this.hideTooltip();

        if (this.isDragging || this.isDraggingSlotCard) {
            this.state.hoveredSlot = null;
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
        state.data.hoverAdventureCheat = null;
        state.data.hoverSettings = null;
        state.data.hoverFeedbackLink = false;
        state.data.deckViewHoverCard = null;
        state.data.deckViewHoverClose = false;
        state.data.hoverStrategyOption = null;
        state.data.hoverStrategyRow = null;
        state.data.hoverSlotHeader = null;
    },

    hitTest(pos, rect) {
        return pos.x >= rect.x && pos.x <= rect.x + rect.w &&
               pos.y >= rect.y && pos.y <= rect.y + rect.h;
    },

    // ===== 标题界面 =====
    handleTitleHover(pos, state) {
        let hovering = false;
        if (state.data.startBtnRect && this.hitTest(pos, state.data.startBtnRect)) {
            state.data.hoverStart = true;
            hovering = true;
        } else {
            state.data.hoverStart = false;
        }
        if (state.data.tutorialBtnRect && this.hitTest(pos, state.data.tutorialBtnRect)) {
            state.data.hoverTutorial = true;
            hovering = true;
        } else {
            state.data.hoverTutorial = false;
        }
        this.canvas.style.cursor = hovering ? 'pointer' : 'default';
    },

    handleTitleClick(pos) {
        if (this.state.data.startBtnRect && this.hitTest(pos, this.state.data.startBtnRect)) {
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            switchScreen(this.state, 'class_select', {});
            return;
        }
        if (this.state.data.tutorialBtnRect && this.hitTest(pos, this.state.data.tutorialBtnRect)) {
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            Tutorial.reset();
            return;
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

    // ===== 通用矿石选择界面 =====
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
                            showPlaceholderToast('银元不足！');
                            data.processing = false;
                            return;
                        }
                        runData.gold -= removeCost;
                        runData.shopRemoveCost = removeCost * 2;
                        const idx = runData.deck.findIndex(c => c.uuid === card.uuid);
                        if (idx !== -1) runData.deck.splice(idx, 1);
                        showPlaceholderToast(`已移除 ${card.name}（消耗${removeCost}银元）`);
                        data.processing = false;
                        switchScreen(this.state, 'shop', data.returnData || { runData, stock: getOrCreateShopStock(runData) });
                        return;
                    }

                    if (data.selectMode === 'shop_upgrade') {
                        const cardCost = runData.shopUpgradeCosts[card.uuid] || 2;
                        const upgradeCost = cardCost;
                        if (runData.gold < upgradeCost) {
                            showPlaceholderToast(`银元不足！需要${upgradeCost}银元`);
                            data.processing = false;
                            return;
                        }
                        runData.gold -= upgradeCost;
                        card.permanentBonus += 5;
                        runData.shopUpgradeCosts[card.uuid] = cardCost + 1;
                        showPlaceholderToast(`${card.name} 数值+5（消耗${upgradeCost}银元）！`);
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
                        showPlaceholderToast(`${card.name} 获得【淬火1】！`);
                        setTimeout(() => {
                            data.processing = false;
                            this._finishEvent(runData);
                        }, 600);
                        return;
                    }

                    if (data.selectMode === 'event_enchant_spread') {
                        const result = addKeywordToCard(card, 'spread');
                        if (!result.ok) {
                            showPlaceholderToast(result.reason);
                            data.processing = false;
                            return;
                        }
                        showPlaceholderToast(`${card.name} 获得【碎屑】！`);
                        setTimeout(() => {
                            data.processing = false;
                            this._finishEvent(runData);
                        }, 600);
                        return;
                    }

                    if (data.selectMode === 'event_remove_free') {
                        const idx = runData.deck.findIndex(c => c.uuid === card.uuid);
                        if (idx !== -1) runData.deck.splice(idx, 1);
                        showPlaceholderToast(`已移除 ${card.name}`);
                        setTimeout(() => {
                            data.processing = false;
                            this._finishEvent(runData);
                        }, 600);
                        return;
                    }

                    if (data.selectMode === 'event_transform') {
                        const pool = Object.keys(CARD_DEFS).filter(id => id !== 'diffusion' && id !== card.defId);
                        const defId = pool[Math.floor(Math.random() * pool.length)];
                        const replacement = createCardInstance(defId);
                        const idx = runData.deck.findIndex(c => c.uuid === card.uuid);
                        if (idx !== -1 && replacement) runData.deck[idx] = replacement;
                        showPlaceholderToast(`${card.name} 变成了 ${replacement.name}`);
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
                        showPlaceholderToast(`移除 ${card.name}，获得 ${gain} 银元！`);
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
                        showPlaceholderToast(`获得矿石：${card.name}`);
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
                        showPlaceholderToast(`${card.name} 获得【熔核】！`);
                        setTimeout(() => {
                            data.processing = false;
                            this._finishEvent(runData);
                        }, 600);
                        return;
                    }

                    if (data.selectMode === 'blacksmith_enchant') {
                        const keyword = data.enchantKeyword;
                        const cost = runData.blacksmithFirstEnchantFree ? 0 : data.enchantCost;
                        if (runData.gold < cost) {
                            showPlaceholderToast('银元不足！');
                            data.processing = false;
                            return;
                        }
                        const result = addKeywordToCard(card, keyword);
                        if (result.ok) {
                            runData.gold -= cost;
                            if (runData.blacksmithFirstEnchantFree) runData.blacksmithFirstEnchantFree = false;
                            // 记录本船坞已敲词条，刷新后不再出现
                            if (!runData.blacksmithEnchantedKeywords) runData.blacksmithEnchantedKeywords = [];
                            if (!runData.blacksmithEnchantedKeywords.includes(keyword)) {
                                runData.blacksmithEnchantedKeywords.push(keyword);
                            }
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

                    if (data.selectMode === 'boss_remove_four') {
                        const idx = runData.deck.findIndex(c => c.uuid === card.uuid);
                        if (idx !== -1) runData.deck.splice(idx, 1);
                        const remaining = Math.max(0, (data.bossRemoveRemaining || 1) - 1);
                        showPlaceholderToast(`已删除 ${card.name}`);
                        if (remaining > 0 && runData.deck.length > 0) {
                            data.processing = false;
                            switchScreen(this.state, 'card_select', {
                                runData,
                                title: '我爱玩小矿舱',
                                desc: `继续选择要删除的矿石（剩余${remaining}块）`,
                                cards: runData.deck,
                                backText: '完成',
                                selectMode: 'boss_remove_four',
                                bossRemoveRemaining: remaining,
                                returnScreen: 'boss_relic_done',
                                returnData: data.returnData || { runData }
                            });
                        } else {
                            setTimeout(() => {
                                data.processing = false;
                                this._afterBossRelicSelection(runData);
                            }, 300);
                        }
                        return;
                    }

                    if (data.selectMode === 'boss_copy_four') {
                        for (let i = 0; i < 4; i++) {
                            const copy = JSON.parse(JSON.stringify(card));
                            copy.uuid = Math.random().toString(36).slice(2, 11);
                            runData.deck.push(copy);
                        }
                        showPlaceholderToast(`复制了 ${card.name} x4`);
                        setTimeout(() => {
                            data.processing = false;
                            this._afterBossRelicSelection(runData);
                        }, 300);
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
            } else if (data.returnScreen === 'boss_relic_done') {
                this._afterBossRelicSelection(runData);
            } else {
                switchScreen(this.state, data.returnScreen || 'map', data.returnData || { runData });
            }
        }
    },

    // ===== 选矿界面 =====
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
                    showPlaceholderToast(`获得矿石：${newCard.name}`);

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

    // ===== BOSS船体改造选择 =====
    handleBossRelicClick(pos) {
        const data = this.state.data;
        const runData = data.runData;
        if (data.processing) return;

        if (data.optionRects) {
            for (const rect of data.optionRects) {
                if (this.hitTest(pos, rect)) {
                    if (typeof GameAudio !== 'undefined') GameAudio.playWin();
                    runData.relics.push(rect.data);
                    showPlaceholderToast(`获得BOSS船体改造：${rect.data.name}`);
                    data.processing = true;
                    if (rect.data.effect?.type === 'remove_four_cards') {
                        setTimeout(() => {
                            data.processing = false;
                            if (runData.deck.length === 0) {
                                this._afterBossRelicSelection(runData);
                                return;
                            }
                            switchScreen(this.state, 'card_select', {
                                runData,
                                title: rect.data.name,
                                desc: '选择矿舱内4块矿石删除',
                                cards: runData.deck,
                                backText: '完成',
                                selectMode: 'boss_remove_four',
                                bossRemoveRemaining: Math.min(4, runData.deck.length),
                                returnScreen: 'boss_relic_done',
                                returnData: { runData }
                            });
                        }, 300);
                        return;
                    }
                    if (rect.data.effect?.type === 'copy_card_four') {
                        setTimeout(() => {
                            data.processing = false;
                            if (runData.deck.length === 0) {
                                this._afterBossRelicSelection(runData);
                                return;
                            }
                            switchScreen(this.state, 'card_select', {
                                runData,
                                title: rect.data.name,
                                desc: '选择矿舱内一块矿石复制4块加入矿舱',
                                cards: runData.deck,
                                backText: '跳过',
                                selectMode: 'boss_copy_four',
                                returnScreen: 'boss_relic_done',
                                returnData: { runData }
                            });
                        }, 300);
                        return;
                    }
                    setTimeout(() => {
                        data.processing = false;
                        this._afterBossRelicSelection(runData);
                    }, 400);
                    return;
                }
            }
        }
    },

    _afterBossRelicSelection(runData) {
        const eventOptions = generatePostBattleEvents(runData);
        switchScreen(this.state, 'event', {
            runData, options: eventOptions, postBattle: true
        });
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

    // ===== 精炼厂 =====
    handleShopHover(pos, state) {
        if (state.data.strategyOptionRects) {
            for (const rect of state.data.strategyOptionRects) {
                if (this.hitTest(pos, rect)) {
                    state.data.hoverStrategyOption = rect.index;
                    this.canvas.style.cursor = 'pointer';
                    return;
                }
            }
            this.canvas.style.cursor = 'default';
            return;
        }

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

        // 叠牌系统已废弃，忽略叠牌二选一弹窗点击
        if (data.strategyOptions && data.strategyOptionRects) {
            data.strategyOptions = null;
            data.strategyOptionRects = null;
        }

        if (data.shopItemRects) {
            for (const rect of data.shopItemRects) {
                if (this.hitTest(pos, rect) && !rect.item.bought) {
                    const freeCardPurchase = rect.type === 'card' && runData.relics?.some(r => r.effect?.type === 'free_card_purchase');
                    const actualPrice = freeCardPurchase ? 0 : rect.price;
                    if (runData.gold >= actualPrice) {
                        runData.gold -= actualPrice;
                        rect.item.bought = true;
                        if (rect.type === 'card') {
                            const newCard = createCardInstance(rect.item.defId);
                            runData.deck.push(newCard);
                            showPlaceholderToast(`获得矿石：${newCard.name}`);
                        } else if (rect.type === 'relic') {
                            const relic = { ...rect.item };
                            delete relic.price;
                            delete relic.bought;
                            runData.relics.push(relic);
                            showPlaceholderToast(`获得船体改造：${relic.name}`);
                        }
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    } else {
                        showPlaceholderToast('银元不足！');
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
                            if (runData.freeRefreshCount > 0) {
                                runData.freeRefreshCount--;
                                refreshShopStock(runData);
                                data.stock = runData.shopStock;
                                runData.shopRefreshCost += 1;
                                if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                                showPlaceholderToast('精炼厂已刷新（使用免费次数）');
                            } else if (runData.shopFriendRefreshAvailable) {
                                runData.shopFriendRefreshAvailable = false;
                                refreshShopStock(runData);
                                data.stock = runData.shopStock;
                                runData.shopRefreshCost += 1;
                                if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                                showPlaceholderToast('朋友证生效：精炼厂已免费刷新');
                            } else {
                                runData.gold -= rect.cost;
                                refreshShopStock(runData);
                                data.stock = runData.shopStock;
                                runData.shopRefreshCost += 1;
                                if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                                showPlaceholderToast('精炼厂已刷新');
                            }
                        } else if (rect.key === 'remove_card') {
                            if (runData.deck.length === 0) { showPlaceholderToast('矿舱为空！'); return; }
                            const removeCost = runData.shopRemoveCost || 2;
                            switchScreen(this.state, 'card_select', {
                                runData, title: '🗑️ 移除矿石服务', desc: `选择矿舱内一块矿石移除（消耗${removeCost}银元，每次翻倍）`,
                                cards: runData.deck, backText: '取消', selectMode: 'shop_remove',
                                returnScreen: 'shop', returnData: data
                            });
                        } else if (rect.key === 'upgrade_card') {
                            if (runData.deck.length === 0) { showPlaceholderToast('矿舱为空！'); return; }
                            switchScreen(this.state, 'card_select', {
                                runData, title: '⬆️ 数值强化', desc: '选择矿舱内一块矿石，数值永久+5（费用按单卡独立计算）',
                                cards: runData.deck, backText: '取消', selectMode: 'shop_upgrade',
                                returnScreen: 'shop', returnData: data
                            });
                        } else if (rect.key === 'buy_strategy') {
                            if (runData.gold < 4) { showPlaceholderToast('银元不足！'); return; }
                            runData.gold -= 4;
                            const strategies = ['attempt_push', 'left_assault', 'right_assault', 'mid_assault', 'steady_push', 'plan_left', 'plan_right', 'plan_mid', 'forceful_push'];
                            // 二选一
                            const pool = [...strategies];
                            const opt1 = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
                            const opt2 = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
                            data.strategyOptions = [opt1, opt2];
                            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                            return;
                        }
                    } else {
                        showPlaceholderToast('银元不足！');
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardInvalid();
                    }
                    return;
                }
            }
        }

        if (data.backBtnRect && this.hitTest(pos, data.backBtnRect)) {
            runData.shopStock = null;
            if (data.postBattle && runData.pendingEventPool) {
                // 战后流程：精炼厂结束后进入事件
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

    // ===== 船坞 =====
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
                        showPlaceholderToast('同一船坞仅能强化一次铸造台');
                        return;
                    }
                    if (!rect.canAfford) {
                        showPlaceholderToast('银元不足！');
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
                        showPlaceholderToast(`获得船体改造：${item.name}`);
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    } else if (rect.item.type === 'upgrade_slot') {
                        if (runData.blacksmithSlotUpgraded) {
                            showPlaceholderToast('同一船坞仅能强化一次铸造台');
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
                        if (runData.deck.length === 0) { showPlaceholderToast('矿舱为空！'); return; }
                        const keyword = rect.item.keyword || null;
                        const kwName = KEYWORDS[keyword] ? KEYWORDS[keyword].name : keyword;
                        switchScreen(this.state, 'card_select', {
                            runData, title: `✨ 附魔【${kwName}】`, desc: '选择矿舱内一块矿石，为其添加词条',
                            cards: runData.deck, backText: '取消', selectMode: 'blacksmith_enchant',
                            returnScreen: 'blacksmith', returnData: data,
                            enchantKeyword: keyword, enchantCost: rect.item.cost
                        });
                    } else if (rect.item.type === 'refresh') {
                        if (runData.blacksmithFriendRefreshAvailable) {
                            runData.blacksmithFriendRefreshAvailable = false;
                        } else {
                            runData.gold -= rect.item.cost;
                        }
                        refreshBlacksmithStock(runData);
                        data.stock = runData.blacksmithStock;
                        runData.blacksmithRefreshCost += 1;
                        showPlaceholderToast('船坞铺已刷新！');
                        if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
                    }
                    return;
                }
            }
        }

        if (data.backBtnRect && this.hitTest(pos, data.backBtnRect)) {
            runData.blacksmithStock = null;
            if (data.postBattle && runData.pendingEventPool) {
                // 战后流程：船坞结束后进入事件
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
                if (runData.deck.length === 0) { showPlaceholderToast('矿舱为空！'); return; }
                switchScreen(this.state, 'card_select', {
                    runData, title: opt.name,
                    desc: `选择矿舱内一块矿石，数值永久+${param || 5}`,
                    cards: runData.deck, backText: '离开', selectMode: 'event_buff',
                    returnScreen: 'map', returnData: data, eventParam: param || 5
                });
                return;
            case 'enchant_grow':
                if (runData.deck.length === 0) { showPlaceholderToast('矿舱为空！'); return; }
                switchScreen(this.state, 'card_select', {
                    runData, title: opt.name,
                    desc: '选择一块矿石，使其获得【淬火1】',
                    cards: runData.deck, backText: '离开', selectMode: 'event_enchant_grow',
                    returnScreen: 'map', returnData: data
                });
                return;
            case 'gain_gold':
                runData.gold += (param || 4);
                showPlaceholderToast(`获得 ${param || 4} 银元！`);
                this._finishEvent(runData);
                return;
            case 'gain_souls':
                runData.gold += (param || 1);
                showPlaceholderToast(`获得 ${param || 1} 银元！`);
                this._finishEvent(runData);
                return;
            case 'gamble':
                if (Math.random() < 0.5) {
                    runData.gold += 3;
                    showPlaceholderToast('赌局胜利！获得 3 银元！');
                } else {
                    runData.gold = Math.max(0, runData.gold - 2);
                    showPlaceholderToast('赌局失败...失去 2 银元');
                }
                this._finishEvent(runData);
                return;
            case 'gain_relic':
                {
                    const relic = this._pickRandomRelic(['common']);
                    if (relic) runData.relics.push(relic);
                    showPlaceholderToast(relic ? `获得船体改造：${relic.name}` : '没有可获得的船体改造');
                }
                this._finishEvent(runData);
                return;
            case 'gain_rare_relic':
                {
                    const relic = this._pickRandomRelic(['epic']);
                    if (relic) runData.relics.push(relic);
                    showPlaceholderToast(relic ? `获得船体改造：${relic.name}` : '没有可获得的船体改造');
                }
                this._finishEvent(runData);
                return;
            case 'random_strategy_level':
                {
                    // 叠牌系统已废弃，改为获得1银元
                    runData.gold = (runData.gold || 0) + 1;
                    showPlaceholderToast('获得1银元');
                    this._finishEvent(runData);
                }
                return;
            case 'self_blacksmith':
                {
                    const sbParam = param || { goldCost: 2, slotBonus: 1 };
                    if (runData.gold < sbParam.goldCost) { showPlaceholderToast('银元不足！'); return; }
                    runData.gold -= sbParam.goldCost;
                    const availSlots = [0, 1, 2];
                    const randSlot = availSlots[Math.floor(Math.random() * availSlots.length)];
                    runData.slotUpgrades[randSlot] = (runData.slotUpgrades[randSlot] || 0) + sbParam.slotBonus;
                    showPlaceholderToast(`第${randSlot + 1}格倍率+${sbParam.slotBonus}！（消耗${sbParam.goldCost}银元）`);
                    this._finishEvent(runData);
                }
                return;
            case 'card_pick_three':
                {
                    const cardDefs = createCardRewardOptions();
                    const cardInstances = cardDefs.map(defId => createCardInstance(defId));
                    switchScreen(this.state, 'card_select', {
                        runData, title: opt.name || '及时的帮助',
                        desc: '选择一块矿石加入矿舱',
                        cards: cardInstances, backText: '放弃', selectMode: 'event_pick_card',
                        returnScreen: 'map', returnData: data
                    });
                }
                return;
            case 'gain_specific_card':
                {
                    const defId = param || 'no_wisdom';
                    const card = createCardInstance(defId);
                    if (card) {
                        runData.deck.push(card);
                        showPlaceholderToast(`获得矿石：${card.name}`);
                    }
                    this._finishEvent(runData);
                }
                return;
            case 'free_remove_card':
                if (runData.deck.length === 0) { showPlaceholderToast('矿舱为空！'); return; }
                switchScreen(this.state, 'card_select', {
                    runData, title: opt.name || '求牌乞丐',
                    desc: '选择一块矿石免费移除',
                    cards: runData.deck, backText: '离开', selectMode: 'event_remove_free',
                    returnScreen: 'map', returnData: data
                });
                return;
            case 'buy_random_relic':
                {
                    const cost = param || 4;
                    if (runData.gold < cost) { showPlaceholderToast('银元不足！'); return; }
                    runData.gold -= cost;
                    const relic = this._pickRandomRelic(['common', 'rare', 'epic']);
                    if (relic) runData.relics.push(relic);
                    showPlaceholderToast(relic ? `获得船体改造：${relic.name}` : '没有可获得的船体改造');
                    this._finishEvent(runData);
                }
                return;
            case 'transform_card':
                if (runData.deck.length === 0) { showPlaceholderToast('矿舱为空！'); return; }
                switchScreen(this.state, 'card_select', {
                    runData, title: opt.name || '乱涂乱画',
                    desc: '选择一块矿石随机转换为另一块矿石',
                    cards: runData.deck, backText: '离开', selectMode: 'event_transform',
                    returnScreen: 'map', returnData: data
                });
                return;
            case 'grow_cards_twice':
                {
                    let count = 0;
                    for (const card of runData.deck) {
                        if (card.keywords && card.keywords.includes('grow')) {
                            card.permanentBonus += (card.growAmount || 1) * 2;
                            count++;
                        }
                    }
                    showPlaceholderToast(count > 0 ? `${count} 块淬火牌淬火2次！` : '矿舱中没有淬火牌');
                    this._finishEvent(runData);
                }
                return;
            case 'enchant_spread':
                if (runData.deck.length === 0) { showPlaceholderToast('矿舱为空！'); return; }
                switchScreen(this.state, 'card_select', {
                    runData, title: opt.name || '盲目岩壁',
                    desc: '选择一块矿石获得【碎屑】词条',
                    cards: runData.deck, backText: '离开', selectMode: 'event_enchant_spread',
                    returnScreen: 'map', returnData: data
                });
                return;
            case 'next_monster_hp_down':
                runData.nextMonsterHpPenalty = (runData.nextMonsterHpPenalty || 0) + (param || 200);
                showPlaceholderToast(`下一场战斗敌舰血量-${param || 200}`);
                this._finishEvent(runData);
                return;
            case 'next_battle_hearts_plus':
                runData.nextBattleHeartBonus = (runData.nextBattleHeartBonus || 0) + (param || 1);
                showPlaceholderToast(`下一场战斗生命值+${param || 1}`);
                this._finishEvent(runData);
                return;
            case 'next_shop_system':
                {
                    const systems = ['neutral', 'big_number', 'growth'];
                    const names = { neutral: '中立', big_number: '大数字', growth: '淬火' };
                    const system = systems[Math.floor(Math.random() * systems.length)];
                    runData.nextShopCardSystem = system;
                    showPlaceholderToast(`预言家生效：下次精炼厂矿石刷新为${names[system]}体系`);
                    this._finishEvent(runData);
                }
                return;
            case 'pick_rare_relic':
                {
                    const options = pickExcavatedRelicOptions()
                        .map(r => ({ name: r.name, desc: r.desc || r.description, effect: 'direct_relic', param: r }));
                    switchScreen(this.state, 'event', {
                        runData, title: opt.name || '出土船体改造',
                        desc: '选择一件中阶船体改造',
                        options,
                        returnScreen: 'map', returnData: data
                    });
                }
                return;
            case 'max_hearts_plus':
                runData.maxHearts = (runData.maxHearts || 3) + 1;
                showPlaceholderToast('最大生命值+1！');
                this._finishEvent(runData);
                return;
            case 'enchant_mighty':
                if (runData.deck.length === 0) { showPlaceholderToast('矿舱为空！'); return; }
                switchScreen(this.state, 'card_select', {
                    runData, title: opt.name || '轻语岩壁',
                    desc: '选择一块矿石获得【熔核】词条',
                    cards: runData.deck, backText: '离开', selectMode: 'event_enchant_mighty',
                    returnScreen: 'map', returnData: data
                });
                return;
            case 'fight_monster':
                this._startEventBattle(runData, 'normal_x7');
                return;
            case 'fight_elite':
                this._startEventBattle(runData, 'elite');
                return;
            case 'remove_for_souls':
                if (runData.deck.length === 0) { showPlaceholderToast('矿舱为空！'); return; }
                switchScreen(this.state, 'card_select', {
                    runData, title: opt.name,
                    desc: `选择一块矿石移除，获得 ${param || 3} 银元`,
                    cards: runData.deck, backText: '离开', selectMode: 'event_remove_for_souls',
                    returnScreen: 'map', returnData: data, eventParam: param || 3
                });
                return;
            case 'buy_random_card':
                if (runData.gold < (param || 1)) { showPlaceholderToast('银元不足！'); return; }
                runData.gold -= (param || 1);
                const pool = ['war_training', 'brute_force', 'ponder', 'vine_climb', 'clear_mind'];
                const randomDef = pool[Math.floor(Math.random() * pool.length)];
                const newCard = createCardInstance(randomDef);
                runData.deck.push(newCard);
                showPlaceholderToast(`获得矿石：${newCard.name}`);
                this._finishEvent(runData);
                return;
            case 'gain_random_card':
                const freePool = ['war_training', 'brute_force', 'ponder', 'vine_climb', 'clear_mind'];
                const freeRandomDef = freePool[Math.floor(Math.random() * freePool.length)];
                const freeCard = createCardInstance(freeRandomDef);
                runData.deck.push(freeCard);
                showPlaceholderToast(`获得矿石：${freeCard.name}`);
                this._finishEvent(runData);
                return;
            case 'duplicate_card':
                if (runData.deck.length === 0) { showPlaceholderToast('矿舱为空！'); return; }
                switchScreen(this.state, 'card_select', {
                    runData, title: opt.name,
                    desc: '选择矿舱内一块矿石复制加入矿舱',
                    cards: runData.deck, backText: '离开', selectMode: 'event_duplicate',
                    returnScreen: 'map', returnData: data
                });
                return;
            case 'direct_relic':
                if (param) {
                    runData.relics.push(param);
                    showPlaceholderToast(`获得船体改造：${param.name}`);
                }
                this._finishEvent(runData);
                return;
            default:
                showPlaceholderToast('该事件尚未实现');
                this._finishEvent(runData);
                return;
        }
    },

    _pickRandomRelic(rarities) {
        const pool = RELIC_DEFS.filter(r => rarities.includes(r.rarity));
        if (pool.length === 0) return null;
        const weights = { common: 65, rare: 30, epic: 5 };
        const weighted = [];
        for (const rarity of rarities) {
            const rarityPool = pool.filter(r => r.rarity === rarity);
            if (rarityPool.length > 0) weighted.push({ rarity, weight: weights[rarity] || 1, pool: rarityPool });
        }
        const total = weighted.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * total;
        for (const item of weighted) {
            if (roll < item.weight) {
                return item.pool[Math.floor(Math.random() * item.pool.length)];
            }
            roll -= item.weight;
        }
        return pool[Math.floor(Math.random() * pool.length)];
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
        const stageKeys = type === 'normal_x7'
            ? Object.keys(STAGE_CONFIG).filter(k => k === `${runData.act}-7`)
            : Object.keys(STAGE_CONFIG).filter(k => k.startsWith(actPrefix) && STAGE_CONFIG[k].type === type);
        if (stageKeys.length === 0) {
            showPlaceholderToast('附近没有合适的敌舰！');
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
        // 检测查看矿舱按钮（任何阶段都可点击）
        if (this.state.data && this.state.data.deckViewBtnRect && this.hitTest(pos, this.state.data.deckViewBtnRect)) {
            this.toggleDeckView();
            return;
        }

        if (this.handleSettingsClick(pos)) {
            return;
        }

        if (this.handleFeedbackClick(pos)) {
            return;
        }

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

        // 优先检测是否点击了铸造台内的矿石（入场矿石拖动）
        const slotCardInfo = getSlotCardAt(this.renderer, pos.x, pos.y, this.state.slots);
        if (slotCardInfo && isCardDraggableFromSlot(slotCardInfo.card)) {
            this.isDragging = false;
            this.state.draggedCard = null;
            this.state.selectedCard = null;
            this.state.hoveredSlot = null;
            this.isDraggingSlotCard = true;
            this.draggedSlotCard = slotCardInfo.card;
            this.draggedSlotCardFromIndex = slotCardInfo.slotIndex;
            this.draggedSlotCardIndex = slotCardInfo.cardIndex;
            this.dragInsertSlotIndex = slotCardInfo.slotIndex;
            this.dragInsertCardIndex = this._calculateInsertIndex(slotCardInfo.slotIndex, pos.y);
            this.state.dragX = pos.x;
            this.state.dragY = pos.y;
            this.canvas.style.cursor = 'grabbing';
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
        // 检测查看矿舱按钮悬停
        if (this.state.data && this.state.data.deckViewBtnRect && this.hitTest(pos, this.state.data.deckViewBtnRect)) {
            this.state.data.hoverDeckViewBtn = true;
            this.canvas.style.cursor = 'pointer';
            this.hideTooltip();
            return;
        }

        if (this.handleSettingsHover(pos)) {
            return;
        }

        if (this.handleFeedbackHover(pos)) {
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

        // 处理入场矿石拖动
        if (this.isDraggingSlotCard && this.draggedSlotCard) {
            this.state.dragX = pos.x;
            this.state.dragY = pos.y;
            const slotIdx = getSlotIndexAt(this.renderer, pos.x, pos.y, this.state.slots.length);
            this.dragInsertSlotIndex = slotIdx !== null ? slotIdx : -1;
            if (slotIdx !== null) {
                this.dragInsertCardIndex = this._calculateInsertIndex(slotIdx, pos.y);
            } else {
                this.dragInsertCardIndex = -1;
            }
            this.canvas.style.cursor = 'grabbing';
            this.hideTooltip();
            this.state.selectedCard = null;
            this.state.hoveredSlot = null;
            this.state.hoveredMonster = false;
            this.state.hoveredEndTurn = false;
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
            const handIdx = getHandCardIndexAt(this.renderer, pos.x, pos.y, this.state.hand.length);
            const endTurnRect = getEndTurnButtonRect(this.renderer);
            const isOverEndTurn = this.hitTest(pos, endTurnRect);
            const isOverMonster = pos.x >= this.renderer.width * 0.5 - 150 && pos.x <= this.renderer.width * 0.5 + 150 && pos.y >= 0 && pos.y <= 220;
            const isOverPlayer = pos.x >= 0 && pos.x <= 200 && pos.y >= 40 && pos.y <= 240;
            const slotHeader = this._getSlotHeaderAt(pos);

            // 优先检测铸造台内的矿石悬停（避免被格子悬停抢走）
            const slotCard = getSlotCardAt(this.renderer, pos.x, pos.y, this.state.slots);
            if (slotCard) {
                this.state.selectedCard = null;
                this.state.hoveredSlot = null;
                this.state.hoveredMonster = false;
                this.state.hoveredEndTurn = false;
                this.canvas.style.cursor = isCardDraggableFromSlot(slotCard.card) ? 'grab' : 'help';
                this.updateSlotCardTooltip(slotCard.card, slotCard.slotIndex, pos.x, pos.y);
                this._playHoverSound();
                return;
            }

            if (handIdx !== null) {
                this.state.selectedCard = this.state.hand[handIdx];
                this.state.hoveredSlot = null;
                this.state.hoveredMonster = false;
                this.state.hoveredEndTurn = false;
                this.canvas.style.cursor = 'grab';
                this.updateTooltip(this.state.hand[handIdx], pos.x, pos.y);
                this._playHoverSound();
            } else if (isOverEndTurn) {
                this.state.selectedCard = null;
                this.state.hoveredSlot = null;
                this.state.hoveredMonster = false;
                this.state.hoveredEndTurn = true;
                this.canvas.style.cursor = 'pointer';
                this.updateEndTurnTooltip(pos.x, pos.y);
                this._playHoverSound();
            } else if (isOverMonster) {
                this.state.selectedCard = null;
                this.state.hoveredSlot = null;
                this.state.hoveredMonster = true;
                this.state.hoveredEndTurn = false;
                this.canvas.style.cursor = 'help';
                this.updateMonsterTooltip(pos.x, pos.y);
                this._playHoverSound();
            } else if (slotHeader) {
                this.state.selectedCard = null;
                this.state.hoveredSlot = null;
                this.state.hoveredMonster = false;
                this.state.hoveredEndTurn = false;
                this.state.data.hoverSlotHeader = slotHeader.slotIndex;
                this.canvas.style.cursor = 'pointer';
                this.updateSlotTooltip(slotHeader.slotIndex, pos.x, pos.y);
                this._playHoverSound();
            } else if (isOverPlayer) {
                this.state.selectedCard = null;
                this.state.hoveredSlot = null;
                this.state.hoveredMonster = false;
                this.state.hoveredEndTurn = false;
                this.canvas.style.cursor = 'help';
                this.updatePlayerTooltip(pos.x, pos.y);
                this._playHoverSound();
            } else {
                // 检测船体改造悬停
                const relicHover = this._checkRelicHover(pos);
                if (relicHover) {
                    this.state.selectedCard = null;
                    this.state.hoveredSlot = null;
                    this.state.hoveredMonster = false;
                    this.state.hoveredEndTurn = false;
                    this.canvas.style.cursor = 'help';
                    this.updateRelicTooltip(relicHover.relic, pos.x, pos.y);
                    this._playHoverSound();
                } else {
                    // 检测叠牌项悬停
                    if (this.state.data && this.state.data.strategyRowRects) {
                        for (const row of this.state.data.strategyRowRects) {
                            if (this.hitTest(pos, row)) {
                                this.state.data.hoverStrategyRow = row.strat.id;
                                this.state.selectedCard = null;
                                this.state.hoveredSlot = null;
                                this.state.hoveredMonster = false;
                                this.state.hoveredEndTurn = false;
                                this.canvas.style.cursor = 'help';
                                this.updateStrategyTooltip(row.strat, pos.x, pos.y);
                                this._playHoverSound();
                                return;
                            }
                        }
                    }

                    this.state.selectedCard = null;
                    this.state.hoveredSlot = null;
                    this.state.hoveredMonster = false;
                    this.state.hoveredEndTurn = false;
                    this.canvas.style.cursor = 'default';
                    this.hideTooltip();
                }
            }
        }
    },

    handleSettingsClick(pos) {
        const data = this.state.data;
        if (!data || !data.settingsRects || this.state.screen !== 'battle' || this.state._playgroundBattle) {
            return false;
        }
        const rect = data.settingsRects.find(r => this.hitTest(pos, r));
        if (!rect) return false;

        if (rect.id === 'toggle_settings') {
            data.settingsExpanded = !data.settingsExpanded;
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            this.canvas.style.cursor = 'default';
            return true;
        }

        if (rect.id === 'quit_to_menu') {
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            switchScreen(this.state, 'title', {});
            return true;
        }

        if (rect.id === 'bgm_volume') {
            // 点击音量条切换预设档位
            const current = data.settingsBgmVolume !== undefined ? data.settingsBgmVolume : 50;
            const presets = [0, 25, 50, 75, 100];
            const idx = presets.indexOf(current);
            const next = presets[(idx + 1) % presets.length];
            data.settingsBgmVolume = next;
            if (typeof GameAudio !== 'undefined') GameAudio.setBGMVolume(next / 100);
            return true;
        }

        if (rect.id === 'sfx_volume') {
            const current = data.settingsSfxVolume !== undefined ? data.settingsSfxVolume : 50;
            const presets = [0, 25, 50, 75, 100];
            const idx = presets.indexOf(current);
            const next = presets[(idx + 1) % presets.length];
            data.settingsSfxVolume = next;
            if (typeof GameAudio !== 'undefined') GameAudio.setSFXVolume(next / 100);
            return true;
        }

        return true;
    },

    handleSettingsHover(pos) {
        const data = this.state.data;
        if (!data || !data.settingsRects || this.state.screen !== 'battle' || this.state._playgroundBattle) {
            return false;
        }
        const rect = data.settingsRects.find(r => this.hitTest(pos, r));
        if (!rect) return false;
        data.hoverSettings = rect.id;
        this.state.selectedCard = null;
        this.state.hoveredMonster = false;
        this.state.hoveredEndTurn = false;
        this.canvas.style.cursor = 'pointer';
        this.hideTooltip();
        return true;
    },

    handleFeedbackClick(pos) {
        const data = this.state.data;
        if (!data || !data.feedbackLinkRect || this.state.screen !== 'battle' || this.state._playgroundBattle) {
            return false;
        }
        if (this.hitTest(pos, data.feedbackLinkRect)) {
            window.open('https://vcnole60l5bl.feishu.cn/wiki/RuhpwE9Mjij9ngkjawmcztXknwd?from=from_copylink', '_blank');
            return true;
        }
        return false;
    },

    handleFeedbackHover(pos) {
        const data = this.state.data;
        if (!data || !data.feedbackLinkRect || this.state.screen !== 'battle' || this.state._playgroundBattle) {
            return false;
        }
        if (this.hitTest(pos, data.feedbackLinkRect)) {
            data.hoverFeedbackLink = true;
            this.state.selectedCard = null;
            this.state.hoveredMonster = false;
            this.state.hoveredEndTurn = false;
            this.canvas.style.cursor = 'pointer';
            this.hideTooltip();
            return true;
        }
        data.hoverFeedbackLink = false;
        return false;
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
                        this.state.message = '💀 击沉成功！自动重置海战';
                    } else {
                        this.state.message = '💔 海战失败！已自动恢复血量';
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
                            c.battleBonus = 0;
                            delete c.dedicateTriggered;
                            delete c.removeRemainOnNextTurnStart;
                            if (c._monsterAddedKeywords) {
                                const def = CARD_DEFS[c.defId];
                                const originalKeywords = def ? def.keywords : [];
                                for (const kw of c._monsterAddedKeywords) {
                                    if (!originalKeywords.includes(kw)) {
                                        const idx = c.keywords.indexOf(kw);
                                        if (idx !== -1) c.keywords.splice(idx, 1);
                                    }
                                }
                                delete c._monsterAddedKeywords;
                            }
                        }
                        runData.deck = allCards.filter(c => !c.isDerived);
                        if (this.state._originalStageIndex !== undefined) {
                            runData.stageIndex = this.state._originalStageIndex;
                        }
                        showPlaceholderToast(`战斗胜利！获得 ${reward} 银元`);
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
        html += `<p>基础强度: <b>${getCardBaseValue(card)}</b> | 尺寸: ${card.size}格</p>`;
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
        html += `<p>类型: ${monster.type === 'boss' ? 'BOSS' : monster.type === 'elite' ? '私掠舰' : '普通'} | HP: ${monster.hp}/${monster.maxHp}</p>`;
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
        const totalCards = slot.cards.length;
        const effMul = getSlotEffectiveMultiplier(slot, this.state);
        let html = `<h4>铸造台 ${slotIdx + 1}</h4>`;
        html += `<p>当前倍率: <b style="color:#ffd700">${effMul}X</b></p>`;
        html += `<p>当前驻台: <b style="color:#ffcc88">${totalCards}</b> 块</p>`;
        tooltip.innerHTML = html;
        tooltip.classList.remove('hidden');
        const x = Math.min(clientX + 20, window.innerWidth - 300);
        const y = Math.min(clientY + 20, window.innerHeight - 200);
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    },

    updateSlotCardTooltip(card, slotIdx, clientX, clientY) {
        const tooltip = document.getElementById('tooltip');
        const bd = getCardDamageBreakdown(card, slotIdx, this.state);
        const state = this.state;

        // ===== 上半侧：矿石效果 =====
        const rarityLabels = { white: '普通', blue: '稀有', gold: '传说' };
        const rarityColors = { white: '#ccc', blue: '#4488ff', gold: '#ffd700' };
        const rLabel = rarityLabels[card.rarity] || '';
        const rColor = rarityColors[card.rarity] || '#ccc';

        let html = `<h4>${card.name} <span style="color:${rColor};font-size:13px;font-weight:normal">[${rLabel}]</span></h4>`;
        html += `<p>基础强度: <b>${bd.baseValue}</b> | 尺寸: ${card.size}格 | 格${slotIdx + 1}</p>`;
        html += `<p style="color:#ddd">${card.description}</p>`;

        if (card.keywords && card.keywords.length > 0) {
            html += '<div style="margin-top:8px;border-top:1px solid #443322;padding-top:8px">';
            html += '<p style="font-size:12px;color:#998866;margin-bottom:6px">词条说明</p>';
            for (const kw of card.keywords) {
                const data = KEYWORDS[kw];
                if (data) {
                    html += `<div style="margin-bottom:4px">`;
                    html += `<span class="keyword-tag" style="border-color:${data.color};color:${data.color};background:${data.color}22">${data.name}</span>`;
                    html += `<span style="color:#aaa;font-size:12px;margin-left:6px">${data.desc}</span>`;
                    html += `</div>`;
                }
            }
            html += '</div>';
        }

        // ===== 分隔线 =====
        html += `<div style="border-top:2px solid #665544;margin:12px 0;"></div>`;

        // ===== 下半侧：伤害计算 =====
        html += `<p style="font-size:13px;color:#ffd700;font-weight:bold;margin-bottom:8px">伤害计算</p>`;

        // --- 阶段1：有效强度 ---
        const effectiveSteps = bd.steps.filter(s => s.phase === 'effective');
        const otherEffSteps = effectiveSteps.filter(s => s.source !== '基础强度');

        // 基础强度
        html += `<div style="display:flex;justify-content:space-between;margin-bottom:3px">`;
        html += `<span style="color:#ccc">基础强度</span>`;
        html += `<span style="color:#fff;font-weight:bold">${bd.baseValue}</span>`;
        html += `</div>`;

        // 有效强度阶段的各个加成
        for (const step of otherEffSteps) {
            const isPositive = step.amount >= 0;
            const color = isPositive ? '#2ecc71' : '#ff6666';
            const sign = isPositive ? '+' : '';

            let sourceName = step.source;

            // 特殊处理预热效果，显示来源矿石名
            if (step.detail === 'dedicate_aura') {
                const slot = state.slots[slotIdx];
                const cards = slot.cards;
                const myIdx = cards.findIndex(c => c.uuid === card.uuid);
                if (myIdx > 0) {
                    const belowCard = cards[myIdx - 1];
                    if (belowCard.keywords.includes('dedicate')) {
                        sourceName = `预热（${belowCard.name}）`;
                    }
                }
            } else if (step.detail === 'yellow_domain_aura') {
                const slot = state.slots[slotIdx];
                const cards = slot.cards;
                const myIdx = cards.findIndex(c => c.uuid === card.uuid);
                if (myIdx > 0) {
                    const belowCard = cards[myIdx - 1];
                    if (!belowCard.keywords.includes('dedicate')) {
                        sourceName = `黄色领域（${belowCard.name}）`;
                    }
                }
            }

            html += `<div style="display:flex;justify-content:space-between;margin-bottom:3px">`;
            html += `<span style="color:#aaa">+ ${sourceName}</span>`;
            html += `<span style="color:${color}">${sign}${step.amount}</span>`;
            html += `</div>`;
        }

        // 有效强度小计
        if (otherEffSteps.length > 0) {
            html += `<div style="border-top:1px dashed #554433;margin:4px 0;padding-top:4px;display:flex;justify-content:space-between">`;
            html += `<span style="color:#ccc;font-size:12px">有效强度</span>`;
            html += `<span style="color:#ffd700;font-weight:bold">${bd.effectiveValue}</span>`;
            html += `</div>`;
        }

        // --- 阶段2：最终强度 ---
        const finalSteps = bd.steps.filter(s => s.phase === 'final');

        if (finalSteps.length > 0) {
            html += `<div style="margin-top:8px">`;

            for (const step of finalSteps) {
                if (step.operation === 'multiply') {
                    // 乘法效果（如熔核翻倍）
                    html += `<div style="display:flex;justify-content:space-between;margin-bottom:3px">`;
                    html += `<span style="color:#aaa">× ${step.source}</span>`;
                    html += `<span style="color:#ffaa44">×2</span>`;
                    html += `</div>`;
                } else {
                    const isPositive = step.amount >= 0;
                    const color = isPositive ? '#2ecc71' : '#ff6666';
                    const sign = isPositive ? '+' : '';
                    html += `<div style="display:flex;justify-content:space-between;margin-bottom:3px">`;
                    html += `<span style="color:#aaa">+ ${step.source}</span>`;
                    html += `<span style="color:${color}">${sign}${step.amount}</span>`;
                    html += `</div>`;
                }
            }

            html += `<div style="border-top:1px dashed #554433;margin:4px 0;padding-top:4px;display:flex;justify-content:space-between">`;
            html += `<span style="color:#ccc;font-size:12px">最终强度</span>`;
            html += `<span style="color:#ffd700;font-weight:bold">${bd.finalValue}</span>`;
            html += `</div>`;
            html += `</div>`;
        }

        // --- 阶段3：倍率计算 ---
        const slotSteps = bd.steps.filter(s => s.phase === 'slot');

        if (slotSteps.length > 0 || bd.slotMultiplier !== 1) {
            html += `<div style="margin-top:8px">`;

            for (const step of slotSteps) {
                const isPositive = step.amount >= 0;
                const color = isPositive ? '#2ecc71' : '#ff6666';
                const sign = isPositive ? '+' : '';
                html += `<div style="display:flex;justify-content:space-between;margin-bottom:3px">`;
                html += `<span style="color:#aaa">+ ${step.source}</span>`;
                html += `<span style="color:${color}">${sign}${step.amount}</span>`;
                html += `</div>`;
            }

            html += `<div style="border-top:1px dashed #554433;margin:4px 0;padding-top:4px;display:flex;justify-content:space-between">`;
            html += `<span style="color:#ccc;font-size:12px">最终倍率</span>`;
            html += `<span style="color:#ffd700;font-weight:bold">${bd.slotMultiplier}X</span>`;
            html += `</div>`;
            html += `</div>`;
        }

        // --- 阶段4：伤害汇总 ---
        html += `<div style="margin-top:8px;border-top:1px solid #554433;padding-top:8px">`;

        html += `<div style="display:flex;justify-content:space-between;margin-bottom:3px">`;
        html += `<span style="color:#ccc">最终强度 × 最终倍率</span>`;
        html += `<span style="color:#fff">${bd.finalValue} × ${bd.slotMultiplier} = <b style="color:#ffd700">${bd.cardOutput}</b></span>`;
        html += `</div>`;

        // 预留：特殊额外加成（全局倍率等）
        const extraSteps = bd.steps.filter(s => s.phase === 'extra');
        for (const step of extraSteps) {
            html += `<div style="display:flex;justify-content:space-between;margin-bottom:3px">`;
            html += `<span style="color:#aaa">× ${step.source}</span>`;
            html += `<span style="color:#ffaa44">×${step.amount}</span>`;
            html += `</div>`;
        }

        html += `<div style="border-top:2px solid #ffd700;margin:6px 0;padding-top:6px;display:flex;justify-content:space-between">`;
        html += `<span style="color:#fff;font-weight:bold">总伤害</span>`;
        html += `<span style="color:#ff4444;font-weight:bold;font-size:16px">${bd.totalOutput}</span>`;
        html += `</div>`;
        html += `</div>`;

        tooltip.innerHTML = html;
        tooltip.classList.remove('hidden');
        const x = Math.min(clientX + 20, window.innerWidth - 360);
        const y = Math.min(clientY + 20, window.innerHeight - 450);
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
            html += `<p style="color:#2ecc71">💀 伤害足够击杀敌舰！</p>`;
        } else {
            html += `<p>本回合伤害: <b>${totalDmg}</b></p>`;
            html += `<p>敌舰剩余: <b style="color:#ff6666">${remaining}</b> HP</p>`;
            html += `<p style="color:#ff6666;margin-top:4px">⚠️ 未击杀将失去 1 生命值</p>`;
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
        html += `<p>🏛️ 船体改造: <b style="color:#cc9955">${(this.state.runDataRef?.relics?.length || 0)} 件</b></p>`;
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

    updateStrategyTooltip(strat, clientX, clientY) {
        const tooltip = document.getElementById('tooltip');
        tooltip.classList.add('hidden');
    },

    updateBlacksmithTooltip(item, clientX, clientY) {
        const tooltip = document.getElementById('tooltip');
        let html = '';
        if (item.type === 'buy_relic') {
            html = `<h4>${item.data.name}</h4><p>${item.data.desc}</p>`;
        } else if (item.type === 'upgrade_slot') {
            html = `<h4>强化铸造台：${item.name}</h4><p>将该格子的倍率永久+1</p>`;
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
        e.preventDefault();
        const state = this.state;
        const pos = this.getEventCanvasPos(e);

        // 对战记录面板滚轮
        if (pos && state.data && state.data.battleLogRect && this.hitTest(pos, state.data.battleLogRect)) {
            const delta = e.deltaY > 0 ? 2 : -2;
            state.data.battleLogScrollY = (state.data.battleLogScrollY || 0) + delta;
            if (state.data.battleLogScrollY < 0) state.data.battleLogScrollY = 0;
            return;
        }

        if (state.data && state.data.viewingDeck) {
            const delta = e.deltaY > 0 ? 60 : -60;
            state.data.deckViewScrollY = (state.data.deckViewScrollY || 0) + delta;
            // 限制滚动范围
            const maxScroll = Math.max(0, state.data.deckViewMaxScroll || 0);
            if (state.data.deckViewScrollY < 0) state.data.deckViewScrollY = 0;
            if (state.data.deckViewScrollY > maxScroll) state.data.deckViewScrollY = maxScroll;
            return;
        }
        if (state.screen === 'card_select' && state.data && state.data.optionRects) {
            const delta = e.deltaY > 0 ? 40 : -40;
            state.data.cardSelectScrollY = (state.data.cardSelectScrollY || 0) + delta;
            const maxScroll = Math.max(0, state.data.cardSelectMaxScroll || 0);
            if (state.data.cardSelectScrollY < 0) state.data.cardSelectScrollY = 0;
            if (state.data.cardSelectScrollY > maxScroll) state.data.cardSelectScrollY = maxScroll;
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
        // 在以下界面可以查看矿舱
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

        // 点击矿石不做选择，只播放音效
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

        // 检测矿石悬停
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
