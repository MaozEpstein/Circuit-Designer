/**
 * SubCircuitRegistry — Stores and manages sub-circuit definitions.
 * Each definition contains the internal nodes/wires and the interface (inputs/outputs).
 */

export class SubCircuitRegistry {
  constructor() {
    /** @type {Map<string, object>} name → definition */
    this._defs = new Map();
  }

  /**
   * Create a sub-circuit definition from selected nodes and wires.
   * INPUT nodes become the block's inputs, OUTPUT nodes become the block's outputs.
   * @param {string} name - Unique name for this sub-circuit
   * @param {object[]} nodes - The internal nodes
   * @param {object[]} wires - The internal wires (only those between the selected nodes)
   * @returns {object} The definition
   */
  define(name, nodes, wires) {
    // Find INPUT and OUTPUT nodes — they become the interface
    const inputs = nodes
      .filter(n => n.type === 'INPUT')
      .map((n, i) => ({ id: n.id, label: n.label || 'IN' + i, index: i }));

    const outputs = nodes
      .filter(n => n.type === 'OUTPUT')
      .map((n, i) => ({ id: n.id, label: n.label || 'OUT' + i, index: i }));

    // Deep clone internal circuit
    const internalNodes = JSON.parse(JSON.stringify(nodes));
    const internalWires = JSON.parse(JSON.stringify(wires));

    const def = {
      name,
      inputs,
      outputs,
      nodes: internalNodes,
      wires: internalWires,
    };

    this._defs.set(name, def);
    return def;
  }

  /**
   * Get a sub-circuit definition by name.
   */
  get(name) {
    return this._defs.get(name) || null;
  }

  /**
   * List all registered sub-circuit names.
   */
  list() {
    return [...this._defs.keys()];
  }

  /**
   * Remove a sub-circuit definition.
   */
  remove(name) {
    this._defs.delete(name);
  }

  /**
   * Create an instance of a sub-circuit for placement.
   * Returns a SUB_CIRCUIT node with deep-cloned internal state.
   * @param {string} name
   * @param {number} x
   * @param {number} y
   * @param {string} nodeId - ID for the new node
   */
  createInstance(name, x, y, nodeId) {
    const def = this._defs.get(name);
    if (!def) return null;

    return {
      type: 'SUB_CIRCUIT',
      id: nodeId,
      x, y,
      label: def.name,
      subName: def.name,
      subInputs: def.inputs.map(inp => ({ ...inp })),
      subOutputs: def.outputs.map(out => ({ ...out })),
      subCircuit: {
        nodes: JSON.parse(JSON.stringify(def.nodes)),
        wires: JSON.parse(JSON.stringify(def.wires)),
      },
    };
  }

  /**
   * Serialize all definitions for saving.
   */
  serialize() {
    const result = {};
    for (const [name, def] of this._defs) {
      result[name] = JSON.parse(JSON.stringify(def));
    }
    return result;
  }

  /**
   * Load definitions from saved data.
   */
  deserialize(data) {
    this._defs.clear();
    if (!data) return;
    for (const [name, def] of Object.entries(data)) {
      this._defs.set(name, def);
    }
  }
}
