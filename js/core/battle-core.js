/**
 * 卡牌地下城 - 战斗基础工具（无循环依赖）
 * 
 * 此文件存放战斗相关的基础函数，不依赖 systems/board.js 或 effects/*
 * 可供效果系统和战斗系统共同引用
 */

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
    for (let i = 0; i < count; i++) {
        if (state.deck.length === 0) break;
        state.hand.push(state.deck.pop());
        drawn++;
    }
    if (drawn > 0) {
        logCombat(state, `抽了 ${drawn} 张牌`);
    }
}

/**
 * 显示占位提示
 */
export function showPlaceholderToast(msg) {
    if (window.gameState) {
        window.gameState.message = msg + '（占位）';
        window.gameState.messageTimer = 120;
    }
}
