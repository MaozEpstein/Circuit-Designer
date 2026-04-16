/**
 * CommandManager — Command pattern for undo/redo.
 * Every user action is wrapped in a Command object with execute/undo methods.
 */
import { bus } from './EventBus.js';

export class Command {
  /** @param {string} description */
  constructor(description = '') {
    this.description = description;
  }
  execute() { throw new Error('Command.execute() not implemented'); }
  undo() { throw new Error('Command.undo() not implemented'); }
}

export class CommandManager {
  constructor(maxHistory = 100) {
    this._undoStack = [];
    this._redoStack = [];
    this._maxHistory = maxHistory;
  }

  /**
   * Execute a command and push it onto the undo stack.
   * @param {Command} cmd
   */
  execute(cmd) {
    cmd.execute();
    this._undoStack.push(cmd);
    if (this._undoStack.length > this._maxHistory) {
      this._undoStack.shift();
    }
    this._redoStack = [];
    bus.emit('command:executed', cmd);
    bus.emit('history:changed', { canUndo: this.canUndo, canRedo: this.canRedo });
  }

  undo() {
    if (this._undoStack.length === 0) return false;
    const cmd = this._undoStack.pop();
    cmd.undo();
    this._redoStack.push(cmd);
    bus.emit('command:undone', cmd);
    bus.emit('history:changed', { canUndo: this.canUndo, canRedo: this.canRedo });
    return true;
  }

  redo() {
    if (this._redoStack.length === 0) return false;
    const cmd = this._redoStack.pop();
    cmd.execute();
    this._undoStack.push(cmd);
    bus.emit('command:redone', cmd);
    bus.emit('history:changed', { canUndo: this.canUndo, canRedo: this.canRedo });
    return true;
  }

  get canUndo() { return this._undoStack.length > 0; }
  get canRedo() { return this._redoStack.length > 0; }

  clear() {
    this._undoStack = [];
    this._redoStack = [];
    bus.emit('history:changed', { canUndo: false, canRedo: false });
  }
}
