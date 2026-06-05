// 战斗与伤害结算

import { getTotalStats, damagePlayer, addGold, healPlayer } from './gameState.js';
import { getRandomItems } from '../data/items.js';

// 伤害计算：攻击 - 防御，最低0
export function calcDamage(attackerAtk, defenderDef) {
  return Math.max(0, attackerAtk - defenderDef);
}

// 玩家与怪物互动
export function resolvePlayerMonsterBattle(state, monster) {
  const stats = getTotalStats(state);
  const playerAtk = stats.atk;
  const playerDef = stats.def;

  // 先攻判定：玩家默认优先，怪物有先攻则怪物先
  const monsterHasFirstStrike = monster.keywords.includes('firstStrike');
  const playerFirst = !monsterHasFirstStrike;

  const results = [];

  if (playerFirst) {
    // 玩家先攻
    const dmgToMonster = calcDamage(playerAtk, monster.def);
    monster.hp -= dmgToMonster;
    results.push({ type: 'playerAttack', target: monster, damage: dmgToMonster });

    if (monster.hp > 0) {
      const dmgToPlayer = calcDamage(monster.atk, playerDef);
      const res = damagePlayer(state, dmgToPlayer);
      results.push({ type: 'monsterAttack', target: 'player', damage: res.damage, shielded: res.shielded });
    } else {
      results.push({ type: 'monsterDie', target: monster });
      onMonsterDefeated(state, monster);
    }
  } else {
    // 怪物先攻
    const dmgToPlayer = calcDamage(monster.atk, playerDef);
    const res = damagePlayer(state, dmgToPlayer);
    results.push({ type: 'monsterAttack', target: 'player', damage: res.damage, shielded: res.shielded });

    if (state.player.hp > 0) {
      const dmgToMonster = calcDamage(playerAtk, monster.def);
      monster.hp -= dmgToMonster;
      results.push({ type: 'playerAttack', target: monster, damage: dmgToMonster });

      if (monster.hp <= 0) {
        results.push({ type: 'monsterDie', target: monster });
        onMonsterDefeated(state, monster);
      }
    }
  }

  // 刺皮：被攻击时对攻击者造成反击（等同于怪物攻击值）
  if (state.player.skills.thorns && results.some(r => r.type === 'monsterAttack' && r.damage > 0)) {
    if (monster.hp > 0) {
      const thornsDmg = monster.atk; // 刺皮造成等同于攻击者攻击的伤害
      monster.hp -= thornsDmg;
      results.push({ type: 'thorns', target: monster, damage: thornsDmg });
      if (monster.hp <= 0) {
        results.push({ type: 'monsterDie', target: monster });
        onMonsterDefeated(state, monster);
      }
    }
  }

  // 历战：每次与敌人互动攻击+1（临时，复原逻辑在互动结束后）
  if (state.player.skills.veteran) {
    state.player.tempAtkBonus += 1;
  }

  return results;
}

// 玩家与机关互动
export function resolvePlayerTrapBattle(state, trap) {
  const stats = getTotalStats(state);
  const dmgToTrap = calcDamage(stats.atk, trap.def || 0);
  trap.hp -= dmgToTrap;

  const results = [];
  results.push({ type: 'playerAttack', target: trap, damage: dmgToTrap });

  // 机关对玩家造成固定伤害（不受防御减免）
  const fixedDmg = trap.atk || 0;
  if (fixedDmg > 0) {
    const res = damagePlayer(state, fixedDmg);
    results.push({ type: 'trapAttack', target: 'player', damage: res.damage, shielded: res.shielded });
  }

  if (trap.hp <= 0) {
    results.push({ type: 'trapDestroy', target: trap });
    results.push(...resolveTrapEffect(state, trap));
  }

  return results;
}

function resolveTrapEffect(state, trap) {
  const results = [];
  if (trap.templateId === 'crossbow') {
    const col = state.playerGridIndex % 3;
    for (let row = 0; row < 3; row++) {
      const idx = row * 3 + col;
      if (idx === state.playerGridIndex) continue;
      const stack = state.grid[idx];
      const card = stack?.[stack.length - 1];
      if (card && card.revealed && card.type === 'monster') {
        card.hp -= 6;
        results.push({ type: 'trapEffect', target: card, damage: 6 });
        if (card.hp <= 0) {
          results.push({ type: 'monsterDie', target: card });
          onMonsterDefeated(state, card);
        }
      }
    }
  } else if (trap.templateId === 'spike') {
    // 尖刺效果在翻牌/互动时由场景处理
  } else if (trap.templateId === 'teleport') {
    results.push({ type: 'teleportTrigger', target: trap });
  }
  return results;
}

function onMonsterDefeated(state, monster) {
  addGold(state, 10);
  state.player.killCount++;
  state.totalKills++;

  // 复仇骷髅：其他复仇骷髅攻击力+2
  for (let i = 0; i < 9; i++) {
    const stack = state.grid[i];
    if (!stack) continue;
    const card = stack[stack.length - 1];
    if (card && card.type === 'monster' && card.templateId === 'vengefulSkeleton' && card !== monster) {
      card.atk += 2;
      card.vengeanceStacks += 2;
    }
  }
}

// 使用道具对目标的效果
export function useItemOnTarget(state, item, target) {
  const results = [];
  switch (item.effect) {
    case 'heal':
      if (target === 'player') {
        healPlayer(state, item.value || 6);
        results.push({ type: 'heal', target: 'player', value: item.value || 6 });
      }
      break;
    case 'damage':
      if (target && target.type === 'monster') {
        target.hp -= item.value;
        results.push({ type: 'itemDamage', target, damage: item.value });
        if (target.hp <= 0) {
          results.push({ type: 'monsterDie', target });
          onMonsterDefeated(state, target);
        }
      }
      break;
    case 'shield':
      if (target === 'player') {
        state.player.shield = 1;
        results.push({ type: 'shield', target: 'player' });
      }
      break;
    case 'doubleAtk':
      if (target === 'player') {
        state.player.tempAtkBonus += state.player.atk;
        results.push({ type: 'doubleAtk', target: 'player' });
      }
      break;
  }
  return results;
}

// 应用属性提升
export function applyAttrUp(state, choice) {
  if (choice === 'atk') state.player.atk += 1;
  else if (choice === 'def') state.player.def += 1;
  else if (choice === 'hp') {
    state.player.maxHp += 2;
    state.player.hp += 2;
  }
}

// 食品卡效果
export function applyFood(state) {
  const stats = getTotalStats(state);
  state.player.hp = stats.maxHp;
}

// 购买商品
export function buyShopItem(state, shopItem) {
  if (state.player.gold < shopItem.cost) return false;
  state.player.gold -= shopItem.cost;

  if (shopItem.effect === 'atk+1') state.player.atk += 1;
  else if (shopItem.effect === 'def+1') state.player.def += 1;
  else if (shopItem.effect === 'hp+2') {
    state.player.maxHp += 2;
    state.player.hp += 2;
  }
  else if (shopItem.effect === 'randomItem') {
    const items = getRandomItems(1);
    if (items.length > 0) {
      state.player.items.push(items[0]);
    }
  }
  else if (shopItem.effect === 'chest') {
    // 在玩家所在格生成宝箱卡
    // 由场景处理
  }
  return true;
}
