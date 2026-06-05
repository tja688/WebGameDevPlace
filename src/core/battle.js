// 战斗与伤害结算 — 扁平卡牌模型

import { getTotalStats, damagePlayer, addGold, healPlayer } from './gameState.js';
import { getRandomItems } from '../data/items.js';

export function calcDamage(atk, def) {
  return Math.max(0, atk - def);
}

/**
 * 玩家 vs 怪物 战斗结算
 * monster 即为 grid 中的扁平卡牌对象
 */
export function resolvePlayerMonsterBattle(state, monster) {
  const stats = getTotalStats(state);
  const playerAtk = stats.atk;
  const playerDef = stats.def;

  // 鼓舞：场上有旗兵骷髅时，其他怪物攻击+1
  let inspireBonus = 0;
  if (state.grid && monster.templateId !== 'bannerSkeleton') {
    for (let i = 0; i < 9; i++) {
      const stack = state.grid[i];
      if (!stack) continue;
      for (const card of stack) {
        if (card.type === 'monster' && card.revealed && card.templateId === 'bannerSkeleton' && card !== monster) {
          inspireBonus += 1;
        }
      }
    }
  }
  const effectiveMonsterAtk = monster.atk + inspireBonus;

  const monsterHasFirstStrike = monster.keywords?.includes('firstStrike');
  const playerFirst = !monsterHasFirstStrike;

  const results = [];

  if (playerFirst) {
    // 玩家先攻
    const dmgToMonster = calcDamage(playerAtk, monster.def);
    monster.hp -= dmgToMonster;
    results.push({ type: 'playerAttack', damage: dmgToMonster });

    if (monster.hp > 0) {
      const dmgToPlayer = calcDamage(effectiveMonsterAtk, playerDef);
      const res = damagePlayer(state, dmgToPlayer);
      results.push({ type: 'monsterAttack', damage: res.damage, shielded: res.shielded });
    } else {
      results.push({ type: 'monsterDie' });
      onMonsterDefeated(state, monster);
    }
  } else {
    // 怪物先攻
    const dmgToPlayer = calcDamage(effectiveMonsterAtk, playerDef);
    const res = damagePlayer(state, dmgToPlayer);
    results.push({ type: 'monsterAttack', damage: res.damage, shielded: res.shielded });

    if (state.player.hp > 0) {
      const dmgToMonster = calcDamage(playerAtk, monster.def);
      monster.hp -= dmgToMonster;
      results.push({ type: 'playerAttack', damage: dmgToMonster });

      if (monster.hp <= 0) {
        results.push({ type: 'monsterDie' });
        onMonsterDefeated(state, monster);
      }
    }
  }

  // 刺皮：被攻击时对怪物反击
  if (state.player.skills.thorns) {
    const wasAttacked = results.some(r => r.type === 'monsterAttack' && r.damage > 0);
    if (wasAttacked && monster.hp > 0) {
      const thornsDmg = effectiveMonsterAtk;
      monster.hp -= thornsDmg;
      results.push({ type: 'thorns', damage: thornsDmg });
      if (monster.hp <= 0) {
        results.push({ type: 'monsterDie' });
        onMonsterDefeated(state, monster);
      }
    }
  }

  // 历战：每次战斗攻击临时+1
  if (state.player.skills.veteran) {
    state.player.tempAtkBonus += 1;
  }

  // 破甲：武装骷髅每次互动减少玩家防御
  if (monster.keywords?.includes('armorBreak')) {
    state.player.tempDefBonus = Math.max(
      -(state.player.def),
      (state.player.tempDefBonus || 0) - 1
    );
  }

  return results;
}

/**
 * 玩家 vs 机关 互动结算
 * 机关伤害为固定值，不受玩家防御影响
 */
export function resolvePlayerTrapBattle(state, trap) {
  const stats = getTotalStats(state);
  const dmgToTrap = calcDamage(stats.atk, trap.def || 0);
  trap.hp -= dmgToTrap;

  const results = [];
  results.push({ type: 'playerAttack', damage: dmgToTrap });

  // 机关对玩家的固定伤害（无视防御）
  const fixedDmg = trap.atk || 0;
  if (fixedDmg > 0) {
    const res = damagePlayer(state, fixedDmg);
    results.push({ type: 'trapAttack', damage: res.damage, shielded: res.shielded });
  }

  if (trap.hp <= 0) {
    results.push({ type: 'trapDestroy' });
  }

  return results;
}

/**
 * 机关摧毁后的效果
 */
export function resolveTrapDestroyEffect(state, trap, gridIndex) {
  const results = [];

  if (trap.templateId === 'crossbow') {
    // 弩箭：对同列上方所有翻开的怪物造成6点伤害
    const col = gridIndex % 3;
    for (let row = 0; row < 3; row++) {
      const idx = row * 3 + col;
      if (idx === state.playerGridIndex) continue;
      const stack = state.grid[idx];
      const card = stack?.[stack.length - 1];
      if (card && card.revealed && card.type === 'monster') {
        card.hp -= 6;
        results.push({ type: 'trapEffect', targetIndex: idx, damage: 6 });
      }
    }
  } else if (trap.templateId === 'teleport') {
    results.push({ type: 'teleportTrigger' });
  }
  // spike 效果在 afterPlayerAction 中处理

  return results;
}

/**
 * 怪物被击败时的回调
 */
function onMonsterDefeated(state, monster) {
  addGold(state, 10);
  state.player.killCount++;
  state.totalKills++;

  // 复仇骷髅：同伴倒下时攻击+2
  for (let i = 0; i < 9; i++) {
    const stack = state.grid[i];
    if (!stack) continue;
    for (const card of stack) {
      if (card.type === 'monster' && card.templateId === 'vengefulSkeleton' && card !== monster) {
        card.atk += 2;
        card.vengeanceStacks = (card.vengeanceStacks || 0) + 2;
      }
    }
  }

  // 村好剑：击败精英/层主攻击+2
  if (monster.level === 'elite' || monster.level === 'boss') {
    state.player.atk += 2;
  }
}

/**
 * 道具使用效果
 */
export function useItemOnTarget(state, item, target) {
  const results = [];

  switch (item.effect) {
    case 'heal':
      if (target === 'player') {
        healPlayer(state, item.value || 6);
        results.push({ type: 'heal', value: item.value || 6 });
      }
      break;

    case 'damage':
      if (target && target.type === 'monster') {
        target.hp -= (item.value || 6);
        results.push({ type: 'itemDamage', damage: item.value || 6 });
      }
      break;

    case 'shield':
      if (target === 'player') {
        state.player.shield = 1;
        results.push({ type: 'shield' });
      }
      break;

    case 'doubleAtk':
      if (target === 'player') {
        state.player.tempAtkBonus += state.player.atk;
        results.push({ type: 'doubleAtk' });
      }
      break;
  }

  return results;
}

/**
 * 属性提升选择
 */
export function applyAttrUp(state, choice) {
  if (choice === 'atk') state.player.atk += 1;
  else if (choice === 'def') state.player.def += 1;
  else if (choice === 'hp') {
    state.player.maxHp += 2;
    state.player.hp = Math.min(state.player.hp + 2, state.player.maxHp);
  }
}

/**
 * 食物：回满血
 */
export function applyFood(state) {
  const stats = getTotalStats(state);
  state.player.hp = stats.maxHp;
}

/**
 * 购买商品
 */
export function buyShopItem(state, shopItem) {
  if (state.player.gold < shopItem.cost) return false;
  state.player.gold -= shopItem.cost;

  switch (shopItem.effect) {
    case 'atk+1': state.player.atk += 1; break;
    case 'def+1': state.player.def += 1; break;
    case 'hp+2':
      state.player.maxHp += 2;
      state.player.hp = Math.min(state.player.hp + 2, state.player.maxHp);
      break;
    case 'randomItem': {
      const items = getRandomItems(1);
      if (items.length > 0 && state.player.items.length < 4) {
        state.player.items.push(items[0]);
      }
      break;
    }
    case 'chest': break; // 由场景处理
  }
  return true;
}
