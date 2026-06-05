// ============================================================
// 深入地牢 - 核心游戏场景：3×3 卡牌网格、战斗、交互
// ============================================================
import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, CARD_TYPES, TRAITS, TRAIT_NAMES,
  TRAIT_DESCRIPTIONS, ITEMS, ITEM_LIST, RELICS, MONSTERS,
  CARD_W, CARD_H, CARD_GAP, GRID_X, GRID_Y, GRID_COLS, GRID_ROWS,
  PLAYER_START_CELL, ROOM_TYPES, ROOM_NAMES,
  getAdjacentCells, getCellPos, getCellFromPos, isOrthogonallyAdjacent,
  shuffle, randomInt
} from '../constants.js';
import { GameState } from '../GameState.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.roomType = data.roomType || ROOM_TYPES.NORMAL;
    this.nodeIndex = data.nodeIndex ?? 0;
    // 网格数据: 9个格子，每格一个卡牌数组(栈)
    this.grid = Array.from({ length: 9 }, () => []);
    this.playerCellIndex = PLAYER_START_CELL;
    this.actionCount = 0;
    this.isDragging = false;
    this.isProcessing = false;
    this.roomCleared = false;
    this.playerDead = false;
    // 显示对象引用
    this.cellSlots = [];      // 每个格子的底板
    this.cardDisplays = [];   // 每个格子的卡牌显示组
    this.highlightRects = []; // 高亮框
    this.uiElements = {};
    this.logMessages = [];
    this.dragCard = null;     // 拖拽中的幽灵卡
    this.pendingCallbacks = [];
    this.spikePending = {};   // 尖刺机关延迟触发
    // 遗物 - 法则魔杖状态
    this.lawWandUsed = false;
    this.lawWandMode = false;
    this.lawWandSourceCell = -1;
    // 翻转卡/照明卡/勾绳 选择模式
    this.itemTargetMode = null;
    this.itemTargetSlot = -1;
    this.hookRopeTarget = -1;
  }

  create() {
    this.cameras.main.fadeIn(300);
    GameState.enterRoom();
    this.drawBackground();
    this.createGridSlots();
    this.dealCards();
    this.createUI();
    this.renderAllCells();
    this.setupInput();
    // 延迟翻开相邻卡，避免初始化阶段触发伏击战斗
    this.time.delayedCall(200, () => {
      this.revealAdjacentToPlayer();
      this.processSpikeTriggers();
      this.updateAllUI();
    });
    this.addLog(`进入${ROOM_NAMES[this.roomType]}`);
  }

  // ── 背景 ──────────────────────────────────────────
  drawBackground() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.bg);
    // 网格区域背景
    const gridW = GRID_COLS * CARD_W + (GRID_COLS - 1) * CARD_GAP + 40;
    const gridH = GRID_ROWS * CARD_H + (GRID_ROWS - 1) * CARD_GAP + 40;
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, gridW, gridH, COLORS.panelBg, 0.5)
      .setStrokeStyle(1, COLORS.panelBorder, 0.3);
  }

  // ── 格子底板 ──────────────────────────────────────
  createGridSlots() {
    this.cellSlots = [];
    this.highlightRects = [];
    for (let i = 0; i < 9; i++) {
      const pos = getCellPos(i);
      const slot = this.add.image(pos.x, pos.y, 'empty_cell');
      slot.setDepth(0);
      this.cellSlots.push(slot);

      // 高亮框 (默认隐藏)
      const hl = this.add.image(pos.x, pos.y, 'cell_highlight').setVisible(false).setDepth(5).setAlpha(0.7);
      this.highlightRects.push(hl);
    }
  }

  // ── 发牌 ──────────────────────────────────────────
  dealCards() {
    const allCards = GameState.generateRoomCards(this.nodeIndex, this.roomType);
    // 将卡牌分配到除玩家起始格外的8个格子
    const availableCells = [];
    for (let i = 0; i < 9; i++) {
      if (i !== PLAYER_START_CELL) availableCells.push(i);
    }
    // 先确保每格至少1张
    const shuffledCells = shuffle(availableCells);
    let cardIdx = 0;
    for (const cell of shuffledCells) {
      if (cardIdx < allCards.length) {
        this.grid[cell].push(allCards[cardIdx]);
        cardIdx++;
      }
    }
    // 剩余卡牌随机分配
    while (cardIdx < allCards.length) {
      const cell = shuffledCells[randomInt(0, shuffledCells.length - 1)];
      this.grid[cell].push(allCards[cardIdx]);
      cardIdx++;
    }
    // 在玩家位置放置玩家卡
    this.grid[PLAYER_START_CELL].push({
      type: CARD_TYPES.PLAYER,
      id: 'player',
      name: GameState.player.className,
      faceUp: true,
    });
  }

  // ── 渲染所有格子 ─────────────────────────────────
  renderAllCells() {
    for (let i = 0; i < 9; i++) {
      this.renderCell(i);
    }
  }

  renderCell(cellIndex) {
    // 清除旧显示
    if (this.cardDisplays[cellIndex]) {
      this.cardDisplays[cellIndex].forEach(obj => obj.destroy());
    }
    this.cardDisplays[cellIndex] = [];

    const pos = getCellPos(cellIndex);
    const stack = this.grid[cellIndex];

    if (stack.length === 0) {
      // 空格子
      this.cellSlots[cellIndex].setVisible(true);
      return;
    }
    this.cellSlots[cellIndex].setVisible(false);

    // 显示栈顶卡牌
    const topCard = stack[stack.length - 1];
    const display = this.createCardDisplay(topCard, pos.x, pos.y, cellIndex);
    this.cardDisplays[cellIndex] = display;

    // 显示叠卡数量指示
    if (stack.length > 1) {
      const countBg = this.add.rectangle(pos.x + CARD_W / 2 - 16, pos.y + CARD_H / 2 - 12, 28, 18, 0x000000, 0.7)
        .setDepth(12);
      const countText = this.add.text(pos.x + CARD_W / 2 - 16, pos.y + CARD_H / 2 - 12, `${stack.length}`, {
        fontFamily: 'sans-serif', fontSize: '11px', color: COLORS.textWhite, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(13);
      this.cardDisplays[cellIndex].push(countBg, countText);
    }
  }

  createCardDisplay(card, x, y, cellIndex) {
    const objects = [];

    if (!card.faceUp) {
      // 背面卡
      const back = this.add.image(x, y, 'card_back').setDepth(10);
      objects.push(back);
      return objects;
    }

    // 正面卡 - 根据类型渲染
    const texKey = 'card_' + card.type;
    const bg = this.add.image(x, y, texKey).setDepth(10);
    objects.push(bg);

    const textStyle = {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: COLORS.textWhite,
      fontStyle: 'bold',
    };

    // 卡牌名称 (顶部)
    const nameText = this.add.text(x, y - CARD_H / 2 + 20, card.name, {
      ...textStyle, fontSize: '13px',
    }).setOrigin(0.5).setDepth(11);
    objects.push(nameText);

    // 根据类型渲染不同内容
    if (card.type === CARD_TYPES.PLAYER) {
      this.renderPlayerCardContent(x, y, objects);
    } else if (card.type === CARD_TYPES.MONSTER) {
      this.renderMonsterCardContent(card, x, y, objects);
    } else if (card.type === CARD_TYPES.TRAP) {
      this.renderTrapCardContent(card, x, y, objects);
    } else if (card.type === CARD_TYPES.ITEM) {
      this.renderItemCardContent(card, x, y, objects);
    } else if (card.type === CARD_TYPES.GOLD) {
      objects.push(this.add.text(x, y, `+${card.goldAmount} 金币`, {
        ...textStyle, fontSize: '16px', color: COLORS.textGold,
      }).setOrigin(0.5).setDepth(11));
    } else if (card.type === CARD_TYPES.TREASURE) {
      objects.push(this.add.text(x, y, '点击获取遗物', {
        ...textStyle, fontSize: '14px', color: '#c084fc',
      }).setOrigin(0.5).setDepth(11));
    } else if (card.type === CARD_TYPES.FOOD) {
      objects.push(this.add.text(x, y, '完全恢复HP', {
        ...textStyle, fontSize: '14px', color: COLORS.textGreen,
      }).setOrigin(0.5).setDepth(11));
    } else if (card.type === CARD_TYPES.SHOP) {
      objects.push(this.add.text(x, y, card.name, {
        ...textStyle, fontSize: '14px', color: COLORS.textWhite,
      }).setOrigin(0.5).setDepth(11));
      objects.push(this.add.text(x, y + 20, `${card.cost} 金币`, {
        ...textStyle, fontSize: '12px', color: COLORS.textGold,
      }).setOrigin(0.5).setDepth(11));
    } else if (card.type === CARD_TYPES.MENTOR) {
      objects.push(this.add.text(x, y - 5, card.name, {
        ...textStyle, fontSize: '14px', color: '#c084fc',
      }).setOrigin(0.5).setDepth(11));
      const traitName = TRAIT_NAMES[card.grantsTrait] || '';
      objects.push(this.add.text(x, y + 18, `习得: ${traitName}`, {
        ...textStyle, fontSize: '11px', color: COLORS.textGray,
      }).setOrigin(0.5).setDepth(11));
    } else if (card.type === CARD_TYPES.ATTRIBUTE) {
      objects.push(this.add.text(x, y, '选择属性提升', {
        ...textStyle, fontSize: '14px', color: COLORS.textBlue,
      }).setOrigin(0.5).setDepth(11));
    }

    // HP条 (怪物和机关)
    if ((card.type === CARD_TYPES.MONSTER || card.type === CARD_TYPES.TRAP) && card.hp !== undefined) {
      this.renderCardHpBar(card, x, y, objects);
    }

    // 词条标记
    if (card.trait && card.faceUp) {
      const traitName = TRAIT_NAMES[card.trait] || '';
      objects.push(this.add.text(x, y - CARD_H / 2 + 38, `[${traitName}]`, {
        fontFamily: 'sans-serif', fontSize: '10px', color: COLORS.textOrange,
      }).setOrigin(0.5).setDepth(11));
    }

    return objects;
  }

  renderPlayerCardContent(x, y, objects) {
    const p = GameState.player;
    const textStyle = { fontFamily: 'sans-serif', fontSize: '12px', color: COLORS.textWhite };

    objects.push(this.add.text(x - 30, y - 15, `HP:`, textStyle).setOrigin(0, 0.5).setDepth(11));
    objects.push(this.add.text(x + 38, y - 15, `${p.hp}/${p.maxHp}`, {
      ...textStyle, color: p.hp <= p.maxHp * 0.3 ? COLORS.textRed : COLORS.textGreen,
    }).setOrigin(1, 0.5).setDepth(11));

    objects.push(this.add.text(x - 30, y + 5, `ATK:`, textStyle).setOrigin(0, 0.5).setDepth(11));
    objects.push(this.add.text(x + 38, y + 5, `${GameState.getEffectiveAtk()}`, {
      ...textStyle, color: COLORS.textOrange,
    }).setOrigin(1, 0.5).setDepth(11));

    objects.push(this.add.text(x - 30, y + 25, `DEF:`, textStyle).setOrigin(0, 0.5).setDepth(11));
    objects.push(this.add.text(x + 38, y + 25, `${GameState.getEffectiveDef()}`, {
      ...textStyle, color: COLORS.textBlue,
    }).setOrigin(1, 0.5).setDepth(11));

    // 词条
    if (p.traits.length > 0) {
      const traitStr = p.traits.map(t => TRAIT_NAMES[t] || t).join(' ');
      objects.push(this.add.text(x, y + 48, traitStr, {
        fontFamily: 'sans-serif', fontSize: '10px', color: COLORS.textOrange,
      }).setOrigin(0.5).setDepth(11));
    }
  }

  renderMonsterCardContent(card, x, y, objects) {
    const textStyle = { fontFamily: 'sans-serif', fontSize: '12px', color: COLORS.textWhite };
    const effAtk = card.atk + (card.atkBonusFromInspire || 0) + (card.atkBonusFromRevenge || 0);

    objects.push(this.add.text(x - 35, y - 5, `ATK:${effAtk}`, {
      ...textStyle, color: COLORS.textOrange,
    }).setOrigin(0, 0.5).setDepth(11));

    objects.push(this.add.text(x - 35, y + 15, `DEF:${card.def}`, {
      ...textStyle, color: COLORS.textBlue,
    }).setOrigin(0, 0.5).setDepth(11));

    if (card.isBoss) {
      objects.push(this.add.text(x + 35, y - 5, 'BOSS', {
        ...textStyle, fontSize: '11px', color: COLORS.textRed, fontStyle: 'bold',
      }).setOrigin(1, 0.5).setDepth(11));
    }
  }

  renderTrapCardContent(card, x, y, objects) {
    objects.push(this.add.text(x, y + 5, `固定伤害:${card.fixedDmg}`, {
      fontFamily: 'sans-serif', fontSize: '11px', color: COLORS.textOrange,
    }).setOrigin(0.5).setDepth(11));
  }

  renderItemCardContent(card, x, y, objects) {
    objects.push(this.add.text(x, y - 5, card.name, {
      fontFamily: 'sans-serif', fontSize: '13px', color: COLORS.textWhite, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11));
    // 简短描述
    const shortDesc = card.desc || '';
    objects.push(this.add.text(x, y + 18, shortDesc.length > 12 ? shortDesc.substring(0, 12) + '…' : shortDesc, {
      fontFamily: 'sans-serif', fontSize: '10px', color: COLORS.textGray,
    }).setOrigin(0.5).setDepth(11));
  }

  renderCardHpBar(card, x, y, objects) {
    const barW = CARD_W - 30;
    const barH = 8;
    const barX = x - barW / 2;
    const barY = y + CARD_H / 2 - 24;
    const ratio = Math.max(0, card.hp / card.maxHp);

    objects.push(this.add.rectangle(barX + barW / 2, barY + barH / 2, barW, barH, COLORS.hpBarBg).setDepth(11));
    if (ratio > 0) {
      objects.push(this.add.rectangle(barX + (barW * ratio) / 2, barY + barH / 2, barW * ratio, barH, COLORS.hpBar).setDepth(12));
    }
    objects.push(this.add.text(x, barY + barH / 2, `${card.hp}/${card.maxHp}`, {
      fontFamily: 'sans-serif', fontSize: '9px', color: COLORS.textWhite,
    }).setOrigin(0.5).setDepth(13));
  }

  // ── UI面板 ────────────────────────────────────────
  createUI() {
    this.createPlayerPanel();
    this.createRelicPanel();
    this.createItemPanel();
    this.createLogPanel();
    this.createRoomHeader();
  }

  createRoomHeader() {
    this.add.text(GAME_WIDTH / 2, 16, `${ROOM_NAMES[this.roomType]}  ·  节点 ${this.nodeIndex + 1}  ·  第 ${GameState.floor} 层`, {
      fontFamily: 'sans-serif', fontSize: '15px', color: COLORS.textGray,
    }).setOrigin(0.5).setDepth(20);
  }

  createPlayerPanel() {
    const px = 20, py = 50, pw = 200, ph = 300;
    const panel = this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph, COLORS.panelBg, 0.9)
      .setStrokeStyle(1, COLORS.panelBorder, 0.5).setDepth(20);

    this.uiElements.playerPanel = this.add.container(0, 0).setDepth(21);

    this.add.text(px + pw / 2, py + 18, '玩家信息', {
      fontFamily: 'sans-serif', fontSize: '15px', color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    this.uiElements.playerName = this.add.text(px + 14, py + 45, '', {
      fontFamily: 'sans-serif', fontSize: '13px', color: COLORS.textWhite,
    }).setDepth(21);

    this.uiElements.playerHp = this.add.text(px + 14, py + 70, '', {
      fontFamily: 'sans-serif', fontSize: '13px', color: COLORS.textGreen,
    }).setDepth(21);

    this.uiElements.playerAtk = this.add.text(px + 14, py + 95, '', {
      fontFamily: 'sans-serif', fontSize: '13px', color: COLORS.textOrange,
    }).setDepth(21);

    this.uiElements.playerDef = this.add.text(px + 14, py + 120, '', {
      fontFamily: 'sans-serif', fontSize: '13px', color: COLORS.textBlue,
    }).setDepth(21);

    this.uiElements.playerGold = this.add.text(px + 14, py + 145, '', {
      fontFamily: 'sans-serif', fontSize: '13px', color: COLORS.textGold,
    }).setDepth(21);

    this.uiElements.playerTraits = this.add.text(px + 14, py + 175, '', {
      fontFamily: 'sans-serif', fontSize: '11px', color: COLORS.textOrange,
      wordWrap: { width: pw - 28 },
    }).setDepth(21);

    this.uiElements.playerStatus = this.add.text(px + 14, py + 220, '', {
      fontFamily: 'sans-serif', fontSize: '11px', color: COLORS.textGray,
      wordWrap: { width: pw - 28 },
    }).setDepth(21);

    // 遗物主动技能按钮区域
    this.uiElements.activeRelicBtns = [];

    this.updatePlayerPanel();
  }

  createRelicPanel() {
    const px = 20, py = 370, pw = 200, ph = 140;
    this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph, COLORS.panelBg, 0.9)
      .setStrokeStyle(1, COLORS.panelBorder, 0.5).setDepth(20);

    this.add.text(px + pw / 2, py + 16, '遗物', {
      fontFamily: 'sans-serif', fontSize: '14px', color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    this.uiElements.relicList = this.add.text(px + 14, py + 38, '', {
      fontFamily: 'sans-serif', fontSize: '11px', color: COLORS.textGray,
      wordWrap: { width: pw - 28 },
    }).setDepth(21);

    this.updateRelicPanel();
  }

  createItemPanel() {
    const px = GAME_WIDTH - 220, py = 50, pw = 200, ph = 200;
    this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph, COLORS.panelBg, 0.9)
      .setStrokeStyle(1, COLORS.panelBorder, 0.5).setDepth(20);

    this.add.text(px + pw / 2, py + 16, '道具栏', {
      fontFamily: 'sans-serif', fontSize: '14px', color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    this.uiElements.itemSlots = [];
    for (let i = 0; i < 2; i++) {
      const slotY = py + 50 + i * 70;
      const slotBg = this.add.rectangle(px + pw / 2, slotY, pw - 24, 55, 0x1a1830, 1)
        .setStrokeStyle(1, 0x3a3460, 0.5).setDepth(21);

      const slotItemDef = GameState.itemSlots[i] ? Object.values(ITEMS).find(it => it.id === GameState.itemSlots[i]) : null;
      const slotText = this.add.text(px + pw / 2, slotY, slotItemDef ? slotItemDef.name : '空', {
        fontFamily: 'sans-serif', fontSize: '12px', color: slotItemDef ? COLORS.textWhite : '#555',
      }).setOrigin(0.5).setDepth(22);

      // 可点击使用/拖拽
      slotBg.setInteractive({ useHandCursor: true });
      slotBg.on('pointerdown', () => this.onItemSlotClick(i));

      this.uiElements.itemSlots.push({ bg: slotBg, text: slotText });
    }

    this.updateItemPanel();
  }

  createLogPanel() {
    const px = GAME_WIDTH - 220, py = 270, pw = 200, ph = 240;
    this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph, COLORS.panelBg, 0.9)
      .setStrokeStyle(1, COLORS.panelBorder, 0.5).setDepth(20);

    this.add.text(px + pw / 2, py + 16, '行动日志', {
      fontFamily: 'sans-serif', fontSize: '14px', color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    this.uiElements.logText = this.add.text(px + 10, py + 38, '', {
      fontFamily: 'sans-serif', fontSize: '10px', color: COLORS.textGray,
      wordWrap: { width: pw - 20 },
      lineSpacing: 2,
    }).setDepth(21);
  }

  // ── 更新UI ────────────────────────────────────────
  updatePlayerPanel() {
    const p = GameState.player;
    if (!p) return;
    this.uiElements.playerName.setText(`${p.className}`);
    this.uiElements.playerHp.setText(`HP: ${p.hp} / ${p.maxHp}`);
    this.uiElements.playerHp.setColor(p.hp <= p.maxHp * 0.3 ? COLORS.textRed : COLORS.textGreen);
    this.uiElements.playerAtk.setText(`ATK: ${GameState.getEffectiveAtk()}${p.violenceActive ? ' (暴力x2)' : ''}`);
    this.uiElements.playerDef.setText(`DEF: ${GameState.getEffectiveDef()}${p.armorBreakReduction > 0 ? ' (-' + p.armorBreakReduction + ')' : ''}`);
    this.uiElements.playerGold.setText(`金币: ${GameState.gold}`);

    const traitStr = p.traits.length > 0
      ? '词条: ' + p.traits.map(t => TRAIT_NAMES[t] || t).join(', ')
      : '词条: 无';
    this.uiElements.playerTraits.setText(traitStr);

    let statusParts = [];
    if (p.blessActive) statusParts.push('庇佑');
    if (p.violenceActive) statusParts.push('暴力');
    if (p.firstStrikeActive) statusParts.push('先攻');
    this.uiElements.playerStatus.setText(statusParts.length > 0 ? '状态: ' + statusParts.join(' ') : '');
  }

  updateRelicPanel() {
    const relicStr = GameState.relics.length > 0
      ? GameState.relics.map(r => {
          const cd = GameState.activeRelicCooldowns[r.id] ? ' (CD)' : '';
          return `· ${r.name}${cd}`;
        }).join('\n')
      : '暂无遗物';
    this.uiElements.relicList.setText(relicStr);
  }

  updateItemPanel() {
    for (let i = 0; i < 2; i++) {
      const slot = this.uiElements.itemSlots[i];
      const itemId = GameState.itemSlots[i];
      if (itemId) {
        const itemDef = Object.values(ITEMS).find(it => it.id === itemId);
        slot.text.setText(itemDef ? itemDef.name : itemId);
        slot.text.setColor(COLORS.textWhite);
      } else {
        slot.text.setText('空');
        slot.text.setColor('#555');
      }
    }
  }

  updateAllUI() {
    this.updatePlayerPanel();
    this.updateRelicPanel();
    this.updateItemPanel();
    // 重新渲染玩家所在格
    this.renderCell(this.playerCellIndex);
  }

  // ── 日志 ──────────────────────────────────────────
  addLog(msg) {
    this.logMessages.unshift(msg);
    if (this.logMessages.length > 20) this.logMessages.pop();
    if (this.uiElements.logText) {
      this.uiElements.logText.setText(this.logMessages.join('\n'));
    }
  }

  // ── 输入处理 ──────────────────────────────────────
  setupInput() {
    this.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));
    this.input.on('pointermove', (pointer) => this.onPointerMove(pointer));
    this.input.on('pointerup', (pointer) => this.onPointerUp(pointer));
  }

  onPointerDown(pointer) {
    if (this.isProcessing || this.roomCleared || this.playerDead) return;

    const cellIndex = getCellFromPos(pointer.x, pointer.y);
    if (cellIndex < 0) return;

    // 如果处于物品目标选择模式
    if (this.itemTargetMode) {
      this.handleItemTargetSelect(cellIndex, pointer);
      return;
    }

    // 法则魔杖模式
    if (this.lawWandMode) {
      this.handleLawWandSelect(cellIndex);
      return;
    }

    const stack = this.grid[cellIndex];
    if (stack.length === 0) return;
    const topCard = stack[stack.length - 1];

    // 点击玩家卡 - 开始拖拽
    if (topCard.type === CARD_TYPES.PLAYER && cellIndex === this.playerCellIndex) {
      this.startDrag(pointer, cellIndex);
      return;
    }

    // 点击正面卡 (非玩家) - 如果相邻则互动
    if (topCard.faceUp && cellIndex !== this.playerCellIndex) {
      if (isOrthogonallyAdjacent(this.playerCellIndex, cellIndex)) {
        this.interactWithCard(cellIndex);
      }
      return;
    }

    // 点击背面卡 - 如果相邻则翻开
    if (!topCard.faceUp && isOrthogonallyAdjacent(this.playerCellIndex, cellIndex)) {
      this.flipCard(cellIndex);
      this.countAction();
    }
  }

  onPointerMove(pointer) {
    if (!this.isDragging) return;

    // 更新幽灵卡位置
    if (this.dragCard) {
      this.dragCard.x = pointer.x;
      this.dragCard.y = pointer.y;
    }

    // 高亮目标格
    this.highlightRects.forEach(h => h.setVisible(false));
    const targetCell = getCellFromPos(pointer.x, pointer.y);
    if (targetCell >= 0 && targetCell !== this.playerCellIndex) {
      this.highlightRects[targetCell].setVisible(true);
    }

    // 高亮相邻空格 (移动提示)
    const adj = getAdjacentCells(this.playerCellIndex);
    for (const ai of adj) {
      if (this.grid[ai].length === 0) {
        this.highlightRects[ai].setVisible(true);
      }
    }
  }

  onPointerUp(pointer) {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.highlightRects.forEach(h => h.setVisible(false));

    // 销毁幽灵卡
    if (this.dragCard) {
      this.dragCard.destroy();
      this.dragCard = null;
    }

    const targetCell = getCellFromPos(pointer.x, pointer.y);
    if (targetCell < 0 || targetCell === this.playerCellIndex) {
      // 放回原位
      this.renderCell(this.playerCellIndex);
      return;
    }

    const targetStack = this.grid[targetCell];

    if (targetStack.length === 0) {
      // 移动到空格
      this.movePlayerTo(targetCell);
    } else {
      const topCard = targetStack[targetStack.length - 1];
      if (topCard.faceUp) {
        // 与正面卡互动
        this.interactWithCard(targetCell);
        this.renderCell(this.playerCellIndex);
      } else {
        // 翻开了再互动
        this.flipCard(targetCell);
        this.countAction();
        this.renderCell(this.playerCellIndex);
      }
    }
  }

  startDrag(pointer, cellIndex) {
    this.isDragging = true;

    // 隐藏原始显示
    if (this.cardDisplays[cellIndex]) {
      this.cardDisplays[cellIndex].forEach(obj => obj.setVisible(false));
    }

    // 创建幽灵卡
    const p = GameState.player;
    const ghost = this.add.container(pointer.x, pointer.y).setDepth(100).setAlpha(0.85);
    const bg = this.add.image(0, 0, 'card_player');
    const nameT = this.add.text(0, -20, p.className, {
      fontFamily: 'sans-serif', fontSize: '14px', color: COLORS.textWhite, fontStyle: 'bold',
    }).setOrigin(0.5);
    ghost.add([bg, nameT]);
    this.dragCard = ghost;
  }

  // ── 移动 ──────────────────────────────────────────
  movePlayerTo(targetCell) {
    // 移动玩家卡到新格
    const playerCard = this.grid[this.playerCellIndex].pop();
    this.grid[targetCell].push(playerCard);
    const oldCell = this.playerCellIndex;
    this.playerCellIndex = targetCell;

    this.renderCell(oldCell);
    this.renderCell(targetCell);
    this.countAction();

    // 翻开相邻卡
    this.revealAdjacentToPlayer();
    this.processSpikeTriggers();
    // 尖刺可能杀死玩家
    if (this.playerDead) return;
    this.updateAllUI();
    this.addLog(`移动到格${targetCell + 1}`);
    this.checkRoomClear();
  }

  // ── 翻牌 ──────────────────────────────────────────
  flipCard(cellIndex) {
    const stack = this.grid[cellIndex];
    if (stack.length === 0) return;
    const card = stack[stack.length - 1];
    if (card.faceUp) return;

    card.faceUp = true;
    this.renderCell(cellIndex);
    this.addLog(`翻开: ${card.name}`);

    // 翻开后效果
    this.onCardRevealed(card, cellIndex);
  }

  onCardRevealed(card, cellIndex) {
    // 自动拾取金币
    if (card.type === CARD_TYPES.GOLD) {
      GameState.gold += card.goldAmount;
      this.addLog(`获得 ${card.goldAmount} 金币`);
      this.removeCardFromCell(cellIndex);
      this.updateAllUI();
      return;
    }

    // 自动拾取道具 (如果道具栏有空)
    if (card.type === CARD_TYPES.ITEM) {
      const emptySlot = GameState.itemSlots.indexOf(null);
      if (emptySlot >= 0) {
        GameState.setItem(emptySlot, card.id);
        this.addLog(`拾取: ${card.name}`);
        this.removeCardFromCell(cellIndex);
        this.updateItemPanel();
        return;
      }
      // 道具栏满了，留在原地
      this.addLog(`道具栏已满`);
    }

    // 伏击词条检查
    if (card.trait === TRAITS.AMBUSH && card.type === CARD_TYPES.MONSTER) {
      if (isOrthogonallyAdjacent(this.playerCellIndex, cellIndex)) {
        this.addLog(`${card.name} 伏击！`);
        this.resolveCombat(cellIndex);
        return;
      }
    }

    // 尖刺机关翻开效果
    if (card.type === CARD_TYPES.TRAP && card.effectId === 'spike') {
      card.spikeTriggered = false; // 将在玩家下一步行动后触发
      this.spikePending[cellIndex] = true;
      this.addLog(`尖刺机关已激活，下一步行动后触发！`);
    }

    // 传送机关翻开效果
    if (card.type === CARD_TYPES.TRAP && card.effectId === 'teleport') {
      this.addLog(`传送机关触发！`);
      this.executeTeleportTrap(cellIndex);
      return;
    }

    // 互动检查：如果相邻且有紧握词条的怪物，限制互动
    this.updateAllUI();
  }

  // ── 互动 ──────────────────────────────────────────
  interactWithCard(cellIndex) {
    if (this.isProcessing) return;

    const stack = this.grid[cellIndex];
    if (stack.length === 0) return;
    const card = stack[stack.length - 1];
    if (!card.faceUp) return;

    // 紧握检查
    if (this.hasGripRestriction() && card.trait !== TRAITS.GRIP) {
      const gripCard = this.findGripCard();
      if (gripCard) {
        this.addLog(`被${gripCard.name}紧握，只能与其互动！`);
        return;
      }
    }

    switch (card.type) {
      case CARD_TYPES.MONSTER:
        this.interactWithMonster(cellIndex);
        break;
      case CARD_TYPES.TRAP:
        this.interactWithTrap(cellIndex);
        break;
      case CARD_TYPES.FOOD:
        this.interactWithFood(cellIndex);
        break;
      case CARD_TYPES.TREASURE:
        this.interactWithTreasure(cellIndex);
        break;
      case CARD_TYPES.SHOP:
        this.interactWithShop(cellIndex);
        break;
      case CARD_TYPES.MENTOR:
        this.interactWithMentor(cellIndex);
        break;
      case CARD_TYPES.ATTRIBUTE:
        this.interactWithAttribute(cellIndex);
        break;
      case CARD_TYPES.GOLD:
        GameState.gold += card.goldAmount;
        this.addLog(`获得 ${card.goldAmount} 金币`);
        this.removeCardFromCell(cellIndex);
        this.updateAllUI();
        break;
      case CARD_TYPES.ITEM: {
        const emptySlot = GameState.itemSlots.indexOf(null);
        if (emptySlot >= 0) {
          GameState.setItem(emptySlot, card.id);
          this.addLog(`拾取: ${card.name}`);
          this.removeCardFromCell(cellIndex);
          this.updateItemPanel();
        } else {
          this.addLog('道具栏已满！');
        }
        break;
      }
    }
    this.countAction();
    // 好战怪物可能在countAction中杀死玩家
    if (this.playerDead) return;
    this.processSpikeTriggers();
    if (this.playerDead) return;
    this.checkRoomClear();
  }

  // ── 战斗 ──────────────────────────────────────────
  interactWithMonster(cellIndex) {
    const card = this.grid[cellIndex][this.grid[cellIndex].length - 1];
    this.resolveCombat(cellIndex);
  }

  resolveCombat(cellIndex) {
    this.isProcessing = true;
    const card = this.grid[cellIndex][this.grid[cellIndex].length - 1];
    const p = GameState.player;

    // 历战词条处理
    if (p.traits.includes(TRAITS.VETERAN)) {
      if (p.veteranTarget !== card.id) {
        // 换目标，重置加成
        p.veteranTarget = card.id;
        p.veteranBonus = 0;
      }
      p.veteranBonus++;
      GameState.recalcStats();
    }

    // 破甲词条处理
    if (card.trait === TRAITS.ARMOR_BREAK) {
      p.armorBreakReduction = (p.armorBreakReduction || 0) + 1;
      GameState.recalcStats();
      this.addLog(`${card.name} 破甲！你的防御-1`);
    }

    const playerAtk = GameState.getEffectiveAtk();
    const playerDef = GameState.getEffectiveDef();
    const monsterEffAtk = card.atk + (card.atkBonusFromInspire || 0) + (card.atkBonusFromRevenge || 0);

    // 计算伤害
    const dmgToMonster = Math.max(0, playerAtk - card.def);
    let dmgToPlayer = Math.max(0, monsterEffAtk - playerDef);

    // 先攻判定
    const playerHasFirstStrike = p.firstStrikeActive || p.traits.includes(TRAITS.FIRST_STRIKE);
    const monsterHasFirstStrike = card.trait === TRAITS.FIRST_STRIKE;

    this.addLog(`⚔ ${card.name} (ATK:${monsterEffAtk} DEF:${card.def} HP:${card.hp})`);

    if (playerHasFirstStrike && !monsterHasFirstStrike) {
      // 玩家先手
      card.hp -= dmgToMonster;
      this.addLog(`你造成 ${dmgToMonster} 伤害`);
      this.flashCell(cellIndex, COLORS.danger);
      if (card.hp <= 0) {
        this.onMonsterKilled(cellIndex, card);
        return;
      }
      // 怪物反击
      this.applyMonsterDamageToPlayer(dmgToPlayer, card);
      // 怪物反击可能杀死玩家
      if (p.hp <= 0) {
        this.onPlayerDeath();
        return;
      }
    } else if (monsterHasFirstStrike && !playerHasFirstStrike) {
      // 怪物先手
      this.applyMonsterDamageToPlayer(dmgToPlayer, card);
      if (p.hp <= 0) {
        this.onPlayerDeath();
        return;
      }
      // 玩家反击
      card.hp -= dmgToMonster;
      this.addLog(`你造成 ${dmgToMonster} 伤害`);
      this.flashCell(cellIndex, COLORS.danger);
      if (card.hp <= 0) {
        this.onMonsterKilled(cellIndex, card);
        return;
      }
    } else {
      // 同时出手（双方均无先攻 或 双方均有先攻 → 同时结算）
      card.hp -= dmgToMonster;
      this.addLog(`你造成 ${dmgToMonster} 伤害`);
      this.flashCell(cellIndex, COLORS.danger);
      this.applyMonsterDamageToPlayer(dmgToPlayer, card);
      const playerDied = p.hp <= 0;
      const monsterDied = card.hp <= 0;
      // 双方同时死亡：先移除怪物，再触发玩家死亡
      if (monsterDied) {
        this.onMonsterKilled(cellIndex, card);
      }
      if (playerDied) {
        this.onPlayerDeath();
        return;
      }
      if (monsterDied) {
        return;
      }
    }

    // 刺皮词条
    if (p.traits.includes(TRAITS.THORNS) && dmgToPlayer > 0) {
      const thornDmg = playerAtk; // 刺皮：反弹等同于玩家攻击力的伤害
      card.hp -= thornDmg;
      this.addLog(`刺皮反弹 ${thornDmg} 伤害！`);
      if (card.hp <= 0) {
        this.onMonsterKilled(cellIndex, card);
        return;
      }
    }

    // 暴力卡效果消耗
    this.consumeViolence();

    // 散子词条检查
    if (card.trait === TRAITS.SPAWNER && card.hp > 0) {
      this.checkSpawner(card, cellIndex);
    }

    this.renderCell(cellIndex);
    this.updateAllUI();
    this.isProcessing = false;
    this.checkRoomClear();
  }

  applyMonsterDamageToPlayer(dmg, card) {
    const actual = GameState.damagePlayer(dmg);
    if (actual > 0) {
      this.addLog(`${card.name} 造成 ${actual} 伤害`);
      this.flashPlayerCell(COLORS.danger);
    } else if (dmg > 0) {
      this.addLog('庇佑抵挡了伤害！');
    } else {
      this.addLog(`${card.name} 未能造成伤害`);
    }
    this.updatePlayerPanel();
  }

  onMonsterKilled(cellIndex, card) {
    this.addLog(`${card.name} 被消灭！`);
    GameState.gold += 10;
    this.addLog(`+10 金币`);

    // 复仇词条：所有其他怪物获得+2攻击
    this.applyRevengeOnKill(cellIndex);

    // 鼓舞重新计算
    this.recalcInspire();

    // 村好剑效果：击败精英或层主时，攻击永久+2
    if (card.isBoss || card.isElite) {
      GameState.villageSwordBonus += 2;
      this.addLog('村好剑：永久攻击+2！');
      GameState.recalcStats();
    }

    // 精英怪物击杀奖励：1张蓝色宝箱 + 1张金币卡(20金) + 1张属性提升
    if (card.isElite) {
      GameState.gold += 20;
      this.addLog('精英奖励：+20金币');
      // 蓝色宝箱 → 直接给遗物选择
      this.showRelicSelection('blue');
      // 属性提升 → 直接给属性选择
      this.showAttributeSelection();
    }

    // Boss怪物击杀奖励：1张金色宝箱 + 2张金币卡(40金) + 1张属性提升
    if (card.isBoss) {
      GameState.gold += 40;
      this.addLog('Boss奖励：+40金币');
      // 金色宝箱 → 直接给遗物选择
      this.showRelicSelection('gold');
      // 属性提升 → 直接给属性选择
      this.showAttributeSelection();
    }

    // 暴力效果消耗
    this.consumeViolence();

    this.removeCardFromCell(cellIndex);
    this.updateAllUI();
    this.isProcessing = false;
    this.checkRoomClear();
  }

  onPlayerDeath() {
    this.isProcessing = true; // 保持锁定，防止死亡期间操作
    this.playerDead = true;
    this.addLog('你被击败了...');

    // 显示死亡界面
    this.time.delayedCall(500, () => {
      this.showDeathScreen();
    });
  }

  showDeathScreen() {
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8).setDepth(200);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, '游戏结束', {
      fontFamily: 'sans-serif', fontSize: '40px', color: COLORS.textRed, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(201);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, '你倒在了地牢深处...', {
      fontFamily: 'sans-serif', fontSize: '16px', color: COLORS.textGray,
    }).setOrigin(0.5).setDepth(201);

    const restartBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, '重新开始', {
      fontFamily: 'sans-serif', fontSize: '20px', color: COLORS.textWhite,
      backgroundColor: '#a51d2d', padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerdown', () => {
      GameState.reset();
      this.scene.start('TitleScene');
    });
  }

  // ── 机关互动 ──────────────────────────────────────
  interactWithTrap(cellIndex) {
    const card = this.grid[cellIndex][this.grid[cellIndex].length - 1];
    const p = GameState.player;
    this.isProcessing = true;

    // 破甲词条处理（机关也可带破甲）
    if (card.trait === TRAITS.ARMOR_BREAK) {
      p.armorBreakReduction = (p.armorBreakReduction || 0) + 1;
      GameState.recalcStats();
      this.addLog(`${card.name} 破甲！你的防御-1`);
    }

    const playerAtk = GameState.getEffectiveAtk();
    const dmgToTrap = Math.max(0, playerAtk - card.def);
    const dmgToPlayer = card.fixedDmg; // 机关固定伤害，不受防御减免

    // 先攻判定
    const playerHasFirstStrike = p.firstStrikeActive || p.traits.includes(TRAITS.FIRST_STRIKE);
    const trapHasFirstStrike = card.trait === TRAITS.FIRST_STRIKE;

    this.addLog(`⚔ ${card.name} (HP:${card.hp} 固定伤害:${dmgToPlayer})`);

    if (playerHasFirstStrike && !trapHasFirstStrike) {
      // 玩家先攻
      card.hp -= dmgToTrap;
      this.addLog(`你造成 ${dmgToTrap} 伤害`);
      this.flashCell(cellIndex, COLORS.danger);
      if (card.hp <= 0) {
        this.addLog(`${card.name} 被摧毁！`);
        this.onTrapDestroyed(cellIndex, card);
        // 机关已摧毁，不再对玩家造成伤害
        this.consumeViolence();
        this.updateAllUI();
        this.isProcessing = false;
        this.checkRoomClear();
        return;
      }
      // 机关反击
      this.applyTrapDamageToPlayer(dmgToPlayer, card);
      // 机关反击可能杀死玩家
      if (p.hp <= 0) {
        this.onPlayerDeath();
        return;
      }
    } else if (trapHasFirstStrike && !playerHasFirstStrike) {
      // 机关先攻
      this.applyTrapDamageToPlayer(dmgToPlayer, card);
      if (p.hp <= 0) {
        this.onPlayerDeath();
        return;
      }
      // 玩家反击
      card.hp -= dmgToTrap;
      this.addLog(`你造成 ${dmgToTrap} 伤害`);
      this.flashCell(cellIndex, COLORS.danger);
      if (card.hp <= 0) {
        this.addLog(`${card.name} 被摧毁！`);
        this.onTrapDestroyed(cellIndex, card);
        this.consumeViolence();
        this.updateAllUI();
        this.isProcessing = false;
        this.checkRoomClear();
        return;
      }
    } else {
      // 同时出手（双方均无先攻 或 双方均有先攻 → 同时结算）
      card.hp -= dmgToTrap;
      this.addLog(`你造成 ${dmgToTrap} 伤害`);
      this.flashCell(cellIndex, COLORS.danger);
      this.applyTrapDamageToPlayer(dmgToPlayer, card);
      const playerDied = p.hp <= 0;
      const trapDestroyed = card.hp <= 0;
      if (trapDestroyed) {
        this.addLog(`${card.name} 被摧毁！`);
        this.onTrapDestroyed(cellIndex, card);
        this.consumeViolence();
        this.updateAllUI();
        this.isProcessing = false;
        this.checkRoomClear();
      }
      if (playerDied) {
        this.onPlayerDeath();
        return;
      }
      if (trapDestroyed) {
        return;
      }
    }

    // 刺皮词条（对机关伤害）
    if (p.traits.includes(TRAITS.THORNS) && dmgToPlayer > 0) {
      const thornDmg = playerAtk; // 刺皮：反弹等同于攻击力的伤害
      card.hp -= thornDmg;
      this.addLog(`刺皮反弹 ${thornDmg} 伤害！`);
      if (card.hp <= 0) {
        this.addLog(`${card.name} 被摧毁！`);
        this.onTrapDestroyed(cellIndex, card);
        this.consumeViolence();
        this.updateAllUI();
        this.isProcessing = false;
        this.checkRoomClear();
        return;
      }
    }

    this.consumeViolence();
    this.renderCell(cellIndex);
    this.updateAllUI();
    this.isProcessing = false;
    this.checkRoomClear();
  }

  applyTrapDamageToPlayer(dmg, card) {
    const actual = GameState.damagePlayer(dmg);
    if (actual === 0 && dmg > 0) {
      this.addLog(`庇佑抵挡了${card.name}的伤害！`);
    } else if (actual > 0) {
      this.addLog(`${card.name} 造成 ${actual} 固定伤害`);
      this.flashPlayerCell(COLORS.danger);
    } else {
      this.addLog(`${card.name} 未能造成伤害`);
    }
    this.updatePlayerPanel();
  }

  consumeViolence() {
    if (GameState.player.violenceActive) {
      GameState.player.violenceActive = false;
      GameState.recalcStats();
      this.addLog('暴力效果已消耗');
    }
  }

  onTrapDestroyed(cellIndex, card) {
    switch (card.effectId) {
      case 'crossbow':
        // 弩箭机关摧毁：对正上方同列所有翻开的卡牌造成6点伤害
        this.executeCrossbowEffect(cellIndex);
        break;
      case 'spike':
        // 尖刺机关摧毁时无额外效果（范围伤害仅在翻开后延迟触发时发生）
        this.addLog('尖刺机关被摧毁');
        break;
      case 'teleport':
        // 传送机关摧毁时无额外效果（传送仅在翻开时触发）
        this.addLog('传送机关被摧毁');
        break;
    }
    this.removeCardFromCell(cellIndex);
    this.updateAllUI();
  }

  executeCrossbowEffect(cellIndex) {
    // 弩箭机关：摧毁时，对同列上方所有正面卡造成伤害
    const col = cellIndex % 3;
    const row = Math.floor(cellIndex / 3);
    this.addLog('弩箭机关触发！向上方射击');
    for (let r = row - 1; r >= 0; r--) {
      const targetCell = r * 3 + col;
      const stack = this.grid[targetCell];
      if (stack.length > 0) {
        const topCard = stack[stack.length - 1];
        if (topCard.faceUp && topCard.type !== CARD_TYPES.PLAYER) {
          if (topCard.hp !== undefined) {
            topCard.hp -= 6;
            this.addLog(`${topCard.name} 受到 6 伤害`);
            this.flashCell(targetCell, COLORS.danger);
            if (topCard.hp <= 0) {
              if (topCard.type === CARD_TYPES.MONSTER) {
                this.addLog(`${topCard.name} 被弩箭消灭！`);
                GameState.gold += 10;
                this.applyRevengeOnKill(targetCell);
                this.recalcInspire();
              }
              this.removeCardFromCell(targetCell);
            } else {
              this.renderCell(targetCell);
            }
          }
        }
      }
    }
  }

  executeTeleportTrap(cellIndex) {
    // 传送机关：重新洗混所有非玩家卡，随机分配
    this.addLog('传送机关！所有卡牌重新洗牌！');

    // 收集所有非玩家卡
    const allNonPlayerCards = [];
    for (let i = 0; i < 9; i++) {
      if (i === this.playerCellIndex) continue;
      for (const card of this.grid[i]) {
        if (card.type !== CARD_TYPES.PLAYER) {
          card.faceUp = false;
          allNonPlayerCards.push(card);
        }
      }
      // 清空非玩家格
      this.grid[i] = [];
    }

    // 玩家所在格只保留玩家卡
    this.grid[this.playerCellIndex] = this.grid[this.playerCellIndex].filter(c => c.type === CARD_TYPES.PLAYER);

    // 移动玩家到随机格
    const availableCells = [];
    for (let i = 0; i < 9; i++) availableCells.push(i);
    const newPlayerCell = availableCells[randomInt(0, availableCells.length - 1)];

    // 将玩家卡移到新位置
    const playerCard = this.grid[this.playerCellIndex].find(c => c.type === CARD_TYPES.PLAYER);
    this.grid[this.playerCellIndex] = [];
    this.playerCellIndex = newPlayerCell;
    this.grid[newPlayerCell].push(playerCard);

    // 随机分配卡牌到非玩家格
    const shuffledCards = shuffle(allNonPlayerCards);
    const nonPlayerCells = availableCells.filter(c => c !== newPlayerCell);
    let ci = 0;
    for (const card of shuffledCards) {
      const cell = nonPlayerCells[ci % nonPlayerCells.length];
      this.grid[cell].push(card);
      ci++;
    }

    this.renderAllCells();
    this.revealAdjacentToPlayer();
    this.updateAllUI();
    this.addLog(`你被传送到格${newPlayerCell + 1}`);
  }

  // ── 尖刺延迟触发 ──────────────────────────────────
  processSpikeTriggers() {
    for (const [cellStr, active] of Object.entries(this.spikePending)) {
      if (!active) continue;
      const cellIndex = parseInt(cellStr);
      const stack = this.grid[cellIndex];
      if (stack.length === 0) {
        delete this.spikePending[cellStr];
        continue;
      }
      const card = stack[stack.length - 1];
      if (card.spikeTriggered) {
        delete this.spikePending[cellStr];
        continue;
      }
      // 触发尖刺伤害
      card.spikeTriggered = true;
      delete this.spikePending[cellStr];
      this.addLog('尖刺机关触发！');
      const adj = getAdjacentCells(cellIndex);
      let anyMonsterKilled = false;
      for (const ai of adj) {
        const aStack = this.grid[ai];
        if (aStack.length > 0) {
          const topCard = aStack[aStack.length - 1];
          if (topCard.type === CARD_TYPES.PLAYER) {
            GameState.damagePlayer(6);
            this.addLog('你受到尖刺 6 伤害');
            this.flashPlayerCell(COLORS.danger);
            // 尖刺杀死玩家 → 游戏结束
            if (GameState.player.hp <= 0) {
              this.updateAllUI();
              this.onPlayerDeath();
              return;
            }
          } else if (topCard.faceUp && topCard.hp !== undefined) {
            topCard.hp -= 6;
            this.addLog(`${topCard.name} 受到尖刺 6 伤害`);
            if (topCard.hp <= 0) {
              if (topCard.type === CARD_TYPES.MONSTER) {
                GameState.gold += 10;
                this.applyRevengeOnKill(ai);
                anyMonsterKilled = true;
              }
              this.removeCardFromCell(ai);
            } else {
              this.renderCell(ai);
            }
          }
        }
      }
      // 尖刺杀怪后重新计算鼓舞
      if (anyMonsterKilled) {
        this.recalcInspire();
      }
    }
    this.updateAllUI();
    this.checkRoomClear();
  }

  // ── 食物/商店/导师/属性 互动 ──────────────────────
  interactWithFood(cellIndex) {
    GameState.player.hp = GameState.player.maxHp;
    this.addLog('HP完全恢复！');
    this.removeCardFromCell(cellIndex);
    this.flashPlayerCell(COLORS.success);
    this.updateAllUI();
  }

  interactWithTreasure(cellIndex) {
    const card = this.grid[cellIndex][this.grid[cellIndex].length - 1];
    // 提供3个遗物选择
    this.showRelicSelection(card.quality);
    this.removeCardFromCell(cellIndex);
  }

  interactWithShop(cellIndex) {
    const card = this.grid[cellIndex][this.grid[cellIndex].length - 1];
    if (GameState.gold < card.cost) {
      this.addLog(`金币不足！需要 ${card.cost}，当前 ${GameState.gold}`);
      return;
    }
    GameState.gold -= card.cost;
    this.addLog(`购买: ${card.name} (-${card.cost}金币)`);

    switch (card.effect) {
      case 'atk+1':
        GameState.shopAtkBonus++;
        GameState.recalcStats();
        break;
      case 'def+1':
        GameState.shopDefBonus++;
        GameState.recalcStats();
        break;
      case 'hp+2':
        GameState.shopHpBonus += 2;
        GameState.recalcStats();
        GameState.healPlayer(2);
        break;
      case 'random_item': {
        const item = ITEM_LIST[randomInt(0, ITEM_LIST.length - 1)];
        const emptySlot = GameState.itemSlots.indexOf(null);
        if (emptySlot >= 0) {
          GameState.setItem(emptySlot, item.id);
          this.addLog(`获得: ${item.name}`);
        }
        break;
      }
      case 'treasure':
        this.showRelicSelection('normal');
        break;
    }

    this.removeCardFromCell(cellIndex);
    this.updateAllUI();
  }

  interactWithMentor(cellIndex) {
    const card = this.grid[cellIndex][this.grid[cellIndex].length - 1];
    const trait = card.grantsTrait;
    if (!GameState.player.traits.includes(trait)) {
      GameState.player.traits.push(trait);
      this.addLog(`习得词条: ${TRAIT_NAMES[trait]}`);
      if (trait === TRAITS.THICK_HIDE) {
        GameState.recalcStats();
      }
    } else {
      this.addLog(`已拥有该词条`);
    }

    // 移除所有导师卡
    for (let i = 0; i < 9; i++) {
      this.grid[i] = this.grid[i].filter(c => c.type !== CARD_TYPES.MENTOR);
      this.renderCell(i);
    }
    this.updateAllUI();
  }

  interactWithAttribute(cellIndex) {
    // 弹出属性选择
    this.showAttributeSelection();
    this.removeCardFromCell(cellIndex);
  }

  // ── 道具使用 ──────────────────────────────────────
  onItemSlotClick(slotIndex) {
    if (this.isProcessing || this.roomCleared || this.playerDead) return;
    const itemId = GameState.itemSlots[slotIndex];
    if (!itemId) return;

    // 某些道具需要选择目标
    switch (itemId) {
      case 'healing_potion':
        GameState.useItem(slotIndex);
        GameState.healPlayer(6);
        this.addLog('使用恢复药水，HP+6');
        this.flashPlayerCell(COLORS.success);
        this.updateAllUI();
        break;

      case 'blessing':
        GameState.useItem(slotIndex);
        GameState.player.blessActive = true;
        this.addLog('使用庇佑魔法，下次伤害归零');
        this.updateAllUI();
        break;

      case 'violence_card':
        GameState.useItem(slotIndex);
        GameState.player.violenceActive = true;
        GameState.recalcStats();
        this.addLog('使用暴力卡，攻击力翻倍！');
        this.updateAllUI();
        break;

      case 'first_strike_card':
        GameState.useItem(slotIndex);
        GameState.player.firstStrikeActive = true;
        this.addLog('使用先攻卡，获得先攻！');
        this.updateAllUI();
        break;

      case 'throwing_knife':
        // 需要选择目标怪物
        GameState.useItem(slotIndex);
        this.itemTargetMode = 'throwing_knife';
        this.addLog('选择目标怪物...');
        this.highlightAllMonsters();
        break;

      case 'hook_rope':
        // 需要选择目标卡
        GameState.useItem(slotIndex);
        this.itemTargetMode = 'hook_rope';
        this.addLog('选择要移动的卡牌...');
        break;

      case 'flip_card':
        GameState.useItem(slotIndex);
        this.itemTargetMode = 'flip_card';
        this.addLog('选择一张正面非玩家卡...');
        break;

      case 'light_card':
        GameState.useItem(slotIndex);
        this.itemTargetMode = 'light_card';
        this.addLog('选择目标格子...');
        break;
    }
  }

  handleItemTargetSelect(cellIndex, pointer) {
    const stack = this.grid[cellIndex];
    if (stack.length === 0) {
      this.cancelItemTarget();
      return;
    }
    const card = stack[stack.length - 1];

    switch (this.itemTargetMode) {
      case 'throwing_knife':
        if (card.faceUp && card.type === CARD_TYPES.MONSTER && card.hp !== undefined) {
          card.hp -= 6;
          this.addLog(`飞刀命中 ${card.name}，造成6伤害`);
          this.flashCell(cellIndex, COLORS.danger);
          if (card.hp <= 0) {
            this.addLog(`${card.name} 被飞刀消灭！`);
            GameState.gold += 10;
            this.applyRevengeOnKill(cellIndex);
            this.recalcInspire();
            this.removeCardFromCell(cellIndex);
          } else {
            this.renderCell(cellIndex);
          }
          this.checkRoomClear();
        } else {
          this.addLog('无效目标');
        }
        break;

      case 'hook_rope':
        if (this.hookRopeTarget < 0) {
          // 第一步：选择要移动的卡
          this.hookRopeTarget = cellIndex;
          this.addLog('选择移动方向...');
          this.itemTargetMode = 'hook_rope_direction';
          // 显示方向提示
          const pos = getCellPos(cellIndex);
          this.highlightRects.forEach(h => h.setVisible(false));
          const adj = getAdjacentCells(cellIndex);
          for (const ai of adj) {
            this.highlightRects[ai].setVisible(true);
          }
          return;
        }
        break;

      case 'hook_rope_direction': {
        const sourceCell = this.hookRopeTarget;
        if (isOrthogonallyAdjacent(sourceCell, cellIndex)) {
          // 移动卡牌
          const movingCard = this.grid[sourceCell].pop();
          if (movingCard) {
            // 如果目标是玩家格且移动的不是玩家卡，放到玩家格下面
            this.grid[cellIndex].push(movingCard);
            // 如果移动的是玩家卡
            if (movingCard.type === CARD_TYPES.PLAYER) {
              this.playerCellIndex = cellIndex;
            }
            this.addLog(`勾绳移动卡牌`);
            this.renderCell(sourceCell);
            this.renderCell(cellIndex);
            this.checkRoomClear();
          }
        } else {
          this.addLog('必须选择相邻格');
          return;
        }
        break;
      }

      case 'flip_card':
        if (card.faceUp && card.type !== CARD_TYPES.PLAYER) {
          // 找一张背面卡
          let backCell = -1;
          for (let i = 0; i < 9; i++) {
            const s = this.grid[i];
            if (s.length > 0 && !s[s.length - 1].faceUp) {
              backCell = i;
              break;
            }
          }
          if (backCell >= 0) {
            // 交换
            const faceUpCard = this.grid[cellIndex].pop();
            const faceDownCard = this.grid[backCell].pop();
            faceUpCard.faceUp = false;
            faceDownCard.faceUp = true;
            this.grid[cellIndex].push(faceDownCard);
            this.grid[backCell].push(faceUpCard);
            this.addLog('翻转卡：交换成功！');
            this.renderCell(cellIndex);
            this.renderCell(backCell);
            this.onCardRevealed(faceDownCard, backCell);
          } else {
            this.addLog('没有可交换的背面卡');
          }
        } else {
          this.addLog('无效目标');
        }
        break;

      case 'light_card': {
        // 翻开目标格所有相邻格
        const adj = getAdjacentCells(cellIndex);
        let flipped = 0;
        for (const ai of adj) {
          const s = this.grid[ai];
          if (s.length > 0 && !s[s.length - 1].faceUp) {
            s[s.length - 1].faceUp = true;
            this.addLog(`照明翻开: ${s[s.length - 1].name}`);
            this.renderCell(ai);
            this.onCardRevealed(s[s.length - 1], ai);
            flipped++;
          }
        }
        if (flipped === 0) this.addLog('没有可翻开的卡');
        break;
      }
    }

    this.cancelItemTarget();
    this.updateAllUI();
  }

  cancelItemTarget() {
    this.itemTargetMode = null;
    this.hookRopeTarget = -1;
    this.highlightRects.forEach(h => h.setVisible(false));
  }

  highlightAllMonsters() {
    for (let i = 0; i < 9; i++) {
      const stack = this.grid[i];
      if (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top.faceUp && top.type === CARD_TYPES.MONSTER) {
          this.highlightRects[i].setVisible(true);
        }
      }
    }
  }

  // ── 词条系统 ──────────────────────────────────────
  applyRevengeOnKill(killedCellIndex) {
    // 复仇：每有怪物被消灭，其他怪物+2攻击
    for (let i = 0; i < 9; i++) {
      if (i === killedCellIndex) continue;
      const stack = this.grid[i];
      if (stack.length > 0) {
        const card = stack[stack.length - 1];
        if (card.faceUp && card.type === CARD_TYPES.MONSTER && card.trait === TRAITS.REVENGE) {
          card.atkBonusFromRevenge += 2;
          this.addLog(`${card.name} 复仇！攻击+2`);
          this.renderCell(i);
        }
      }
    }
  }

  recalcInspire() {
    // 鼓舞：场上所有其他怪物+1攻击 (只要旗兵在场)
    // 先重置所有鼓舞加成
    for (let i = 0; i < 9; i++) {
      const stack = this.grid[i];
      if (stack.length > 0) {
        const card = stack[stack.length - 1];
        if (card.type === CARD_TYPES.MONSTER) {
          card.atkBonusFromInspire = 0;
        }
      }
    }
    // 找到所有鼓舞源
    for (let i = 0; i < 9; i++) {
      const stack = this.grid[i];
      if (stack.length > 0) {
        const card = stack[stack.length - 1];
        if (card.faceUp && card.type === CARD_TYPES.MONSTER && card.trait === TRAITS.INSPIRE) {
          // 给所有其他怪物+1
          for (let j = 0; j < 9; j++) {
            if (j === i) continue;
            const jStack = this.grid[j];
            if (jStack.length > 0) {
              const jCard = jStack[jStack.length - 1];
              if (jCard.faceUp && jCard.type === CARD_TYPES.MONSTER) {
                jCard.atkBonusFromInspire += 1;
              }
            }
          }
        }
      }
    }
  }

  checkSpawner(card, cellIndex) {
    // 散子：每损失10HP召唤一个骷髅
    const hpLost = card.maxHp - card.hp;
    const currentThreshold = Math.floor(hpLost / 10);
    const lastThreshold = card.spawnerLastThreshold !== undefined
      ? card.spawnerLastThreshold
      : 0;

    if (currentThreshold > lastThreshold) {
      card.spawnerLastThreshold = currentThreshold;
      const summonCount = currentThreshold - lastThreshold;

      for (let s = 0; s < summonCount; s++) {
        const adj = getAdjacentCells(cellIndex).filter(ai => ai !== this.playerCellIndex);
        if (adj.length > 0) {
          const targetCell = adj[randomInt(0, adj.length - 1)];
          const skeleton = GameState.createMonsterCard(MONSTERS.skeleton);
          skeleton.faceUp = true;

          // 如果目标格有正面卡，将旧卡翻面压下面
          const existingStack = this.grid[targetCell];
          if (existingStack.length > 0 && existingStack[existingStack.length - 1].faceUp) {
            existingStack[existingStack.length - 1].faceUp = false;
          }

          this.grid[targetCell].push(skeleton);
          this.addLog(`${card.name} 召唤了骷髅！`);
          this.renderCell(targetCell);
        }
      }
    }
  }

  hasGripRestriction() {
    // 检查是否有紧握怪物与玩家相邻
    const adj = getAdjacentCells(this.playerCellIndex);
    for (const ai of adj) {
      const stack = this.grid[ai];
      if (stack.length > 0) {
        const card = stack[stack.length - 1];
        if (card.faceUp && card.type === CARD_TYPES.MONSTER && card.trait === TRAITS.GRIP && card.hp > 0) {
          return true;
        }
      }
    }
    return false;
  }

  findGripCard() {
    const adj = getAdjacentCells(this.playerCellIndex);
    for (const ai of adj) {
      const stack = this.grid[ai];
      if (stack.length > 0) {
        const card = stack[stack.length - 1];
        if (card.faceUp && card.type === CARD_TYPES.MONSTER && card.trait === TRAITS.GRIP) {
          return card;
        }
      }
    }
    return null;
  }

  // ── 好战词条处理 ──────────────────────────────────
  processWarlikeMovement() {
    for (let i = 0; i < 9; i++) {
      const stack = this.grid[i];
      if (stack.length === 0) continue;
      const card = stack[stack.length - 1];
      if (!card.faceUp || card.type !== CARD_TYPES.MONSTER || card.trait !== TRAITS.WARLIKE) continue;

      card.warlikeStepCount = (card.warlikeStepCount || 0) + 1;
      if (card.warlikeStepCount >= 3) {
        card.warlikeStepCount = 0;

        // 检查好战怪物是否与玩家正交相邻
        const isAdjacentToPlayer = getAdjacentCells(i).includes(this.playerCellIndex);

        if (isAdjacentToPlayer) {
          // 相邻时直接互动（战斗）
          this.addLog(`${card.name} 好战触发，与你互动！`);
          this.resolveCombat(i);
        } else {
          // 不相邻时向玩家方向移动一格（移到相邻格中离玩家最近的空格）
          const adj = getAdjacentCells(i);
          let bestCell = -1;
          let bestDist = Infinity;
          const pPos = getCellPos(this.playerCellIndex);

          for (const ai of adj) {
            if (this.grid[ai].length === 0) {
              const cPos = getCellPos(ai);
              const dist = Math.abs(pPos.x - cPos.x) + Math.abs(pPos.y - cPos.y);
              if (dist < bestDist) {
                bestDist = dist;
                bestCell = ai;
              }
            }
          }

          if (bestCell >= 0) {
            const movingCard = this.grid[i].pop();
            this.grid[bestCell].push(movingCard);
            this.addLog(`${card.name} 好战移动至格${bestCell + 1}`);
            this.renderCell(i);
            this.renderCell(bestCell);

            // 移动后检查是否与玩家相邻（为下一步行动做准备）
            if (getAdjacentCells(bestCell).includes(this.playerCellIndex)) {
              this.addLog(`${card.name} 已逼近你身边！`);
            }
          } else {
            this.addLog(`${card.name} 无路可移`);
          }
        }
      }
    }
  }

  // ── 翻牌辅助 ──────────────────────────────────────
  revealAdjacentToPlayer() {
    const adj = getAdjacentCells(this.playerCellIndex);
    let anyFlipped = false;
    for (const ai of adj) {
      const stack = this.grid[ai];
      if (stack.length > 0) {
        const topCard = stack[stack.length - 1];
        if (!topCard.faceUp) {
          topCard.faceUp = true;
          this.renderCell(ai);
          this.addLog(`翻开: ${topCard.name}`);
          this.onCardRevealed(topCard, ai);
          anyFlipped = true;
        }
      }
    }
    return anyFlipped;
  }

  // ── 房间清理检查 ──────────────────────────────────
  checkRoomClear() {
    if (this.roomCleared || this.playerDead) return;

    // 只检查正面（已翻开）的怪物卡，背面和被覆盖的怪物不算
    let hasMonsters = false;
    for (let i = 0; i < 9; i++) {
      const stack = this.grid[i];
      if (stack.length > 0) {
        const topCard = stack[stack.length - 1];
        if (topCard.faceUp && topCard.type === CARD_TYPES.MONSTER && topCard.hp > 0) {
          hasMonsters = true;
          break;
        }
      }
    }

    if (!hasMonsters) {
      this.roomCleared = true;
      GameState.clearRoom();
      this.addLog('房间已清除！');
      this.updateAllUI();

      // 显示继续按钮
      this.time.delayedCall(600, () => {
        this.showRoomClearUI();
      });
    }
  }

  showRoomClearUI() {
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5).setDepth(150);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, '房间清除！', {
      fontFamily: 'sans-serif', fontSize: '36px', color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(151);

    // 遗物主动技能按钮
    const activeRelics = GameState.relics.filter(r => r.active && !GameState.activeRelicCooldowns[r.id]);
    let btnY = GAME_HEIGHT / 2 + 10;

    for (const relic of activeRelics) {
      const btn = this.add.text(GAME_WIDTH / 2, btnY, `${relic.name}: ${relic.desc}`, {
        fontFamily: 'sans-serif', fontSize: '14px', color: COLORS.textWhite,
        backgroundColor: '#2a2550', padding: { x: 16, y: 8 },
      }).setOrigin(0.5).setDepth(151).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        this.useRelicInRoom(relic);
        btn.destroy();
      });
      btnY += 40;
    }

    const continueBtn = this.add.text(GAME_WIDTH / 2, btnY + 20, '继续前进', {
      fontFamily: 'sans-serif', fontSize: '22px', color: COLORS.textWhite,
      backgroundColor: '#1a5fb4', padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setDepth(151).setInteractive({ useHandCursor: true });

    continueBtn.on('pointerover', () => continueBtn.setScale(1.05));
    continueBtn.on('pointerout', () => continueBtn.setScale(1));
    continueBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('MapScene');
      });
    });
  }

  useRelicInRoom(relic) {
    if (!GameState.useActiveRelic(relic.id)) return;

    switch (relic.id) {
      case 'law_wand':
        // 法则魔杖：移动任意卡到任意格
        this.lawWandMode = true;
        this.lawWandSourceCell = -1;
        this.addLog('法则魔杖：选择要移动的卡牌');
        break;
      case 'endless_water':
        // 无尽水袋：恢复6HP
        GameState.healPlayer(6);
        this.addLog('无尽水袋：HP+6');
        this.flashPlayerCell(COLORS.success);
        this.updateAllUI();
        break;
    }
  }

  handleLawWandSelect(cellIndex) {
    if (this.lawWandSourceCell < 0) {
      // 选择源
      const stack = this.grid[cellIndex];
      if (stack.length === 0) return;
      this.lawWandSourceCell = cellIndex;
      this.addLog('选择目标格子...');
      // 高亮所有格子
      for (let i = 0; i < 9; i++) {
        this.highlightRects[i].setVisible(true);
      }
    } else {
      // 选择目标 - 移动卡牌
      const card = this.grid[this.lawWandSourceCell].pop();
      if (card) {
        if (card.type === CARD_TYPES.PLAYER) {
          this.playerCellIndex = cellIndex;
        }
        this.grid[cellIndex].push(card);
        this.addLog(`法则魔杖：移动 ${card.name}`);
        this.renderCell(this.lawWandSourceCell);
        this.renderCell(cellIndex);
        this.updateAllUI();
      }
      this.lawWandMode = false;
      this.lawWandSourceCell = -1;
      this.highlightRects.forEach(h => h.setVisible(false));
      this.checkRoomClear();
    }
  }

  // ── 遗物选择 ──────────────────────────────────────
  showRelicSelection(quality) {
    // 根据品质生成3个遗物选择
    const allWhiteRelics = Object.values(RELICS).filter(r => r.quality === 'white' && !r.isStarter);
    const available = allWhiteRelics.filter(r => !GameState.relics.find(gr => gr.id === r.id));
    const choices = shuffle(available).slice(0, Math.min(3, available.length));

    if (choices.length === 0) {
      this.addLog('没有可获取的遗物');
      return;
    }

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setDepth(150);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, '选择遗物', {
      fontFamily: 'sans-serif', fontSize: '28px', color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(151);

    const btnWidth = 200;
    const startX = GAME_WIDTH / 2 - ((choices.length - 1) * (btnWidth + 20)) / 2;

    for (let i = 0; i < choices.length; i++) {
      const relic = choices[i];
      const x = startX + i * (btnWidth + 20);
      const y = GAME_HEIGHT / 2 + 10;

      const container = this.add.container(x, y).setDepth(151);

      const bg = this.add.graphics();
      bg.fillStyle(0x2a2550, 1);
      bg.fillRoundedRect(-btnWidth / 2, -50, btnWidth, 100, 8);
      bg.lineStyle(2, 0x9141ac, 0.8);
      bg.strokeRoundedRect(-btnWidth / 2, -50, btnWidth, 100, 8);
      container.add(bg);

      container.add(this.add.text(0, -25, relic.name, {
        fontFamily: 'sans-serif', fontSize: '16px', color: COLORS.textWhite, fontStyle: 'bold',
      }).setOrigin(0.5));

      container.add(this.add.text(0, 10, relic.desc, {
        fontFamily: 'sans-serif', fontSize: '11px', color: COLORS.textGray,
        wordWrap: { width: btnWidth - 20 }, align: 'center',
      }).setOrigin(0.5));

      const hitArea = this.add.rectangle(0, 0, btnWidth, 100, 0x000000, 0).setInteractive({ useHandCursor: true });
      container.add(hitArea);

      hitArea.on('pointerdown', () => {
        GameState.addRelic(relic.id);
        this.addLog(`获得遗物: ${relic.name}`);
        // 清除选择UI
        this.children.list.filter(c => c.depth >= 150).forEach(c => c.destroy());
        this.updateAllUI();
      });
    }
  }

  // ── 属性选择 ──────────────────────────────────────
  showAttributeSelection() {
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setDepth(150);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, '选择属性提升', {
      fontFamily: 'sans-serif', fontSize: '24px', color: COLORS.textBlue, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(151);

    const options = [
      { label: '攻击 +1', action: () => { GameState.shopAtkBonus++; GameState.recalcStats(); } },
      { label: '防御 +1', action: () => { GameState.shopDefBonus++; GameState.recalcStats(); } },
      { label: '生命 +2', action: () => { GameState.shopHpBonus += 2; GameState.recalcStats(); GameState.healPlayer(2); } },
    ];

    const btnWidth = 150;
    const startX = GAME_WIDTH / 2 - ((options.length - 1) * (btnWidth + 20)) / 2;

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const x = startX + i * (btnWidth + 20);
      const y = GAME_HEIGHT / 2 + 10;

      const btn = this.add.text(x, y, opt.label, {
        fontFamily: 'sans-serif', fontSize: '18px', color: COLORS.textWhite,
        backgroundColor: '#2a2550', padding: { x: 20, y: 12 },
      }).setOrigin(0.5).setDepth(151).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setScale(1.05));
      btn.on('pointerout', () => btn.setScale(1));
      btn.on('pointerdown', () => {
        opt.action();
        this.addLog(`属性提升: ${opt.label}`);
        this.children.list.filter(c => c.depth >= 150).forEach(c => c.destroy());
        this.updateAllUI();
      });
    }
  }

  // ── 辅助函数 ──────────────────────────────────────
  removeCardFromCell(cellIndex) {
    const stack = this.grid[cellIndex];
    if (stack.length === 0) return;
    const removed = stack.pop();

    // 如果移除后还有卡，处理新的顶卡
    if (stack.length > 0) {
      const newTop = stack[stack.length - 1];
      if (newTop.type !== CARD_TYPES.PLAYER) {
        if (!newTop.faceUp) {
          // 背面卡：翻开并触发效果
          newTop.faceUp = true;
          this.addLog(`翻开: ${newTop.name}`);
          this.time.delayedCall(100, () => {
            if (this.playerDead || this.scene.isPaused) return;
            this.renderCell(cellIndex);
            this.onCardRevealed(newTop, cellIndex);
          });
          return;
        } else {
          // 已经是正面卡：仍然需要触发翻开效果（如金币自动拾取）
          this.time.delayedCall(100, () => {
            if (this.playerDead || this.scene.isPaused) return;
            this.renderCell(cellIndex);
            this.onCardRevealed(newTop, cellIndex);
          });
          return;
        }
      }
    }
    this.renderCell(cellIndex);
  }

  countAction() {
    this.actionCount++;
    // 好战词条处理
    this.processWarlikeMovement();
    this.updateAllUI();
  }

  flashCell(cellIndex, color) {
    const pos = getCellPos(cellIndex);
    const flash = this.add.rectangle(pos.x, pos.y, CARD_W, CARD_H, color, 0.5).setDepth(50);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });
  }

  flashPlayerCell(color) {
    this.flashCell(this.playerCellIndex, color);
  }

  update() {
    // 实时更新（如果需要的话）
  }
}
