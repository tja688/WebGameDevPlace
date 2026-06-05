// 房间生成与地城逻辑

import { generateMonstersForNode, createBossInstance, randomMonsterByLevel } from '../data/monsters.js';
import { getRandomItems, createShopItem, SHOP_ITEMS } from '../data/items.js';
import { ROOM_TYPES, FIXED_NODES, getRouteChoices } from '../data/rooms.js';
import {
  createPlayerCard, createMonsterCard, createGoldCard, createChestCard,
  createFoodCard, createMentorCard, createAttrUpCard, createTrapCard, createShopCard
} from './cards.js';

// 生成一层9个节点的房间类型
export function generateLayerRooms(layer) {
  const rooms = [];
  for (let i = 0; i < 9; i++) {
    if (FIXED_NODES[i]) {
      rooms.push(FIXED_NODES[i]);
    } else {
      rooms.push('normal');
    }
  }
  return rooms;
}

// 为特定节点生成房间卡牌堆叠
export function generateRoomCards(roomType, nodeIndex, layer, playerData) {
  const stacks = Array.from({ length: 9 }, () => []);
  const cards = [];

  // 玩家卡固定在格8 (index 7)
  const playerCard = createPlayerCard(playerData);
  stacks[7].push(playerCard);

  if (roomType === 'restaurant') {
    cards.push(createFoodCard());
    cards.push(createMentorCard('thorns'));
    cards.push(createMentorCard('toughSkin'));
    cards.push(createMentorCard('veteran'));
  } else if (roomType === 'boss') {
    const monsters = generateMonstersForNode(8, layer);
    for (const m of monsters) {
      if (m.level === 'boss') {
        const boss = createBossInstance();
        cards.push(createMonsterCard(boss));
      } else {
        cards.push(createMonsterCard(m));
      }
    }
    addTrapsAndItems(cards, layer);
  } else {
    const monsters = generateMonstersForNode(nodeIndex, layer);
    for (const m of monsters) {
      cards.push(createMonsterCard(m));
    }

    if (roomType === 'elite') {
      const elite = randomMonsterByLevel(4);
      if (elite) {
        const eliteInst = { ...elite };
        eliteInst.level = 'elite';
        cards.push(createMonsterCard(eliteInst));
      }
    }

    const roomDef = ROOM_TYPES[roomType];
    if (roomDef && roomDef.extraCards) {
      for (const extra of roomDef.extraCards) {
        if (extra.type === 'goldCard') cards.push(createGoldCard());
        else if (extra.type === 'chestCard') cards.push(createChestCard());
        else if (extra.type === 'attrCard') cards.push(createAttrUpCard());
        else if (extra.type === 'shopItems') {
          for (const def of SHOP_ITEMS) {
            cards.push(createShopCard(def));
          }
        }
      }
    }

    if (roomType !== 'restaurant') {
      addTrapsAndItems(cards, layer);
    }
  }

  distributeCards(cards, stacks, 7);
  return stacks;
}

function addTrapsAndItems(cards, layer) {
  const trapCount = randInt(2, 4);
  const trapTypes = ['crossbow', 'spike', 'teleport'];
  for (let i = 0; i < trapCount; i++) {
    const type = trapTypes[Math.floor(Math.random() * trapTypes.length)];
    cards.push(createTrapCard(type));
  }

  const itemCount = randInt(4, 6);
  const items = getRandomItems(itemCount);
  for (const item of items) {
    cards.push(item);
  }
}

function distributeCards(cards, stacks, excludeIndex) {
  const indices = [];
  for (let i = 0; i < 9; i++) {
    if (i !== excludeIndex) indices.push(i);
  }

  // 先每个格子放一张
  for (let i = 0; i < indices.length && i < cards.length; i++) {
    const card = cards[i];
    card.revealed = false;
    stacks[indices[i]].push(card);
  }

  // 剩余卡牌随机堆叠
  for (let i = indices.length; i < cards.length; i++) {
    const card = cards[i];
    card.revealed = false;
    const idx = indices[Math.floor(Math.random() * indices.length)];
    stacks[idx].push(card);
  }

  // 随机打乱每个堆叠的顺序（除了玩家格）
  for (let i = 0; i < 9; i++) {
    if (i === excludeIndex) continue;
    shuffleArray(stacks[i]);
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

// 生成路线选择选项
export function generateRouteOptions(nodeIndex) {
  const choices = getRouteChoices(nodeIndex);
  const count = randInt(2, 3);
  const shuffled = [...choices].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
