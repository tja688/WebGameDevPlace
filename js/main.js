/**
 * 卡牌地下城 - 主入口
 */

import { createGameState, startBattle } from './core/state.js';
import { endTurn } from './systems/battle.js';
import { Input } from './input/index.js';
import { Renderer } from './render/renderer.js';
import { initBattleFromRun } from './systems/battle.js';
import { GameAudio } from './audio.js';
import { FX as RenderFX } from './render/fx.js';
import { KEYWORDS, applyDataOverrides } from './data/index.js';
import { initPlaygroundUI, updateUIView, updateBattlePanelRealtime } from './playground/ui-controller.js';
import { enterPlayground } from './playground/index.js';

// 挂载到全局，供各系统使用
window.GameAudio = GameAudio;
window.RenderFX = RenderFX;

// 必须导入以触发效果注册副作用
import './effects/index.js';

window.gameState = null;
let _lastScreen = null;

function init() {
    applyDataOverrides();
    Renderer.init('gameCanvas');
    GameAudio.init();
    initKeywordPanel();
    bindKeys();
    bindVolumeControls();

    window.gameState = createGameState('title');
    Input.init(window.gameState, Renderer);
    initPlaygroundUI(window.gameState);

    // Playground 主菜单按钮（DOM事件）
    const pgBtn = document.getElementById('btn-playground');
    if (pgBtn) {
        pgBtn.addEventListener('click', () => {
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            enterPlayground(window.gameState);
        });
    }

    if (typeof AutoTest !== 'undefined') {
        AutoTest.init(window.gameState);
    }

    requestAnimationFrame(gameLoop);
}

function initKeywordPanel() {
    const list = document.getElementById('keyword-list');
    if (!list) return;
    let html = '';
    for (const [key, data] of Object.entries(KEYWORDS)) {
        html += `<div class="keyword-entry" style="border-left-color:${data.color}">`;
        html += `<h5 style="color:${data.color}">${data.name}</h5>`;
        html += `<p>${data.desc}</p>`;
        html += `</div>`;
    }
    list.innerHTML = html;
}

function bindKeys() {
    document.addEventListener('keydown', e => {
        if (!window.gameState) return;

        if (e.key === 'd' || e.key === 'D') {
            document.getElementById('keyword-panel').classList.toggle('hidden');
        }

        if (window.gameState.screen === 'playground') {
            return; // Playground 不响应全局快捷键
        }

        // V键：查看牌组
        if (e.key === 'v' || e.key === 'V') {
            if (typeof Input !== 'undefined' && Input.toggleDeckView) {
                Input.toggleDeckView();
            }
        }

        // ESC键：关闭牌组视图
        if (e.key === 'Escape') {
            if (window.gameState.data && window.gameState.data.viewingDeck) {
                if (typeof Input !== 'undefined' && Input.toggleDeckView) {
                    Input.toggleDeckView();
                }
            }
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

function bindVolumeControls() {
    const bgmSlider = document.getElementById('bgm-volume');
    const sfxSlider = document.getElementById('sfx-volume');
    const bgmVal = document.getElementById('bgm-volume-val');
    const sfxVal = document.getElementById('sfx-volume-val');

    if (bgmSlider) {
        bgmSlider.addEventListener('input', e => {
            const val = parseInt(e.target.value);
            if (bgmVal) bgmVal.textContent = val + '%';
            if (typeof GameAudio !== 'undefined') GameAudio.setBGMVolume(val / 100);
        });
    }
    if (sfxSlider) {
        sfxSlider.addEventListener('input', e => {
            const val = parseInt(e.target.value);
            if (sfxVal) sfxVal.textContent = val + '%';
            if (typeof GameAudio !== 'undefined') GameAudio.setSFXVolume(val / 100);
        });
    }

    // 书本按钮切换词条面板
    const btn = document.getElementById('btn-toggle-keyword');
    const panel = document.getElementById('keyword-panel');
    if (btn && panel) {
        btn.addEventListener('click', () => {
            panel.classList.toggle('hidden');
        });
    }
}

function gameLoop() {
    if (window.gameState) {
        // BGM 自动切换：非战斗界面播放平时音乐
        if (window.gameState.screen !== _lastScreen) {
            if (window.gameState.screen !== 'battle' && window.gameState.screen !== 'playground' && typeof GameAudio !== 'undefined') {
                GameAudio.playBGM('normal');
            }
            _lastScreen = window.gameState.screen;
        }

        // Playground UI 显示/隐藏同步
        if (window.gameState.screen === 'playground') {
            updateUIView('playground');
        } else {
            updateUIView('hidden');
        }

        // Playground 主菜单入口按钮显示控制
        const pgBtn = document.getElementById('btn-playground');
        if (pgBtn) {
            if (window.gameState.screen === 'title') {
                pgBtn.classList.remove('hidden');
            } else {
                pgBtn.classList.add('hidden');
            }
        }

        Renderer.render(window.gameState);

        // 对战测试场面板实时数据更新
        if (window.gameState.screen === 'playground') {
            updateBattlePanelRealtime(window.gameState);
        }

        if (window.gameState.messageTimer > 0) {
            window.gameState.messageTimer--;
            if (window.gameState.messageTimer === 0) {
                window.gameState.message = null;
            }
        }

        // 伤害达标消息提醒已移除
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
