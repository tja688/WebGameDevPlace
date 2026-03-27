import { playgroundModules } from '../../playgrounds';
import { templateModules } from '../../templates';
import type { PlaygroundModule } from './types';

export const registry: PlaygroundModule[] = [...playgroundModules, ...templateModules];

export const playgroundGroups = [
  {
    title: 'Playgrounds',
    items: playgroundModules,
  },
  {
    title: 'Templates',
    items: templateModules,
  },
];

export function getModuleById(id: string) {
  return registry.find((module) => module.meta.id === id);
}

