/**
 * 卡牌地下城 - 核心工具函数
 */

export function generateUUID() {
    return 'c_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

export function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function getAvailableSlotIndices(totalSlots, unlockedCount) {
    const center = Math.floor(totalSlots / 2);
    const half = Math.floor(unlockedCount / 2);
    const start = center - half;
    const end = start + unlockedCount - 1;
    const indices = [];
    for (let i = start; i <= end; i++) {
        if (i >= 0 && i < totalSlots) indices.push(i);
    }
    return indices;
}

export function darkenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `rgb(${r},${g},${b})`;
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}
