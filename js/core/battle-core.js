/**
 * 生死烛局 - 战斗基础工具（无循环依赖）
 * 
 * 此文件存放战斗相关的基础函数，不依赖 systems/board.js 或 effects/*
 * 可供效果系统和战斗系统共同引用
 */

import { HAND_LIMIT } from './constants.js';

/**
 * 记录纯数据结算时间线，给未来 Unity 动画编排使用。
 * 这里只记录状态变化事实，不持有 DOM / Canvas / Audio 引用。
 */
export function recordTimeline(state, type, payload = {}) {
    if (!state) return;
    if (!state.effectTimeline) state.effectTimeline = [];
    if (state.timelineSeq === undefined) state.timelineSeq = 0;
    state.timelineSeq += 1;
    state.effectTimeline.push({
        seq: state.timelineSeq,
        turn: state.turn || 0,
        type,
        ...payload
    });
}

/**
 * 记录战斗日志
 */
export function logCombat(state, msg) {
    state.combatLog.push(`[T${state.turn}] ${msg}`);
    if (state.combatLog.length > 50) state.combatLog.shift();
}

/**
 * 记录对战日志（战斗内可视化记录面板用）
 * 只记录关键事件：出牌、伤害、扣血、遗物触发等
 * 离开战斗后自动清空，不跨战斗保留
 */
export function addBattleLog(state, type, data = {}) {
    if (!state.battleLog) state.battleLog = [];
    state.battleLog.push({
        turn: state.turn || 0,
        type, // 'play_card' | 'damage' | 'heart_loss' | 'relic' | 'monster_skill' | 'strategy' | 'heal' | 'gold' | 'draw' | 'other'
        ...data,
        time: Date.now()
    });
    // 限制条目数量，防止内存膨胀
    if (state.battleLog.length > 200) {
        state.battleLog.shift();
    }
}

/**
 * 从牌库抽牌到手中
 */
export function drawCards(state, count) {
    let drawn = 0;
    if (!state.drawAnimations) state.drawAnimations = [];
    const handLimit = state.handLimit !== undefined ? state.handLimit : HAND_LIMIT;
    const actualCount = Math.min(count, handLimit - state.hand.length);
    for (let i = 0; i < actualCount; i++) {
        if (state.deck.length === 0) break;
        const card = state.deck.pop();
        state.hand.push(card);
        recordTimeline(state, 'draw_card', {
            cardUuid: card.uuid,
            cardDefId: card.defId,
            cardName: card.name,
            handIndex: state.hand.length - 1
        });
        // 抽卡动画：40帧(~667ms)带延迟错峰，带旋转和拖尾
        state.drawAnimations.push({
            card: card,
            handIndex: state.hand.length - 1,
            timer: 40,
            maxTimer: 40,
            delay: i * 8, // 错峰延迟
            rotation: (Math.random() - 0.5) * 1.5 // 初始随机旋转
        });
        drawn++;
    }
    if (drawn > 0) {
        logCombat(state, `抽了 ${drawn} 张牌`);
        if (typeof GameAudio !== 'undefined') GameAudio.playDrawCard();
    }
}

/**
 * 显示占位提示
 */

/**
 * 将弃牌堆洗牌回牌库（与剩余牌库合并后整体洗牌）
 */
export function shuffleDiscardToDeck(state) {
    if (state.discard.length > 0) {
        const combined = [...state.deck, ...state.discard];
        for (let i = combined.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [combined[i], combined[j]] = [combined[j], combined[i]];
        }
        state.deck = combined;
        state.discard = [];
        logCombat(state, `弃牌堆洗牌回牌库，牌库共 ${state.deck.length} 张`);
    }
}

export function showPlaceholderToast(msg) {
    if (window.gameState) {
        window.gameState.message = msg + '（占位）';
        window.gameState.messageTimer = 120;
    }
}
