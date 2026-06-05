// 全局游戏状态管理

import { createPlayer } from '../data/classes.js';
import { RELICS } from '../data/relics.js';

export function createInitialGameState(classId = 'soldier') {
  const player = createPlayer(classId);
  return {
    player,
    layer: 1,
    nodeIndex: 0,
    layerNodes: [], // 当前层9个节点的房间类型
    currentRoom: null,
    grid: [], // 9个格子，每个是 Card[] 堆叠
    playerGridIndex: 7, // 格8 (0-based)
    turnCount: 0,
    actionCount: 0,
    gameOver: false,
    victory: false,
    paused: false,
    // 统计数据
    totalRooms: 0,
    totalKills: 0,
    totalGold: 0,
  };
}

export function getTotalStats(state) {
  let atk = state.player.atk + state.player.tempAtkBonus;
  let def = state.player.def + state.player.tempDefBonus;
  let maxHp = state.player.maxHp;

  for (const relicId of state.player.relics) {
    const relic = RELICS[relicId];
    if (relic) {
      atk += relic.atk || 0;
      def += relic.def || 0;
      maxHp += relic.hp || 0;
    }
  }

  return { atk, def, maxHp };
}

export function healPlayer(state, amount) {
  const stats = getTotalStats(state);
  state.player.hp = Math.min(state.player.hp + amount, stats.maxHp);
}

export function damagePlayer(state, amount) {
  // 庇佑魔法：免疫单次伤害
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

export function removeCardFromGrid(state, gridIndex, cardIndex) {
  const stack = state.grid[gridIndex];
  if (stack && cardIndex >= 0 && cardIndex < stack.length) {
    const removed = stack.splice(cardIndex, 1)[0];
    // 翻开下方的卡
    if (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (!top.revealed) {
        top.revealed = true;
        return { removed, revealed: top };
      }
    }
    return { removed, revealed: null };
  }
  return { removed: null, revealed: null };
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
    const card = getTopCard(state, i);
    if (card && card.type === 'monster') count++;
  }
  return count;
}

export function hasMonsters(state) {
  return getMonsterCount(state) > 0;
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
  localStorage.removeItem('deepDungeon_save');
}
