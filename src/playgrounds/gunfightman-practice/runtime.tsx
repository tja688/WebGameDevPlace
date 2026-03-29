import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import type { RuntimeAdapter, RuntimeHandle } from '../../platform/runtime/types';
import {
  createGame,
  INITIAL_HUD_STATE,
  INITIAL_MENU_STATE,
  type GunfightmanGameHandle,
  type HudState,
  type MenuState,
} from './game/createGame';

function HeartMeter({ hp, maxHp }: { hp: number; maxHp: number }) {
  return (
    <div className="gunfightman-hearts" aria-label={`Health ${hp}/${maxHp}`}>
      {Array.from({ length: maxHp }, (_, index) => (
        <span
          key={`${maxHp}-${index}`}
          className={index < hp ? 'gunfightman-heart is-filled' : 'gunfightman-heart'}
        />
      ))}
    </div>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  const width = `${Math.max(4, Math.round(value * 100))}%`;

  return (
    <div className="gunfightman-progress">
      <div className="gunfightman-progress-meta">
        <span>{label}</span>
        <strong>{Math.round(value * 100)}%</strong>
      </div>
      <div className="gunfightman-progress-track">
        <div className="gunfightman-progress-fill" style={{ width }} />
      </div>
    </div>
  );
}

function GunfightmanRuntime({
  onGameHandleChange,
}: {
  onGameHandleChange: (handle: GunfightmanGameHandle | null) => void;
}) {
  const gameHostRef = useRef<HTMLDivElement | null>(null);
  const gameHandleRef = useRef<GunfightmanGameHandle | null>(null);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD_STATE);
  const [menu, setMenu] = useState<MenuState>(INITIAL_MENU_STATE);

  const commitHud = useEffectEvent((nextState: HudState) => {
    startTransition(() => {
      setHud(nextState);
    });
  });

  const commitMenu = useEffectEvent((nextState: MenuState) => {
    startTransition(() => {
      setMenu(nextState);
    });
  });

  useEffect(() => {
    const host = gameHostRef.current;
    if (!host || gameHandleRef.current) {
      return;
    }

    let active = true;
    gameHandleRef.current = createGame(host, {
      onHudChange: (nextState) => {
        if (active) {
          commitHud(nextState);
        }
      },
      onMenuChange: (nextState) => {
        if (active) {
          commitMenu(nextState);
        }
      },
    });
    onGameHandleChange(gameHandleRef.current);

    return () => {
      active = false;
      gameHandleRef.current?.destroy(true);
      gameHandleRef.current = null;
      onGameHandleChange(null);
      startTransition(() => {
        setHud(INITIAL_HUD_STATE);
        setMenu(INITIAL_MENU_STATE);
      });
    };
  }, [commitHud, commitMenu, onGameHandleChange]);

  const deferredHud = useDeferredValue(hud);
  const deferredMenu = useDeferredValue(menu);
  const canRestart = Boolean(deferredHud.runResult);

  return (
    <div className="gunfightman-runtime">
      <div className="gunfightman-game-host" ref={gameHostRef} />

      <div className="gunfightman-overlay">
        <div className="gunfightman-topbar">
          <section className="gunfightman-brief">
            <p className="gunfightman-kicker">GunFightMan Practice</p>
            <h2>{deferredHud.phaseLabel}</h2>
            <p>{deferredHud.objective}</p>
          </section>

          <section className="gunfightman-status">
            <div className="gunfightman-stat-row">
              <HeartMeter hp={deferredHud.hp} maxHp={deferredHud.maxHp} />
              <div className="gunfightman-pill-grid">
                <span>Ammo {deferredHud.ammo}/{deferredHud.maxAmmo}</span>
                <span>Wallet {deferredHud.wallet}</span>
                <span>Combo {deferredHud.comboLabel}</span>
                <span>Kills {deferredHud.kills}</span>
              </div>
            </div>

            <ProgressBar label="Run Progress" value={deferredHud.progress} />

            {deferredHud.bossActive ? (
              <ProgressBar
                label="Boss"
                value={deferredHud.bossMaxHp ? deferredHud.bossHp / deferredHud.bossMaxHp : 0}
              />
            ) : null}

            <p className="gunfightman-status-line">{deferredHud.statusLine}</p>
          </section>
        </div>

        <div className="gunfightman-bottombar">
          <span>Mouse aim</span>
          <span>Hold left click or Space to fire</span>
          <span>R reload</span>
          <span>E dock shop</span>
        </div>

        {deferredMenu.visible ? (
          <div className="gunfightman-modal">
            <div className="gunfightman-modal-head">
              <div>
                <p className="gunfightman-kicker">Supply Ship</p>
                <h3>{deferredMenu.title}</h3>
                <p>{deferredMenu.subtitle}</p>
              </div>
              <strong>{deferredMenu.wallet} diamonds</strong>
            </div>

            <div className="gunfightman-shop-grid">
              {deferredMenu.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className="gunfightman-shop-option"
                  disabled={!choice.affordable}
                  onClick={() => gameHandleRef.current?.selectShopChoice(choice.id)}
                >
                  <span className="gunfightman-shop-cost">{choice.cost}</span>
                  <strong>{choice.title}</strong>
                  <p>{choice.description}</p>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="gunfightman-secondary"
              onClick={() => gameHandleRef.current?.selectShopChoice('skip')}
            >
              Skip supply and keep sailing
            </button>
          </div>
        ) : null}

        {canRestart ? (
          <div className="gunfightman-modal gunfightman-result">
            <p className="gunfightman-kicker">
              {deferredHud.runResult === 'escaped' ? 'Escaped' : 'Restart'}
            </p>
            <h3>{deferredHud.runResult === 'escaped' ? 'Demo cleared' : 'The raft sank'}</h3>
            <p>{deferredHud.statusLine}</p>
            <button
              type="button"
              className="gunfightman-primary"
              onClick={() => gameHandleRef.current?.restartRun()}
            >
              Restart run
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function createGunfightmanPracticeAdapter(): RuntimeAdapter {
  return {
    runtime: 'phaser',
    mount(context): RuntimeHandle {
      context.container.innerHTML = '';
      let gameHandle: GunfightmanGameHandle | null = null;

      const host = document.createElement('div');
      host.className = 'gunfightman-runtime-shell';
      context.container.append(host);

      const root = createRoot(host);
      root.render(
        <GunfightmanRuntime
          onGameHandleChange={(nextHandle) => {
            gameHandle = nextHandle;
          }}
        />,
      );

      return {
        resize() {
          gameHandle?.resize();
        },
        pause() {
          gameHandle?.pause();
        },
        resume() {
          gameHandle?.resume();
          gameHandle?.resize();
        },
        destroy() {
          root.unmount();
          gameHandle = null;
          host.remove();
        },
      };
    },
  };
}
