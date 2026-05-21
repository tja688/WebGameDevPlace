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
    if (!state.drawAnimations) state.drawAnimations = [];
    for (let i = 0; i < count; i++) {
        if (state.deck.length === 0) break;
        const card = state.deck.pop();
        state.hand.push(card);
        // 添加抽卡动画
        state.drawAnimations.push({
            card: card,
            handIndex: state.hand.length - 1,
            timer: 12,
            maxTimer: 12
        });
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
