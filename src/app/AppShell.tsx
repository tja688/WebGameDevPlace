import { useEffect, useMemo, useState } from 'react';
import { registry, getModuleById, playgroundGroups } from '../platform/runtime/registry';
import { ModuleList } from './ModuleList';
import { ModuleViewport } from './ModuleViewport';
import { DebugOverlay } from '../platform/debug/DebugOverlay';

const firstSelectableId = registry[0]?.meta.id ?? '';

export function AppShell() {
  const [selectedId, setSelectedId] = useState(() => {
    const fromHash = window.location.hash.replace(/^#module=/, '');
    return getModuleById(fromHash) ? fromHash : firstSelectableId;
  });

  const selectedModule = useMemo(() => getModuleById(selectedId) ?? registry[0], [selectedId]);

  useEffect(() => {
    if (!selectedModule) {
      return;
    }

    const nextHash = `#module=${selectedModule.meta.id}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, [selectedModule]);

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Web Runtime Playground</p>
          <h1>多 runtime 游戏实验平台的基础模板</h1>
          <p className="lede">
            React 负责平台壳层，Playground 以文件夹为单位组织，Phaser / PixiJS / Three.js /
            Babylon.js 通过统一的生命周期接口接入。
          </p>
        </div>

        <div className="hero-panel">
          <p className="panel-label">Core Rules</p>
          <ul>
            <li>一个 playground 只允许一个主 runtime</li>
            <li>platform 层统一生命周期，不强行统一引擎 API</li>
            <li>main 保持可运行，分支只负责短期开发</li>
          </ul>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          {playgroundGroups.map((group) => (
            <section key={group.title} className="module-group">
              <div className="module-group-header">
                <h2>{group.title}</h2>
                <span>{group.items.length}</span>
              </div>

              <ModuleList
                modules={group.items}
                selectedId={selectedModule?.meta.id ?? ''}
                onSelect={setSelectedId}
              />
            </section>
          ))}
        </aside>

        <section className="playground-stage">
          {selectedModule ? (
            <>
              <div className="stage-header">
                <div>
                  <p className="stage-kicker">{selectedModule.meta.kind}</p>
                  <h2>{selectedModule.meta.title}</h2>
                  <p>{selectedModule.meta.description}</p>
                </div>
                <div className="stage-meta">
                  <span>{selectedModule.meta.primaryRuntime}</span>
                  <span>{selectedModule.meta.status}</span>
                </div>
              </div>

              <ModuleViewport module={selectedModule} />
              <DebugOverlay module={selectedModule} />
            </>
          ) : (
            <div className="empty-stage">No module selected.</div>
          )}
        </section>
      </section>
    </main>
  );
}

export default AppShell;
