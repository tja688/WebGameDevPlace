/**
 * Heave! - 主入口
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
import { Tutorial } from './tutorial.js';

// 挂载到全局，供各系统使用
window.GameAudio = GameAudio;
window.RenderFX = RenderFX;
window.GameInput = null; // 将在 Input.init 后设置

// 必须导入以触发效果注册副作用
import './effects/index.js';

window.gameState = null;
let _lastScreen = null;

window.render_game_to_text = function() {
    const state = window.gameState;
    if (!state) return JSON.stringify({ screen: 'none' });
    const payload = {
        screen: state.screen,
        phase: state.phase || null,
        turn: state.turn || 0,
        player: state.player ? { hearts: state.player.hearts, maxHearts: state.player.maxHearts } : null,
        monster: state.monster ? { id: state.monster.id, name: state.monster.name, hp: state.monster.hp, maxHp: state.monster.maxHp } : null,
        hand: (state.hand || []).map(c => ({ uuid: c.uuid, defId: c.defId, name: c.name, value: (c.baseValue || 0) + (c.permanentBonus || 0) + (c.battleBonus || 0) + (c.tempBonus || 0), keywords: c.keywords || [] })),
        slots: (state.slots || []).map(s => ({ index: s.index, multiplier: s.multiplier + (s.roundMultiplierBonus || 0), cards: s.cards.map(c => ({ uuid: c.uuid, defId: c.defId, name: c.name })) })),
        currentStrategy: state.currentStrategy ? { id: state.currentStrategy.id, name: state.currentStrategy.name } : null,
        message: state.message || null,
        note: 'canvas coordinates use origin top-left, x right, y down'
    };
    return JSON.stringify(payload);
};

window.advanceTime = function(ms = 16) {
    const frames = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < frames; i++) {
        if (window.gameState?.messageTimer > 0) {
            window.gameState.messageTimer--;
            if (window.gameState.messageTimer === 0) window.gameState.message = null;
        }
    }
    if (window.gameState) Renderer.render(window.gameState);
};

function init() {
    applyDataOverrides();
    Renderer.init('gameCanvas');
    GameAudio.init();
    Tutorial.init(Renderer);
    initKeywordPanel();
    bindKeys();
    bindVolumeControls();

    window.gameState = createGameState('title');
    Input.init(window.gameState, Renderer);
    window.GameInput = Input;
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

        if (Tutorial.isActive()) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                Tutorial.advance();
            }
            e.preventDefault();
            return;
        }

        if (e.key === 'd' || e.key === 'D') {
            document.getElementById('keyword-panel').classList.toggle('hidden');
        }

        if (window.gameState.screen === 'playground') {
            return; // Playground 不响应全局快捷键
        }

        // V键：查看矿舱
        if (e.key === 'v' || e.key === 'V') {
            if (typeof Input !== 'undefined' && Input.toggleDeckView) {
                Input.toggleDeckView();
            }
        }

        // ESC键：关闭矿舱视图
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
    // 音量控制已移至 Canvas 设置面板，此处保留音频系统初始化
    // 设置面板的音量状态通过 state.data.settingsBgmVolume / settingsSfxVolume 管理

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
        Tutorial.update(window.gameState, Renderer);

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
