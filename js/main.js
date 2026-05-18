/**
 * 卡牌地下城 - 主入口
 */

window.gameState = null;

function init() {
    Renderer.init('gameCanvas');
    bindKeys();

    document.getElementById('btn-start').addEventListener('click', () => {
        document.getElementById('start-screen').classList.add('hidden');
        if (typeof GameAudio !== 'undefined') GameAudio.init();
        startGame();
    });
}

function startGame() {
    window.gameState = startBattle();
    Input.init(window.gameState, Renderer);
    AutoTest.init(window.gameState);
    requestAnimationFrame(gameLoop);
}

function bindKeys() {
    document.addEventListener('keydown', e => {
        if (!window.gameState) return;
        if (e.key === 'e' || e.key === 'E') {
            if (window.gameState.phase === 'playing') {
                endTurn(window.gameState);
                Input.checkBattleEnd();
            }
        }
        if (e.key === 'd' || e.key === 'D') {
            document.getElementById('debug-panel').classList.toggle('hidden');
        }
        if (e.key === 'a' || e.key === 'A') {
            AutoTest.autoPlayOptimal();
        }
        if (e.key === 'r' || e.key === 'R') {
            restartGame();
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

        // 持续显示型提示：伤害已达标
        if (window.gameState.phase === 'playing') {
            const totalDmg = calculateTotalBoardDamage(window.gameState);
            if (totalDmg >= window.gameState.monster.hp) {
                // 只有当没有临时消息时才显示达标提示
                if (!window.gameState.message || window.gameState.messageTimer === 0) {
                    window.gameState.message = '伤害已达标！按 E 或点击结束回合';
                    window.gameState.messageTimer = -1; // -1 表示持续显示直到条件改变
                }
            } else if (window.gameState.message && window.gameState.messageTimer === -1) {
                // 伤害不再达标时清除持续消息
                window.gameState.message = null;
                window.gameState.messageTimer = 0;
            }
        }
    }
    requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', init);
