import Phaser from 'phaser';
import { DemoScene, INITIAL_HUD_STATE, INITIAL_MENU_STATE } from './DemoScene';

export { INITIAL_HUD_STATE, INITIAL_MENU_STATE };

export interface ShopChoiceState {
  id: string;
  title: string;
  description: string;
  cost: number;
  affordable: boolean;
}

export interface HudState {
  phaseLabel: string;
  objective: string;
  progress: number;
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  wallet: number;
  combo: number;
  comboLabel: string;
  eventLabel: string;
  statusLine: string;
  reloadActive: boolean;
  reloadingMs: number;
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossHint: string;
  shopNearby: boolean;
  shopOpen: boolean;
  canDockShop: boolean;
  runResult: string;
  upgrades: string[];
  kills: number;
}

export interface MenuState {
  visible: boolean;
  title: string;
  subtitle: string;
  wallet: number;
  choices: ShopChoiceState[];
}

interface UiBridge {
  onHudChange: (nextState: HudState) => void;
  onMenuChange: (nextState: MenuState) => void;
}

export interface GunfightmanGameHandle {
  destroy: (removeCanvas?: boolean) => void;
  restartRun: () => void;
  selectShopChoice: (choiceId: string) => void;
  pause: () => void;
  resume: () => void;
  resize: () => void;
}

export function createGame(parent: HTMLDivElement, uiBridge: UiBridge): GunfightmanGameHandle {
  const scene = new DemoScene(uiBridge);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: '#082336',
    scene: [scene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
  });

  const resizeObserver = new ResizeObserver(() => {
    game.scale.refresh();
  });
  resizeObserver.observe(parent);

  const handle: GunfightmanGameHandle = {
    destroy(removeCanvas = true) {
      resizeObserver.disconnect();
      game.destroy(removeCanvas);
    },
    restartRun() {
      scene.restartRun();
    },
    selectShopChoice(choiceId: string) {
      scene.selectShopChoice(choiceId);
    },
    pause() {
      game.scene.pause('DemoScene');
    },
    resume() {
      game.scene.resume('DemoScene');
    },
    resize() {
      game.scale.refresh();
    },
  };

  return handle;
}
