/**
 * 卡牌地下城 - 主入口
 */

import { createGameState, switchScreen, startBattle } from './core/state.js';
import { endTurn } from './systems/battle.js';
import { calculateTotalBoardDamage } from './systems/board.js';
import { Input } from './input/index.js';
import { Renderer } from './render/renderer.js';
import { initBattleFromRun } from './systems/battle.js';
import { GameAudio } from './audio.js';

// 挂载到全局，供各系统使用
window.GameAudio = GameAudio;

// 必须导入以触发效果注册副作用
import './effects/index.js';

window.gameState = null;

function init() {
    Renderer.init('gameCanvas');
    bindKeys();

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

        if (e.key === 'd' || e.key === 'D') {
            document.getElementById('debug-panel').classList.toggle('hidden');
        }

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

        if (window.gameState.messageTimer > 0) {
            window.gameState.messageTimer--;
            if (window.gameState.messageTimer === 0) {
                window.gameState.message = null;
            }
        }

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

// 全局辅助函数
window.restartGame = function() {
    window.gameState = startBattle();
    Input.state = window.gameState;
    if (typeof AutoTest !== 'undefined') {
        AutoTest.state = window.gameState;
    }
};
