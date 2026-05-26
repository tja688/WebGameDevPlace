/**
 * 生死烛局 - 主入口
 */

import { createGameState, startBattle, switchScreen } from './core/state.js';
import { endTurn } from './systems/battle.js';
import { Input } from './input/index.js';
import { Renderer } from './render/renderer.js';
import { initBattleFromRun } from './systems/battle.js';
import { GameAudio } from './audio.js';
import { FX as RenderFX } from './render/fx.js';
import { KEYWORDS, applyDataOverrides, createCardInstance, CARD_DEFS } from './data/index.js';
import { initPlaygroundUI, updateUIView, updateBattlePanelRealtime } from './playground/ui-controller.js';
import { enterPlayground } from './playground/index.js';
import { Tutorial } from './tutorial.js';
import { drawCards } from './core/battle-core.js';
import { calculateTotalBoardDamage } from './systems/board.js';
import { HAND_LIMIT } from './core/constants.js';

// 挂载到全局，供各系统使用
window.GameAudio = GameAudio;
window.RenderFX = RenderFX;

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
    bindToolsPanel();

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

function bindToolsPanel() {
    const toolsBtn = document.getElementById('btn-toggle-tools');
    const toolsPanel = document.getElementById('tools-panel');

    if (toolsBtn && toolsPanel) {
        toolsBtn.addEventListener('click', () => {
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            toolsPanel.classList.toggle('hidden');
        });
    }

    // 退出到主菜单
    const exitBtn = document.getElementById('btn-exit-to-menu');
    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            if (window.gameState) {
                switchScreen(window.gameState, 'title', {});
            }
            if (toolsPanel) toolsPanel.classList.add('hidden');
        });
    }

    // 作弊功能
    const cheatPrev = document.getElementById('cheat-prev-card');
    const cheatNext = document.getElementById('cheat-next-card');
    const cheatAdd = document.getElementById('cheat-add-card');
    const cheatDraw = document.getElementById('cheat-draw-one');
    const cheatHeal = document.getElementById('cheat-heal');
    const cheatGold = document.getElementById('cheat-add-gold');
    const cheatWin = document.getElementById('cheat-win');

    if (cheatPrev) {
        cheatPrev.addEventListener('click', () => {
            if (!window.gameState || window.gameState.phase !== 'playing') return;
            const cardIds = Object.keys(CARD_DEFS).filter(id => id !== 'diffusion');
            const data = window.gameState.data || (window.gameState.data = {});
            if (data.adventureCheatCardIndex === undefined) data.adventureCheatCardIndex = 0;
            data.adventureCheatCardIndex = (data.adventureCheatCardIndex - 1 + cardIds.length) % cardIds.length;
            updateCheatCardName();
        });
    }

    if (cheatNext) {
        cheatNext.addEventListener('click', () => {
            if (!window.gameState || window.gameState.phase !== 'playing') return;
            const cardIds = Object.keys(CARD_DEFS).filter(id => id !== 'diffusion');
            const data = window.gameState.data || (window.gameState.data = {});
            if (data.adventureCheatCardIndex === undefined) data.adventureCheatCardIndex = 0;
            data.adventureCheatCardIndex = (data.adventureCheatCardIndex + 1) % cardIds.length;
            updateCheatCardName();
        });
    }

    if (cheatAdd) {
        cheatAdd.addEventListener('click', () => {
            if (!window.gameState || window.gameState.phase !== 'playing') return;
            if (window.gameState.hand.length >= HAND_LIMIT) {
                window.gameState.message = '手牌已满';
                window.gameState.messageTimer = 60;
                return;
            }
            const cardIds = Object.keys(CARD_DEFS).filter(id => id !== 'diffusion');
            const data = window.gameState.data || {};
            if (data.adventureCheatCardIndex === undefined) data.adventureCheatCardIndex = 0;
            const defId = cardIds[data.adventureCheatCardIndex % cardIds.length];
            const card = createCardInstance(defId);
            if (card) window.gameState.hand.push(card);
            window.gameState.turnDamage = calculateTotalBoardDamage(window.gameState);
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            updateCheatCardName();
        });
    }

    if (cheatDraw) {
        cheatDraw.addEventListener('click', () => {
            if (!window.gameState || window.gameState.phase !== 'playing') return;
            drawCards(window.gameState, 1);
            window.gameState.turnDamage = calculateTotalBoardDamage(window.gameState);
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
            updateCheatCardName();
        });
    }

    if (cheatHeal) {
        cheatHeal.addEventListener('click', () => {
            if (!window.gameState || window.gameState.phase !== 'playing') return;
            window.gameState.player.hearts = window.gameState.player.maxHearts;
            window.gameState.heartsLost = 0;
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
        });
    }

    if (cheatGold) {
        cheatGold.addEventListener('click', () => {
            if (!window.gameState || window.gameState.phase !== 'playing') return;
            if (window.gameState.runDataRef) {
                window.gameState.runDataRef.gold += 10;
            }
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
        });
    }

    if (cheatWin) {
        cheatWin.addEventListener('click', () => {
            if (!window.gameState || window.gameState.phase !== 'playing') return;
            window.gameState.monster.hp = 0;
            window.gameState.phase = 'ended';
            window.gameState.result = 'win';
            if (typeof Input !== 'undefined' && Input.checkBattleEnd) {
                Input.checkBattleEnd();
            }
            if (typeof GameAudio !== 'undefined') GameAudio.playCardPlace();
        });
    }
}

function updateCheatCardName() {
    const span = document.getElementById('cheat-card-name');
    if (!span || !window.gameState) return;
    const card = getCheatSelectedCard(window.gameState);
    span.textContent = card.name;

    const countDiv = document.getElementById('cheat-hand-count');
    if (countDiv) {
        countDiv.textContent = `手牌 ${window.gameState.hand.length}/${HAND_LIMIT}`;
    }
}

function getCheatSelectedCard(state) {
    const allCardIds = Object.keys(CARD_DEFS).filter(id => id !== 'diffusion');
    if (allCardIds.length === 0) {
        return { id: null, name: '无卡牌' };
    }
    const idx = state.data?.adventureCheatCardIndex || 0;
    const id = allCardIds[((idx % allCardIds.length) + allCardIds.length) % allCardIds.length];
    return { id, name: CARD_DEFS[id].name };
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

        // 工具按钮显示控制（正式战斗专属）
        const toolsBtn = document.getElementById('btn-toggle-tools');
        const toolsPanel = document.getElementById('tools-panel');
        const cheatSection = document.getElementById('cheat-section');
        const feedbackLink = document.getElementById('feedback-link');
        const isFormalBattle = window.gameState.screen === 'battle' && !window.gameState._playgroundBattle && window.gameState.runDataRef;
        if (toolsBtn) {
            if (isFormalBattle) {
                toolsBtn.classList.remove('hidden');
            } else {
                toolsBtn.classList.add('hidden');
                if (toolsPanel) toolsPanel.classList.add('hidden');
            }
        }
        if (cheatSection) {
            cheatSection.style.display = isFormalBattle ? '' : 'none';
        }
        if (feedbackLink) {
            feedbackLink.style.top = isFormalBattle ? '114px' : '64px';
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
