// @ts-nocheck
import Phaser from 'phaser';
import { generateTextures } from './generateTextures';

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;
const ARENA_MARGIN = 44;
const INTERACT_RADIUS = 90;
const FONT_STACK = '"Microsoft YaHei", "Segoe UI", sans-serif';

const COMBO_TIERS = [
  { threshold: 0, label: '冷枪', radius: 0, damage: 0 },
  { threshold: 4, label: '热手', radius: 48, damage: 0.35 },
  { threshold: 9, label: '沸腾', radius: 72, damage: 0.55 },
  { threshold: 16, label: '满帆', radius: 96, damage: 0.78 },
];

const SHOP_CATALOG = [
  { id: 'fastReload', title: '快装弹仓', description: '换弹速度提升 18%，当前弹匣立刻补满。', cost: 5, maxStack: 3 },
  { id: 'magazine', title: '扩容弹匣', description: '弹匣上限 +2，连续后坐力窗口更长。', cost: 6, maxStack: 2 },
  { id: 'brassPolish', title: '抛光子弹', description: '子弹更快，射击间隔略缩短，更容易续连击。', cost: 6, maxStack: 3 },
  { id: 'powderBloom', title: '火药开花', description: '连击溅射半径和伤害同步提高。', cost: 7, maxStack: 3 },
  { id: 'hullPatch', title: '船体补片', description: '最大生命 +1，并回复 1 点生命。', cost: 6, maxStack: 2 },
  { id: 'firstAid', title: '急救包', description: '立刻回复 2 点生命。', cost: 4, maxStack: 99 },
  { id: 'ricochet', title: '跳弹涂层', description: '子弹撞墙后会反弹一次，不再直接断连击。', cost: 7, maxStack: 2 },
  { id: 'reloadNova', title: '换弹冲击', description: '开始换弹时在船边炸出一圈冲击波。', cost: 8, maxStack: 2 },
];

const PHASES = [
  {
    key: 'opening',
    type: 'combat',
    label: '平静海面',
    objective: '先学会开枪反推，边线的花和手会把你往上下边挤。',
    duration: 36000,
    danger: 1,
    spawns: {
      flower: { interval: 3600, jitter: 900, cap: 3 },
      hand: { interval: 2900, jitter: 650, cap: 2 },
    },
  },
  {
    key: 'shop-1',
    type: 'shop',
    label: '补给船靠岸',
    objective: '漂过去，贴近后按 E，再到右侧 React 面板挑一件强化。',
    boatX: 148,
  },
  {
    key: 'crossfire',
    type: 'combat',
    label: '交叉火力',
    objective: '海盗加入战场，远程点射会逼你重新规划后坐力路线。',
    duration: 42000,
    danger: 2,
    spawns: {
      flower: { interval: 4200, jitter: 900, cap: 3 },
      hand: { interval: 2500, jitter: 500, cap: 3 },
      pirate: { interval: 5200, jitter: 1000, cap: 2 },
    },
  },
  {
    key: 'night',
    type: 'combat',
    label: '夜幕异象',
    objective: '视野收缩，只剩船边一块亮区，必须靠命中保住连击。',
    duration: 24000,
    danger: 2.4,
    event: 'night',
    spawns: {
      flower: { interval: 4800, jitter: 700, cap: 2 },
      hand: { interval: 2100, jitter: 450, cap: 3 },
      pirate: { interval: 3600, jitter: 700, cap: 3 },
    },
  },
  {
    key: 'shop-2',
    type: 'shop',
    label: '第二次补给',
    objective: '拿一件真正改手感的构筑件，然后准备接 Boss。',
    boatX: WORLD_WIDTH - 148,
  },
  {
    key: 'blackwake',
    type: 'combat',
    label: '黑潮迫近',
    objective: '保持爆裂连击，把海盗和边线怪一起清掉。',
    duration: 46000,
    danger: 3,
    spawns: {
      flower: { interval: 4200, jitter: 600, cap: 3 },
      hand: { interval: 1900, jitter: 400, cap: 4 },
      pirate: { interval: 3000, jitter: 650, cap: 4 },
    },
  },
  {
    key: 'boss',
    type: 'boss',
    label: '持盾大海盗',
    objective: '盾面能挡正面子弹，绕到侧后方。帽子飞了以后只差最后一枪。',
  },
];

const TOTAL_COMBAT_DURATION = PHASES.filter((phase) => phase.type === 'combat').reduce(
  (sum, phase) => sum + phase.duration,
  0,
);

export const INITIAL_HUD_STATE = {
  phaseLabel: '初始化中',
  objective: '准备进入海面',
  progress: 0,
  hp: 6,
  maxHp: 6,
  ammo: 6,
  maxAmmo: 6,
  wallet: 0,
  combo: 0,
  comboLabel: '冷枪',
  eventLabel: '',
  statusLine: '射击的后坐力就是移动。',
  reloadActive: false,
  reloadingMs: 0,
  bossActive: false,
  bossHp: 0,
  bossMaxHp: 0,
  bossHint: '',
  shopNearby: false,
  shopOpen: false,
  canDockShop: false,
  runResult: '',
  upgrades: [],
  kills: 0,
};

export const INITIAL_MENU_STATE = {
  visible: false,
  title: '',
  subtitle: '',
  wallet: 0,
  choices: [],
};

function pickPhaseProgress(phases, currentPhaseIndex, currentPhaseElapsed) {
  let elapsed = 0;

  for (let index = 0; index < phases.length; index += 1) {
    const phase = phases[index];

    if (phase.type !== 'combat') {
      continue;
    }

    if (index < currentPhaseIndex) {
      elapsed += phase.duration;
      continue;
    }

    if (index === currentPhaseIndex) {
      elapsed += currentPhaseElapsed;
    }
  }

  return Phaser.Math.Clamp(elapsed / TOTAL_COMBAT_DURATION, 0, 1);
}

function getComboTier(combo) {
  for (let index = COMBO_TIERS.length - 1; index >= 0; index -= 1) {
    if (combo >= COMBO_TIERS[index].threshold) {
      return COMBO_TIERS[index];
    }
  }

  return COMBO_TIERS[0];
}

function vectorBetween(fromX, fromY, toX, toY) {
  return new Phaser.Math.Vector2(toX - fromX, toY - fromY);
}

function randomAround(base, jitter) {
  return base + Phaser.Math.Between(-jitter, jitter);
}

function clampToArena(x, y) {
  return {
    x: Phaser.Math.Clamp(x, ARENA_MARGIN, WORLD_WIDTH - ARENA_MARGIN),
    y: Phaser.Math.Clamp(y, ARENA_MARGIN, WORLD_HEIGHT - ARENA_MARGIN),
  };
}

export class DemoScene extends Phaser.Scene {
  constructor(uiBridge = {}) {
    super('DemoScene');

    this.uiBridge = {
      onHudChange: uiBridge.onHudChange ?? (() => {}),
      onMenuChange: uiBridge.onMenuChange ?? (() => {}),
    };
  }

  create() {
    generateTextures(this);

    this.cameras.main.setBackgroundColor('#082336');
    this.physics.world.setBounds(
      ARENA_MARGIN,
      ARENA_MARGIN,
      WORLD_WIDTH - ARENA_MARGIN * 2,
      WORLD_HEIGHT - ARENA_MARGIN * 2,
    );

    this.setupWorld();
    this.setupPlayer();
    this.setupGroups();
    this.setupInput();
    this.resetRun();
  }

  setupWorld() {
    this.seaLayer = this.add
      .tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 'sea-tile')
      .setDepth(0);
    this.seaLayerTwo = this.add
      .tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 'sea-tile')
      .setTint(0x9fe8ef)
      .setAlpha(0.16)
      .setDepth(1);

    this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH - 16, WORLD_HEIGHT - 16)
      .setStrokeStyle(2, 0x7ed3df, 0.2)
      .setDepth(2);
    this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH - 88, WORLD_HEIGHT - 88)
      .setStrokeStyle(3, 0xeed49a, 0.24)
      .setDepth(2);

    this.bannerPlate = this.add
      .rectangle(WORLD_WIDTH / 2, 70, 360, 78, 0x0d2131, 0.84)
      .setStrokeStyle(2, 0xf0d393, 0.35)
      .setDepth(90)
      .setAlpha(0);
    this.bannerTitle = this.add
      .text(WORLD_WIDTH / 2, 56, '', {
        fontFamily: FONT_STACK,
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#fff0c9',
      })
      .setOrigin(0.5)
      .setDepth(91)
      .setAlpha(0);
    this.bannerSubtitle = this.add
      .text(WORLD_WIDTH / 2, 82, '', {
        fontFamily: FONT_STACK,
        fontSize: '13px',
        color: '#b9e7ee',
      })
      .setOrigin(0.5)
      .setDepth(91)
      .setAlpha(0);

    this.promptText = this.add
      .text(WORLD_WIDTH / 2, WORLD_HEIGHT - 24, '', {
        fontFamily: FONT_STACK,
        fontSize: '14px',
        color: '#d7f5f9',
        backgroundColor: 'rgba(8, 22, 34, 0.45)',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(92);

    this.shopText = this.add
      .text(0, 0, '', {
        fontFamily: FONT_STACK,
        fontSize: '13px',
        color: '#fdf3d2',
        backgroundColor: 'rgba(8, 22, 34, 0.7)',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(92)
      .setVisible(false);

    this.nightMask = this.add
      .image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'night-mask')
      .setDepth(110)
      .setAlpha(0.94)
      .setVisible(false);
  }

  setupPlayer() {
    this.player = this.physics.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 90, 'player-raft');
    this.player.setDepth(20);
    this.player.setCollideWorldBounds(true);
    this.player.setCircle(15, 25, 25);
  }

  setupGroups() {
    this.enemyGroup = this.physics.add.group();
    this.enemyBulletGroup = this.physics.add.group();
    this.playerBulletGroup = this.physics.add.group();
    this.pickupGroup = this.physics.add.group();
    this.decorGroup = this.add.group();
    this.bossGroup = this.physics.add.group();

    this.physics.add.overlap(this.playerBulletGroup, this.enemyGroup, this.handlePlayerBulletHitEnemy, undefined, this);
    this.physics.add.overlap(this.playerBulletGroup, this.bossGroup, this.handlePlayerBulletHitBoss, undefined, this);
    this.physics.add.overlap(this.enemyBulletGroup, this.player, this.handleEnemyBulletHitPlayer, undefined, this);
    this.physics.add.overlap(this.enemyGroup, this.player, this.handleEnemyTouchPlayer, undefined, this);
    this.physics.add.overlap(this.bossGroup, this.player, this.handleEnemyTouchPlayer, undefined, this);
    this.physics.add.overlap(this.pickupGroup, this.player, this.handlePickup, undefined, this);
  }

  setupInput() {
    this.keys = this.input.keyboard.addKeys({
      reload: 'R',
      interact: 'E',
      fire: 'SPACE',
    });
  }

  resetRun() {
    this.tweens.killAll();
    this.time.removeAllEvents();

    [this.enemyGroup, this.enemyBulletGroup, this.playerBulletGroup, this.pickupGroup, this.bossGroup].forEach(
      (group) => group.clear(true, true),
    );
    this.decorGroup.clear(true, true);

    this.playerState = {
      hp: 6,
      maxHp: 6,
      ammo: 6,
      maxAmmo: 6,
      wallet: 4,
      fireRateMs: 190,
      reloadMs: 1000,
      bulletSpeed: 660,
      recoil: 172,
      damage: 1,
      comboRadiusBonus: 0,
      comboDamageBonus: 0,
      ricochet: 0,
      reloadNova: 0,
      upgrades: [],
    };

    this.player.setPosition(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 90);
    this.player.setVelocity(0, 0);
    this.player.setRotation(0);
    this.player.clearTint();
    this.player.setAlpha(1);

    this.phaseIndex = -1;
    this.currentPhase = null;
    this.currentPhaseElapsed = 0;
    this.currentPhaseTimer = 0;
    this.spawnTimers = {};
    this.combo = 0;
    this.comboExpiryAt = 0;
    this.fireCooldown = 0;
    this.reloadTimer = 0;
    this.wasReloading = false;
    this.invulnerableUntil = 0;
    this.shopBoat = null;
    this.shopChoices = [];
    this.shopDocked = false;
    this.shopMenuOpen = false;
    this.runResult = '';
    this.statusFlash = '';
    this.boss = null;
    this.bossState = null;
    this.kills = 0;
    this.nextHudEmitAt = 0;
    this.lastHudDigest = '';
    this.phaseMode = 'combat';

    this.promptText.setText('按住鼠标左键或空格射击。枪口方向决定输出，也决定你被后坐力推去哪里。');
    this.shopText.setVisible(false);
    this.setNight(false);
    this.emitMenu(INITIAL_MENU_STATE);

    this.showBanner('平静海面', '首版 demo：射击即移动，命中才能把溅射打起来。');
    this.advancePhase();
    this.emitHud(true);
  }

  restartRun() {
    this.physics.resume();
    this.resetRun();
  }

  selectShopChoice(choiceId) {
    if (!this.shopMenuOpen) {
      return;
    }

    if (choiceId === 'skip') {
      this.closeShopMenu();
      this.finishShopPhase();
      return;
    }

    const choice = this.shopChoices.find((item) => item.id === choiceId);

    if (!choice || this.playerState.wallet < choice.cost) {
      return;
    }

    this.playerState.wallet -= choice.cost;
    this.applyUpgrade(choice.id);
    this.playerState.upgrades.push(choice.title);
    this.flashStatus(`购入 ${choice.title}`);

    this.closeShopMenu();
    this.finishShopPhase();
    this.emitHud(true);
  }

  applyUpgrade(upgradeId) {
    switch (upgradeId) {
      case 'fastReload':
        this.playerState.reloadMs = Math.max(520, Math.round(this.playerState.reloadMs * 0.82));
        this.playerState.ammo = this.playerState.maxAmmo;
        break;
      case 'magazine':
        this.playerState.maxAmmo += 2;
        this.playerState.ammo = this.playerState.maxAmmo;
        break;
      case 'brassPolish':
        this.playerState.bulletSpeed += 85;
        this.playerState.fireRateMs = Math.max(120, Math.round(this.playerState.fireRateMs * 0.94));
        break;
      case 'powderBloom':
        this.playerState.comboRadiusBonus += 0.18;
        this.playerState.comboDamageBonus += 0.12;
        break;
      case 'hullPatch':
        this.playerState.maxHp += 1;
        this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + 1);
        break;
      case 'firstAid':
        this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + 2);
        break;
      case 'ricochet':
        this.playerState.ricochet += 1;
        break;
      case 'reloadNova':
        this.playerState.reloadNova += 1;
        break;
      default:
        break;
    }
  }

  update(time, delta) {
    const deltaSeconds = delta / 1000;

    this.updateBackground(deltaSeconds);
    this.updateDecor(delta);
    this.updatePrompt();

    if (this.shopMenuOpen) {
      this.updateNightMask();
      this.emitHud();
      return;
    }

    if (!this.runResult) {
      this.updateComboTimer(time);
      this.updateProjectiles(delta);
      this.updatePickups(delta);
    }

    if (!this.runResult) {
      this.updatePlayer(delta, deltaSeconds, time);
      this.updateEnemies(delta, time);
      this.updateBoss(delta);
      this.updatePhase(delta);
    }

    this.updateNightMask();
    this.emitHud();
  }

  updateBackground(deltaSeconds) {
    this.seaLayer.tilePositionX += 12 * deltaSeconds;
    this.seaLayer.tilePositionY += 8 * deltaSeconds;
    this.seaLayerTwo.tilePositionX -= 20 * deltaSeconds;
    this.seaLayerTwo.tilePositionY += 14 * deltaSeconds;
  }

  updateDecor(delta) {
    this.decorGroup.getChildren().forEach((item) => {
      item.life -= delta;

      if (item.kind === 'wake') {
        item.alpha = Math.max(0, item.life / item.maxLife) * 0.7;
        item.scaleX += delta * 0.0006;
        item.scaleY += delta * 0.0003;
      }

      if (item.kind === 'spark') {
        item.x += item.vx * (delta / 1000);
        item.y += item.vy * (delta / 1000);
        item.alpha = Math.max(0, item.life / item.maxLife);
      }

      if (item.kind === 'text') {
        item.y -= delta * 0.02;
        item.alpha = Math.max(0, item.life / item.maxLife);
      }

      if (item.life <= 0) {
        item.destroy();
      }
    });
  }

  updatePrompt() {
    this.shopText.setVisible(Boolean(this.shopBoat));

    if (this.shopBoat) {
      this.shopText.setPosition(this.shopBoat.x, this.shopBoat.y - 30);
      this.shopText.setText(this.shopDocked ? '按 E 靠泊补给船' : '漂近一点补给');
    }
  }

  updateComboTimer(time) {
    if (this.combo > 0 && time > this.comboExpiryAt) {
      this.breakCombo('断连');
    }
  }

  updateProjectiles(delta) {
    this.playerBulletGroup.getChildren().forEach((bullet) => {
      this.updateBullet(bullet, delta, true);
    });
    this.enemyBulletGroup.getChildren().forEach((bullet) => {
      this.updateBullet(bullet, delta, false);
    });
  }

  updateBullet(bullet, delta, isPlayerBullet) {
    if (!bullet.active) {
      return;
    }

    bullet.life -= delta;

    if (bullet.life <= 0) {
      if (isPlayerBullet && !bullet.connected) {
        this.breakCombo('空枪');
      }

      bullet.destroy();
      return;
    }

    const outLeft = bullet.x < ARENA_MARGIN - 10;
    const outRight = bullet.x > WORLD_WIDTH - ARENA_MARGIN + 10;
    const outTop = bullet.y < ARENA_MARGIN - 10;
    const outBottom = bullet.y > WORLD_HEIGHT - ARENA_MARGIN + 10;

    if (!outLeft && !outRight && !outTop && !outBottom) {
      return;
    }

    if (isPlayerBullet && bullet.ricochet > 0) {
      bullet.ricochet -= 1;
      bullet.connected = true;

      if (outLeft || outRight) {
        bullet.body.velocity.x *= -1;
      }

      if (outTop || outBottom) {
        bullet.body.velocity.y *= -1;
      }

      const clamped = clampToArena(bullet.x, bullet.y);
      bullet.setPosition(clamped.x, clamped.y);
      this.spawnImpactRing(clamped.x, clamped.y, 0.42, 0xbceef8);
      return;
    }

    if (isPlayerBullet && !bullet.connected) {
      this.breakCombo('空枪');
    }

    bullet.destroy();
  }

  updatePickups(delta) {
    this.pickupGroup.getChildren().forEach((pickup) => {
      if (!pickup.active) {
        return;
      }

      pickup.life -= delta;
      pickup.setAlpha(Math.min(1, pickup.life / 2000 + 0.2));

      if (pickup.life <= 0) {
        pickup.destroy();
        return;
      }

      const toPlayer = vectorBetween(pickup.x, pickup.y, this.player.x, this.player.y);

      if (toPlayer.lengthSq() < 110 * 110) {
        toPlayer.normalize().scale(26);
        pickup.body.velocity.x += toPlayer.x;
        pickup.body.velocity.y += toPlayer.y;
      }

      pickup.body.velocity.scale(0.94);
    });
  }

  updatePlayer(delta, deltaSeconds, time) {
    const pointer = this.input.activePointer;
    const aim = vectorBetween(this.player.x, this.player.y, pointer.worldX, pointer.worldY);

    if (aim.lengthSq() < 6) {
      aim.set(0, -1);
    } else {
      aim.normalize();
    }

    this.player.rotation = Phaser.Math.Angle.RotateTo(
      this.player.rotation,
      aim.angle() + Math.PI / 2,
      0.16,
    );

    const drag = Math.max(0.76, 1 - deltaSeconds * 2.9);
    this.player.body.velocity.scale(drag);

    const speed = this.player.body.velocity.length();

    if (speed > 280) {
      this.player.body.velocity.normalize().scale(280);
    }

    if (speed > 80 && time > (this.nextWakeAt ?? 0)) {
      this.spawnWake();
      this.nextWakeAt = time + 80;
    }

    if (this.invulnerableUntil > time) {
      this.player.alpha = Phaser.Math.Linear(0.45, 1, ((time / 60) % 1));
    } else {
      this.player.alpha = 1;
    }

    this.fireCooldown = Math.max(0, this.fireCooldown - delta);
    this.reloadTimer = Math.max(0, this.reloadTimer - delta);

    if (this.reloadTimer === 0 && this.wasReloading) {
      this.wasReloading = false;
      this.playerState.ammo = this.playerState.maxAmmo;
      this.flashStatus('装填完成');
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.reload) && !this.reloadTimer) {
      this.startReload();
    }

    const wantsToFire = pointer.isDown || this.keys.fire.isDown;

    if (wantsToFire && this.fireCooldown <= 0 && !this.reloadTimer) {
      if (this.playerState.ammo > 0) {
        this.firePlayerBullet(aim);
        this.fireCooldown = this.playerState.fireRateMs;
      } else {
        this.startReload();
      }
    }

    if (this.playerState.ammo <= 0 && !this.reloadTimer) {
      this.startReload();
    }
  }

  updateEnemies(delta, time) {
    this.enemyGroup.getChildren().forEach((enemy) => {
      if (!enemy.active) {
        return;
      }

      enemy.life += delta;

      if (enemy.kind === 'flower') {
        enemy.body.velocity.scale(0.8);
        enemy.y += Math.sin((time + enemy.seed) * 0.004) * 0.12;
        enemy.fireTimer -= delta;

        if (enemy.fireTimer <= 0) {
          this.fireFlower(enemy);
          enemy.fireTimer = randomAround(2200, 350);
        }

        return;
      }

      const toPlayer = vectorBetween(enemy.x, enemy.y, this.player.x, this.player.y);
      const distance = Math.max(1, toPlayer.length());
      toPlayer.scale(1 / distance);

      if (enemy.kind === 'hand') {
        const velocity = toPlayer.scale(distance > 90 ? 118 : 176);
        enemy.body.velocity.x = velocity.x;
        enemy.body.velocity.y = velocity.y;
        enemy.rotation = velocity.angle() + Math.PI / 2;
        return;
      }

      if (enemy.kind === 'pirate') {
        const lateral = new Phaser.Math.Vector2(-toPlayer.y, toPlayer.x).scale(enemy.strafeDir * 56);
        const forward = toPlayer.clone().scale(distance > 210 ? 72 : -42);
        enemy.body.velocity.x = forward.x + lateral.x;
        enemy.body.velocity.y = forward.y + lateral.y;
        enemy.rotation = Phaser.Math.Angle.RotateTo(enemy.rotation, toPlayer.angle() + Math.PI / 2, 0.08);

        if (enemy.windup > 0) {
          enemy.windup -= delta;
          enemy.setTint(0xffd39c);

          if (enemy.windup <= 0) {
            enemy.clearTint();
            this.firePirate(enemy);
            enemy.fireTimer = randomAround(2600, 500);
          }
        } else {
          enemy.fireTimer -= delta;

          if (enemy.fireTimer <= 0) {
            enemy.windup = 460;
          }
        }
      }
    });
  }

  updateBoss(delta) {
    if (!this.boss || !this.boss.active || !this.bossState) {
      return;
    }

    const toPlayer = vectorBetween(this.boss.x, this.boss.y, this.player.x, this.player.y);
    const distance = Math.max(1, toPlayer.length());
    const direction = toPlayer.scale(1 / distance);

    this.boss.rotation = Phaser.Math.Angle.RotateTo(this.boss.rotation, direction.angle(), 0.06);
    this.bossState.phaseTimer -= delta;
    this.bossState.fireTimer -= delta;

    if (this.bossState.mode === 'shield') {
      this.boss.body.velocity.x = direction.x * 66;
      this.boss.body.velocity.y = direction.y * 66;

      if (this.bossState.fireTimer <= 0) {
        this.fireBossVolley(direction, 1);
        this.bossState.fireTimer = 1050;
      }

      if (this.bossState.phaseTimer <= 0) {
        this.bossState.mode = 'open';
        this.bossState.phaseTimer = 2400;
        this.bossState.fireTimer = 220;
        this.boss.setTint(0xffd29a);
      }

      return;
    }

    if (this.bossState.mode === 'open') {
      const lateral = new Phaser.Math.Vector2(-direction.y, direction.x).scale(this.bossState.strafeDir * 84);
      this.boss.body.velocity.x = lateral.x;
      this.boss.body.velocity.y = lateral.y;

      if (this.bossState.fireTimer <= 0) {
        this.fireBossVolley(direction, 3);
        this.bossState.fireTimer = 760;
      }

      if (this.bossState.phaseTimer <= 0) {
        this.bossState.mode = 'shield';
        this.bossState.phaseTimer = 2600;
        this.bossState.fireTimer = 820;
        this.boss.clearTint();
      }

      return;
    }

    if (this.bossState.mode === 'rage') {
      this.boss.body.velocity.x = direction.x * 116;
      this.boss.body.velocity.y = direction.y * 116;

      if (this.bossState.fireTimer <= 0) {
        this.fireBossVolley(direction, 4);
        this.bossState.fireTimer = 620;
      }
    }
  }

  updatePhase(delta) {
    if (!this.currentPhase) {
      return;
    }

    if (this.currentPhase.type === 'shop') {
      this.updateShopProximity();
      return;
    }

    if (this.currentPhase.type === 'boss') {
      return;
    }

    this.currentPhaseTimer -= delta;
    this.currentPhaseElapsed += delta;

    Object.entries(this.currentPhase.spawns).forEach(([kind, config]) => {
      this.spawnTimers[kind] -= delta;

      if (this.spawnTimers[kind] > 0 || this.countActiveEnemies(kind) >= config.cap) {
        return;
      }

      this.spawnEnemy(kind, this.currentPhase.danger);
      this.spawnTimers[kind] = randomAround(config.interval, config.jitter);
    });

    if (this.currentPhaseTimer <= 0) {
      this.advancePhase();
    }
  }

  updateShopProximity() {
    if (!this.shopBoat || !this.shopBoat.active) {
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.shopBoat.x, this.shopBoat.y);
    this.shopDocked = distance <= INTERACT_RADIUS;

    if (this.shopDocked && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      this.openShopMenu();
    }
  }

  handlePlayerBulletHitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) {
      return;
    }

    bullet.connected = true;
    this.registerComboHit();
    this.damageEnemy(enemy, bullet.damage, 'bullet');
    this.applySplashDamage(enemy.x, enemy.y, enemy);
    this.spawnImpactRing(enemy.x, enemy.y, 0.32, 0xffe4b4);
    bullet.destroy();
  }

  handlePlayerBulletHitBoss(bullet, boss) {
    if (!bullet.active || !boss.active || !this.bossState) {
      return;
    }

    bullet.connected = true;
    const hitVector = vectorBetween(boss.x, boss.y, bullet.x, bullet.y).normalize();
    const shieldForward = new Phaser.Math.Vector2(Math.cos(boss.rotation), Math.sin(boss.rotation));
    const blocked =
      !this.bossState.broken &&
      this.bossState.mode === 'shield' &&
      hitVector.dot(shieldForward) > 0.18;

    if (blocked) {
      this.spawnImpactRing(boss.x, boss.y, 0.46, 0xbdeef6);
      this.spawnSparkBurst(boss.x + shieldForward.x * 28, boss.y + shieldForward.y * 28, 0xe8fbff, 6);
      bullet.destroy();
      return;
    }

    this.registerComboHit();
    this.damageBoss(boss, bullet.damage);
    this.applySplashDamage(boss.x, boss.y, boss);
    this.spawnImpactRing(boss.x, boss.y, 0.5, 0xffe0ad);
    bullet.destroy();
  }

  handleEnemyBulletHitPlayer(player, bullet) {
    if (!bullet.active) {
      return;
    }

    bullet.destroy();
    const source = vectorBetween(bullet.x, bullet.y, player.x, player.y).normalize().scale(90);
    this.damagePlayer(1, source.x, source.y);
  }

  handleEnemyTouchPlayer(enemy, player) {
    if (!enemy.active) {
      return;
    }

    const source = vectorBetween(enemy.x, enemy.y, player.x, player.y).normalize().scale(140);
    this.damagePlayer(enemy.kind === 'boss' ? 2 : 1, source.x, source.y);

    if (enemy.kind === 'hand') {
      this.damageEnemy(enemy, 99, 'collision');
    }
  }

  handlePickup(pickup) {
    if (!pickup.active) {
      return;
    }

    if (pickup.kind === 'diamond') {
      this.playerState.wallet += pickup.value;
      pickup.destroy();
      return;
    }

    if (pickup.kind === 'heart' && this.playerState.hp < this.playerState.maxHp) {
      this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + 1);
      pickup.destroy();
    }
  }

  damageEnemy(enemy, damage, source) {
    enemy.hp -= damage;
    enemy.setTint(0xffdbaf);
    this.time.delayedCall(70, () => {
      if (enemy.active) {
        enemy.clearTint();
      }
    });

    if (enemy.hp > 0) {
      return;
    }

    const reward = enemy.kind === 'pirate' ? 2 : 1;
    this.kills += 1;
    this.spawnSparkBurst(enemy.x, enemy.y, 0xffd395, 7);
    this.spawnPickupBurst(enemy.x, enemy.y, reward, this.playerState.hp < this.playerState.maxHp && Math.random() < 0.16);
    enemy.destroy();

    if (source === 'collision') {
      return;
    }
  }

  damageBoss(boss, damage) {
    this.bossState.hp -= damage;
    boss.setTint(0xffd4b0);
    this.time.delayedCall(90, () => {
      if (boss.active) {
        boss.clearTint();
      }
    });

    if (!this.bossState.broken && this.bossState.hp <= 1) {
      this.bossState.hp = 1;
      this.breakBossHat();
      return;
    }

    if (this.bossState.broken && this.bossState.hp <= 0) {
      this.winRun();
    }
  }

  damagePlayer(amount, knockbackX, knockbackY) {
    if (this.runResult || this.time.now < this.invulnerableUntil) {
      return;
    }

    this.playerState.hp = Math.max(0, this.playerState.hp - amount);
    this.invulnerableUntil = this.time.now + 860;
    this.player.setTint(0xff9b86);
    this.player.body.velocity.x += knockbackX;
    this.player.body.velocity.y += knockbackY;
    this.breakCombo('受击');
    this.flashStatus('船体受损');

    this.time.delayedCall(120, () => {
      if (this.player.active) {
        this.player.clearTint();
      }
    });

    if (this.playerState.hp <= 0) {
      this.failRun();
    }
  }

  registerComboHit() {
    this.combo += 1;
    this.comboExpiryAt = this.time.now + 1600;
  }

  breakCombo(reason) {
    if (this.combo <= 0) {
      return;
    }

    if (this.combo >= 4) {
      this.spawnFloatingText(this.player.x, this.player.y - 28, `${reason}，连击断开`, '#ffd0aa');
    }

    this.combo = 0;
  }

  applySplashDamage(centerX, centerY, directTarget) {
    const tier = getComboTier(this.combo);

    if (!tier.radius) {
      return;
    }

    const radius = tier.radius * (1 + this.playerState.comboRadiusBonus);
    const splashDamage = tier.damage + this.playerState.comboDamageBonus;
    this.spawnImpactRing(centerX, centerY, radius / 128, 0xffe9ad);

    const hurtEnemy = (enemy) => {
      if (!enemy.active || enemy === directTarget) {
        return;
      }

      if (Phaser.Math.Distance.Between(centerX, centerY, enemy.x, enemy.y) <= radius) {
        if (enemy.kind === 'boss') {
          this.damageBoss(enemy, splashDamage * 0.45);
        } else {
          this.damageEnemy(enemy, splashDamage, 'splash');
        }
      }
    };

    this.enemyGroup.getChildren().forEach(hurtEnemy);
    this.bossGroup.getChildren().forEach(hurtEnemy);
  }

  firePlayerBullet(direction) {
    const spawnX = this.player.x + direction.x * 26;
    const spawnY = this.player.y + direction.y * 26;
    const bullet = this.playerBulletGroup.create(spawnX, spawnY, 'player-bullet');
    bullet.setDepth(30);
    bullet.setScale(1.1);
    bullet.body.allowGravity = false;
    bullet.setCircle(4, 6, 6);
    bullet.setVelocity(direction.x * this.playerState.bulletSpeed, direction.y * this.playerState.bulletSpeed);
    bullet.life = 950;
    bullet.connected = false;
    bullet.damage = this.playerState.damage;
    bullet.ricochet = this.playerState.ricochet;

    this.player.body.velocity.x -= direction.x * this.playerState.recoil;
    this.player.body.velocity.y -= direction.y * this.playerState.recoil;
    this.playerState.ammo -= 1;

    this.spawnImpactRing(this.player.x - direction.x * 6, this.player.y - direction.y * 6, 0.18, 0xb7eef3);
  }

  startReload() {
    if (this.reloadTimer > 0) {
      return;
    }

    this.reloadTimer = this.playerState.reloadMs;
    this.wasReloading = true;
    this.flashStatus('装填中');

    if (this.playerState.reloadNova > 0) {
      const radius = 58 + this.playerState.reloadNova * 18;
      this.spawnImpactRing(this.player.x, this.player.y, radius / 128, 0xb7f1ff);

      this.enemyGroup.getChildren().forEach((enemy) => {
        if (
          enemy.active &&
          Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= radius
        ) {
          this.damageEnemy(enemy, 0.8 + this.playerState.reloadNova * 0.25, 'splash');
        }
      });

      this.bossGroup.getChildren().forEach((enemy) => {
        if (
          enemy.active &&
          Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= radius
        ) {
          this.damageBoss(enemy, 0.4 + this.playerState.reloadNova * 0.15);
        }
      });
    }
  }

  fireFlower(enemy) {
    const toPlayer = vectorBetween(enemy.x, enemy.y, this.player.x, this.player.y).normalize();
    const baseAngle = toPlayer.angle();
    const spread = this.currentPhase?.danger >= 2 ? [-0.22, 0, 0.22] : [0];

    spread.forEach((offset) => {
      const angle = baseAngle + offset;
      const direction = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
      this.spawnEnemyBullet(enemy.x, enemy.y, direction, 180 + this.currentPhase.danger * 18);
    });
  }

  firePirate(enemy) {
    const toPlayer = vectorBetween(enemy.x, enemy.y, this.player.x, this.player.y).normalize();
    this.spawnEnemyBullet(enemy.x, enemy.y, toPlayer, 280 + this.currentPhase.danger * 16);

    if (this.currentPhase?.danger >= 3) {
      this.spawnEnemyBullet(
        enemy.x,
        enemy.y,
        new Phaser.Math.Vector2(Math.cos(toPlayer.angle() - 0.16), Math.sin(toPlayer.angle() - 0.16)),
        240,
      );
      this.spawnEnemyBullet(
        enemy.x,
        enemy.y,
        new Phaser.Math.Vector2(Math.cos(toPlayer.angle() + 0.16), Math.sin(toPlayer.angle() + 0.16)),
        240,
      );
    }
  }

  fireBossVolley(direction, spreadLevel) {
    const baseAngle = direction.angle();
    const spreads = {
      1: [0],
      3: [-0.24, 0, 0.24],
      4: [-0.34, -0.12, 0.12, 0.34],
    };

    (spreads[spreadLevel] ?? spreads[1]).forEach((offset) => {
      const angle = baseAngle + offset;
      const shotDirection = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
      this.spawnEnemyBullet(this.boss.x, this.boss.y, shotDirection, 250 + spreadLevel * 16);
    });
  }

  spawnEnemyBullet(x, y, direction, speed) {
    const bullet = this.enemyBulletGroup.create(x, y, 'enemy-bullet');
    bullet.setDepth(28);
    bullet.body.allowGravity = false;
    bullet.setCircle(4, 6, 6);
    bullet.setVelocity(direction.x * speed, direction.y * speed);
    bullet.life = 2400;
  }

  spawnEnemy(kind, danger) {
    const spawn = this.getSpawnPoint(kind);
    let texture = 'flower-enemy';
    let radius = 13;
    let hitPoints = 2;

    if (kind === 'hand') {
      texture = 'hand-enemy';
      radius = 14;
      hitPoints = 2.4;
    }

    if (kind === 'pirate') {
      texture = 'pirate-enemy';
      radius = 14;
      hitPoints = 3.4;
    }

    const enemy = this.enemyGroup.create(spawn.x, spawn.y, texture);
    enemy.setDepth(22);
    enemy.setCollideWorldBounds(true);
    enemy.setCircle(radius, 18, 18);
    enemy.body.allowGravity = false;
    enemy.kind = kind;
    enemy.hp = hitPoints + (danger - 1) * (kind === 'pirate' ? 0.5 : 0.2);
    enemy.fireTimer = randomAround(1800, 450);
    enemy.windup = 0;
    enemy.strafeDir = Math.random() > 0.5 ? 1 : -1;
    enemy.seed = Math.random() * 1000;
    enemy.life = 0;

    if (kind === 'flower') {
      enemy.body.immovable = true;
      enemy.setVelocity(0, 0);
    }
  }

  getSpawnPoint(kind) {
    const edgePadding = 84;

    if (kind === 'hand') {
      return {
        x: Phaser.Math.Between(edgePadding, WORLD_WIDTH - edgePadding),
        y: Math.random() > 0.5 ? ARENA_MARGIN + 8 : WORLD_HEIGHT - ARENA_MARGIN - 8,
      };
    }

    if (kind === 'flower') {
      const side = Phaser.Math.Between(0, 3);

      if (side === 0) {
        return { x: ARENA_MARGIN + 12, y: Phaser.Math.Between(edgePadding, WORLD_HEIGHT - edgePadding) };
      }

      if (side === 1) {
        return { x: WORLD_WIDTH - ARENA_MARGIN - 12, y: Phaser.Math.Between(edgePadding, WORLD_HEIGHT - edgePadding) };
      }

      if (side === 2) {
        return { x: Phaser.Math.Between(edgePadding, WORLD_WIDTH - edgePadding), y: ARENA_MARGIN + 12 };
      }

      return { x: Phaser.Math.Between(edgePadding, WORLD_WIDTH - edgePadding), y: WORLD_HEIGHT - ARENA_MARGIN - 12 };
    }

    const side = Phaser.Math.Between(0, 3);

    if (side === 0) {
      return { x: ARENA_MARGIN + 10, y: Phaser.Math.Between(edgePadding, WORLD_HEIGHT - edgePadding) };
    }

    if (side === 1) {
      return { x: WORLD_WIDTH - ARENA_MARGIN - 10, y: Phaser.Math.Between(edgePadding, WORLD_HEIGHT - edgePadding) };
    }

    if (side === 2) {
      return { x: Phaser.Math.Between(edgePadding, WORLD_WIDTH - edgePadding), y: ARENA_MARGIN + 10 };
    }

    return { x: Phaser.Math.Between(edgePadding, WORLD_WIDTH - edgePadding), y: WORLD_HEIGHT - ARENA_MARGIN - 10 };
  }

  spawnPickupBurst(x, y, diamondCount, includeHeart) {
    for (let index = 0; index < diamondCount; index += 1) {
      const pickup = this.pickupGroup.create(x, y, 'diamond-pickup');
      pickup.kind = 'diamond';
      pickup.value = 1;
      pickup.life = 9000;
      pickup.setDepth(18);
      pickup.body.allowGravity = false;
      pickup.setCircle(7, 6, 6);
      pickup.setVelocity(Phaser.Math.Between(-90, 90), Phaser.Math.Between(-90, 90));
    }

    if (!includeHeart) {
      return;
    }

    const pickup = this.pickupGroup.create(x, y, 'heart-pickup');
    pickup.kind = 'heart';
    pickup.value = 0;
    pickup.life = 9000;
    pickup.setDepth(18);
    pickup.body.allowGravity = false;
    pickup.setCircle(8, 6, 6);
    pickup.setVelocity(Phaser.Math.Between(-70, 70), Phaser.Math.Between(-70, 70));
  }

  spawnWake() {
    const wake = this.add.image(this.player.x, this.player.y, 'wake');
    wake.kind = 'wake';
    wake.life = 480;
    wake.maxLife = 480;
    wake.setDepth(12);
    wake.rotation = this.player.rotation + Math.PI;
    wake.alpha = 0.55;
    this.decorGroup.add(wake);
  }

  spawnImpactRing(x, y, scale, tint) {
    const ring = this.add.image(x, y, 'impact-ring');
    ring.kind = 'wake';
    ring.life = 220;
    ring.maxLife = 220;
    ring.setDepth(36);
    ring.setTint(tint);
    ring.setScale(scale);
    this.decorGroup.add(ring);
  }

  spawnSparkBurst(x, y, tint, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(48, 148);
      const spark = this.add.image(x, y, 'spark');
      spark.kind = 'spark';
      spark.life = 260;
      spark.maxLife = 260;
      spark.vx = Math.cos(angle) * speed;
      spark.vy = Math.sin(angle) * speed;
      spark.setTint(tint);
      spark.setDepth(38);
      this.decorGroup.add(spark);
    }
  }

  spawnFloatingText(x, y, text, color) {
    const label = this.add
      .text(x, y, text, {
        fontFamily: FONT_STACK,
        fontSize: '13px',
        fontStyle: 'bold',
        color,
      })
      .setOrigin(0.5)
      .setDepth(40);
    label.kind = 'text';
    label.life = 760;
    label.maxLife = 760;
    this.decorGroup.add(label);
  }

  flashStatus(message) {
    this.statusFlash = message;
    this.time.delayedCall(900, () => {
      if (this.statusFlash === message) {
        this.statusFlash = '';
      }
    });
  }

  breakBossHat() {
    this.bossState.broken = true;
    this.bossState.mode = 'rage';
    this.bossState.fireTimer = 260;
    this.boss.setTexture('boss-pirate-broken');
    this.boss.setCircle(18, 44, 44);
    this.showBanner('帽子飞了', '只剩最后一枪，追上去收尾。');

    const hat = this.add.image(this.boss.x + 10, this.boss.y - 28, 'hat-fragment').setDepth(50);
    this.tweens.add({
      targets: hat,
      x: hat.x + 64,
      y: hat.y - 36,
      angle: 140,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => hat.destroy(),
    });
  }

  winRun() {
    this.runResult = 'escaped';
    this.physics.pause();
    this.spawnSparkBurst(this.boss.x, this.boss.y, 0xffefc2, 14);
    this.showBanner('Escaped', '首版闭环完成：商店、异象、Boss 都通了。');
    this.flashStatus('试航成功');
    this.boss.destroy();
    this.boss = null;
    this.bossState = null;
    this.emitHud(true);
  }

  failRun() {
    this.runResult = 'sunk';
    this.physics.pause();
    this.showBanner('沉了', '重开一局，尽量把后坐力当位移而不是事故。');
    this.emitHud(true);
  }

  advancePhase() {
    const previousPhase = this.currentPhase;

    if (previousPhase?.event === 'night') {
      this.setNight(false);
    }

    this.phaseIndex += 1;
    this.currentPhase = PHASES[this.phaseIndex] ?? null;
    this.currentPhaseElapsed = 0;

    if (!this.currentPhase) {
      return;
    }

    if (this.currentPhase.type === 'combat') {
      this.phaseMode = 'combat';
      this.currentPhaseTimer = this.currentPhase.duration;
      this.spawnTimers = {};
      Object.entries(this.currentPhase.spawns).forEach(([kind, config]) => {
        this.spawnTimers[kind] = randomAround(config.interval, config.jitter);
      });
      this.showBanner(this.currentPhase.label, this.currentPhase.objective);
      this.promptText.setText(this.currentPhase.objective);
      this.setNight(this.currentPhase.event === 'night');
      return;
    }

    if (this.currentPhase.type === 'shop') {
      this.phaseMode = 'shop-travel';
      this.currentPhaseTimer = 0;
      this.clearArenaForTransition();
      this.spawnShopBoat();
      this.showBanner(this.currentPhase.label, this.currentPhase.objective);
      this.promptText.setText(this.currentPhase.objective);
      return;
    }

    if (this.currentPhase.type === 'boss') {
      this.phaseMode = 'boss';
      this.currentPhaseTimer = 0;
      this.clearArenaForTransition();
      this.spawnBoss();
      this.showBanner(this.currentPhase.label, this.currentPhase.objective);
      this.promptText.setText(this.currentPhase.objective);
    }
  }

  clearArenaForTransition() {
    this.enemyGroup.getChildren().forEach((enemy) => {
      if (enemy.active) {
        this.spawnSparkBurst(enemy.x, enemy.y, 0x9adfea, 4);
        enemy.destroy();
      }
    });

    this.enemyBulletGroup.clear(true, true);
  }

  spawnShopBoat() {
    if (this.shopBoat?.active) {
      this.shopBoat.destroy();
    }

    const y = Phaser.Math.Between(154, WORLD_HEIGHT - 154);
    this.shopBoat = this.add.image(this.currentPhase.boatX, y, 'shop-boat').setDepth(14);
    this.shopChoices = this.rollShopChoices();
    this.shopDocked = false;

    this.tweens.add({
      targets: this.shopBoat,
      y: y - 8,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  rollShopChoices() {
    const stackCounts = this.playerState.upgrades.reduce((map, upgradeTitle) => {
      map[upgradeTitle] = (map[upgradeTitle] ?? 0) + 1;
      return map;
    }, {});

    const available = SHOP_CATALOG.filter((item) => {
      const currentCount = stackCounts[item.title] ?? 0;
      return currentCount < item.maxStack;
    });

    return Phaser.Utils.Array.Shuffle([...available]).slice(0, 3);
  }

  openShopMenu() {
    this.shopMenuOpen = true;
    this.phaseMode = 'shop-menu';
    this.physics.pause();
    this.emitMenu({
      visible: true,
      title: '补给船',
      subtitle: '靠泊后用 React 面板挑一件强化，也可以直接跳过继续航行。',
      wallet: this.playerState.wallet,
      choices: this.shopChoices.map((choice) => ({
        ...choice,
        affordable: this.playerState.wallet >= choice.cost,
      })),
    });
    this.emitHud(true);
  }

  closeShopMenu() {
    this.shopMenuOpen = false;
    this.phaseMode = 'shop-travel';
    this.physics.resume();
    this.emitMenu(INITIAL_MENU_STATE);
  }

  finishShopPhase() {
    if (this.shopBoat?.active) {
      this.shopBoat.destroy();
    }

    this.shopBoat = null;
    this.shopDocked = false;
    this.advancePhase();
  }

  spawnBoss() {
    this.boss = this.bossGroup.create(WORLD_WIDTH / 2, 92, 'boss-pirate');
    this.boss.setDepth(26);
    this.boss.setCollideWorldBounds(true);
    this.boss.setCircle(18, 44, 44);
    this.boss.body.allowGravity = false;
    this.boss.kind = 'boss';

    this.bossState = {
      hp: 10,
      maxHp: 10,
      broken: false,
      mode: 'shield',
      phaseTimer: 2600,
      fireTimer: 720,
      strafeDir: Math.random() > 0.5 ? 1 : -1,
    };
  }

  setNight(active) {
    this.nightMask.setVisible(active);
    this.nightMask.alpha = active ? 0.94 : 0;
  }

  updateNightMask() {
    if (!this.nightMask.visible) {
      return;
    }

    this.nightMask.setPosition(this.player.x, this.player.y);
  }

  countActiveEnemies(kind) {
    return this.enemyGroup.getChildren().filter((enemy) => enemy.active && (!kind || enemy.kind === kind)).length;
  }

  showBanner(title, subtitle) {
    this.bannerTitle.setText(title);
    this.bannerSubtitle.setText(subtitle);
    this.tweens.killTweensOf([this.bannerPlate, this.bannerTitle, this.bannerSubtitle]);
    [this.bannerPlate, this.bannerTitle, this.bannerSubtitle].forEach((target) => target.setAlpha(0));

    this.tweens.add({
      targets: [this.bannerPlate, this.bannerTitle, this.bannerSubtitle],
      alpha: 1,
      duration: 180,
      ease: 'Sine.easeOut',
      yoyo: true,
      hold: 1450,
    });
  }

  emitMenu(state) {
    this.uiBridge.onMenuChange(state);
  }

  emitHud(force = false) {
    const now = this.time.now;

    if (!force && now < this.nextHudEmitAt) {
      return;
    }

    this.nextHudEmitAt = now + 100;
    const comboTier = getComboTier(this.combo);
    const state = {
      phaseLabel: this.currentPhase?.label ?? INITIAL_HUD_STATE.phaseLabel,
      objective: this.currentPhase?.objective ?? INITIAL_HUD_STATE.objective,
      progress: pickPhaseProgress(PHASES, this.phaseIndex, this.currentPhaseElapsed),
      hp: this.playerState.hp,
      maxHp: this.playerState.maxHp,
      ammo: this.playerState.ammo,
      maxAmmo: this.playerState.maxAmmo,
      wallet: this.playerState.wallet,
      combo: this.combo,
      comboLabel: comboTier.label,
      eventLabel: this.currentPhase?.event === 'night' ? '异象：夜幕缩视野' : '',
      statusLine:
        this.statusFlash ||
        (this.shopMenuOpen
          ? '在 React 面板里做选择。'
          : this.shopDocked
            ? '贴近补给船后按 E 进入商店。'
            : this.runResult === 'escaped'
              ? 'Boss 已击破，点击重开可再试一局。'
              : this.runResult === 'sunk'
                ? '重开一局，尽量把后坐力当位移而不是事故。'
                : this.reloadTimer > 0
                  ? '换弹中，注意保命。'
                  : this.currentPhase?.objective ?? INITIAL_HUD_STATE.statusLine),
      reloadActive: this.reloadTimer > 0,
      reloadingMs: this.reloadTimer,
      bossActive: Boolean(this.bossState),
      bossHp: this.bossState?.hp ?? 0,
      bossMaxHp: this.bossState?.maxHp ?? 0,
      bossHint: this.bossState?.broken ? '帽子飞了，只剩最后一枪。' : '盾面挡正面，绕侧后方。',
      shopNearby: Boolean(this.shopBoat),
      shopOpen: this.shopMenuOpen,
      canDockShop: this.shopDocked,
      runResult: this.runResult,
      upgrades: [...this.playerState.upgrades].slice(-6).reverse(),
      kills: this.kills,
    };

    const digest = JSON.stringify(state);

    if (!force && digest === this.lastHudDigest) {
      return;
    }

    this.lastHudDigest = digest;
    this.uiBridge.onHudChange(state);
  }
}
