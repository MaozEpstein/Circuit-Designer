/**
 * Theme — Color palettes for dark and light themes.
 */

const DARK = {
  bg:           '#0a0e14',
  grid:         'rgba(30, 60, 100, 0.18)',
  gridAccent:   'rgba(30, 90, 160, 0.28)',

  wireHigh:     '#39ff14',
  wireHighGlow: 'rgba(57,255,20,0.55)',
  wireLow:      '#c62828',
  wireLowGlow:  'rgba(198,40,40,0.35)',
  wireNull:     '#2a3a50',
  wireClock:    '#00d4ff',
  wireClockGlow:'rgba(0,212,255,0.5)',

  nodeInput:       '#0a2a4a',
  nodeInputBorder: '#1e6fa0',
  nodeGate:        '#0e1f33',
  nodeGateBorder:  '#2a4060',
  nodeGateEmpty:   '#1a2a3a',
  nodeGateEmptyBorder: '#3a5a7a',
  nodeOutput:      '#0a1f0a',
  nodeOutputBorder:'#1a6a1a',

  clockFill:       '#0a1a2a',
  clockBorder:     '#0080c0',
  clockBorderHigh: '#00d4ff',

  ffFill:          '#120d22',
  ffBorder:        '#5a2a9a',
  ffBorderActive:  '#a060ff',
  ffQhigh:         '#39ff14',
  ffQlow:          '#c62828',
  ffClkAccent:     '#00d4ff',

  textPrimary:  '#c8d8f0',
  textDim:      '#4a6080',
  textGate:     '#a0c8ff',
  textValue:    '#ffffff',
  textHigh:     '#39ff14',
  textLow:      '#ff4444',
  accentCyan:   '#00d4ff',

  // Block components (MUX, DEMUX, DECODER, etc.)
  blockFill:       '#0a1a1a',
  blockBorder:     '#1a8a6a',
  blockBorderHover:'#20d4a0',
  blockText:       '#20d4a0',
};

const LIGHT = {
  bg:           '#222838',
  grid:         'rgba(60, 120, 180, 0.12)',
  gridAccent:   'rgba(60, 120, 180, 0.22)',
  wireHigh:     '#50cc30',
  wireHighGlow: 'rgba(80,204,48,0.45)',
  wireLow:      '#e04040',
  wireLowGlow:  'rgba(224,64,64,0.3)',
  wireNull:     '#3a4a60',
  wireClock:    '#40b8d8',
  wireClockGlow:'rgba(64,184,216,0.4)',
  nodeInput:       '#1a2a1a',
  nodeInputBorder: '#40a040',
  nodeGate:        '#182840',
  nodeGateBorder:  '#406090',
  nodeGateEmpty:   '#1e2e44',
  nodeGateEmptyBorder: '#4a6a8a',
  nodeOutput:      '#1a2a1a',
  nodeOutputBorder:'#309030',
  clockFill:       '#142838',
  clockBorder:     '#2090c0',
  clockBorderHigh: '#40b8d8',
  ffFill:          '#1e1830',
  ffBorder:        '#7040c0',
  ffBorderActive:  '#9060ee',
  ffQhigh:         '#50cc30',
  ffQlow:          '#e04040',
  ffClkAccent:     '#40b8d8',
  textPrimary:  '#c0cce0',
  textDim:      '#607088',
  textGate:     '#80b0ee',
  textValue:    '#e0e8f0',
  textHigh:     '#50cc30',
  textLow:      '#ff5050',
  accentCyan:   '#40b8d8',
};

/** Active color palette — mutated in place for fast access */
export const C = { ...DARK };

let _isLight = false;

export function setLightTheme(isLight) {
  _isLight = isLight;
  const src = isLight ? LIGHT : DARK;
  Object.keys(src).forEach(k => { C[k] = src[k]; });
}

export function isLightTheme() { return _isLight; }

/** Node geometry constants */
export const NODE = {
  inputR:  28,
  outputR: 28,
  clockR:  28,
  gateW:   90,
  gateH:   52,
  gateR:   8,
  ffW:     110,
  ffH:     82,
  ffR:     8,
};
