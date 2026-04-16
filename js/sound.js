/* ============================================================
   sound.js — Sound Effects (Web Audio API)
   No external files — all sounds generated with oscillators.
   ============================================================ */

const Sound = (() => {

  let _ctx = null;
  let _muted = localStorage.getItem('andgame_mute') === '1';

  function _ensureCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  function _tone(freq, duration, type = 'square', gain = 0.15) {
    if (_muted) return;
    const ctx = _ensureCtx();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    vol.gain.setValueAtTime(gain, ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(vol);
    vol.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  function _sweep(f1, f2, duration, type = 'square', gain = 0.12) {
    if (_muted) return;
    const ctx = _ensureCtx();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(f2, ctx.currentTime + duration);
    vol.gain.setValueAtTime(gain, ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(vol);
    vol.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  const effects = {
    gate() {
      _tone(800, 0.08, 'square', 0.1);
    },
    ff() {
      _tone(600, 0.05, 'square', 0.1);
      setTimeout(() => _tone(800, 0.06, 'square', 0.1), 60);
    },
    step() {
      _tone(200, 0.15, 'sawtooth', 0.08);
    },
    win() {
      _tone(523, 0.12, 'sine', 0.15);
      setTimeout(() => _tone(659, 0.12, 'sine', 0.15), 130);
      setTimeout(() => _tone(784, 0.25, 'sine', 0.18), 260);
    },
    fail() {
      _sweep(400, 200, 0.3, 'sawtooth', 0.1);
    },
    toggle() {
      _tone(1000, 0.05, 'square', 0.08);
    },
    undo() {
      _sweep(600, 400, 0.1, 'sine', 0.08);
    },
    wire() {
      _sweep(400, 600, 0.08, 'sine', 0.08);
    },
    clear() {
      _sweep(600, 150, 0.25, 'sawtooth', 0.1);
      setTimeout(() => _tone(100, 0.15, 'square', 0.06), 150);
    },
  };

  function play(name) {
    if (effects[name]) effects[name]();
  }

  function toggleMute() {
    _muted = !_muted;
    localStorage.setItem('andgame_mute', _muted ? '1' : '0');
    return _muted;
  }

  function isMuted() { return _muted; }

  return { play, toggleMute, isMuted };

})();
