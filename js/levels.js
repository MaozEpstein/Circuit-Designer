/* ============================================================
   levels.js — Single Design Mode Level for Circuit Designer
   ============================================================ */

const LEVELS = [
  {
    id: 1, name: 'DESIGN MODE', difficulty: 'Design Mode',
    description: 'Design Mode — create your own circuit from scratch. Place nodes, draw wires, and build whatever you want. Export your creation and share it with others.',
    instruction: 'Welcome to Circuit Designer! Use the toolbar on the left to place components and draw wires.',
    instructionHtml: '<div style="text-align:center;margin:16px 0"><svg viewBox="0 0 220 140" width="165" height="105"><rect x="10" y="10" width="200" height="120" rx="10" fill="#0a0e14" stroke="#a060ff" stroke-width="2"/><circle cx="50" cy="50" r="15" fill="rgba(57,255,20,0.15)" stroke="#39ff14" stroke-width="2"/><text x="50" y="54" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="#39ff14">IN</text><rect x="90" y="38" width="40" height="25" rx="4" fill="rgba(0,212,255,0.1)" stroke="#00d4ff" stroke-width="1.5"/><text x="110" y="55" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="#00d4ff">GATE</text><circle cx="170" cy="50" r="15" fill="rgba(200,216,240,0.1)" stroke="#c8d8f0" stroke-width="2"/><text x="170" y="54" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9" fill="#c8d8f0">OUT</text><line x1="65" y1="50" x2="90" y2="50" stroke="#39ff14" stroke-width="2"/><line x1="130" y1="50" x2="155" y2="50" stroke="#39ff14" stroke-width="2"/><text x="110" y="100" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="11" font-weight="bold" fill="#a060ff">BUILD YOUR OWN</text><text x="110" y="118" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="11" font-weight="bold" fill="#a060ff">CIRCUIT</text></svg></div><p style="text-align:center;color:#c8d8f0;font-size:14px;margin:8px 0">Place inputs, gates, flip-flops, and outputs on an empty canvas.</p><p style="text-align:center;color:#c8d8f0;font-size:14px;margin:4px 0">Draw wires to connect them. Test your circuit. Export and share!</p>',
    hint: 'Use the toolbar on the left: select a tool, click on the canvas to place. Switch to WIRE mode to connect nodes. Click TEST to try your circuit.',
    nodes: [],
    wires: [],
  },
];

function deriveHint(level) {
  return level.hint || 'Use the toolbar to place components and draw wires.';
}
