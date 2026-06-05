import Phaser, { Scene } from 'phaser';
import { COLORS, FONT, GAME_CONFIG, getGridX, getGridY, indexToRowCol, getAdjacentIndices, hexToString } from '../config.js';
import { audio } from '../audio/AudioManager.js';
import { generateRoomCards, generateLayerRooms, generateRouteOptions } from '../core/dungeon.js';
import {
  getTotalStats, healPlayer, damagePlayer, addGold, addRelic, addItem, addSkill,
  removeCardFromGrid, getTopCard, isCellEmpty, hasMonsters, saveGame, resetTempBonuses
} from '../core/gameState.js';
import {
  resolvePlayerMonsterBattle, resolvePlayerTrapBattle, resolveTrapDestroyEffect,
  useItemOnTarget, applyAttrUp, applyFood, buyShopItem
} from '../core/battle.js';
import { getRelicChoices, RELICS } from '../data/relics.js';
import { delay, tweenShake, tweenPop, tweenFadeOut } from '../utils/tweens.js';

// 场景阶段枚举
const Phase = Object.freeze({
  IDLE: 'idle',
  BUSY: 'busy',
  MODAL: 'modal',
  TRANSITION: 'transition',
  OVER: 'over',
});

export class GameScene extends Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.gameState = data.state || null;
    this.phase = Phase.IDLE;
    this.transitionScheduled = false;
    // 拖拽状态
    this.draggedCard = null;
    this.dragOriginalIndex = -1;
    this.dragSourceTxt = null;
    this.dragGhost = null;
    this.dragTargetIndex = -1;
    // 尖刺机关标记
    this.pendingSpikeIndex = -1;
    // UI 引用
    this.cells = [];
    this.uiRefs = {};
    this.hoveredCard = null;
  }

  create() {
    if (!this.gameState) {
      this.scene.start('MenuScene');
      return;
    }
    audio.startBgm();

    this.drawBackground();
    this.buildGrid();
    this.initGrid();
    this.buildUI();
    this.buildSettingsBtn();

    // 初始揭示
    this.revealAdjacent(this.gameState.playerGridIndex);

    // 拖拽设置
    this.input.dragDistanceThreshold = 8;
    this.input.on('dragstart', (p, g) => this.onDragStart(p, g));
    this.input.on('drag', (p, g, dx, dy) => this.onDrag(p, g, dx, dy));
    this.input.on('dragend', (p, g) => this.onDragEnd(p, g));
  }

  // ── 背景 ──
  drawBackground() {
    // 背景色由 Phaser config 统一处理
  }

  // ── 九宫格构建（一次性，不重建）──
  buildGrid() {
    this.gridContainer = this.add.container(0, 0);
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 - 10;
    const { cellSize } = GAME_CONFIG;

    for (let i = 0; i < 9; i++) {
      const { row, col } = indexToRowCol(i);
      const x = getGridX(col, cx);
      const y = getGridY(row, cy);

      const bg = this.add.graphics();
      bg.fillStyle(COLORS.panel, 0.6);
      bg.fillRoundedRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 6);
      bg.lineStyle(1, COLORS.line, 0.5);
      bg.strokeRoundedRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 6);
      bg.setPosition(x, y);

      const label = this.add.text(x, y, `格${i + 1}`, {
        fontFamily: FONT.family, fontSize: '14px', color: '#3a4045',
      }).setOrigin(0.5).setAlpha(0.4);

      const mainText = this.add.text(x, y - 8, '', {
        fontFamily: FONT.family, fontSize: '20px', color: '#f2eee7', fontStyle: 'bold',
        stroke: hexToString(COLORS.ink), strokeThickness: 2,
        wordWrap: { width: cellSize - 8 }, align: 'center',
      }).setOrigin(0.5).setVisible(false);

      const subText = this.add.text(x, y + 18, '', {
        fontFamily: FONT.family, fontSize: '11px', color: '#aeb5b6',
      }).setOrigin(0.5).setVisible(false);

      const countText = this.add.text(x + cellSize / 2 - 6, y - cellSize / 2 + 6, '', {
        fontFamily: FONT.family, fontSize: '10px', color: '#8a7440',
      }).setOrigin(1, 0).setVisible(false);

      this.gridContainer.add([bg, label, mainText, subText, countText]);
      this.cells[i] = { x, y, bg, label, mainText, subText, countText };
    }
  }

  // ── 初始化格子数据 ──
  initGrid() {
    this.gameState.grid = this.gameState.grid || [];
    if (this.gameState.grid.length === 0) {
      this.enterRoom(this.gameState.currentRoom || 'reward', true);
    }
    this.refreshAllCells();
  }

  // ── 刷新单个格子 ──
  refreshCell(i) {
    const cell = this.cells[i];
    if (!cell) return;
    const stack = this.gameState.grid[i] || [];

    // 清除交互
    if (cell.mainText.input) cell.mainText.removeInteractive();

    if (stack.length === 0) {
      cell.mainText.setVisible(false);
      cell.subText.setVisible(false);
      cell.countText.setVisible(false);
      cell.label.setAlpha(0.4);
      return;
    }

    cell.label.setAlpha(0);
    const card = stack[stack.length - 1];

    if (!card.revealed) {
      cell.mainText.setText('？').setColor('#8a7440').setFontSize('28px').setVisible(true);
      cell.subText.setVisible(false);
    } else {
      cell.mainText
        .setText(this.cardDisplayText(card))
        .setColor(this.cardColor(card))
        .setFontSize('18px')
        .setVisible(true);

      const sub = this.cardSubText(card);
      if (sub) {
        cell.subText.setText(sub).setVisible(true);
      } else {
        cell.subText.setVisible(false);
      }
    }

    // 堆叠计数
    if (stack.length > 1) {
      cell.countText.setText(`x${stack.length}`).setVisible(true);
    } else {
      cell.countText.setVisible(false);
    }

    // 交互区
    this.makeCellInteractive(i, card);
  }

  makeCellInteractive(i, card) {
    const cell = this.cells[i];
    const { cellSize } = GAME_CONFIG;

    cell.mainText.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(
        -cellSize / 2, -cellSize / 2, cellSize, cellSize
      ),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    cell.mainText.cardData = card;
    cell.mainText.gridIndex = i;

    // 可拖拽判定
    const canDrag = card.type === 'player' || card.type === 'item';
    if (canDrag) this.input.setDraggable(cell.mainText);

    // 悬停事件
    cell.mainText.off('pointerover');
    cell.mainText.off('pointerout');
    cell.mainText.on('pointerover', () => {
      this.hoveredCard = card;
      this.updateDesc();
    });
    cell.mainText.on('pointerout', () => {
      this.hoveredCard = null;
      this.updateDesc();
    });
  }

  refreshAllCells() {
    for (let i = 0; i < 9; i++) this.refreshCell(i);
  }

  // ── 卡牌显示文本 ──
  cardDisplayText(card) {
    if (!card.revealed) return '？';
    switch (card.type) {
      case 'player': return '玩 家';
      case 'monster': {
        const n = card.name || '怪物';
        return n.length > 4 ? n.slice(0, 4) : n;
      }
      case 'item': return card.name || '道具';
      case 'goldCard': return '金币';
      case 'chest': return card.quality === 'blue' ? '蓝宝箱' : card.quality === 'gold' ? '金宝箱' : '宝箱';
      case 'food': return '食物';
      case 'mentor': return '导师';
      case 'attrUp': return '提升';
      case 'trap': return card.name || '机关';
      case 'shopItem': return card.name || '商品';
      default: return '？';
    }
  }

  cardColor(card) {
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

  cardSubText(card) {
    if (!card.revealed) return null;
    switch (card.type) {
      case 'monster':
        return `${card.hp}/${card.maxHp} ⚔${card.atk} 🛡${card.def}`;
      case 'trap':
        return `HP:${card.hp} ${card.description ? card.description.slice(0, 10) : ''}`;
      case 'shopItem':
        return `${card.cost}金币`;
      case 'player': {
        const s = getTotalStats(this.gameState);
        return `♥${this.gameState.player.hp} ⚔${s.atk} 🛡${s.def}`;
      }
      case 'item':
        return card.description ? card.description.slice(0, 12) : '';
      default: return null;
    }
  }

  // ═══════════════════════════════════════
  //  拖拽系统
  // ═══════════════════════════════════════

  onDragStart(pointer, gameObject) {
    if (this.phase !== Phase.IDLE) return;
    const card = gameObject.cardData;
    if (!card) return;
    if (card.type !== 'player' && card.type !== 'item') return;

    this.draggedCard = card;
    this.dragOriginalIndex = Number.isInteger(gameObject.gridIndex) ? gameObject.gridIndex : -1;
    this.dragSourceTxt = gameObject;

    audio.playDrag();

    if (this.dragGhost) this.dragGhost.destroy();
    this.dragGhost = this.add.text(pointer.x, pointer.y, this.cardDisplayText(card), {
      fontFamily: FONT.family, fontSize: '24px', color: this.cardColor(card), fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.9).setDepth(100);

    gameObject.setAlpha(0.3);
    this.highlightDragTarget(pointer.x, pointer.y);
  }

  onDrag(pointer, gameObject, dragX, dragY) {
    if (this.dragGhost) {
      this.dragGhost.setPosition(pointer.x, pointer.y);
    }
    this.highlightDragTarget(pointer.x, pointer.y);
  }

  onDragEnd(pointer, gameObject) {
    if (!this.dragGhost || !this.draggedCard) {
      this.cleanupDrag();
      return;
    }

    const card = this.draggedCard;
    const fromIndex = this.dragOriginalIndex;
    const toIndex = this.getGridIndexAt(pointer.x, pointer.y);
    const valid = this.isValidDrop(card, fromIndex, toIndex);
    const message = this.getDropMessage(card, fromIndex, toIndex);

    this.cleanupDrag();

    if (valid && toIndex >= 0) {
      audio.playDrop();
      this.phase = Phase.BUSY;
      this.processDrop(card, fromIndex, toIndex).then(() => {
        if (this.phase === Phase.BUSY) this.phase = Phase.IDLE;
      }).catch(err => {
        console.error('[GameScene] drop error:', err);
        if (this.phase === Phase.BUSY) this.phase = Phase.IDLE;
      });
    } else if (message) {
      this.showToast(message);
    }
  }

  cleanupDrag() {
    if (this.dragGhost) { this.dragGhost.destroy(); this.dragGhost = null; }
    if (this.dragSourceTxt?.active) this.dragSourceTxt.setAlpha(1);
    this.clearDragHighlight();
    this.draggedCard = null;
    this.dragOriginalIndex = -1;
    this.dragSourceTxt = null;
  }

  getGridIndexAt(x, y) {
    const half = GAME_CONFIG.cellSize / 2;
    for (let i = 0; i < 9; i++) {
      const c = this.cells[i];
      if (Math.abs(x - c.x) <= half && Math.abs(y - c.y) <= half) return i;
    }
    return -1;
  }

  highlightDragTarget(x, y) {
    if (!this.draggedCard) return;
    const ti = this.getGridIndexAt(x, y);
    if (ti !== this.dragTargetIndex) {
      this.clearDragHighlight();
      this.dragTargetIndex = ti;
    }
    if (ti < 0) return;
    const valid = this.isValidDrop(this.draggedCard, this.dragOriginalIndex, ti);
    const cell = this.cells[ti];
    cell.bg.clear();
    cell.bg.fillStyle(valid ? 0xf5c86a : 0xe76457, 0.2);
    cell.bg.fillRoundedRect(
      cell.x - GAME_CONFIG.cellSize / 2, cell.y - GAME_CONFIG.cellSize / 2,
      GAME_CONFIG.cellSize, GAME_CONFIG.cellSize, 6
    );
    if (this.dragGhost) this.dragGhost.setAlpha(valid ? 0.95 : 0.5);
  }

  clearDragHighlight() {
    if (this.dragTargetIndex >= 0 && this.cells[this.dragTargetIndex]) {
      const cell = this.cells[this.dragTargetIndex];
      cell.bg.clear();
      cell.bg.fillStyle(COLORS.panel, 0.6);
      cell.bg.fillRoundedRect(
        cell.x - GAME_CONFIG.cellSize / 2, cell.y - GAME_CONFIG.cellSize / 2,
        GAME_CONFIG.cellSize, GAME_CONFIG.cellSize, 6
      );
      cell.bg.lineStyle(1, COLORS.line, 0.5);
      cell.bg.strokeRoundedRect(
        cell.x - GAME_CONFIG.cellSize / 2, cell.y - GAME_CONFIG.cellSize / 2,
        GAME_CONFIG.cellSize, GAME_CONFIG.cellSize, 6
      );
    }
    this.dragTargetIndex = -1;
  }

  isValidDrop(card, from, to) {
    if (!card || to < 0 || this.gameState.gameOver) return false;

    if (card.type === 'player') {
      if (to === from) return false;
      if (isCellEmpty(this.gameState, to)) return true;
      const tc = getTopCard(this.gameState, to);
      return tc?.revealed === true;
    }

    if (card.type === 'item') {
      // 场上道具拖回自己位置或空格 = 收集
      if (from >= 0 && from < 9 && (to === from || isCellEmpty(this.gameState, to))) {
        return this.gameState.player.items.length < 4;
      }
      const tc = getTopCard(this.gameState, to);
      if (!tc?.revealed) return false;
      return this.canUseItemOn(card, tc);
    }

    return false;
  }

  getDropMessage(card, from, to) {
    if (to < 0) return '';
    if (card.type === 'player') {
      if (to === from) return '';
      const tc = getTopCard(this.gameState, to);
      if (tc && !tc.revealed) return '目标尚未揭示';
      return '无法移动到此';
    }
    if (card.type === 'item') {
      if (from >= 0 && from < 9 && (to === from || isCellEmpty(this.gameState, to))) {
        return this.gameState.player.items.length >= 4 ? '道具栏已满' : '';
      }
      const tc = getTopCard(this.gameState, to);
      if (!tc?.revealed) return '目标尚未揭示';
      if (!this.canUseItemOn(card, tc)) return '无法对此目标使用';
    }
    return '';
  }

  canUseItemOn(item, target) {
    if (!item || !target) return false;
    switch (item.effect) {
      case 'heal': case 'shield': case 'doubleAtk':
        return target.type === 'player';
      case 'damage':
        return target.type === 'monster';
      default:
        return false;
    }
  }

  // ═══════════════════════════════════════
  //  拖放处理
  // ═══════════════════════════════════════

  async processDrop(card, from, to) {
    try {
      if (card.type === 'player') {
        if (isCellEmpty(this.gameState, to)) {
          await this.movePlayer(to);
        } else {
          await this.interactWithCard(to);
        }
        this.afterPlayerAction();
      } else if (card.type === 'item') {
        if (from >= 0 && from < 9 && (to === from || isCellEmpty(this.gameState, to))) {
          this.collectItem(card, from);
        } else {
          await this.useItem(card, to, from);
        }
      }
    } catch (e) {
      console.error('[GameScene] processDrop error:', e);
    } finally {
      this.updateUI();
      this.checkRoomClear();
      this.checkGameOver();
    }
  }

  async movePlayer(toIndex) {
    const fromIndex = this.gameState.playerGridIndex;
    const stack = this.gameState.grid[fromIndex];
    const pi = stack.findIndex(c => c.type === 'player');
    if (pi >= 0) {
      const pc = stack.splice(pi, 1)[0];
      this.gameState.grid[toIndex].push(pc);
      this.gameState.playerGridIndex = toIndex;
    }
    audio.playStep();
    this.refreshCell(fromIndex);
    this.refreshCell(toIndex);
    this.revealAdjacent(toIndex);
  }

  async interactWithCard(gridIndex) {
    const card = getTopCard(this.gameState, gridIndex);
    if (!card) return;

    switch (card.type) {
      case 'monster': await this.fightMonster(gridIndex); break;
      case 'trap': await this.interactTrap(gridIndex); break;
      case 'goldCard': this.collectGold(card, gridIndex); break;
      case 'chest': this.openChest(card, gridIndex); break;
      case 'food': this.eatFood(card, gridIndex); break;
      case 'mentor': this.learnSkill(card, gridIndex); break;
      case 'attrUp': this.chooseAttrUp(card, gridIndex); break;
      case 'shopItem': this.buyShopItemCard(card, gridIndex); break;
      case 'item': this.collectItem(card, gridIndex); break;
    }
  }

  // ═══════════════════════════════════════
  //  战斗
  // ═══════════════════════════════════════

  async fightMonster(gridIndex) {
    const stack = this.gameState.grid[gridIndex];
    const monster = stack[stack.length - 1];
    if (!monster || monster.type !== 'monster') return;

    const results = resolvePlayerMonsterBattle(this.gameState, monster);

    // 动画
    const txt = this.cells[gridIndex]?.mainText;
    if (txt) { await tweenShake(this, txt, 5, 120); await tweenPop(this, txt, 80); }

    let monsterDied = false;
    for (const r of results) {
      if (r.type === 'playerAttack') {
        audio.playAttack();
        await delay(this, 60);
      } else if (r.type === 'monsterAttack') {
        audio.playHit();
        const pt = this.findPlayerText();
        if (pt) await tweenShake(this, pt, 6, 120);
        await delay(this, 60);
      } else if (r.type === 'thorns') {
        audio.playAttack();
        await delay(this, 40);
      } else if (r.type === 'monsterDie') {
        audio.playVictory();
        monsterDied = true;
        if (txt) await tweenFadeOut(this, txt, 160);
        const idx = stack.findIndex(c => c === monster);
        if (idx >= 0) {
          const rem = removeCardFromGrid(this.gameState, gridIndex, idx);
          this.refreshCell(gridIndex);
          if (rem.revealed) await this.handleRevealEffect(rem.revealed, gridIndex);
        }
      }
    }

    // 如果怪物没死，刷新显示更新血量
    if (!monsterDied && stack.includes(monster)) {
      this.refreshCell(gridIndex);
    }

    this.updateUI();
    this.checkRoomClear();
    this.checkGameOver();
  }

  async interactTrap(gridIndex) {
    const stack = this.gameState.grid[gridIndex];
    const trap = stack[stack.length - 1];
    if (!trap || trap.type !== 'trap') return;

    const results = resolvePlayerTrapBattle(this.gameState, trap);

    const txt = this.cells[gridIndex]?.mainText;
    if (txt) await tweenShake(this, txt, 5, 120);

    let trapDestroyed = false;
    for (const r of results) {
      if (r.type === 'trapAttack') {
        audio.playHit();
        const pt = this.findPlayerText();
        if (pt) await tweenShake(this, pt, 6, 120);
      } else if (r.type === 'trapDestroy') {
        trapDestroyed = true;
        audio.playTrapTrigger();
        if (txt) await tweenFadeOut(this, txt, 160);
        const idx = stack.findIndex(c => c === trap);
        if (idx >= 0) {
          const rem = removeCardFromGrid(this.gameState, gridIndex, idx);
          this.refreshCell(gridIndex);
          // 处理机关摧毁效果
          const effects = resolveTrapDestroyEffect(this.gameState, trap, gridIndex);
          for (const eff of effects) {
            if (eff.type === 'trapEffect') {
              // 检查被机关效果击杀的怪物
              const targetStack = this.gameState.grid[eff.targetIndex];
              const topCard = targetStack?.[targetStack.length - 1];
              if (topCard?.type === 'monster' && topCard.hp <= 0) {
                const ci = targetStack.indexOf(topCard);
                if (ci >= 0) {
                  removeCardFromGrid(this.gameState, eff.targetIndex, ci);
                  addGold(this.gameState, 10);
                  this.gameState.player.killCount++;
                  this.gameState.totalKills++;
                }
              }
              this.refreshCell(eff.targetIndex);
            } else if (eff.type === 'teleportTrigger') {
              await this.handleTeleport();
            }
          }
          if (rem.revealed) await this.handleRevealEffect(rem.revealed, gridIndex);
        }
      }
    }

    if (!trapDestroyed) {
      this.refreshCell(gridIndex);
    }

    this.updateUI();
    this.checkRoomClear();
    this.checkGameOver();
  }

  async handleTeleport() {
    const allCards = [];
    for (let i = 0; i < 9; i++) {
      if (i === this.gameState.playerGridIndex) continue;
      const stack = this.gameState.grid[i];
      while (stack.length > 0) {
        const c = stack.pop();
        c.revealed = false;
        allCards.push(c);
      }
    }
    shuffleArr(allCards);

    // 玩家随机移到非当前位置的安全格
    const available = [0, 1, 2, 3, 4, 5, 6, 8].filter(
      idx => idx !== this.gameState.playerGridIndex
    );
    const newPlayerIdx = available[Math.floor(Math.random() * available.length)];
    const ps = this.gameState.grid[this.gameState.playerGridIndex];
    const pi = ps.findIndex(c => c.type === 'player');
    if (pi >= 0) {
      const pc = ps.splice(pi, 1)[0];
      this.gameState.grid[newPlayerIdx].push(pc);
      this.gameState.playerGridIndex = newPlayerIdx;
    }

    // 重新分布：轮转放置，每格最多3张
    const targetIndices = [];
    for (let i = 0; i < 9; i++) {
      if (i !== newPlayerIdx) targetIndices.push(i);
    }
    let ptr = 0;
    for (const card of allCards) {
      // 找下一个没满的格
      let placed = false;
      for (let attempt = 0; attempt < targetIndices.length; attempt++) {
        const idx = targetIndices[ptr % targetIndices.length];
        ptr++;
        if (this.gameState.grid[idx].length < 3) {
          this.gameState.grid[idx].push(card);
          placed = true;
          break;
        }
      }
      if (!placed) {
        // 溢出：放到任意非玩家格
        for (const idx of targetIndices) {
          this.gameState.grid[idx].push(card);
          break;
        }
      }
    }

    audio.playTrapTrigger();
    this.refreshAllCells();
    this.revealAdjacent(newPlayerIdx);
  }

  async handleRevealEffect(card, gridIndex) {
    // 伏击者骷髅：翻开时若玩家相邻则自动攻击
    if (card.type === 'monster' && card.templateId === 'ambusherSkeleton') {
      const adj = getAdjacentIndices(gridIndex);
      if (adj.includes(this.gameState.playerGridIndex)) {
        await this.fightMonster(gridIndex);
      }
    }
  }

  // ═══════════════════════════════════════
  //  拾取与使用
  // ═══════════════════════════════════════

  collectGold(card, gridIndex) {
    addGold(this.gameState, card.value || 20);
    audio.playPickUp();
    const stack = this.gameState.grid[gridIndex];
    const idx = stack.indexOf(card);
    if (idx >= 0) removeCardFromGrid(this.gameState, gridIndex, idx);
    this.refreshCell(gridIndex);
    this.updateUI();
    this.checkRoomClear();
  }

  openChest(card, gridIndex) {
    const stack = this.gameState.grid[gridIndex];
    const idx = stack.indexOf(card);
    if (idx >= 0) removeCardFromGrid(this.gameState, gridIndex, idx);
    this.refreshCell(gridIndex);

    const choices = getRelicChoices();
    this.phase = Phase.MODAL;
    this.showChoiceModal('选择一个遗物', choices.map(c => ({
      label: c.name,
      desc: c.description,
    })), (choiceIdx) => {
      this.phase = Phase.IDLE;
      const relic = choices[choiceIdx];
      if (relic) {
        addRelic(this.gameState, relic);
        audio.playPickUp();
      }
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
    this.refreshCell(gridIndex);
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
          this.refreshCell(i);
        }
      }
    }
    const stack = this.gameState.grid[gridIndex];
    const idx = stack.indexOf(card);
    if (idx >= 0) removeCardFromGrid(this.gameState, gridIndex, idx);
    this.refreshCell(gridIndex);
    this.updateUI();
    this.checkRoomClear();
  }

  chooseAttrUp(card, gridIndex) {
    this.phase = Phase.MODAL;
    this.showChoiceModal('选择属性提升', [
      { label: '攻击+1', desc: '提升攻击力' },
      { label: '防御+1', desc: '提升防御力' },
      { label: '生命+2', desc: '提升最大生命' },
    ], (choiceIdx) => {
      this.phase = Phase.IDLE;
      const choices = ['atk', 'def', 'hp'];
      applyAttrUp(this.gameState, choices[choiceIdx]);
      audio.playPickUp();
      const stack = this.gameState.grid[gridIndex];
      const idx = stack.indexOf(card);
      if (idx >= 0) removeCardFromGrid(this.gameState, gridIndex, idx);
      this.refreshCell(gridIndex);
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
      this.refreshCell(gridIndex);
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
      this.refreshCell(gridIndex);
      this.updateUI();
      this.checkRoomClear();
    } else {
      this.showToast('道具栏已满！');
    }
  }

  async useItem(item, targetIndex, fromIndex) {
    const targetCard = getTopCard(this.gameState, targetIndex);
    if (!targetCard) return;

    const resolvedTarget = targetCard.type === 'player' ? 'player' : targetCard;
    const results = useItemOnTarget(this.gameState, item, resolvedTarget);

    if (results.length === 0) {
      this.showToast('无法使用');
      return;
    }

    // 移除道具
    if (fromIndex >= 0 && fromIndex < 9) {
      const stack = this.gameState.grid[fromIndex];
      const idx = stack.indexOf(item);
      if (idx >= 0) removeCardFromGrid(this.gameState, fromIndex, idx);
      this.refreshCell(fromIndex);
    } else {
      const iidx = this.gameState.player.items.indexOf(item);
      if (iidx >= 0) this.gameState.player.items.splice(iidx, 1);
    }

    for (const r of results) {
      if (r.type === 'itemDamage') {
        audio.playAttack();
        const ct = this.cells[targetIndex]?.mainText;
        if (ct) await tweenShake(this, ct, 6, 200);
        // 检查怪物是否死亡
        if (targetCard.type === 'monster' && targetCard.hp <= 0) {
          audio.playVictory();
          const stack = this.gameState.grid[targetIndex];
          const tidx = stack.findIndex(c => c === targetCard);
          if (tidx >= 0) {
            const rem = removeCardFromGrid(this.gameState, targetIndex, tidx);
            this.refreshCell(targetIndex);
            if (rem.revealed) await this.handleRevealEffect(rem.revealed, targetIndex);
          }
          // 飞刀击杀也给金币
          addGold(this.gameState, 10);
          this.gameState.player.killCount++;
          this.gameState.totalKills++;
        }
      } else if (r.type === 'heal') {
        audio.playHeal();
      } else if (r.type === 'shield' || r.type === 'doubleAtk') {
        audio.playPickUp();
      }
    }

    this.refreshCell(targetIndex);
    this.updateUI();
    this.checkRoomClear();
  }

  // ═══════════════════════════════════════
  //  视野揭示
  // ═══════════════════════════════════════

  revealAdjacent(playerIndex) {
    const adj = getAdjacentIndices(playerIndex);
    for (const idx of adj) {
      const stack = this.gameState.grid[idx];
      if (stack && stack.length > 0) {
        const top = stack[stack.length - 1];
        if (!top.revealed) {
          top.revealed = true;
          audio.playFlipCard();
          this.refreshCell(idx);
          // 伏击效果（异步但不阻塞）
          if (top.type === 'monster' && top.templateId === 'ambusherSkeleton') {
            const adjOfCard = getAdjacentIndices(idx);
            if (adjOfCard.includes(this.gameState.playerGridIndex)) {
              this.fightMonster(idx).catch(err => {
                console.error('[GameScene] ambusher fight error:', err);
                if (this.phase === Phase.BUSY) this.phase = Phase.IDLE;
              });
            }
          }
          // 尖刺机关标记
          if (top.type === 'trap' && top.templateId === 'spike') {
            this.pendingSpikeIndex = idx;
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════
  //  回合管理
  // ═══════════════════════════════════════

  afterPlayerAction() {
    this.gameState.actionCount++;

    // 追踪者骷髅
    this.processTrackers();

    // 尖刺机关
    this.processSpikeTraps();

    this.updateUI();
    this.checkGameOver();
  }

  processTrackers() {
    for (let i = 0; i < 9; i++) {
      const stack = this.gameState.grid[i];
      const top = stack?.[stack.length - 1];
      if (top?.type === 'monster' && top.templateId === 'trackerSkeleton' && top.revealed) {
        top.aggressiveCounter = (top.aggressiveCounter || 0) + 1;
        if (top.aggressiveCounter >= 3) {
          top.aggressiveCounter = 0;
          this.moveTrackerTowardPlayer(top, i);
        }
      }
    }
  }

  moveTrackerTowardPlayer(monster, gridIndex) {
    const adj = getAdjacentIndices(gridIndex);
    const playerIdx = this.gameState.playerGridIndex;
    const { row: pr, col: pc } = indexToRowCol(playerIdx);

    let best = -1;
    let bestDist = Infinity;

    for (const idx of adj) {
      if (idx === playerIdx) {
        // 直接战斗
        this.phase = Phase.BUSY;
        this.fightMonster(gridIndex).then(() => {
          if (this.phase === Phase.BUSY) this.phase = Phase.IDLE;
          this.checkRoomClear();
          this.checkGameOver();
        }).catch(err => {
          console.error('[GameScene] tracker fight error:', err);
          if (this.phase === Phase.BUSY) this.phase = Phase.IDLE;
        });
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
      const mi = stack.findIndex(c => c === monster);
      if (mi >= 0) {
        stack.splice(mi, 1);
        this.gameState.grid[best].push(monster);
        this.refreshCell(gridIndex);
        this.refreshCell(best);
        this.revealAdjacent(best);
      }
    }
  }

  processSpikeTraps() {
    if (this.pendingSpikeIndex < 0) return;
    const idx = this.pendingSpikeIndex;
    this.pendingSpikeIndex = -1;

    const stack = this.gameState.grid[idx];
    const trap = stack?.[stack.length - 1];
    if (!trap || trap.type !== 'trap' || trap.templateId !== 'spike' || trap.triggered) return;

    trap.triggered = true;
    const adj = getAdjacentIndices(idx);

    for (const ai of adj) {
      const s = this.gameState.grid[ai];
      const c = s?.[s.length - 1];
      if (c?.type === 'monster') {
        c.hp -= 6;
        const ct = this.cells[ai]?.mainText;
        if (ct) tweenShake(this, ct, 5, 150);
        if (c.hp <= 0) {
          const ci = s.indexOf(c);
          if (ci >= 0) {
            removeCardFromGrid(this.gameState, ai, ci);
            addGold(this.gameState, 10);
            this.gameState.player.killCount++;
            this.gameState.totalKills++;
          }
        }
        this.refreshCell(ai);
      } else if (c?.type === 'player') {
        damagePlayer(this.gameState, 6);
        const pt = this.findPlayerText();
        if (pt) tweenShake(this, pt, 6, 150);
      }
    }

    audio.playTrapTrigger();
    this.updateUI();
    this.checkRoomClear();
    this.checkGameOver();
  }

  // ═══════════════════════════════════════
  //  房间清理与过渡
  // ═══════════════════════════════════════

  checkRoomClear() {
    if (this.transitionScheduled) return;
    if (hasMonsters(this.gameState)) return;

    this.transitionScheduled = true;
    this.phase = Phase.TRANSITION;

    // 房间清理奖励
    this.gameState.totalRooms++;
    if (this.gameState.player.skills.toughSkin) {
      healPlayer(this.gameState, 10);
    }
    resetTempBonuses(this.gameState);

    this.showToast('房间清理完成！');
    audio.playVictory();
    this.updateUI();

    this.time.delayedCall(1200, () => this.goToRouteSelect());
  }

  goToRouteSelect() {
    const node = this.gameState.nodeIndex;

    if (node === 7) {
      // 餐厅后 → 层主
      this.enterNextNode('boss');
    } else if (node === 8) {
      // 层主战后
      if (this.gameState.layer >= 3) {
        this.gameState.victory = true;
        this.scene.start('GameOverScene', { state: this.gameState });
      } else {
        this.gameState.layer++;
        this.gameState.nodeIndex = 0;
        this.gameState.layerNodes = generateLayerRooms(this.gameState.layer);
        this.transitionScheduled = false;
        this.phase = Phase.IDLE;
        this.enterRoom(this.gameState.layerNodes[0]);
      }
    } else {
      const options = generateRouteOptions(node);
      this.scene.start('RoomSelectScene', {
        state: this.gameState,
        options,
      });
    }
  }

  enterRoom(roomType, skipRefresh = false) {
    this.gameState.currentRoom = roomType;
    this.gameState.grid = generateRoomCards(
      roomType, this.gameState.nodeIndex, this.gameState.layer, this.gameState.player
    );
    this.gameState.playerGridIndex = 7;
    this.gameState.actionCount = 0;
    this.pendingSpikeIndex = -1;
    resetTempBonuses(this.gameState);

    if (!skipRefresh) {
      this.refreshAllCells();
      this.revealAdjacent(7);
    }
  }

  enterNextNode(roomType) {
    this.gameState.nodeIndex++;
    this.transitionScheduled = false;
    this.phase = Phase.IDLE;
    this.enterRoom(roomType);
  }

  checkGameOver() {
    if (!this.gameState.gameOver) return;
    if (this.transitionScheduled) return;

    this.transitionScheduled = true;
    this.phase = Phase.OVER;

    this.time.delayedCall(800, () => {
      audio.playDefeat();
      this.scene.start('GameOverScene', { state: this.gameState });
    });
  }

  // ═══════════════════════════════════════
  //  UI 渲染（增量更新）
  // ═══════════════════════════════════════

  buildUI() {
    this.uiContainer = this.add.container(0, 0);
    this.renderPlayerInfo();
    this.renderDescPanel();
    this.renderRelicsPanel();
    this.renderItemsPanel();
    this.renderLayerInfo();
  }

  renderPlayerInfo() {
    if (this.uiRefs.playerGroup) {
      this.uiRefs.playerGroup.forEach(t => t.destroy());
    }
    this.uiRefs.playerGroup = [];

    const x = 20, y = 60;
    const s = getTotalStats(this.gameState);
    const p = this.gameState.player;

    const lines = [
      { text: '◆ 玩家', color: '#52c6b8', size: '18px', bold: true },
      { text: `  ${p.name}`, color: '#52c6b8', size: '16px' },
      { text: `  生命: ${p.hp} / ${s.maxHp}`, color: hpColor(p.hp, s.maxHp) },
      { text: `  攻击: ${s.atk}`, color: '#f2eee7' },
      { text: `  防御: ${s.def}`, color: '#f2eee7' },
      { text: `  金币: ${p.gold}`, color: '#f5c86a' },
    ];

    if (p.shield > 0) lines.push({ text: '  [护盾]', color: '#74a8ff', size: '13px' });
    if (p.skills.thorns) lines.push({ text: '  [刺皮]', color: '#9b72cf', size: '13px' });
    if (p.skills.toughSkin) lines.push({ text: '  [硬皮]', color: '#9b72cf', size: '13px' });
    if (p.skills.veteran) lines.push({ text: `  [历战 +${p.tempAtkBonus}]`, color: '#9b72cf', size: '13px' });

    lines.forEach((l, i) => {
      const t = this.add.text(x, y + i * 24, l.text, {
        fontFamily: FONT.family, fontSize: l.size || '14px',
        color: l.color, fontStyle: l.bold ? 'bold' : 'normal',
      }).setOrigin(0, 0);
      this.uiContainer.add(t);
      this.uiRefs.playerGroup.push(t);
    });
  }

  renderDescPanel() {
    if (!this.uiRefs.descBuilt) {
      this.uiRefs.descBuilt = true;
      const x = 20, y = 380;

      this.uiRefs.descTitle_label = this.add.text(x, y, '◆ 描述', {
        fontFamily: FONT.family, fontSize: '16px', color: '#f2eee7', fontStyle: 'bold',
      }).setOrigin(0, 0);
      this.uiContainer.add(this.uiRefs.descTitle_label);

      this.uiRefs.descName = this.add.text(x, y + 28, '', {
        fontFamily: FONT.family, fontSize: '14px', color: '#f2eee7', fontStyle: 'bold',
      }).setOrigin(0, 0);
      this.uiContainer.add(this.uiRefs.descName);

      this.uiRefs.descBody = this.add.text(x, y + 50, '指向卡牌查看详情', {
        fontFamily: FONT.family, fontSize: '13px', color: '#aeb5b6',
        wordWrap: { width: 200 }, lineSpacing: 4,
      }).setOrigin(0, 0);
      this.uiContainer.add(this.uiRefs.descBody);
    }
  }

  renderRelicsPanel() {
    if (this.uiRefs.relicGroup) {
      this.uiRefs.relicGroup.forEach(t => t.destroy());
    }
    this.uiRefs.relicGroup = [];

    const x = this.scale.width - 220, y = 60;

    const title = this.add.text(x, y, '◆ 遗物', {
      fontFamily: FONT.family, fontSize: '16px', color: '#9b72cf', fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.uiContainer.add(title);
    this.uiRefs.relicGroup.push(title);

    this.gameState.player.relics.forEach((relicId, i) => {
      const relic = RELICS[relicId];
      if (!relic) return;
      const t = this.add.text(x, y + 28 + i * 28, relic.name, {
        fontFamily: FONT.family, fontSize: '13px', color: '#9b72cf',
      }).setOrigin(0, 0).setInteractive({ useHandCursor: true });

      t.on('pointerover', () => { this.hoveredCard = relic; this.updateDesc(); });
      t.on('pointerout', () => { this.hoveredCard = null; this.updateDesc(); });

      this.uiContainer.add(t);
      this.uiRefs.relicGroup.push(t);
    });
  }

  renderItemsPanel() {
    if (this.uiRefs.itemGroup) {
      this.uiRefs.itemGroup.forEach(t => t.destroy());
    }
    this.uiRefs.itemGroup = [];

    const x = this.scale.width - 220, y = 340;

    const title = this.add.text(x, y, '◆ 道具', {
      fontFamily: FONT.family, fontSize: '16px', color: '#74a8ff', fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.uiContainer.add(title);
    this.uiRefs.itemGroup.push(title);

    this.gameState.player.items.forEach((item, i) => {
      const t = this.add.text(x, y + 28 + i * 28, item.name, {
        fontFamily: FONT.family, fontSize: '13px', color: '#74a8ff',
      }).setOrigin(0, 0).setInteractive({
        hitArea: new Phaser.Geom.Rectangle(0, 0, 190, 24),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });

      t.cardData = item;
      t.gridIndex = -1;
      t.itemIndex = i;
      this.input.setDraggable(t);

      t.on('pointerover', () => { this.hoveredCard = item; this.updateDesc(); });
      t.on('pointerout', () => { this.hoveredCard = null; this.updateDesc(); });

      this.uiContainer.add(t);
      this.uiRefs.itemGroup.push(t);
    });
  }

  renderLayerInfo() {
    if (this.uiRefs.layerText) this.uiRefs.layerText.destroy();

    const cx = this.scale.width / 2;
    const nodeLabel = this.gameState.nodeIndex < 9
      ? `节点 ${this.gameState.nodeIndex + 1}/9`
      : '';
    this.uiRefs.layerText = this.add.text(cx, 12, `第 ${this.gameState.layer} 层  ${nodeLabel}`, {
      fontFamily: FONT.family, fontSize: '15px', color: '#aeb5b6',
    }).setOrigin(0.5, 0);
    this.uiContainer.add(this.uiRefs.layerText);
  }

  updateUI() {
    this.renderPlayerInfo();
    this.renderRelicsPanel();
    this.renderItemsPanel();
    this.renderLayerInfo();
    this.updateDesc();
    // 刷新玩家格的子文本
    const pi = this.gameState.playerGridIndex;
    if (this.cells[pi]) this.refreshCell(pi);
  }

  updateDesc() {
    const { descName, descBody } = this.uiRefs;
    if (!descName || !descBody) return;
    const card = this.hoveredCard;

    if (!card) {
      descName.setText('');
      descBody.setText('指向卡牌查看详情');
      return;
    }

    let name = '', body = '';

    if (card.type === 'monster') {
      name = card.name || '怪物';
      body = `生命: ${card.hp}/${card.maxHp}  攻击: ${card.atk}  防御: ${card.def}`;
      if (card.keywords?.length) body += '\n词条: ' + card.keywords.join(', ');
      if (card.description) body += '\n' + card.description;
    } else if (card.type === 'trap') {
      name = card.name;
      body = `生命: ${card.hp}/${card.maxHp}\n${card.description || ''}`;
    } else if (card.type === 'item') {
      name = card.name;
      body = card.description || '';
    } else if (card.type === 'player') {
      name = card.name || '玩家';
      const s = getTotalStats(this.gameState);
      body = `生命: ${this.gameState.player.hp}/${s.maxHp}\n攻击: ${s.atk}  防御: ${s.def}\n金币: ${this.gameState.player.gold}`;
    } else if (card.id && RELICS[card.id]) {
      name = card.name;
      body = card.description || '';
    } else {
      name = card.name || '未知';
      body = card.description || '';
    }

    descName.setText(name);
    descBody.setText(body);
  }

  // ═══════════════════════════════════════
  //  辅助方法
  // ═══════════════════════════════════════

  findPlayerText() {
    const idx = this.gameState.playerGridIndex;
    const stack = this.gameState.grid[idx];
    for (let j = 0; j < stack.length; j++) {
      if (stack[j].type === 'player') return this.cells[idx]?.mainText;
    }
    return null;
  }

  // ═══════════════════════════════════════
  //  弹窗与提示
  // ═══════════════════════════════════════

  showToast(message) {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 + 90;
    const toast = this.add.text(cx, cy, message, {
      fontFamily: FONT.family, fontSize: '18px', color: '#f5c86a', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: toast, y: cy - 40, alpha: 0,
      duration: 1500, ease: 'Quad.easeOut',
      onComplete: () => toast.destroy(),
    });
  }

  showChoiceModal(title, options, callback) {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const elements = [];

    const overlay = this.add.zone(cx, cy, this.scale.width, this.scale.height)
      .setInteractive().setDepth(300);
    overlay.on('pointerdown', () => {});
    elements.push(overlay);

    // 背景面板
    const panelBg = this.add.graphics();
    panelBg.fillStyle(COLORS.panelSoft, 0.95);
    panelBg.fillRoundedRect(cx - 200, cy - 100, 400, 50 + options.length * 56, 10);
    panelBg.setDepth(301);
    elements.push(panelBg);

    const titleText = this.add.text(cx, cy - 80, title, {
      fontFamily: FONT.family, fontSize: '20px', color: '#f2eee7', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(302);
    elements.push(titleText);

    options.forEach((opt, i) => {
      const y = cy - 40 + i * 56;
      const label = typeof opt === 'string' ? opt : opt.label;
      const desc = typeof opt === 'object' ? opt.desc : '';

      const btn = this.add.text(cx, y, label, {
        fontFamily: FONT.family, fontSize: '18px', color: '#74a8ff',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(302);

      if (desc) {
        const descTxt = this.add.text(cx, y + 20, desc, {
          fontFamily: FONT.family, fontSize: '12px', color: '#aeb5b6',
        }).setOrigin(0.5).setDepth(302);
        elements.push(descTxt);
      }

      btn.on('pointerover', () => btn.setColor('#f5c86a'));
      btn.on('pointerout', () => btn.setColor('#74a8ff'));
      btn.on('pointerdown', () => {
        elements.forEach(e => e.destroy());
        callback(i);
      });
      elements.push(btn);
    });
  }

  // ── 设置 ──
  buildSettingsBtn() {
    const btn = this.add.text(this.scale.width - 40, 40, '⚙', {
      fontFamily: FONT.family, fontSize: '28px', color: '#aeb5b6',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(50);

    btn.on('pointerover', () => btn.setColor('#f2eee7'));
    btn.on('pointerout', () => btn.setColor('#aeb5b6'));
    btn.on('pointerdown', () => this.showSettings());
  }

  showSettings() {
    const cx = this.scale.width / 2, cy = this.scale.height / 2;
    const els = [];

    const overlay = this.add.zone(cx, cy, this.scale.width, this.scale.height)
      .setInteractive().setDepth(400);
    overlay.on('pointerdown', () => {});
    els.push(overlay);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(COLORS.panelSoft, 0.95);
    panelBg.fillRoundedRect(cx - 160, cy - 130, 320, 310, 10);
    panelBg.setDepth(401);
    els.push(panelBg);

    els.push(this.add.text(cx, cy - 110, '◆ 设置', {
      fontFamily: FONT.family, fontSize: '22px', color: '#f2eee7', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(402));

    const muteText = this.add.text(cx, cy - 50, audio.muted ? '音量: 静音' : '音量: 开', {
      fontFamily: FONT.family, fontSize: '18px', color: '#f2eee7',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);

    muteText.on('pointerdown', () => {
      audio.toggleMute();
      muteText.setText(audio.muted ? '音量: 静音' : '音量: 开');
    });
    els.push(muteText);

    const menuBtn = this.add.text(cx, cy + 10, '回到主菜单', {
      fontFamily: FONT.family, fontSize: '18px', color: '#e76457',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    els.push(menuBtn);

    const saveBtn = this.add.text(cx, cy + 60, '保存并退出', {
      fontFamily: FONT.family, fontSize: '18px', color: '#74a8ff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);
    saveBtn.on('pointerdown', () => {
      saveGame(this.gameState);
      this.showToast('已保存');
    });
    els.push(saveBtn);

    const close = this.add.text(cx, cy + 120, '关闭', {
      fontFamily: FONT.family, fontSize: '18px', color: '#f2eee7',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(402);
    close.on('pointerdown', () => els.forEach(e => e.destroy()));
    els.push(close);
  }
}

// ── 局部工具函数 ──

function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function hpColor(hp, maxHp) {
  const ratio = hp / maxHp;
  if (ratio > 0.6) return '#7ec86a';
  if (ratio > 0.3) return '#f5c86a';
  return '#e76457';
}
