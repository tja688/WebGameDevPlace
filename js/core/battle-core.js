/**
 * 卡牌地下城 - 战斗基础工具（无循环依赖）
 * 
 * 此文件存放战斗相关的基础函数，不依赖 systems/board.js 或 effects/*
 * 可供效果系统和战斗系统共同引用
 */

import { HAND_LIMIT } from './constants.js';

/**
 * 记录战斗日志
 */
export function logCombat(state, msg) {
    state.combatLog.push(`[T${state.turn}] ${msg}`);
    if (state.combatLog.length > 50) state.combatLog.shift();
}

/**
 * 从牌库抽牌到手中
 */
export function drawCards(state, count) {
    let drawn = 0;
    if (!state.drawAnimations) state.drawAnimations = [];
    const actualCount = Math.min(count, HAND_LIMIT - state.hand.length);
    for (let i = 0; i < actualCount; i++) {
        if (state.deck.length === 0) break;
        const card = state.deck.pop();
        state.hand.push(card);
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
 * 将弃牌堆洗牌回牌库
 */
export function shuffleDiscardToDeck(state) {
    if (state.discard.length > 0) {
        const shuffled = [];
        const discard = [...state.discard];
        for (let i = discard.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [discard[i], discard[j]] = [discard[j], discard[i]];
        }
        state.deck.push(...discard);
        state.discard = [];
        logCombat(state, `弃牌堆 ${discard.length} 张牌洗回牌库`);
    }
}

export function showPlaceholderToast(msg) {
    if (window.gameState) {
        window.gameState.message = msg + '（占位）';
        window.gameState.messageTimer = 120;
    }
}
