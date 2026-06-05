import { Scene } from 'phaser';
import { COLORS, FONT, GAME_CONFIG, getGridX, getGridY, indexToRowCol, getAdjacentIndices, hexToString } from '../config.js';
import { audio } from '../audio/AudioManager.js';
import { generateRoomCards, generateLayerRooms, generateRouteOptions } from '../core/dungeon.js';
import { getTotalStats, healPlayer, damagePlayer, addGold, addRelic, addItem, addSkill, removeCardFromGrid, getTopCard, isCellEmpty, hasMonsters, saveGame } from '../core/gameState.js';
import { resolvePlayerMonsterBattle, resolvePlayerTrapBattle, useItemOnTarget, applyAttrUp, applyFood, buyShopItem } from '../core/battle.js';
import { getRelicChoices, createRelicInstance, RELICS } from '../data/relics.js';
import { delay, tweenPop, tweenShake, tweenFlip, tweenMove, tweenFadeOut } from '../utils/tweens.js';

export class GameScene extends Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.gameState = data.state || null;
    this.draggedCard = null;
    this.dragOriginalIndex = -1;
    this.cellTexts = [];
    this.cardTexts = []; // 2D array [gridIndex][stackIndex]
    this.uiTexts = {};
    this.dragGhost = null;
    this.dragSourceTxt = null;     // 原卡牌对象
    this.hoveredCard = null;
    this.itemMode = false; // 道具使用模式
    this.selectedItem = null;
    this.awaitingDirection = false; // 勾绳等待方向
    this.pendingCallbacks = [];
  }

  create() {
    if (!this.gameState) {
      this.scene.start('MenuScene');
      return;
    }

    audio.startBgm();

    this.renderBackground();
    this.renderGrid();

    // 初始化网格
    this.gameState.grid = this.gameState.grid || [];
    if (this.gameState.grid.length === 0) {
      this.enterRoom(this.gameState.currentRoom || 'reward', true);
    }

    this.renderCards();
    this.renderUI();
    this.createSettingsButton();

    // 初始揭示
    this.revealAdjacent(this.gameState.playerGridIndex);

    // Phaser 原生拖拽
    this.input.dragDistanceThreshold = 8;
    this.input.on('dragstart', (pointer, gameObject) => this.onDragStart(pointer, gameObject));
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => this.onDrag(pointer, gameObject, dragX, dragY));
    this.input.on('dragend', (pointer, gameObject) => this.onDragEnd(pointer, gameObject));
  }

  // ========== 背景 ==========
  renderBackground() {
    // 背景由 Phaser Game 配置统一处理，无需额外几何绘制
  }

  // ========== 九宫格文字渲染 ==========
  renderGrid() {
    this.cellContainer = this.add.container(0, 0);
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 - 20;

    for (let i = 0; i < 9; i++) {
      const { row, col } = indexToRowCol(i);
      const x = getGridX(col, cx);
      const y = getGridY(row, cy);

      // 格子名称文字（空格子时可见）
      const label = this.add.text(x, y, `格${i + 1}`, {
        fontFamily: FONT.family,
        fontSize: '16px',
        color: '#3a4045',
      }).setOrigin(0.5);
      this.cellContainer.add(label);

      this.cellTexts[i] = { x, y, label };
    }
  }

  // ========== 卡牌渲染 ==========
  renderCards() {
    this.cleanupDrag(); // 重建卡牌前务必清理拖拽状态
    if (this.cardContainer) this.cardContainer.destroy();
    this.cardContainer = this.add.container(0, 0);
    this.cardTexts = Array.from({ length: 9 }, () => []);

    for (let i = 0; i < 9; i++) {
      const stack = this.gameState.grid[i] || [];
      for (let j = 0; j < stack.length; j++) {
        const card = stack[j];
        const textObj = this.createCardText(i, j, card);
        this.cardTexts[i][j] = textObj;
        this.cardContainer.add(textObj);
      }
    }
  }

  createCardText(gridIndex, stackIndex, card) {
    const cell = this.cellTexts[gridIndex];
    const x = cell.x;
    const y = cell.y + (stackIndex - (this.gameState.grid[gridIndex]?.length - 1)) * 3;

    let text, color, fontSize;
    const isTop = stackIndex === (this.gameState.grid[gridIndex]?.length - 1);

    if (!card.revealed) {
      text = '？';
      color = '#8a7440';
      fontSize = '32px';
    } else {
      text = this.getCardDisplayText(card);
      color = this.getCardColor(card);
      fontSize = '20px';
    }

    const txt = this.add.text(x, y, text, {
      fontFamily: FONT.family,
      fontSize,
      color,
      fontStyle: 'bold',
      stroke: hexToString(COLORS.ink),
      strokeThickness: 3,
    }).setOrigin(0.5);

    // 只有顶部的卡可以交互
    if (isTop && card.type !== 'empty') {
      txt.setInteractive({ useHandCursor: true });
      txt.cardData = card;
      txt.gridIndex = gridIndex;
      txt.stackIndex = stackIndex;

      // 玩家卡和道具卡可拖拽
      const canDrag = (card.type === 'player' || card.type === 'item') &&
                      (!this.itemMode || card.type === 'item');
      if (canDrag) {
        this.input.setDraggable(txt);
      }

      txt.on('pointerover', () => {
        this.hoveredCard = card;
        this.updateDescription();
        txt.setScale(1.1);
      });
      txt.on('pointerout', () => {
        this.hoveredCard = null;
        this.updateDescription();
        txt.setScale(1);
      });
    }

    return txt;
  }

  getCardDisplayText(card) {
    if (!card.revealed) return '？';
    switch (card.type) {
      case 'player': return '你';
      case 'monster': return card.data?.name || card.name || '怪物';
      case 'item': return card.name || '道具';
      case 'goldCard': return '金币';
      case 'chest': return card.quality === 'blue' ? '蓝箱' : card.quality === 'gold' ? '金宝' : '宝箱';
      case 'food': return '食物';
      case 'mentor': return '导师';
      case 'attrUp': return '提升';
      case 'trap': return card.name || '机关';
      case 'shopItem': return card.name || '商品';
      default: return '？';
    }
  }

  getCardColor(card) {
    if (!card.revealed) return '#8a7440';
    switch (card.type) {
      case 'player': return '#52c6b8';
      case 'monster': return '#e76457';
      case 'item': return '#74a8ff';
      case 'goldCard': return '#f5c86a';
      case 'chest': return '#f5c86a';
      case 'food': return '#7ec86a';
      case 'mentor': return '#9b72cf';
      case 'attrUp': return '#7ec86a';
      case 'trap': return '#d98e3e';
      case 'shopItem': return '#f5c86a';
      default: return '#f2eee7';
    }
  }

  // ========== Phaser 原生拖拽 ==========

  onDragStart(pointer, gameObject) {
    const card = gameObject.cardData;
    if (!card) return;

    this.draggedCard = card;
    this.dragOriginalIndex = gameObject.gridIndex;
    this.dragSourceTxt = gameObject;

    audio.playDrag();

    if (this.dragGhost) this.dragGhost.destroy();
    this.dragGhost = this.add.text(pointer.x, pointer.y, this.getCardDisplayText(card), {
      fontFamily: FONT.family,
      fontSize: '28px',
      color: this.getCardColor(card),
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.9).setDepth(100);

    gameObject.setAlpha(0.3);
  }

  onDrag(pointer, gameObject, dragX, dragY) {
    if (this.dragGhost) {
      this.dragGhost.x = pointer.x;
      this.dragGhost.y = pointer.y;
    }
  }

  async onDragEnd(pointer, gameObject) {
    if (this.awaitingDirection) {
      this.cleanupDrag();
      return;
    }

    if (this.dragGhost && this.draggedCard) {
      audio.playDrop();

      let targetIndex = -1;
      for (let i = 0; i < 9; i++) {
        const cell = this.cellTexts[i];
        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, cell.x, cell.y);
        if (dist < GAME_CONFIG.cellSize / 2) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex >= 0) {
        await this.handleDrop(this.draggedCard, this.dragOriginalIndex, targetIndex);
      }
    }

    this.cleanupDrag();
  }

  cleanupDrag() {
    if (this.dragGhost) {
      this.dragGhost.destroy();
      this.dragGhost = null;
    }
    if (this.dragSourceTxt && this.dragSourceTxt.active) {
      this.dragSourceTxt.setAlpha(1);
    }
    this.draggedCard = null;
    this.dragOriginalIndex = -1;
    this.dragSourceTxt = null;
  }

  // ========== 拖拽释放处理 ==========
  async handleDrop(card, fromIndex, toIndex) {
    if (this.gameState.gameOver) return;

    const targetCard = getTopCard(this.gameState, toIndex);

    if (card.type === 'player') {
      if (toIndex === fromIndex) return;

      if (isCellEmpty(this.gameState, toIndex)) {
        // 移动到空白格
        await this.movePlayer(toIndex);
        this.afterPlayerAction();
      } else if (targetCard && targetCard.revealed) {
        // 互动
        await this.interactWithCard(targetCard, toIndex);
        this.afterPlayerAction();
      }
    } else if (card.type === 'item') {
      // 道具使用
      if (toIndex === fromIndex) {
        // 收入道具栏（如果当前在场上）
        if (fromIndex >= 0 && fromIndex < 9) {
          this.collectItem(card, fromIndex);
        }
      } else if (targetCard && targetCard.revealed) {
        await this.useItem(card, targetCard, toIndex, fromIndex);
      }
    }
  }

  async movePlayer(toIndex) {
    const fromIndex = this.gameState.playerGridIndex;
    const stack = this.gameState.grid[fromIndex];
    const playerCardIndex = stack.findIndex(c => c.type === 'player');
    if (playerCardIndex >= 0) {
      const playerCard = stack.splice(playerCardIndex, 1)[0];
      this.gameState.grid[toIndex].push(playerCard);
      this.gameState.playerGridIndex = toIndex;
    }

    audio.playStep();
    this.renderCards();
    this.revealAdjacent(toIndex);
  }

  async interactWithCard(targetCard, gridIndex) {
    switch (targetCard.type) {
      case 'monster':
        await this.fightMonster(targetCard, gridIndex);
        break;
      case 'trap':
        await this.interactTrap(targetCard, gridIndex);
        break;
      case 'goldCard':
        this.collectGold(targetCard, gridIndex);
        break;
      case 'chest':
        this.openChest(targetCard, gridIndex);
        break;
      case 'food':
        this.eatFood(targetCard, gridIndex);
        break;
      case 'mentor':
        this.learnSkill(targetCard, gridIndex);
        break;
      case 'attrUp':
        this.chooseAttrUp(targetCard, gridIndex);
        break;
      case 'shopItem':
        this.buyShopItemCard(targetCard, gridIndex);
        break;
      case 'item':
        // 拾取道具
        this.collectItem(targetCard, gridIndex);
        break;
    }
  }

  // ========== 战斗互动 ==========
  async fightMonster(monsterCard, gridIndex) {
    const stack = this.gameState.grid[gridIndex];
    const monster = monsterCard.data || monsterCard;
    const results = resolvePlayerMonsterBattle(this.gameState, monster);

    // 动画
    const txt = this.findCardText(gridIndex, monsterCard);
    if (txt) {
      await tweenShake(this, txt, 6, 200);
      await tweenPop(this, txt, 150);
    }

    for (const res of results) {
      if (res.type === 'playerAttack') {
        audio.playAttack();
        await delay(this, 150);
      } else if (res.type === 'monsterAttack') {
        audio.playHit();
        const playerTxt = this.findPlayerText();
        if (playerTxt) await tweenShake(this, playerTxt, 8, 200);
        await delay(this, 150);
      } else if (res.type === 'monsterDie') {
        audio.playVictory();
        if (txt) {
          await tweenFadeOut(this, txt, 300);
        }
        // 从堆叠移除
        const idx = stack.findIndex(c => (c.data || c) === monster);
        if (idx >= 0) {
          const rem = removeCardFromGrid(this.gameState, gridIndex, idx);
          if (rem.revealed) {
            // 新翻开的卡触发效果
            await this.handleRevealEffect(rem.revealed, gridIndex);
          }
        }
      }
    }

    this.renderCards();
    this.updateUI();
    this.checkRoomClear();
    this.checkGameOver();
  }

  async interactTrap(trapCard, gridIndex) {
    const stack = this.gameState.grid[gridIndex];
    const results = resolvePlayerTrapBattle(this.gameState, trapCard);

    const txt = this.findCardText(gridIndex, trapCard);
    if (txt) await tweenShake(this, txt, 6, 200);

    for (const res of results) {
      if (res.type === 'trapAttack') {
        audio.playHit();
        const playerTxt = this.findPlayerText();
        if (playerTxt) await tweenShake(this, playerTxt, 8, 200);
      } else if (res.type === 'trapDestroy') {
        audio.playTrapTrigger();
        if (txt) await tweenFadeOut(this, txt, 300);
        const idx = stack.findIndex(c => c === trapCard);
        if (idx >= 0) {
          const rem = removeCardFromGrid(this.gameState, gridIndex, idx);
          if (rem.revealed) {
            await this.handleRevealEffect(rem.revealed, gridIndex);
          }
        }
      } else if (res.type === 'teleportTrigger') {
        await this.handleTeleport();
      }
    }

    this.renderCards();
    this.updateUI();
    this.checkGameOver();
  }

  async handleTeleport() {
    // 传送机关：洗牌重布
    const cards = [];
    for (let i = 0; i < 9; i++) {
      if (i === this.gameState.playerGridIndex) continue;
      const stack = this.gameState.grid[i];
      while (stack.length > 0) {
        const c = stack.pop();
        c.revealed = false;
        cards.push(c);
      }
    }

    // 玩家随机移动
    const possibleIndices = [0, 1, 2, 3, 4, 5, 6, 8];
    const newIndex = possibleIndices[Math.floor(Math.random() * possibleIndices.length)];
    const playerStack = this.gameState.grid[this.gameState.playerGridIndex];
    const playerCard = playerStack.find(c => c.type === 'player');
    if (playerCard) {
      const idx = playerStack.indexOf(playerCard);
      playerStack.splice(idx, 1);
      this.gameState.grid[newIndex].push(playerCard);
      this.gameState.playerGridIndex = newIndex;
    }

    // 重新分布
    for (const c of cards) {
      const idx = Math.floor(Math.random() * 9);
      if (idx === this.gameState.playerGridIndex) continue;
      this.gameState.grid[idx].push(c);
    }

    audio.playTrapTrigger();
    this.renderCards();
    this.revealAdjacent(newIndex);
  }

  async handleRevealEffect(card, gridIndex) {
    // 伏击者骷髅
    if (card.type === 'monster' && card.templateId === 'ambusherSkeleton') {
      const adj = getAdjacentIndices(gridIndex);
      if (adj.includes(this.gameState.playerGridIndex)) {
        await this.fightMonster(card, gridIndex);
      }
    }
  }

  // ========== 拾取与使用 ==========
  collectGold(card, gridIndex) {
    addGold(this.gameState, card.value || 20);
    audio.playPickUp();
    const stack = this.gameState.grid[gridIndex];
    const idx = stack.indexOf(card);
    if (idx >= 0) {
      removeCardFromGrid(this.gameState, gridIndex, idx);
    }
    this.renderCards();
    this.updateUI();
    this.checkRoomClear();
  }

  openChest(card, gridIndex) {
    const stack = this.gameState.grid[gridIndex];
    const idx = stack.indexOf(card);
    if (idx >= 0) removeCardFromGrid(this.gameState, gridIndex, idx);

    // 选择遗物
    const choices = getRelicChoices();
    this.showChoiceModal('选择一个遗物', choices.map(c => c.name), (choiceIdx) => {
      const relic = choices[choiceIdx];
      if (relic) {
        addRelic(this.gameState, relic);
        audio.playPickUp();
      }
      this.renderCards();
      this.updateUI();
      this.checkRoomClear();
    });
  }

  eatFood(card, gridIndex) {
    applyFood(this.gameState);
    audio.playHeal();
    const stack = this.gameState.grid[gridIndex];
    const idx = stack.indexOf(card);
    if (idx >= 0) removeCardFromGrid(this.gameState, gridIndex, idx);
    this.renderCards();
    this.updateUI();
    this.checkRoomClear();
  }

  learnSkill(card, gridIndex) {
    addSkill(this.gameState, card.skillId);
    audio.playPickUp();
    // 移除其他导师卡
    for (let i = 0; i < 9; i++) {
      const stack = this.gameState.grid[i];
      for (let j = stack.length - 1; j >= 0; j--) {
        if (stack[j].type === 'mentor' && stack[j] !== card) {
          stack.splice(j, 1);
        }
      }
    }
    const stack = this.gameState.grid[gridIndex];
    const idx = stack.indexOf(card);
    if (idx >= 0) removeCardFromGrid(this.gameState, gridIndex, idx);
    this.renderCards();
    this.updateUI();
    this.checkRoomClear();
  }

  chooseAttrUp(card, gridIndex) {
    this.showChoiceModal('选择属性提升', ['攻击+1', '防御+1', '生命+2'], (choiceIdx) => {
      const choices = ['atk', 'def', 'hp'];
      applyAttrUp(this.gameState, choices[choiceIdx]);
      audio.playPickUp();
      const stack = this.gameState.grid[gridIndex];
      const idx = stack.indexOf(card);
      if (idx >= 0) removeCardFromGrid(this.gameState, gridIndex, idx);
      this.renderCards();
      this.updateUI();
      this.checkRoomClear();
    });
  }

  buyShopItemCard(card, gridIndex) {
    if (buyShopItem(this.gameState, card)) {
      audio.playPickUp();
      const stack = this.gameState.grid[gridIndex];
      const idx = stack.indexOf(card);
      if (idx >= 0) removeCardFromGrid(this.gameState, gridIndex, idx);
      this.renderCards();
      this.updateUI();
    } else {
      this.showToast('金币不足！');
    }
  }

  collectItem(card, gridIndex) {
    if (addItem(this.gameState, card)) {
      audio.playPickUp();
      const stack = this.gameState.grid[gridIndex];
      const idx = stack.indexOf(card);
      if (idx >= 0) removeCardFromGrid(this.gameState, gridIndex, idx);
      this.renderCards();
      this.updateUI();
      this.checkRoomClear();
    } else {
      this.showToast('道具栏已满！');
    }
  }

  async useItem(item, target, toIndex, fromIndex) {
    const results = useItemOnTarget(this.gameState, item, target);

    // 移除使用的道具
    if (fromIndex >= 0 && fromIndex < 9) {
      const stack = this.gameState.grid[fromIndex];
      const idx = stack.indexOf(item);
      if (idx >= 0) removeCardFromGrid(this.gameState, fromIndex, idx);
    } else {
      // 从道具栏使用
      const iidx = this.gameState.player.items.indexOf(item);
      if (iidx >= 0) this.gameState.player.items.splice(iidx, 1);
    }

    for (const res of results) {
      if (res.type === 'itemDamage') {
        audio.playAttack();
        const txt = this.findCardText(toIndex, target);
        if (txt) await tweenShake(this, txt, 6, 200);
        if (target.hp <= 0) {
          const stack = this.gameState.grid[toIndex];
          const tidx = stack.findIndex(c => c === target);
          if (tidx >= 0) {
            removeCardFromGrid(this.gameState, toIndex, tidx);
          }
        }
      } else if (res.type === 'heal') {
        audio.playHeal();
      } else if (res.type === 'shield') {
        audio.playPickUp();
      }
    }

    this.renderCards();
    this.updateUI();
    this.checkRoomClear();
  }

  // ========== 视野揭示 ==========
  revealAdjacent(playerIndex) {
    const adj = getAdjacentIndices(playerIndex);
    for (const idx of adj) {
      const stack = this.gameState.grid[idx];
      if (stack && stack.length > 0) {
        const top = stack[stack.length - 1];
        if (!top.revealed) {
          top.revealed = true;
          audio.playFlipCard();
          // 翻牌动画
          const txt = this.findCardText(idx, top);
          if (txt) {
            tweenFlip(this, txt, this.getCardDisplayText(top), this.getCardColor(top));
          }
          // 伏击效果
          if (top.type === 'monster' && top.templateId === 'ambusherSkeleton') {
            this.handleRevealEffect(top, idx);
          }
        }
      }
    }
  }

  // ========== 回合与房间 ==========
  afterPlayerAction() {
    this.gameState.actionCount++;

    // 追踪者骷髅：每3次行动靠近一格
    for (let i = 0; i < 9; i++) {
      const stack = this.gameState.grid[i];
      const top = stack?.[stack.length - 1];
      if (top && top.type === 'monster' && top.templateId === 'trackerSkeleton' && top.revealed) {
        top.aggressiveCounter = (top.aggressiveCounter || 0) + 1;
        if (top.aggressiveCounter >= 3) {
          top.aggressiveCounter = 0;
          this.moveTrackerTowardPlayer(top, i);
        }
      }
    }

    // 尖刺机关触发
    this.checkSpikeTraps();

    this.updateUI();
    this.checkGameOver();
  }

  moveTrackerTowardPlayer(monster, gridIndex) {
    const adj = getAdjacentIndices(gridIndex);
    const playerIdx = this.gameState.playerGridIndex;
    const { row: mr, col: mc } = indexToRowCol(gridIndex);
    const { row: pr, col: pc } = indexToRowCol(playerIdx);

    // 找朝向玩家最近的相邻格
    let best = -1;
    let bestDist = Infinity;
    for (const idx of adj) {
      if (idx === playerIdx) {
        // 直接与玩家互动
        this.fightMonster(monster, gridIndex);
        return;
      }
      const { row, col } = indexToRowCol(idx);
      const dist = Math.abs(row - pr) + Math.abs(col - pc);
      if (dist < bestDist && isCellEmpty(this.gameState, idx)) {
        bestDist = dist;
        best = idx;
      }
    }

    if (best >= 0) {
      const stack = this.gameState.grid[gridIndex];
      const mIdx = stack.findIndex(c => c === monster);
      if (mIdx >= 0) {
        stack.splice(mIdx, 1);
        this.gameState.grid[best].push(monster);
        this.revealAdjacent(best);
        this.renderCards();
      }
    }
  }

  checkSpikeTraps() {
    for (let i = 0; i < 9; i++) {
      const stack = this.gameState.grid[i];
      const top = stack?.[stack.length - 1];
      if (top && top.type === 'trap' && top.templateId === 'spike' && top.revealed && !top.triggered) {
        top.triggered = true;
        const adj = getAdjacentIndices(i);
        for (const idx of adj) {
          const s = this.gameState.grid[idx];
          const c = s?.[s.length - 1];
          if (c && c.type === 'monster') {
            c.hp -= 6;
            const txt = this.findCardText(idx, c);
            if (txt) tweenShake(this, txt, 5, 150);
            if (c.hp <= 0) {
              const cidx = s.indexOf(c);
              if (cidx >= 0) removeCardFromGrid(this.gameState, idx, cidx);
            }
          } else if (c && c.type === 'player') {
            const res = damagePlayer(this.gameState, 6);
            const txt = this.findPlayerText();
            if (txt) tweenShake(this, txt, 6, 150);
          }
        }
        audio.playTrapTrigger();
      }
    }
    this.renderCards();
    this.updateUI();
  }

  checkRoomClear() {
    if (!hasMonsters(this.gameState)) {
      this.gameState.totalRooms++;

      // 硬皮：清空房间恢复10点生命
      if (this.gameState.player.skills.toughSkin) {
        healPlayer(this.gameState, 10);
      }

      // 村好剑：击败精英/层主攻击+2（在 onMonsterDefeated 中处理精英）

      this.showToast('房间清理完成！');
      audio.playVictory();
      this.time.delayedCall(1000, () => {
        this.goToRouteSelect();
      });
    }
  }

  goToRouteSelect() {
    // 节点7后固定餐厅，层主战后进入下一层或通关
    const node = this.gameState.nodeIndex;
    if (node === 7) {
      // 餐厅后直接进入下一层或层主
      this.enterNextNode('normal');
    } else if (node === 8) {
      // 层主战结束
      if (this.gameState.layer >= 3) {
        this.gameState.victory = true;
        this.scene.start('GameOverScene', { state: this.gameState });
      } else {
        this.gameState.layer++;
        this.gameState.nodeIndex = 0;
        this.gameState.layerNodes = generateLayerRooms(this.gameState.layer);
        this.enterRoom(this.gameState.layerNodes[0]);
      }
    } else {
      // 正常路线选择
      const options = generateRouteOptions(node);
      this.scene.start('RoomSelectScene', {
        state: this.gameState,
        options,
      });
    }
  }

  enterRoom(roomType, skipRender = false) {
    this.gameState.currentRoom = roomType;
    this.gameState.grid = generateRoomCards(
      roomType,
      this.gameState.nodeIndex,
      this.gameState.layer,
      this.gameState.player
    );
    this.gameState.playerGridIndex = 7;
    this.gameState.actionCount = 0;
    if (!skipRender) {
      this.renderCards();
      this.revealAdjacent(7);
    }
  }

  enterNextNode(roomType) {
    this.gameState.nodeIndex++;
    this.enterRoom(roomType);
  }

  checkGameOver() {
    if (this.gameState.gameOver) {
      this.time.delayedCall(800, () => {
        audio.playDefeat();
        this.scene.start('GameOverScene', { state: this.gameState });
      });
    }
  }

  // ========== UI 渲染 ==========
  renderUI() {
    if (this.uiContainer) this.uiContainer.destroy();
    this.uiContainer = this.add.container(0, 0);

    // 左上：玩家信息
    this.renderPlayerInfo();

    // 左下：物体描述
    this.renderDescriptionPanel();

    // 右上：遗物
    this.renderRelicsPanel();

    // 右下：道具
    this.renderItemsPanel();

    // 层数/节点信息
    this.renderLayerInfo();
  }

  renderPlayerInfo() {
    const x = 20;
    const y = 20;
    const stats = getTotalStats(this.gameState);

    const title = this.add.text(x + 20, y + 10, '◆ 玩家', {
      fontFamily: FONT.family, fontSize: '20px', color: '#52c6b8', fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.uiContainer.add(title);

    const divider = this.add.text(x + 20, y + 38, '━━━━━━━━━━━━━━', {
      fontFamily: FONT.family, fontSize: '14px', color: '#3a4045',
    }).setOrigin(0, 0);
    this.uiContainer.add(divider);

    const lines = [
      { text: this.gameState.player.name, color: '#52c6b8', size: '22px', bold: true },
      { text: `生命: ${this.gameState.player.hp} / ${stats.maxHp}`, color: '#f2eee7' },
      { text: `攻击: ${stats.atk}`, color: '#f2eee7' },
      { text: `防御: ${stats.def}`, color: '#f2eee7' },
      { text: `金币: ${this.gameState.player.gold}`, color: '#f5c86a' },
    ];

    if (this.gameState.player.skills.thorns) lines.push({ text: '[刺皮]', color: '#9b72cf', size: '14px' });
    if (this.gameState.player.skills.toughSkin) lines.push({ text: '[硬皮]', color: '#9b72cf', size: '14px' });
    if (this.gameState.player.skills.veteran) lines.push({ text: '[历战]', color: '#9b72cf', size: '14px' });

    lines.forEach((line, i) => {
      const txt = this.add.text(x + 20, y + 56 + i * 28, line.text, {
        fontFamily: FONT.family,
        fontSize: line.size || '16px',
        color: line.color,
        fontStyle: line.bold ? 'bold' : 'normal',
      }).setOrigin(0, 0);
      this.uiContainer.add(txt);
    });
  }

  renderDescriptionPanel() {
    const x = 20;
    const y = 340;

    const title = this.add.text(x + 20, y + 10, '◆ 描述', {
      fontFamily: FONT.family, fontSize: '18px', color: '#f2eee7', fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.uiContainer.add(title);

    const divider = this.add.text(x + 20, y + 38, '━━━━━━━━━━━━━━', {
      fontFamily: FONT.family, fontSize: '14px', color: '#3a4045',
    }).setOrigin(0, 0);
    this.uiContainer.add(divider);

    this.descTitle = this.add.text(x + 20, y + 60, '描述', {
      fontFamily: FONT.family, fontSize: '16px', color: '#f2eee7', fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.uiContainer.add(this.descTitle);

    this.descText = this.add.text(x + 20, y + 88, '指向卡牌查看详情', {
      fontFamily: FONT.family, fontSize: '14px', color: '#aeb5b6', wordWrap: { width: 190 },
    }).setOrigin(0, 0);
    this.uiContainer.add(this.descText);
  }

  renderRelicsPanel() {
    const x = this.scale.width - 240;
    const y = 20;

    const title = this.add.text(x + 20, y + 10, '◆ 遗物', {
      fontFamily: FONT.family, fontSize: '18px', color: '#9b72cf', fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.uiContainer.add(title);

    const divider = this.add.text(x + 20, y + 38, '━━━━━━━━━━━━━━', {
      fontFamily: FONT.family, fontSize: '14px', color: '#3a4045',
    }).setOrigin(0, 0);
    this.uiContainer.add(divider);

    this.gameState.player.relics.forEach((relicId, i) => {
      const relic = RELICS[relicId];
      if (!relic) return;
      const row = Math.floor(i / 3);
      const col = i % 3;
      const rx = x + 20 + col * 70;
      const ry = y + 56 + row * 40;
      const txt = this.add.text(rx, ry, relic.name, {
        fontFamily: FONT.family, fontSize: '13px', color: '#9b72cf',
      }).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      txt.on('pointerover', () => {
        this.hoveredCard = relic;
        this.updateDescription();
      });
      txt.on('pointerout', () => {
        this.hoveredCard = null;
        this.updateDescription();
      });
      this.uiContainer.add(txt);
    });
  }

  renderItemsPanel() {
    const x = this.scale.width - 240;
    const y = 340;

    const title = this.add.text(x + 20, y + 10, '◆ 道具', {
      fontFamily: FONT.family, fontSize: '18px', color: '#74a8ff', fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.uiContainer.add(title);

    const divider = this.add.text(x + 20, y + 38, '━━━━━━━━━━━━━━', {
      fontFamily: FONT.family, fontSize: '14px', color: '#3a4045',
    }).setOrigin(0, 0);
    this.uiContainer.add(divider);

    this.gameState.player.items.forEach((item, i) => {
      const ix = x + 20;
      const iy = y + 56 + i * 32;
      const txt = this.add.text(ix, iy, item.name, {
        fontFamily: FONT.family, fontSize: '14px', color: '#74a8ff',
      }).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      txt.on('pointerover', () => {
        this.hoveredCard = item;
        this.updateDescription();
      });
      txt.on('pointerout', () => {
        this.hoveredCard = null;
        this.updateDescription();
      });
      txt.on('pointerdown', () => {
        // 点击道具从道具栏使用
        this.showToast(`拖动「${item.name}」到目标上使用`);
      });
      this.uiContainer.add(txt);
    });
  }

  renderLayerInfo() {
    const cx = this.scale.width / 2;
    this.layerText = this.add.text(cx, 10, `第 ${this.gameState.layer} 层 - 节点 ${this.gameState.nodeIndex + 1}/9`, {
      fontFamily: FONT.family, fontSize: '16px', color: '#aeb5b6',
    }).setOrigin(0.5, 0);
    this.uiContainer.add(this.layerText);
  }

  updateUI() {
    this.renderUI();
  }

  updateDescription() {
    if (!this.descTitle || !this.descText) return;
    const card = this.hoveredCard;
    if (!card) {
      this.descTitle.setText('描述');
      this.descText.setText('指向卡牌查看详情');
      return;
    }

    let title = '';
    let desc = '';

    if (card.type === 'monster' || card.templateId) {
      title = card.name || '怪物';
      desc = `生命: ${card.hp}/${card.maxHp}\n攻击: ${card.atk}  防御: ${card.def}`;
      if (card.keywords?.length) desc += '\n词条: ' + card.keywords.join(', ');
      if (card.description) desc += '\n' + card.description;
    } else if (card.type === 'trap') {
      title = card.name;
      desc = `生命: ${card.hp}/${card.maxHp}\n${card.description || ''}`;
    } else if (card.type === 'item') {
      title = card.name;
      desc = card.description || '';
    } else if (card.type === 'player') {
      title = card.name || '玩家';
      const stats = getTotalStats(this.gameState);
      desc = `生命: ${this.gameState.player.hp}/${stats.maxHp}\n攻击: ${stats.atk}  防御: ${stats.def}\n金币: ${this.gameState.player.gold}`;
    } else if (card.id && RELICS[card.id]) {
      title = card.name;
      desc = card.description;
    } else {
      title = card.name || '未知';
      desc = card.description || '';
    }

    this.descTitle.setText(title);
    this.descText.setText(desc);
  }

  // ========== 辅助方法 ==========
  findCardText(gridIndex, card) {
    const stackTexts = this.cardTexts[gridIndex];
    if (!stackTexts) return null;
    // 找到对应卡牌（通过cardData匹配）
    for (const txt of stackTexts) {
      if (txt && txt.cardData === card) return txt;
    }
    return null;
  }

  findPlayerText() {
    const idx = this.gameState.playerGridIndex;
    const stack = this.gameState.grid[idx];
    for (let j = 0; j < stack.length; j++) {
      if (stack[j].type === 'player') {
        return this.cardTexts[idx]?.[j];
      }
    }
    return null;
  }

  // ========== 弹窗与提示 ==========
  showToast(message) {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 + 80;
    const toast = this.add.text(cx, cy, message, {
      fontFamily: FONT.family, fontSize: '20px', color: '#f5c86a', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: toast,
      y: cy - 40,
      alpha: 0,
      duration: 1500,
      ease: 'Quad.easeOut',
      onComplete: () => toast.destroy(),
    });
  }

  showChoiceModal(title, options, callback) {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const overlay = this.add.zone(cx, cy, this.scale.width, this.scale.height).setInteractive().setDepth(300);
    overlay.on('pointerdown', () => {});

    const titleText = this.add.text(cx, cy - 80, title, {
      fontFamily: FONT.family, fontSize: '24px', color: '#f2eee7', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(302);

    const divider = this.add.text(cx, cy - 48, '━━━━━━━━━━━━━━━━━━━━', {
      fontFamily: FONT.family, fontSize: '16px', color: '#3a4045',
    }).setOrigin(0.5).setDepth(302);

    const buttons = [];
    options.forEach((opt, i) => {
      const y = cy - 20 + i * 50;
      const btn = this.add.text(cx, y, opt, {
        fontFamily: FONT.family, fontSize: '20px', color: '#74a8ff',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(302);

      btn.on('pointerover', () => btn.setColor('#f5c86a'));
      btn.on('pointerout', () => btn.setColor('#74a8ff'));
      btn.on('pointerdown', () => {
        overlay.destroy();
        divider.destroy();
        titleText.destroy();
        buttons.forEach(b => b.destroy());
        callback(i);
      });
      buttons.push(btn);
    });
  }

  createSettingsButton() {
    const btn = this.add.text(this.scale.width - 40, 40, '⚙', {
      fontFamily: FONT.family, fontSize: '28px', color: '#aeb5b6',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(50);

    btn.on('pointerover', () => btn.setColor('#f2eee7'));
    btn.on('pointerout', () => btn.setColor('#aeb5b6'));
    btn.on('pointerdown', () => this.showSettings());
  }

  showSettings() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const overlay = this.add.zone(cx, cy, this.scale.width, this.scale.height).setInteractive().setDepth(400);
    overlay.on('pointerdown', () => {});
    const title = this.add.text(cx, cy - 120, '◆ 设置', {
      fontFamily: FONT.family, fontSize: FONT.sizeLarge, color: '#f2eee7', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(402);

    const divider = this.add.text(cx, cy - 88, '━━━━━━━━━━━━━━━━━━━━', {
      fontFamily: FONT.family, fontSize: '16px', color: '#3a4045',
    }).setOrigin(0.5).setDepth(402);

    const muteText = this.add.text(cx, cy - 40, audio.muted ? '音量: 静音' : '音量: 开', {
      fontFamily: FONT.family, fontSize: FONT.sizeNormal, color: '#f2eee7',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);

    muteText.on('pointerdown', () => {
      audio.toggleMute();
      muteText.setText(audio.muted ? '音量: 静音' : '音量: 开');
    });

    const menuBtn = this.add.text(cx, cy + 20, '回到主菜单', {
      fontFamily: FONT.family, fontSize: FONT.sizeNormal, color: '#e76457',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);

    menuBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    const saveBtn = this.add.text(cx, cy + 70, '保存并退出', {
      fontFamily: FONT.family, fontSize: FONT.sizeNormal, color: '#74a8ff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);

    saveBtn.on('pointerdown', () => {
      saveGame(this.gameState);
      this.showToast('已保存');
    });

    const close = this.add.text(cx, cy + 130, '关闭', {
      fontFamily: FONT.family, fontSize: FONT.sizeNormal, color: '#f2eee7',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);

    close.on('pointerdown', () => {
      overlay.destroy();
      divider.destroy();
      title.destroy();
      muteText.destroy();
      menuBtn.destroy();
      saveBtn.destroy();
      close.destroy();
    });
  }
}
