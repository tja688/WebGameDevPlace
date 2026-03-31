import {
  startTransition,
  useDeferredValue,
  useEffect,
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

function GunfightmanRuntime({
  onGameHandleChange,
}: {
  onGameHandleChange: (handle: GunfightmanGameHandle | null) => void;
}) {
  const gameHostRef = useRef<HTMLDivElement | null>(null);
  const gameHandleRef = useRef<GunfightmanGameHandle | null>(null);
  const onGameHandleChangeRef = useRef(onGameHandleChange);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD_STATE);
  const [menu, setMenu] = useState<MenuState>(INITIAL_MENU_STATE);

  useEffect(() => {
    onGameHandleChangeRef.current = onGameHandleChange;
  }, [onGameHandleChange]);

  useEffect(() => {
    const host = gameHostRef.current;
    if (!host || gameHandleRef.current) {
      return;
    }

    let active = true;
    gameHandleRef.current = createGame(host, {
      onHudChange: (nextState) => {
        if (active) {
          startTransition(() => {
            setHud(nextState);
          });
        }
      },
      onMenuChange: (nextState) => {
        if (active) {
          startTransition(() => {
            setMenu(nextState);
          });
        }
      },
    });
    onGameHandleChangeRef.current(gameHandleRef.current);

    return () => {
      active = false;
      gameHandleRef.current?.destroy(true);
      gameHandleRef.current = null;
      onGameHandleChangeRef.current(null);
      startTransition(() => {
        setHud(INITIAL_HUD_STATE);
        setMenu(INITIAL_MENU_STATE);
      });
    };
  }, []);

  const deferredHud = useDeferredValue(hud);
  const deferredMenu = useDeferredValue(menu);
  const canRestart = Boolean(deferredHud.runResult);

  return (
    <div className="gunfightman-runtime">
      <div className="gunfightman-game-host" ref={gameHostRef} />

      {deferredMenu.visible || canRestart ? (
        <div className="gunfightman-overlay">
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
      ) : null}
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
        getPauseSnapshot() {
          return gameHandle?.getPauseSnapshot() ?? null;
        },
      };
    },
  };
}
