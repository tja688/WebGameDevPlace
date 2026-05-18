/**
 * 卡牌地下城 - 主入口
 */

window.gameState = null;

function init() {
    Renderer.init('gameCanvas');
    bindKeys();

    // 初始进入标题界面
    window.gameState = createGameState('title');
    Input.init(window.gameState, Renderer);
    if (typeof AutoTest !== 'undefined') {
        AutoTest.init(window.gameState);
    }
    requestAnimationFrame(gameLoop);
}

function bindKeys() {
    document.addEventListener('keydown', e => {
        if (!window.gameState) return;

        // 调试面板
        if (e.key === 'd' || e.key === 'D') {
            document.getElementById('debug-panel').classList.toggle('hidden');
        }

        // 战斗中的快捷键
        if (window.gameState.screen === 'battle') {
            if (e.key === 'e' || e.key === 'E') {
                if (window.gameState.phase === 'playing') {
                    endTurn(window.gameState);
                    Input.checkBattleEnd();
                }
            }
            if (e.key === 'a' || e.key === 'A') {
                if (typeof AutoTest !== 'undefined') {
                    AutoTest.autoPlayOptimal();
                }
            }
            if (e.key === 'r' || e.key === 'R') {
                // 仅在战斗中重置当前战斗
                if (window.gameState.runDataRef) {
                    const runData = window.gameState.runDataRef;
                    const battleState = initBattleFromRun(runData);
                    Object.assign(window.gameState, battleState);
                    window.gameState.screen = 'battle';
                    window.gameState.data = {};
                }
            }
        }
    });
}

function gameLoop() {
    if (window.gameState) {
        Renderer.render(window.gameState);

        // 消息计时器（递减型消息）
        if (window.gameState.messageTimer > 0) {
            window.gameState.messageTimer--;
            if (window.gameState.messageTimer === 0) {
                window.gameState.message = null;
            }
        }

        // 战斗中的持续提示
        if (window.gameState.screen === 'battle' && window.gameState.phase === 'playing') {
            const totalDmg = calculateTotalBoardDamage(window.gameState);
            if (totalDmg >= window.gameState.monster.hp) {
                if (!window.gameState.message || window.gameState.messageTimer === 0) {
                    window.gameState.message = '伤害已达标！按 E 或点击结束回合';
                    window.gameState.messageTimer = -1;
                }
            } else if (window.gameState.message && window.gameState.messageTimer === -1) {
                window.gameState.message = null;
                window.gameState.messageTimer = 0;
            }
        }
    }
    requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', init);
