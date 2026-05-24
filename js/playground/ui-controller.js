/**
 * 卡牌地下城 - Playground DOM UI 控制器
 *
 * 提供：
 * - 场景选择器
 * - JSON 编辑器（textarea）
 * - 控制按钮（运行/保存/导出/导入/返回）
 * - 结果展示
 * - 与 localStorage 联动
 */

import { PlaygroundState, getAllScenarios, getScenarioById, runScenario, runCurrentScenarioFromEditor, saveScenarioFromEditor, backToPlaygroundMenu } from './index.js';
import { exportScenarioToJson, importScenarioFromFile, exportAllScenariosToJson } from './local-storage.js';
import { AITest } from './ai-harness.js';

// ===== DOM 引用 =====

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

// ===== 初始化 =====

export function initPlaygroundUI(gameState) {
    uiRoot = document.getElementById('playground-ui');
    if (!uiRoot) {
        console.warn('[Playground] UI 根元素 #playground-ui 未找到');
        return;
    }

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

    bindEvents(gameState);
}

function bindEvents(gameState) {
    // 场景选择
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

    // 运行当前场景
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

    // 运行全部场景
    if (btnRunAll) {
        btnRunAll.addEventListener('click', () => {
            showMessage('正在运行全部场景...');
            setTimeout(() => {
                const report = AITest.report();
                showReport(report);
            }, 50);
        });
    }

    // 保存到本地
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

    // 导出当前场景
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

    // 导入场景
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

    // 导出全部场景
    if (btnExportAll) {
        btnExportAll.addEventListener('click', () => {
            const all = getAllScenarios();
            exportAllScenariosToJson(all);
            showMessage(`已导出 ${all.length} 个场景`);
        });
    }

    // 返回菜单
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            backToPlaygroundMenu(gameState);
            updateUIView('menu');
        });
    }

    // 编辑器内容同步
    if (editorTextarea) {
        editorTextarea.addEventListener('input', e => {
            PlaygroundState.ui.editorContent = e.target.value;
        });
    }
}

// ===== UI 状态更新 =====

export function updateUIView(view) {
    if (!uiRoot) return;

    if (view === 'playground') {
        uiRoot.classList.remove('hidden');
        const pgView = PlaygroundState.view;

        if (menuPanel) {
            menuPanel.style.display = pgView === 'menu' ? 'block' : 'none';
        }
        if (effectPanel) {
            effectPanel.style.display = pgView === 'effect' ? 'flex' : 'none';
        }

        if (pgView === 'effect') {
            refreshScenarioSelect();
            if (editorTextarea && PlaygroundState.ui.editorContent) {
                editorTextarea.value = PlaygroundState.ui.editorContent;
            }
            if (PlaygroundState.lastResult) {
                showResults(PlaygroundState.lastResult);
            }
        }
    } else {
        uiRoot.classList.add('hidden');
    }
}

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

// ===== 结果展示 =====

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

    // 日志
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
