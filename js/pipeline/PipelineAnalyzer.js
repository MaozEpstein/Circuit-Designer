/**
 * PipelineAnalyzer — public API for pipeline analysis.
 * Wraps StageEvaluator with cache + EventBus integration.
 * UI consumers should call analyze() and subscribe to 'pipeline:analyzed'.
 */
import { bus } from '../core/EventBus.js';
import { evaluate } from './StageEvaluator.js';

export class PipelineAnalyzer {
  constructor(scene) {
    this._scene = scene;
    this._cache = null;
    this._dirty = true;

    const invalidate = () => { this._dirty = true; };
    bus.on('node:added', invalidate);
    bus.on('node:removed', invalidate);
    bus.on('wire:added', invalidate);
    bus.on('wire:removed', invalidate);
    bus.on('scene:loaded', invalidate);
    bus.on('scene:cleared', invalidate);
  }

  analyze({ force = false } = {}) {
    if (!force && !this._dirty && this._cache) return this._cache;
    this._cache = evaluate(this._scene);
    this._dirty = false;
    bus.emit('pipeline:analyzed', this._cache);
    return this._cache;
  }

  invalidate() { this._dirty = true; }
}
