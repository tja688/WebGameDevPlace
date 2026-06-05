// 全局游戏状态管理

import { createPlayer } from '../data/classes.js';
import { RELICS } from '../data/relics.js';

export function createInitialGameState(classId = 'soldier') {
  const player = createPlayer(classId);
  return {
    player,
    layer: 1,
    nodeIndex: 0,
    layerNodes: [],
    currentRoom: null,
    grid: [],
    playerGridIndex: 7,
    turnCount: 0,
    actionCount: 0,
    gameOver: false,
    victory: false,
    paused: false,
    totalRooms: 0,
    totalKills: 0,
    totalGold: 0,
  };
}

/**
 * 计算含遗物和临时加成的最终属性
 */
export function getTotalStats(state) {
  let atk = state.player.atk + (state.player.tempAtkBonus || 0);
  let def = state.player.def + (state.player.tempDefBonus || 0);
  let maxHp = state.player.maxHp;

  // 遗物加成
  for (const relicId of state.player.relics) {
    const relic = RELICS[relicId];
    if (relic) {
      atk += relic.atk || 0;
      def += relic.def || 0;
      maxHp += relic.hp || 0;
    }
  }

  // 活着的肉：每进3个房间额外+1攻击（最多+6）
  const livingFleshCount = state.player.relics.filter(id => id === 'livingFlesh').length;
  if (livingFleshCount > 0) {
    const bonus = Math.min(6, Math.floor(state.totalRooms / 3));
    atk += bonus;
  }

  // 鼓舞：计算场上旗兵骷髅数量
  if (state.grid) {
    for (let i = 0; i < 9; i++) {
      const stack = state.grid[i];
      if (!stack) continue;
      for (const card of stack) {
        if (card.type === 'monster' && card.revealed && card.keywords?.includes('inspire')) {
          // 鼓舞给其他怪物加攻击，不影响玩家属性
        }
      }
    }
  }

  return { atk: Math.max(0, atk), def: Math.max(0, def), maxHp };
}

export function healPlayer(state, amount) {
  const stats = getTotalStats(state);
  state.player.hp = Math.min(state.player.hp + amount, stats.maxHp);
}

/**
 * 对玩家造成伤害
 * @param {boolean} ignoreShield - 机关固定伤害是否忽略护盾（设计文档中机关伤害是固定的但没说忽略护盾）
 */
export function damagePlayer(state, amount) {
  if (amount <= 0) return { damage: 0, shielded: false };

  // 护盾免疫单次伤害
  if (state.player.shield > 0) {
    state.player.shield--;
    return { damage: 0, shielded: true };
  }

  const actual = Math.max(0, amount);
  state.player.hp -= actual;
  if (state.player.hp <= 0) {
    state.player.hp = 0;
    state.gameOver = true;
  }
  return { damage: actual, shielded: false };
}

export function addGold(state, amount) {
  state.player.gold += amount;
  state.totalGold += amount;
}

export function addRelic(state, relic) {
  state.player.relics.push(relic.id);
}

export function addItem(state, item) {
  if (state.player.items.length < 4) {
    state.player.items.push(item);
    return true;
  }
  return false;
}

export function removeItem(state, index) {
  if (index >= 0 && index < state.player.items.length) {
    state.player.items.splice(index, 1);
  }
}

export function addSkill(state, skillId) {
  if (state.player.skills[skillId] !== undefined) {
    state.player.skills[skillId] = true;
  }
}

/**
 * 从格子堆叠中移除一张卡牌
 * 返回 { removed, revealed } — revealed 是新露出的顶部卡牌（如有）
 */
export function removeCardFromGrid(state, gridIndex, cardIndex) {
  const stack = state.grid[gridIndex];
  if (!stack || cardIndex < 0 || cardIndex >= stack.length) {
    return { removed: null, revealed: null };
  }

  const removed = stack.splice(cardIndex, 1)[0];

  // 如果移除后还有卡牌，翻开新的顶部
  let revealed = null;
  if (stack.length > 0) {
    const top = stack[stack.length - 1];
    if (!top.revealed) {
      top.revealed = true;
      revealed = top;
    }
  }

  return { removed, revealed };
}

export function getTopCard(state, gridIndex) {
  const stack = state.grid[gridIndex];
  if (!stack || stack.length === 0) return null;
  return stack[stack.length - 1];
}

export function isCellEmpty(state, gridIndex) {
  const stack = state.grid[gridIndex];
  return !stack || stack.length === 0;
}

export function getMonsterCount(state) {
  let count = 0;
  for (let i = 0; i < 9; i++) {
    const stack = state.grid[i];
    if (!stack) continue;
    for (const card of stack) {
      if (card.type === 'monster') count++;
    }
  }
  return count;
}

export function hasMonsters(state) {
  return getMonsterCount(state) > 0;
}

/**
 * 进入新房间时重置临时加成
 */
export function resetTempBonuses(state) {
  state.player.tempAtkBonus = 0;
  state.player.tempDefBonus = 0;
}

/**
 * 重置遗物的房间冷却
 */
export function resetRelicCooldowns(state) {
  // 遗物是以ID存储的，主动遗物使用标记在别处管理
}

export function saveGame(state) {
  try {
    localStorage.setItem('deepDungeon_save', JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem('deepDungeon_save');
    if (raw) return JSON.parse(raw);
  } catch {
    return null;
  }
  return null;
}

export function clearSave() {
  try {
    localStorage.removeItem('deepDungeon_save');
  } catch { /* ignore */ }
}
