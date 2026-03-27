import type { PlaygroundMeta, PlaygroundModule } from './types';
import { createPlaceholderAdapter } from './adapters/dom';
import { createPhaserAdapter } from './adapters/phaser';
import { createPixiAdapter } from './adapters/pixi';
import { createThreeAdapter } from './adapters/three';
import { createBabylonAdapter } from './adapters/babylon';

export function createPlaygroundModule(meta: PlaygroundMeta, flavor: 'phaser' | 'pixi' | 'three' | 'babylon' | 'placeholder'): PlaygroundModule {
  const createAdapter =
    flavor === 'phaser'
      ? () => createPhaserAdapter({ title: meta.title, accent: meta.accent })
      : flavor === 'pixi'
        ? () => createPixiAdapter(meta.title, meta.description, meta.accent)
        : flavor === 'three'
          ? () => createThreeAdapter(meta.title, meta.description, meta.accent)
          : flavor === 'babylon'
            ? () => createBabylonAdapter(meta.title, meta.description, meta.accent)
            : () =>
                createPlaceholderAdapter({
                  runtime: meta.primaryRuntime,
                  title: meta.title,
                  description: meta.description,
                  accent: meta.accent,
                });

  return {
    meta,
    createAdapter,
  };
}

