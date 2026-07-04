/**
 * Heave! - Playground DOM UI 控制器
 *
 * 提供：
 * - 场景选择器、JSON 编辑器、控制按钮（AI 测试用）
 * - 对战测试场控制面板（人类测试用）
 * - 数据参数配置面板（数值修改持久化）
 * - 结果展示
 * - 与 localStorage 联动
 */

import {
    PlaygroundState, getAllScenarios, getScenarioById, runScenario,
    runCurrentScenarioFromEditor, saveScenarioFromEditor, backToPlaygroundMenu,
    enterPlaygroundBattle, resetPlaygroundBattle, addCardToPlaygroundHand,
    changePlaygroundMonster
} from './index.js';
import { exportScenarioToJson, importScenarioFromFile, exportAllScenariosToJson } from './local-storage.js';
import { AITest } from './ai-harness.js';
import {
    saveDataOverride, getDataOverrides, clearDataOverrides, applyDataOverrides
} from '../data/index.js';
import { CARD_DEFS, MONSTER_DEFS } from '../data/index.js';
import { drawCards } from '../core/battle-core.js';
import { calculateTotalBoardDamage } from '../systems/board.js';

// ===== DOM 引用（AI 测试） =====

let uiRoot = null;
let menuPanel = null;
let effectPanel = null;
let scenarioSelect = null;
let editorTextarea = null;
let btnRun = null;
let btnRunAll = null;
let btnSave = null;
let btnExport = null;
let btnImport = null;
let btnExportAll = null;
let btnBack = null;
let resultsArea = null;
let fileInput = null;

// ===== DOM 引用（对战测试场） =====

let battlePanel = null;
let monsterSelect = null;
let btnChangeMonster = null;
let btnResetHp = null;
let btnClearBoard = null;
let cardSelect = null;
let btnAddCard = null;
let btnDrawRandom = null;
let infoTurn = null;
let infoDamage = null;
let infoMonsterHp = null;
let btnTabCards = null;
let btnTabMonsters = null;
let dataEditor = null;
let btnExportOverrides = null;
let btnImportOverrides = null;
let btnClearOverrides = null;
let btnExitBattle = null;

// 参数配置独立面板
let paramPanel = null;
let btnToggleParam = null;
let btnCloseParam = null;
let paramSearch = null;

let _gameStateRef = null;
let _dataEditorTab = 'cards';
let _lastRenderedView = null;

// ===== 初始化 =====

export function initPlaygroundUI(gameState) {
    uiRoot = document.getElementById('playground-ui');
    if (!uiRoot) {
        console.warn('[Playground] UI 根元素 #playground-ui 未找到');
        return;
    }

    _gameStateRef = gameState;

    // AI 测试面板
    menuPanel = document.getElementById('pg-menu-panel');
    effectPanel = document.getElementById('pg-effect-panel');
    scenarioSelect = document.getElementById('pg-scenario-select');
    editorTextarea = document.getElementById('pg-editor-textarea');
    btnRun = document.getElementById('pg-btn-run');
    btnRunAll = document.getElementById('pg-btn-run-all');
    btnSave = document.getElementById('pg-btn-save');
    btnExport = document.getElementById('pg-btn-export');
    btnImport = document.getElementById('pg-btn-import');
    btnExportAll = document.getElementById('pg-btn-export-all');
    btnBack = document.getElementById('pg-btn-back');
    resultsArea = document.getElementById('pg-results-area');
    fileInput = document.getElementById('pg-file-input');

    // 对战测试场面板
    battlePanel = document.getElementById('pg-battle-panel');
    monsterSelect = document.getElementById('pg-monster-select');
    btnChangeMonster = document.getElementById('pg-change-monster');
    btnResetHp = document.getElementById('pg-reset-hp');
    btnClearBoard = document.getElementById('pg-clear-board');
    cardSelect = document.getElementById('pg-card-select');
    btnAddCard = document.getElementById('pg-add-card');
    btnDrawRandom = document.getElementById('pg-draw-random');
    infoTurn = document.getElementById('pg-info-turn');
    infoDamage = document.getElementById('pg-info-damage');
    infoMonsterHp = document.getElementById('pg-info-monster-hp');
    btnTabCards = document.getElementById('pg-tab-cards');
    btnTabMonsters = document.getElementById('pg-tab-monsters');
    dataEditor = document.getElementById('pg-data-editor');
    btnExportOverrides = document.getElementById('pg-export-overrides');
    btnImportOverrides = document.getElementById('pg-import-overrides');
    btnClearOverrides = document.getElementById('pg-clear-overrides');
    btnExitBattle = document.getElementById('pg-exit-battle');

    paramPanel = document.getElementById('pg-param-panel');
    btnToggleParam = document.getElementById('pg-toggle-param');
    btnCloseParam = document.getElementById('pg-close-param');
    paramSearch = document.getElementById('pg-param-search');

    bindEvents(gameState);
    populateStaticSelects();
}

function populateStaticSelects() {
    // 填充敌舰下拉框
    if (monsterSelect) {
        let html = '';
        for (const [id, def] of Object.entries(MONSTER_DEFS)) {
            html += `<option value="${id}">${def.name}</option>`;
        }
        monsterSelect.innerHTML = html;
    }
    // 填充矿石下拉框
    if (cardSelect) {
        let html = '';
        for (const [id, def] of Object.entries(CARD_DEFS)) {
            html += `<option value="${id}">${def.name} (${def.baseValue}点)</option>`;
        }
        cardSelect.innerHTML = html;
    }
}

function bindEvents(gameState) {
    // ===== AI 测试面板事件 =====
    if (scenarioSelect) {
        scenarioSelect.addEventListener('change', e => {
            const id = e.target.value;
            if (!id) return;
            const scenario = getScenarioById(id);
            if (scenario && editorTextarea) {
                editorTextarea.value = JSON.stringify(scenario, null, 2);
                PlaygroundState.ui.editorContent = editorTextarea.value;
                PlaygroundState.selectedScenarioId = id;
            }
        });
    }
    if (btnRun) {
        btnRun.addEventListener('click', () => {
            if (!editorTextarea) return;
            const json = editorTextarea.value;
            const { success, result, error } = runCurrentScenarioFromEditor(json);
            if (success) {
                showResults(result);
                updateGameStateResult(gameState, result);
            } else {
                showError(error);
            }
        });
    }
    if (btnRunAll) {
        btnRunAll.addEventListener('click', () => {
            showMessage('正在运行全部场景...');
            setTimeout(() => {
                const report = AITest.report();
                showReport(report);
            }, 50);
        });
    }
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            if (!editorTextarea) return;
            const { success, error } = saveScenarioFromEditor(editorTextarea.value);
            if (success) {
                showMessage('已保存到本地（localStorage）');
                refreshScenarioSelect();
            } else {
                showError('保存失败: ' + error);
            }
        });
    }
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            if (!editorTextarea) return;
            try {
                const scenario = JSON.parse(editorTextarea.value);
                exportScenarioToJson(scenario);
                showMessage('已导出 JSON');
            } catch (e) {
                showError('JSON 格式错误，无法导出');
            }
        });
    }
    if (btnImport && fileInput) {
        btnImport.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async e => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const scenario = await importScenarioFromFile(file);
                if (editorTextarea) {
                    editorTextarea.value = JSON.stringify(scenario, null, 2);
                    PlaygroundState.ui.editorContent = editorTextarea.value;
                }
                showMessage(`已导入场景: ${scenario.id}`);
                refreshScenarioSelect();
            } catch (err) {
                showError('导入失败: ' + err.message);
            }
            fileInput.value = '';
        });
    }
    if (btnExportAll) {
        btnExportAll.addEventListener('click', () => {
            const all = getAllScenarios();
            exportAllScenariosToJson(all);
            showMessage(`已导出 ${all.length} 个场景`);
        });
    }
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            backToPlaygroundMenu(gameState);
            updateUIView('menu');
        });
    }
    if (editorTextarea) {
        editorTextarea.addEventListener('input', e => {
            PlaygroundState.ui.editorContent = e.target.value;
        });
    }

    // ===== 对战测试场面板事件 =====
    if (btnChangeMonster) {
        btnChangeMonster.addEventListener('click', () => {
            const monsterId = monsterSelect?.value;
            if (monsterId && gameState) {
                changePlaygroundMonster(gameState, monsterId);
                updateBattleInfo();
            }
        });
    }
    if (btnResetHp) {
        btnResetHp.addEventListener('click', () => {
            if (!gameState) return;
            gameState.monster.hp = gameState.monster.maxHp;
            gameState.player.hearts = gameState.player.maxHearts;
            gameState.message = '血量已重置';
            gameState.messageTimer = 60;
            updateBattleInfo();
        });
    }
    if (btnClearBoard) {
        btnClearBoard.addEventListener('click', () => {
            if (!gameState) return;
            const allCards = [
                ...gameState.deck, ...gameState.hand, ...gameState.discard,
                ...gameState.slots.flatMap(s => s.cards)
            ];
            for (const c of allCards) { c.tempBonus = 0; c.dedicateTriggered = false; }
            gameState.deck = allCards.filter(c => !c.isDerived);
            gameState.hand = [];
            gameState.discard = [];
            for (const slot of gameState.slots) {
                slot.cards = [];
                slot.nextCardBonus = 0;
                slot.roundMultiplierBonus = 0;
            }
            gameState.turnDamage = 0;
            gameState.message = '格子已清空';
            gameState.messageTimer = 60;
            updateBattleInfo();
        });
    }
    if (btnAddCard) {
        btnAddCard.addEventListener('click', () => {
            const defId = cardSelect?.value;
            if (defId && gameState) {
                addCardToPlaygroundHand(gameState, defId);
                updateBattleInfo();
            }
        });
    }
    if (btnDrawRandom) {
        btnDrawRandom.addEventListener('click', () => {
            if (!gameState) return;
            drawCards(gameState, 1);
            updateBattleInfo();
        });
    }
    if (btnTabCards) {
        btnTabCards.addEventListener('click', () => {
            _dataEditorTab = 'cards';
            renderDataEditor();
        });
    }
    if (btnTabMonsters) {
        btnTabMonsters.addEventListener('click', () => {
            _dataEditorTab = 'monsters';
            renderDataEditor();
        });
    }
    if (btnExportOverrides) {
        btnExportOverrides.addEventListener('click', () => {
            const overrides = getDataOverrides();
            const blob = new Blob([JSON.stringify(overrides, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'card_dungeon_overrides.json';
            a.click();
            URL.revokeObjectURL(url);
        });
    }
    if (btnImportOverrides) {
        btnImportOverrides.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async e => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const overrides = JSON.parse(text);
                    localStorage.setItem('card_dungeon_data_overrides', JSON.stringify(overrides));
                    applyDataOverrides();
                    populateStaticSelects();
                    renderDataEditor();
                    alert('配置已导入并生效，刷新页面后完全生效');
                } catch (err) {
                    alert('导入失败: ' + err.message);
                }
            };
            input.click();
        });
    }
    if (btnClearOverrides) {
        btnClearOverrides.addEventListener('click', () => {
            if (confirm('确定要清除所有数值修改吗？此操作不可撤销。')) {
                clearDataOverrides();
                populateStaticSelects();
                renderDataEditor();
                alert('已清除所有修改，刷新页面后完全生效');
            }
        });
    }
    if (btnExitBattle) {
        btnExitBattle.addEventListener('click', () => {
            backToPlaygroundMenu(gameState);
            if (gameState) {
                gameState.screen = 'title';
                gameState.data = {};
            }
            updateUIView('hidden');
        });
    }

    // ===== 参数配置独立面板事件 =====
    if (btnToggleParam) {
        btnToggleParam.addEventListener('click', () => {
            if (paramPanel) {
                const isHidden = paramPanel.classList.contains('hidden');
                if (isHidden) {
                    paramPanel.classList.remove('hidden');
                    renderDataEditor();
                    if (paramSearch) paramSearch.focus();
                } else {
                    paramPanel.classList.add('hidden');
                }
            }
        });
    }
    if (btnCloseParam) {
        btnCloseParam.addEventListener('click', () => {
            if (paramPanel) paramPanel.classList.add('hidden');
        });
    }
    if (paramSearch) {
        paramSearch.addEventListener('input', () => {
            renderDataEditor();
        });
    }
    // ESC 关闭参数面板
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && paramPanel && !paramPanel.classList.contains('hidden')) {
            paramPanel.classList.add('hidden');
        }
    });
}

// ===== UI 状态更新 =====

export function updateUIView(view) {
    if (!uiRoot) return;

    if (view === 'playground') {
        uiRoot.classList.remove('hidden');
        const pgView = PlaygroundState.view;

        if (menuPanel) menuPanel.style.display = pgView === 'menu' ? 'block' : 'none';
        if (effectPanel) effectPanel.style.display = pgView === 'effect' ? 'flex' : 'none';
        if (battlePanel) battlePanel.style.display = pgView === 'battle' ? 'block' : 'none';

        if (pgView === 'effect') {
            refreshScenarioSelect();
            if (editorTextarea && PlaygroundState.ui.editorContent) {
                editorTextarea.value = PlaygroundState.ui.editorContent;
            }
            if (PlaygroundState.lastResult) {
                showResults(PlaygroundState.lastResult);
            }
        }
        if (pgView === 'battle') {
            updateBattleInfo();
            // 只在首次进入 battle 视图或从其他视图切换回来时渲染编辑器，避免每帧重建 DOM
            if (_lastRenderedView !== 'battle') {
                renderDataEditor();
            }
        } else {
            if (paramPanel) paramPanel.classList.add('hidden');
        }
        _lastRenderedView = pgView;
    } else {
        uiRoot.classList.add('hidden');
        if (battlePanel) battlePanel.style.display = 'none';
        if (effectPanel) effectPanel.style.display = 'none';
        if (menuPanel) menuPanel.style.display = 'none';
        if (paramPanel) paramPanel.classList.add('hidden');
    }
}

function updateBattleInfo() {
    const state = _gameStateRef;
    if (!state || state.screen !== 'playground') return;
    if (infoTurn) infoTurn.textContent = state.turn || 1;
    if (infoDamage) infoDamage.textContent = state.turnDamage || 0;
    if (infoMonsterHp) {
        const hp = state.monster ? Math.max(0, state.monster.hp) : 0;
        const maxHp = state.monster ? state.monster.maxHp : 0;
        infoMonsterHp.textContent = `${hp}/${maxHp}`;
    }
}

// 供外部每帧调用，更新实时数据
export function updateBattlePanelRealtime(state) {
    if (!state || state.screen !== 'playground' || PlaygroundState.view !== 'battle') return;
    if (infoTurn) infoTurn.textContent = state.turn || 1;
    if (infoDamage) infoDamage.textContent = state.turnDamage || 0;
    if (infoMonsterHp && state.monster) {
        infoMonsterHp.textContent = `${Math.max(0, state.monster.hp)}/${state.monster.maxHp}`;
    }
}

// ===== 数据编辑器 =====

// 原始数值缓存（用于恢复默认）
const _originalValues = {
    cards: {},
    monsters: {}
};

function _initOriginalValues() {
    if (Object.keys(_originalValues.cards).length === 0) {
        for (const [id, def] of Object.entries(CARD_DEFS)) {
            _originalValues.cards[id] = { baseValue: def.baseValue };
        }
    }
    if (Object.keys(_originalValues.monsters).length === 0) {
        for (const [id, def] of Object.entries(MONSTER_DEFS)) {
            _originalValues.monsters[id] = { hp: def.hp };
        }
    }
}

function renderDataEditor() {
    if (!dataEditor) return;
    _initOriginalValues();

    // 标签页高亮
    if (btnTabCards && btnTabMonsters) {
        if (_dataEditorTab === 'cards') {
            btnTabCards.style.background = '#2c3e50';
            btnTabCards.style.color = '#fff';
            btnTabMonsters.style.background = '#1a1025';
            btnTabMonsters.style.color = '#aaa';
        } else {
            btnTabMonsters.style.background = '#2c3e50';
            btnTabMonsters.style.color = '#fff';
            btnTabCards.style.background = '#1a1025';
            btnTabCards.style.color = '#aaa';
        }
    }

    const searchQuery = (paramSearch?.value || '').toLowerCase().trim();
    const overrides = getDataOverrides();

    let html = '';
    let itemCount = 0;

    if (_dataEditorTab === 'cards') {
        for (const [id, def] of Object.entries(CARD_DEFS)) {
            if (searchQuery && !id.toLowerCase().includes(searchQuery) && !def.name.toLowerCase().includes(searchQuery)) {
                continue;
            }
            itemCount++;
            const overridden = overrides.cards?.[id]?.baseValue !== undefined;
            const currentValue = overridden ? overrides.cards[id].baseValue : def.baseValue;
            const originalValue = _originalValues.cards[id]?.baseValue ?? def.baseValue;
            const borderColor = overridden ? 'rgba(243,156,18,0.4)' : 'rgba(255,255,255,0.03)';
            const bgColor = overridden ? 'rgba(243,156,18,0.06)' : 'rgba(255,255,255,0.03)';
            const badge = overridden ? `<span style="margin-left:6px;padding:1px 6px;background:#f39c12;color:#000;font-size:10px;border-radius:3px;font-weight:bold;">已修改</span>` : '';
            const originalHint = `<span style="font-size:11px;color:#666;margin-left:6px;">原始: ${originalValue}</span>`;

            html += `<div class="pg-editor-row" data-id="${id}" style="margin-bottom:10px;padding:10px;background:${bgColor};border:1px solid ${borderColor};border-radius:6px;transition:background 0.2s;">`;
            html += `<div style="font-weight:bold;margin-bottom:8px;color:#f39c12;display:flex;align-items:center;flex-wrap:wrap;">${def.name} <span style="color:#666;font-size:11px;font-weight:normal;margin-left:6px;">(${id})</span>${badge}</div>`;
            html += `<div style="display:flex;gap:6px;align-items:center;">`;
            html += `<label style="width:70px;font-size:12px;color:#aaa;">基础数值</label>`;
            html += `<input type="number" data-cat="cards" data-id="${id}" data-field="baseValue" value="${currentValue}" style="flex:1;padding:5px 8px;background:#1a1025;color:#fff;border:1px solid #444;border-radius:4px;font-size:13px;min-width:60px;">`;
            html += `<button class="pg-save-field" style="padding:5px 12px;background:#27ae60;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;white-space:nowrap;">保存</button>`;
            html += `<button class="pg-reset-field" data-cat="cards" data-id="${id}" data-field="baseValue" style="padding:5px 10px;background:#555;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;white-space:nowrap;">恢复</button>`;
            html += `</div>`;
            html += `<div style="margin-top:6px;font-size:11px;color:#666;">${originalHint}</div>`;
            html += `</div>`;
        }
    } else {
        for (const [id, def] of Object.entries(MONSTER_DEFS)) {
            if (searchQuery && !id.toLowerCase().includes(searchQuery) && !def.name.toLowerCase().includes(searchQuery)) {
                continue;
            }
            itemCount++;
            const overridden = overrides.monsters?.[id]?.hp !== undefined;
            const currentValue = overridden ? overrides.monsters[id].hp : def.hp;
            const originalValue = _originalValues.monsters[id]?.hp ?? def.hp;
            const borderColor = overridden ? 'rgba(231,76,60,0.4)' : 'rgba(255,255,255,0.03)';
            const bgColor = overridden ? 'rgba(231,76,60,0.06)' : 'rgba(255,255,255,0.03)';
            const badge = overridden ? `<span style="margin-left:6px;padding:1px 6px;background:#e74c3c;color:#fff;font-size:10px;border-radius:3px;font-weight:bold;">已修改</span>` : '';
            const originalHint = `<span style="font-size:11px;color:#666;margin-left:6px;">原始: ${originalValue}</span>`;

            html += `<div class="pg-editor-row" data-id="${id}" style="margin-bottom:10px;padding:10px;background:${bgColor};border:1px solid ${borderColor};border-radius:6px;transition:background 0.2s;">`;
            html += `<div style="font-weight:bold;margin-bottom:8px;color:#e74c3c;display:flex;align-items:center;flex-wrap:wrap;">${def.name} <span style="color:#666;font-size:11px;font-weight:normal;margin-left:6px;">(${id})</span>${badge}</div>`;
            html += `<div style="display:flex;gap:6px;align-items:center;">`;
            html += `<label style="width:70px;font-size:12px;color:#aaa;">HP</label>`;
            html += `<input type="number" data-cat="monsters" data-id="${id}" data-field="hp" value="${currentValue}" style="flex:1;padding:5px 8px;background:#1a1025;color:#fff;border:1px solid #444;border-radius:4px;font-size:13px;min-width:60px;">`;
            html += `<button class="pg-save-field" style="padding:5px 12px;background:#27ae60;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;white-space:nowrap;">保存</button>`;
            html += `<button class="pg-reset-field" data-cat="monsters" data-id="${id}" data-field="hp" style="padding:5px 10px;background:#555;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;white-space:nowrap;">恢复</button>`;
            html += `</div>`;
            html += `<div style="margin-top:6px;font-size:11px;color:#666;">${originalHint}</div>`;
            html += `</div>`;
        }
    }

    if (itemCount === 0) {
        html = `<div style="text-align:center;color:#666;padding:40px 0;font-size:14px;">🔍 未找到匹配项</div>`;
    } else {
        html = `<div style="font-size:12px;color:#888;margin-bottom:10px;">共 ${itemCount} 项</div>` + html;
    }

    dataEditor.innerHTML = html;

    // 绑定保存按钮
    dataEditor.querySelectorAll('.pg-save-field').forEach(btn => {
        btn.addEventListener('click', e => {
            const row = e.target.closest('.pg-editor-row');
            const input = row?.querySelector('input[data-field]');
            if (!input) return;
            _saveField(input, e.target);
        });
    });

    // 绑定恢复按钮
    dataEditor.querySelectorAll('.pg-reset-field').forEach(btn => {
        btn.addEventListener('click', e => {
            const cat = e.target.dataset.cat;
            const id = e.target.dataset.id;
            const field = e.target.dataset.field;
            const orig = _originalValues[cat]?.[id]?.[field];
            if (orig === undefined) return;
            // 清除覆盖
            const ov = getDataOverrides();
            if (ov[cat]) {
                delete ov[cat][id][field];
                if (Object.keys(ov[cat][id]).length === 0) {
                    delete ov[cat][id];
                }
                if (Object.keys(ov[cat]).length === 0) {
                    delete ov[cat];
                }
                localStorage.setItem('card_dungeon_data_overrides', JSON.stringify(ov));
                // 直接恢复原始定义（applyDataOverrides 只应用覆盖，不会恢复已修改的定义）
                if (cat === 'cards' && CARD_DEFS[id]) {
                    CARD_DEFS[id][field] = orig;
                } else if (cat === 'monsters' && MONSTER_DEFS[id]) {
                    MONSTER_DEFS[id][field] = orig;
                }
                populateStaticSelects();
                renderDataEditor();
                // 同步战斗状态
                if (_gameStateRef && _gameStateRef._playgroundBattle) {
                    if (cat === 'monsters' && field === 'hp' && _gameStateRef.monster && _gameStateRef.data?.pgMonsterId === id) {
                        const diff = orig - _gameStateRef.monster.maxHp;
                        _gameStateRef.monster.maxHp = orig;
                        _gameStateRef.monster.hp = Math.max(0, _gameStateRef.monster.hp + diff);
                    }
                }
            }
        });
    });

    // 绑定回车保存
    dataEditor.querySelectorAll('input[data-field]').forEach(input => {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                const row = e.target.closest('.pg-editor-row');
                const btn = row?.querySelector('.pg-save-field');
                if (btn) _saveField(input, btn);
            }
        });
    });
}

function _saveField(input, btn) {
    const cat = input.dataset.cat;
    const id = input.dataset.id;
    const field = input.dataset.field;
    let value = input.value;
    if (input.type === 'number') value = Number(value);
    saveDataOverride(cat, id, field, value);
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = '保存'; }, 800);
    // 如果正在战斗，同步更新当前状态中的数值
    if (_gameStateRef && _gameStateRef._playgroundBattle) {
        if (cat === 'monsters' && field === 'hp' && _gameStateRef.monster && _gameStateRef.data?.pgMonsterId === id) {
            const diff = value - _gameStateRef.monster.maxHp;
            _gameStateRef.monster.maxHp = value;
            _gameStateRef.monster.hp = Math.max(0, _gameStateRef.monster.hp + diff);
        }
    }
    populateStaticSelects();
    renderDataEditor();
}

// ===== AI 测试相关 =====

function refreshScenarioSelect() {
    if (!scenarioSelect) return;
    const scenarios = getAllScenarios();
    const currentId = PlaygroundState.selectedScenarioId;

    let html = '<option value="">-- 选择场景 --</option>';
    for (const s of scenarios) {
        const selected = s.id === currentId ? ' selected' : '';
        const tag = s.category === 'quick' ? '[自定义]' : '[预设]';
        html += `<option value="${s.id}"${selected}>${tag} ${s.name}</option>`;
    }
    scenarioSelect.innerHTML = html;
}

function updateGameStateResult(gameState, result) {
    if (gameState && gameState.data) {
        gameState.data.pgResult = result;
    }
}

function showResults(result) {
    if (!resultsArea) return;

    const assertions = result.assertionResults || [];
    const passCount = assertions.filter(a => a.passed).length;
    const failCount = assertions.length - passCount;
    const statusColor = result.passed ? '#2ecc71' : '#e74c3c';
    const statusIcon = result.passed ? '✓' : '✗';

    let html = `<div class="pg-result-header" style="color:${statusColor};font-weight:bold;font-size:16px;margin-bottom:8px;">`;
    html += `${statusIcon} ${result.name} (${passCount}/${assertions.length} 通过)`;
    html += ` <span style="color:#888;font-size:12px;">${result.durationMs.toFixed(1)}ms</span>`;
    html += '</div>';

    if (assertions.length > 0) {
        html += '<div class="pg-assertions">';
        for (const a of assertions) {
            const color = a.passed ? '#2ecc71' : '#e74c3c';
            const icon = a.passed ? '✓' : '✗';
            html += `<div style="margin:4px 0;font-size:13px;">`;
            html += `<span style="color:${color}">${icon}</span> ${escapeHtml(a.desc)}`;
            if (!a.passed) {
                html += `<div style="color:#888;font-size:11px;margin-left:18px;">期望: ${escapeHtml(JSON.stringify(a.expected))} | 实际: ${escapeHtml(JSON.stringify(a.actual))}</div>`;
            }
            html += '</div>';
        }
        html += '</div>';
    }

    if (result.logs && result.logs.length > 0) {
        html += '<details style="margin-top:8px;"><summary style="color:#888;font-size:12px;cursor:pointer;">执行日志</summary>';
        html += '<pre style="background:#1a1025;padding:8px;font-size:11px;color:#aaa;max-height:150px;overflow:auto;margin-top:4px;">';
        html += escapeHtml(result.logs.join('\n'));
        html += '</pre></details>';
    }

    resultsArea.innerHTML = html;
}

function showReport(report) {
    if (!resultsArea) return;
    const color = report.summary.failed === 0 ? '#2ecc71' : '#e74c3c';

    let html = `<div style="color:${color};font-weight:bold;font-size:16px;margin-bottom:8px;">`;
    html += `📊 全量报告: ${report.summary.passed}/${report.summary.total} 通过 (${report.summary.passRate})`;
    html += '</div>';

    if (report.summary.failed > 0) {
        html += '<div style="color:#e74c3c;margin-bottom:8px;font-size:13px;">失败场景:</div>';
        for (const detail of report.details.filter(d => !d.passed)) {
            html += `<div style="margin:4px 0;font-size:12px;">`;
            html += `<span style="color:#e74c3c">✗</span> ${escapeHtml(detail.name)}`;
            for (const fa of detail.failedAssertions) {
                html += `<div style="color:#888;margin-left:16px;font-size:11px;">${escapeHtml(fa.desc)}: 期望=${escapeHtml(JSON.stringify(fa.expected))} 实际=${escapeHtml(JSON.stringify(fa.actual))}</div>`;
            }
            html += '</div>';
        }
    } else {
        html += '<div style="color:#2ecc71;font-size:14px;">🎉 所有场景全部通过！</div>';
    }

    html += `<div style="margin-top:8px;font-size:11px;color:#666;">生成时间: ${report.timestamp}</div>`;

    resultsArea.innerHTML = html;
}

function showError(msg) {
    if (!resultsArea) return;
    resultsArea.innerHTML = `<div style="color:#e74c3c;font-size:14px;">❌ ${escapeHtml(msg)}</div>`;
}

function showMessage(msg) {
    if (!resultsArea) return;
    resultsArea.innerHTML = `<div style="color:#3498db;font-size:14px;">ℹ️ ${escapeHtml(msg)}</div>`;
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}
