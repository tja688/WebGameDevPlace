// ============================================================
// 深入地牢 - 地图场景：楼层节点选择
// ============================================================
import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, ROOM_TYPES, ROOM_NAMES,
  NODE_FIXED, MAP_NODES
} from '../constants.js';
import { GameState } from '../GameState.js';

export class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
    this.nodeButtons = [];
    this.currentChoices = [];
  }

  init() {
    this.nodeButtons = [];
    this.currentChoices = [];
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(300);

    // 顶部信息栏
    this.add.text(width / 2, 30, `第 ${GameState.floor} 层`, {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: COLORS.textGold,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 玩家状态摘要
    const p = GameState.player;
    this.add.text(30, 20, `${p.className}`, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: COLORS.textWhite,
    });
    this.add.text(30, 42, `HP:${p.hp}/${p.maxHp}  ATK:${p.baseAtk}  DEF:${p.baseDef}  金币:${GameState.gold}`, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: COLORS.textGray,
    });

    // 绘制节点路径
    this.drawNodePath(width, height);

    // 显示当前可选的房间
    this.showRoomChoices();
  }

  drawNodePath(width, height) {
    const mapAreaY = 90;
    const mapAreaH = height - 200;

    // 绘制连接线
    for (let i = 0; i < MAP_NODES.length - 1; i++) {
      const n1 = MAP_NODES[i];
      const n2 = MAP_NODES[i + 1];
      const x1 = n1.x * width;
      const y1 = mapAreaY + n1.y * mapAreaH;
      const x2 = n2.x * width;
      const y2 = mapAreaY + n2.y * mapAreaH;

      const line = this.add.graphics();
      line.lineStyle(2, 0x3a3460, 0.5);
      line.lineBetween(x1, y1, x2, y2);
    }

    // 绘制节点
    for (let i = 0; i < 9; i++) {
      const node = MAP_NODES[i];
      const x = node.x * width;
      const y = mapAreaY + node.y * mapAreaH;
      const nodeNum = i + 1;
      const isVisited = i < GameState.currentNode + 1;
      const isCurrent = i === GameState.currentNode + 1;
      const isFixed = !!NODE_FIXED[nodeNum];

      // 节点圆
      const circleColor = isVisited ? 0x33d17a : isCurrent ? COLORS.highlight : 0x3a3460;
      const circle = this.add.circle(x, y, 14, circleColor, isVisited ? 0.6 : 1);
      this.add.circle(x, y, 14, 0x000000, 0).setStrokeStyle(2, isCurrent ? COLORS.highlight : 0x5a55a0, isCurrent ? 1 : 0.5);

      // 节点编号
      this.add.text(x, y, `${nodeNum}`, {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: isVisited ? '#33d17a' : COLORS.textWhite,
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // 固定节点标签
      if (isFixed) {
        this.add.text(x, y - 24, ROOM_NAMES[NODE_FIXED[nodeNum]], {
          fontFamily: 'sans-serif',
          fontSize: '11px',
          color: COLORS.textOrange,
        }).setOrigin(0.5);
      }

      // 已访问标记
      if (isVisited) {
        this.add.text(x, y + 22, '✓', {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#33d17a',
        }).setOrigin(0.5);
      }
    }
  }

  showRoomChoices() {
    const { width, height } = this.scale;
    const nextNode = GameState.currentNode + 1;

    if (nextNode >= 9) {
      // 当前楼层的Boss已击败
      if (GameState.floor >= 3) {
        // 3层全部通关 → 胜利
        this.showVictory();
        return;
      } else {
        // 进入下一层
        this.showFloorTransition();
        return;
      }
    }

    // 获取当前节点的房间选择
    this.currentChoices = GameState.generateNodeChoices(nextNode);

    // 提示文字
    this.add.text(width / 2, height - 150, '选择下一个房间：', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: COLORS.textWhite,
    }).setOrigin(0.5);

    // 房间选择按钮
    const btnWidth = 200;
    const totalWidth = this.currentChoices.length * btnWidth + (this.currentChoices.length - 1) * 20;
    const startX = (width - totalWidth) / 2 + btnWidth / 2;

    for (let i = 0; i < this.currentChoices.length; i++) {
      const roomType = this.currentChoices[i];
      const x = startX + i * (btnWidth + 20);
      const y = height - 90;

      this.createRoomButton(x, y, btnWidth, roomType, nextNode);
    }
  }

  createRoomButton(x, y, w, roomType, nodeIndex) {
    const container = this.add.container(x, y);

    // 按钮背景
    const g = this.add.graphics();
    g.fillStyle(0x2a2550, 1);
    g.fillRoundedRect(-w / 2, -30, w, 60, 8);
    g.lineStyle(2, this.getRoomColor(roomType), 0.8);
    g.strokeRoundedRect(-w / 2, -30, w, 60, 8);
    container.add(g);

    // 房间名称
    const nameText = this.add.text(0, -8, ROOM_NAMES[roomType], {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: COLORS.textWhite,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(nameText);

    // 房间描述
    const desc = this.getRoomDescription(roomType);
    const descText = this.add.text(0, 14, desc, {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: COLORS.textGray,
    }).setOrigin(0.5);
    container.add(descText);

    // 交互区域
    const hitArea = this.add.rectangle(0, 0, w, 60, 0x000000, 0).setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      g.clear();
      g.fillStyle(0x3a3570, 1);
      g.fillRoundedRect(-w / 2, -30, w, 60, 8);
      g.lineStyle(2, this.getRoomColor(roomType), 1);
      g.strokeRoundedRect(-w / 2, -30, w, 60, 8);
      this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 80 });
    });

    hitArea.on('pointerout', () => {
      g.clear();
      g.fillStyle(0x2a2550, 1);
      g.fillRoundedRect(-w / 2, -30, w, 60, 8);
      g.lineStyle(2, this.getRoomColor(roomType), 0.8);
      g.strokeRoundedRect(-w / 2, -30, w, 60, 8);
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80 });
    });

    hitArea.on('pointerdown', () => {
      GameState.currentNode = nodeIndex;
      GameState.nodesVisited++;
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.time.delayedCall(250, () => {
        this.scene.start('GameScene', { roomType, nodeIndex });
      });
    });
  }

  getRoomColor(roomType) {
    const colors = {
      [ROOM_TYPES.REWARD]: COLORS.goldCard,
      [ROOM_TYPES.GOLD]: COLORS.goldCard,
      [ROOM_TYPES.TREASURE]: COLORS.treasureCard,
      [ROOM_TYPES.ATTRIBUTE]: COLORS.attributeCard,
      [ROOM_TYPES.SHOP]: COLORS.shopCard,
      [ROOM_TYPES.RESTAURANT]: COLORS.foodCard,
      [ROOM_TYPES.NORMAL]: COLORS.monsterCard,
      [ROOM_TYPES.ELITE]: COLORS.monsterBorder,
      [ROOM_TYPES.BOSS]: COLORS.danger,
    };
    return colors[roomType] || 0x5a55a0;
  }

  getRoomDescription(roomType) {
    const descs = {
      [ROOM_TYPES.REWARD]: '获得宝箱和金币',
      [ROOM_TYPES.GOLD]: '获得金币',
      [ROOM_TYPES.TREASURE]: '获得遗物宝箱',
      [ROOM_TYPES.ATTRIBUTE]: '提升属性',
      [ROOM_TYPES.SHOP]: '购买强化和道具',
      [ROOM_TYPES.RESTAURANT]: '恢复HP，学习词条',
      [ROOM_TYPES.NORMAL]: '普通怪物战斗',
      [ROOM_TYPES.ELITE]: '精英怪物，丰厚奖励',
      [ROOM_TYPES.BOSS]: '击败Boss通关！',
    };
    return descs[roomType] || '';
  }

  showFloorTransition() {
    const { width, height } = this.scale;
    const nextFloor = GameState.floor + 1;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85).setDepth(200);

    this.add.text(width / 2, height / 2 - 40, `第 ${GameState.floor} 层 已通关！`, {
      fontFamily: 'sans-serif', fontSize: '32px', color: COLORS.textGold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(201);

    this.add.text(width / 2, height / 2 + 10, `即将进入第 ${nextFloor} 层...`, {
      fontFamily: 'sans-serif', fontSize: '18px', color: COLORS.textGray,
    }).setOrigin(0.5).setDepth(201);

    const continueBtn = this.add.text(width / 2, height / 2 + 70, '继续', {
      fontFamily: 'sans-serif', fontSize: '20px', color: COLORS.textWhite,
      backgroundColor: '#1a5fb4', padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });

    continueBtn.on('pointerover', () => continueBtn.setScale(1.05));
    continueBtn.on('pointerout', () => continueBtn.setScale(1));
    continueBtn.on('pointerdown', () => {
      GameState.floor = nextFloor;
      GameState.currentNode = -1;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.restart();
      });
    });
  }

  showVictory() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 40, '恭喜通关！', {
      fontFamily: 'sans-serif',
      fontSize: '40px',
      color: COLORS.textGold,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 10, `你成功征服了全部 ${GameState.floor} 层地牢！`, {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: COLORS.textWhite,
    }).setOrigin(0.5);

    const restartBtn = this.add.text(width / 2, height / 2 + 60, '再来一局', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: COLORS.textBlue,
      backgroundColor: '#2a2550',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerdown', () => {
      GameState.reset();
      this.scene.start('TitleScene');
    });
  }
}
