/**
 * Heave! - Playground LocalStorage 覆盖层
 *
 * 提供：读/写/导出/导入自定义场景
 * 核心机制：localStorage 作为运行时覆盖层，JSON 作为持久化格式
 */

const STORAGE_KEY = 'card_dungeon_playground_scenarios';
const STORAGE_VERSION = '1.0';

function getStorageData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { version: STORAGE_VERSION, scenarios: {} };
        const data = JSON.parse(raw);
        if (data.version !== STORAGE_VERSION) {
            // 版本迁移（未来需要时在此处处理）
            data.version = STORAGE_VERSION;
        }
        return data;
    } catch (e) {
        console.warn('[Playground] LocalStorage 读取失败:', e);
        return { version: STORAGE_VERSION, scenarios: {} };
    }
}

function setStorageData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (e) {
        console.warn('[Playground] LocalStorage 写入失败:', e);
        return false;
    }
}

// ===== 公开 API =====

export function loadCustomScenarios() {
    return getStorageData().scenarios;
}

export function loadCustomScenario(id) {
    return getStorageData().scenarios[id] || null;
}

export function saveCustomScenario(scenario) {
    if (!scenario || !scenario.id) {
        console.error('[Playground] 保存失败：场景缺少 id');
        return false;
    }
    const data = getStorageData();
    data.scenarios[scenario.id] = scenario;
    return setStorageData(data);
}

export function deleteCustomScenario(id) {
    const data = getStorageData();
    delete data.scenarios[id];
    return setStorageData(data);
}

export function exportScenarioToJson(scenario) {
    if (!scenario) return;
    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scenario.id || 'scenario'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function importScenarioFromFile(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.name.endsWith('.json')) {
            reject(new Error('请选择 .json 文件'));
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const scenario = JSON.parse(e.target.result);
                if (!scenario.id) {
                    reject(new Error('场景 JSON 缺少 id 字段'));
                    return;
                }
                resolve(scenario);
            } catch (err) {
                reject(new Error('JSON 解析失败: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
    });
}

export function exportAllScenariosToJson(scenarios) {
    const data = {
        version: STORAGE_VERSION,
        exportedAt: new Date().toISOString(),
        scenarios
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `card_dungeon_scenarios_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
