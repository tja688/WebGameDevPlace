import { projectModules } from '../../playgrounds';
import type { ProjectModule } from './types';

export const projectRegistry: ProjectModule[] = [...projectModules];

export function getProjectById(id: string) {
  return projectRegistry.find((module) => module.meta.id === id);
}
