import { useEffect, useMemo, useRef, useState } from 'react';
import { getProjectById, projectRegistry } from '../platform/runtime/registry';
import { ProjectViewport } from './ProjectViewport';
import type { ProjectModule, RuntimeHandle } from '../platform/runtime/types';

const HOME_HASH = '#/';
const RECENT_PROJECTS_KEY = 'web-game-dev-place:recent-projects';
const MAX_RECENT_PROJECTS = 3;

type RouteState =
  | {
      mode: 'home';
    }
  | {
      mode: 'play';
      projectId: string;
    };

function readRoute(hash: string): RouteState {
  const normalized = hash.replace(/^#/, '');

  if (normalized.startsWith('/play/')) {
    const projectId = normalized.slice('/play/'.length).trim();
    if (projectId) {
      return { mode: 'play', projectId };
    }
  }

  return { mode: 'home' };
}

function routeToHash(route: RouteState) {
  return route.mode === 'home' ? HOME_HASH : `#/play/${route.projectId}`;
}

function readRecentProjectIds() {
  if (typeof window === 'undefined') {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_PROJECTS_KEY);
    if (!raw) {
      return [] as string[];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [] as string[];
  }
}

function writeRecentProjectIds(ids: string[]) {
  window.localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(ids.slice(0, MAX_RECENT_PROJECTS)));
}

function rememberRecentProject(projectId: string) {
  const next = [projectId, ...readRecentProjectIds().filter((id) => id !== projectId)];
  writeRecentProjectIds(next);
}

function statusLabel(status: ProjectModule['meta']['status']) {
  return status === 'active' ? 'Active' : status === 'stable' ? 'Stable' : 'Draft';
}

export function AppShell() {
  const [route, setRoute] = useState<RouteState>(() => readRoute(window.location.hash));
  const [query, setQuery] = useState('');
  const [recentProjectIds, setRecentProjectIds] = useState<string[]>(() => readRecentProjectIds());
  const [pauseOpen, setPauseOpen] = useState(false);
  const runtimeHandleRef = useRef<RuntimeHandle | null>(null);

  const currentProject =
    route.mode === 'play' ? getProjectById(route.projectId) ?? null : null;

  const filteredProjects = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return projectRegistry;
    }

    return projectRegistry.filter((project) => {
      const haystack = [
        project.meta.title,
        project.meta.description,
        project.meta.primaryRuntime,
        ...project.meta.tags,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(value);
    });
  }, [query]);

  const recentProjects = useMemo(
    () =>
      recentProjectIds
        .map((id) => getProjectById(id))
        .filter((project): project is ProjectModule => Boolean(project)),
    [recentProjectIds],
  );

  useEffect(() => {
    const syncRoute = () => {
      setRoute(readRoute(window.location.hash));
    };

    if (!window.location.hash) {
      window.location.hash = HOME_HASH;
    }

    syncRoute();
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  useEffect(() => {
    const expectedHash = routeToHash(route);
    if (window.location.hash !== expectedHash) {
      window.location.hash = expectedHash;
    }
  }, [route]);

  useEffect(() => {
    if (route.mode !== 'play' || !currentProject) {
      setPauseOpen(false);
      return;
    }

    rememberRecentProject(currentProject.meta.id);
    setRecentProjectIds(readRecentProjectIds());
  }, [currentProject, route.mode]);

  useEffect(() => {
    if (route.mode !== 'play' || !currentProject) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      setPauseOpen((open) => !open);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentProject, route.mode]);

  useEffect(() => {
    const handle = runtimeHandleRef.current;
    if (!handle) {
      return;
    }

    if (pauseOpen) {
      handle.pause();
      return;
    }

    handle.resume();
    handle.resize();
  }, [pauseOpen]);

  useEffect(() => {
    if (route.mode !== 'play' || currentProject) {
      return;
    }

    setRoute({ mode: 'home' });
  }, [currentProject, route.mode]);

  const openProject = (projectId: string) => {
    setPauseOpen(false);
    setRoute({ mode: 'play', projectId });
  };

  const returnHome = () => {
    setPauseOpen(false);
    setRoute({ mode: 'home' });
  };

  return route.mode === 'play' && currentProject ? (
    <main className="play-shell">
      <ProjectViewport
        project={currentProject}
        paused={pauseOpen}
        onHandleChange={(handle) => {
          runtimeHandleRef.current = handle;
        }}
      />

      {pauseOpen ? (
        <div className="pause-overlay" role="dialog" aria-modal="true" aria-label="Paused">
          <div className="pause-panel">
            <p className="pause-kicker">Paused</p>
            <h1>{currentProject.meta.title}</h1>
            <p>{currentProject.meta.primaryRuntime} runtime</p>
            <div className="pause-actions">
              <button type="button" className="pause-action is-primary" onClick={() => setPauseOpen(false)}>
                Resume
              </button>
              <button type="button" className="pause-action" onClick={returnHome}>
                Home
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  ) : (
    <main className="app-shell">
      <section className="launcher-shell">
        <header className="launcher-header">
          <div>
            <p className="eyebrow">Web Game Dev Place</p>
            <h1>Project Library</h1>
            <p className="launcher-lede">
              Browse current experiments, reopen recent work, and jump directly into play without
              runtime-first clutter.
            </p>
          </div>

          <div className="launcher-summary">
            <span>{projectRegistry.length} projects</span>
            <span>Hash-routed play</span>
            <span>No public templates</span>
          </div>
        </header>

        <section className="launcher-controls">
          <label className="search-field">
            <span>Search Projects</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, description, runtime, or tag"
            />
          </label>
        </section>

        {recentProjects.length > 0 ? (
          <section className="launcher-section">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Recent Development</p>
                <h2>Continue where you left off</h2>
              </div>
            </div>

            <div className="recent-grid">
              {recentProjects.map((project) => (
                <button
                  key={project.meta.id}
                  type="button"
                  className="project-card recent-card"
                  onClick={() => openProject(project.meta.id)}
                >
                  <div className="project-card-top">
                    <span className="project-runtime">{project.meta.primaryRuntime}</span>
                    <span className="project-status">{statusLabel(project.meta.status)}</span>
                  </div>
                  <strong>{project.meta.title}</strong>
                  <p>{project.meta.description}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="launcher-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Project Library</p>
              <h2>{query ? 'Filtered projects' : 'Current experiments'}</h2>
            </div>
            <span>{filteredProjects.length}</span>
          </div>

          {filteredProjects.length > 0 ? (
            <div className="project-grid">
              {filteredProjects.map((project) => (
                <button
                  key={project.meta.id}
                  type="button"
                  className="project-card"
                  onClick={() => openProject(project.meta.id)}
                >
                  <div className="project-card-top">
                    <span className="project-runtime">{project.meta.primaryRuntime}</span>
                    <span className="project-status">{statusLabel(project.meta.status)}</span>
                  </div>
                  <strong>{project.meta.title}</strong>
                  <p>{project.meta.description}</p>
                  <div className="project-tags">
                    {project.meta.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="section-kicker">No Matches</p>
              <h2>No project fits this search yet.</h2>
              <p>Clear the search or add a new project through the local skills workflow.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default AppShell;
