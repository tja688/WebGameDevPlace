import type { CSSProperties } from 'react';
import { engineCatalog, stackHighlights } from './engineCatalog';

function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Web Game Dev Infrastructure</p>
          <h1>面向多引擎实验的统一起点</h1>
          <p className="lede">
            这个仓库已经把 PixiJS、Phaser 3、Three.js、Babylon.js、Vite 和 React
            放在同一个起跑线上，方便我们后续按玩法或引擎拆分 demo。
          </p>
        </div>

        <aside className="hero-panel">
          <p className="panel-label">Stack Highlights</p>
          <ul>
            {stackHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="catalog">
        {engineCatalog.map((engine) => (
          <article
            className="engine-card"
            key={engine.name}
            style={{ '--accent': engine.accent } as CSSProperties}
          >
            <p className="engine-focus">{engine.focus}</p>
            <h2>{engine.name}</h2>
            <p className="package-name">{engine.packageName}</p>
            <p>{engine.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
