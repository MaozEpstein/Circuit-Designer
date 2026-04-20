// HDL component translator registry.
// Each translator: (node, ctx) -> { decls?: string[], body?: string[] }
//   decls — extra reg/wire declarations beyond the top-level net pass
//   body  — assign / always / instantiation lines emitted inside the module
// Phase 1 ships the registry itself; translators for real components arrive
// in Phases 2-4.

const registry = new Map();

export function registerTranslator(type, fn) {
  registry.set(type, fn);
}

export function getTranslator(type) {
  return registry.get(type) || null;
}

export function hasTranslator(type) {
  return registry.has(type);
}

export function listTranslators() {
  return [...registry.keys()];
}
