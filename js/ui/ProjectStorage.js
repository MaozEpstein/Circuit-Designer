/**
 * ProjectStorage — Save/load projects using IndexedDB.
 *
 * Stores complete project state: circuit (nodes, wires),
 * annotations, breakpoints, and metadata.
 */
import { bus } from '../core/EventBus.js';

const DB_NAME = 'CircuitDesignerPro';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

/**
 * @typedef {object} Project
 * @property {string} id
 * @property {string} name
 * @property {number} created
 * @property {number} modified
 * @property {object} circuit — { nodes, wires }
 * @property {object[]} annotations
 * @property {object} metadata
 */

function _openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('modified', 'modified', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class ProjectStorage {
  /**
   * Save a project.
   */
  async save(project) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      project.modified = Date.now();
      if (!project.created) project.created = Date.now();
      if (!project.id) project.id = 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      store.put(project);
      tx.oncomplete = () => {
        bus.emit('project:saved', { id: project.id, name: project.name });
        resolve(project);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Load a project by ID.
   */
  async load(projectId) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(projectId);
      req.onsuccess = () => {
        if (req.result) {
          bus.emit('project:loaded', req.result);
          resolve(req.result);
        } else {
          reject(new Error('Project not found'));
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * List all saved projects.
   */
  async list() {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const idx = store.index('modified');
      const req = idx.getAll();
      req.onsuccess = () => {
        const projects = req.result.sort((a, b) => b.modified - a.modified);
        resolve(projects.map(p => ({
          id: p.id,
          name: p.name,
          created: p.created,
          modified: p.modified,
          nodeCount: p.circuit?.nodes?.length || 0,
          wireCount: p.circuit?.wires?.length || 0,
        })));
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Delete a project by ID.
   */
  async delete(projectId) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(projectId);
      tx.oncomplete = () => {
        bus.emit('project:deleted', { id: projectId });
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Export a project as a JSON string (for file download).
   */
  exportJSON(project) {
    return JSON.stringify(project, null, 2);
  }

  /**
   * Import a project from a JSON string.
   */
  importJSON(jsonStr) {
    const project = JSON.parse(jsonStr);
    if (!project.circuit || !project.circuit.nodes) {
      throw new Error('Invalid project file');
    }
    // Assign new ID to avoid conflicts
    project.id = 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    project.modified = Date.now();
    return project;
  }
}
