// 房间生成与地城逻辑

import { generateMonstersForNode, createBossInstance, randomMonsterByLevel } from '../data/monsters.js';
import { getRandomItems, SHOP_ITEMS } from '../data/items.js';
import { ROOM_TYPES, FIXED_NODES } from '../data/rooms.js';
import {
  createPlayerCard, createMonsterCard, createGoldCard, createChestCard,
  createFoodCard, createMentorCard, createAttrUpCard, createTrapCard, createShopCard
} from './cards.js';

/**
 * 生成一层的9个节点房间类型
 */
export function generateLayerRooms(layer) {
  const rooms = [];
  for (let i = 0; i < 9; i++) {
    rooms.push(FIXED_NODES[i] || 'normal');
  }
  return rooms;
}

/**
 * 生成房间内的卡牌并分布到九宫格
 */
export function generateRoomCards(roomType, nodeIndex, layer, playerData) {
  const stacks = Array.from({ length: 9 }, () => []);

  // 玩家卡固定在格8（index 7）
  stacks[7] = [createPlayerCard(playerData.name)];

  // 收集所有需要分布的卡牌
  const cards = [];

  if (roomType === 'restaurant') {
    // 餐厅：1食物 + 3导师
    cards.push(createFoodCard());
    cards.push(createMentorCard('thorns'));
    cards.push(createMentorCard('toughSkin'));
    cards.push(createMentorCard('veteran'));
  } else if (roomType === 'boss') {
    // Boss房：层主 + 少量高级怪物
    const boss = createBossInstance();
    cards.push(createMonsterCard(boss));
    // 加几个高级护卫
    for (let i = 0; i < 3; i++) {
      const m = randomMonsterByLevel(4);
      if (m) cards.push(createMonsterCard(m));
    }
    addTrapsAndItems(cards, layer);
  } else {
    // 战斗房：按节点和层数生成怪物
    const monsters = generateMonstersForNode(nodeIndex, layer);
    for (const m of monsters) {
      cards.push(createMonsterCard(m));
    }

    // 精英房额外加精英
    if (roomType === 'elite') {
      const elite = randomMonsterByLevel(4);
      if (elite) {
        const eliteInst = { ...elite, level: 'elite', keywords: [...(elite.keywords || [])] };
        cards.push(createMonsterCard(eliteInst));
      }
    }

    // 房间类型额外卡牌
    const roomDef = ROOM_TYPES[roomType];
    if (roomDef?.extraCards) {
      for (const extra of roomDef.extraCards) {
        switch (extra.type) {
          case 'goldCard': cards.push(createGoldCard()); break;
          case 'chestCard': cards.push(createChestCard()); break;
          case 'attrCard': cards.push(createAttrUpCard()); break;
          case 'shopItems':
            for (const def of SHOP_ITEMS) cards.push(createShopCard(def));
            break;
        }
      }
    }

    // 非餐厅都加机关和道具
    if (roomType !== 'restaurant') {
      addTrapsAndItems(cards, layer);
    }
  }

  // 分布卡牌到格子
  distributeCards(cards, stacks, 7);
  return stacks;
}

function addTrapsAndItems(cards, layer) {
  const trapCount = randInt(2, 3);
  const trapTypes = ['crossbow', 'spike', 'teleport'];
  for (let i = 0; i < trapCount; i++) {
    const type = trapTypes[Math.floor(Math.random() * trapTypes.length)];
    cards.push(createTrapCard(type));
  }

  const itemCount = randInt(3, 5);
  const items = getRandomItems(itemCount);
  for (const item of items) cards.push(item);
}

/**
 * 将卡牌均匀分布到格子中，控制每格堆叠深度
 */
function distributeCards(cards, stacks, excludeIndex) {
  shuffleArray(cards);

  // 可用格子索引
  const indices = [];
  for (let i = 0; i < 9; i++) {
    if (i !== excludeIndex) indices.push(i);
  }

  // 第一轮：每格至少放1张
  let cardIdx = 0;
  for (let i = 0; i < indices.length && cardIdx < cards.length; i++) {
    const card = cards[cardIdx++];
    card.revealed = false;
    stacks[indices[i]].push(card);
  }

  // 剩余卡牌：轮转分配到各格（控制最大堆叠深度为4）
  const maxDepth = 4;
  let idxPtr = 0;
  while (cardIdx < cards.length) {
    const targetCellIdx = indices[idxPtr % indices.length];
    if (stacks[targetCellIdx].length < maxDepth) {
      const card = cards[cardIdx++];
      card.revealed = false;
      stacks[targetCellIdx].push(card);
    }
    idxPtr++;
    // 安全阀：所有格都满了就停止
    if (idxPtr > indices.length * maxDepth) break;
  }

  // 每格内部洗牌
  for (const idx of indices) {
    shuffleArray(stacks[idx]);
  }
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成路线选项
 */
export function generateRouteOptions(nodeIndex) {
  const earlyChoices = ['gold', 'chest', 'attr'];
  const midChoices = ['gold', 'chest', 'attr', 'shop', 'elite'];
  const pool = nodeIndex < 3 ? earlyChoices : midChoices;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, randInt(2, 3));
}
