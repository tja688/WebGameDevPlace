import { createPlaceholderAdapter } from './dom';

export function createBabylonAdapter(title: string, description: string, accent: string) {
  return createPlaceholderAdapter({
    runtime: 'babylon',
    title,
    description,
    accent,
  });
}

