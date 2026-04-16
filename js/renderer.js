/* ============================================================
   renderer.js — Canvas Drawing Engine
   Supports INPUT, GATE_SLOT, OUTPUT, CLOCK, and FLIPFLOP nodes.
   ============================================================ */

const Renderer = (() => {

  // ── Color Palette ─────────────────────────────────────────
  const C = {
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

    // Clock node
    clockFill:       '#0a1a2a',
    clockBorder:     '#0080c0',
    clockBorderHigh: '#00d4ff',

    // Flip-flop node
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
  };

  // Dark theme defaults (saved for toggle)
  const C_DARK = { ...C };

  const C_LIGHT = {
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

  function setLightTheme(isLight) {
    const src = isLight ? C_LIGHT : C_DARK;
    Object.keys(src).forEach(k => { C[k] = src[k]; });
  }

  // ── Node geometry ──────────────────────────────────────────
  const NODE = {
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

  let canvas, ctx;
  let W, H;

  // ── Vertical-layout centering ─────────────────────────────
  let _currentLayout = null;
  let _offsetX = 0, _offsetY = 0;
  let _userPanned = false;
  let _userZoom = 1;
  let _baseScale = 1;
  let _baseOffsetX = 0, _baseOffsetY = 0;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx    = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // ── Centering + auto-scale for all levels ───────────────────
  let _scale = 1;

  function _computeCenterOffset(level) {
    if (!level) { _currentLayout = null; _offsetX = 0; _offsetY = 0; _scale = 1; return; }
    _currentLayout = level.layout || null;
    // Empty canvas (design mode) — use identity transform so clicks map 1:1
    if (level.nodes.length === 0) {
      _scale = 1;
      _offsetX = 0;
      _offsetY = 56;  // offset past HUD
      return;
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    level.nodes.forEach(n => {
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
    });
    // Add padding around the bounding box
    const pad = 100;
    const levelW = (maxX - minX) + pad * 2;
    const levelH = (maxY - minY) + pad * 2;
    const availW = W;
    const availH = H - 56;   // 56 = HUD height
    // Scale down if the level is too big, never scale up beyond 1
    _baseScale = Math.min(1, availW / levelW, availH / levelH);
    const levelCX = (minX + maxX) / 2;
    const levelCY = (minY + maxY) / 2;
    _baseOffsetX = W / 2 - levelCX * _baseScale;
    _baseOffsetY = (56 + H) / 2 - levelCY * _baseScale;
    _scale = _baseScale * _userZoom;
    _offsetX = W / 2 - levelCX * _scale;
    _offsetY = (56 + H) / 2 - levelCY * _scale;
  }

  // ── Main Render ───────────────────────────────────────────
  let _stepCount = 0;
  let _currentLevel = null;
  let _currentNodeValues = null;
  function render(level, evalResult, hoveredNodeId, solved, stepCount) {
    _stepCount = stepCount || 0;
    _currentLevel = level;
    _currentNodeValues = (evalResult && evalResult.nodeValues) || new Map();
    if (!ctx || !level) return;

    ctx.clearRect(0, 0, W, H);
    _drawBackground();
    _drawGrid();

    if (!State.designMode && !_userPanned) _computeCenterOffset(level);

    const { wireValues, nodeValues } = evalResult || {
      wireValues: new Map(),
      nodeValues:  new Map(),
    };

    const ffStates = State.getFfStates ? State.getFfStates() : new Map();

    ctx.save();
    ctx.translate(_offsetX, _offsetY);
    if (_scale !== 1) ctx.scale(_scale, _scale);

    _drawWires(level, wireValues);
    _drawPulses(level, wireValues);
    _drawNodes(level, nodeValues, ffStates, hoveredNodeId, solved);

    // Design mode: wire preview line from source to mouse
    if (State.designMode && Input.wireSource && State.designTool === 'wire') {
      const src = Input.wireSource;
      const mouse = Input.mouseWorld;
      // Check if hovering over an invalid target
      const hNode = hoveredNodeId ? level.nodes.find(n => n.id === hoveredNodeId) : null;
      let wireColor = '#a060ff'; // default purple
      if (hNode) {
        const isSelf = hNode.id === src.id;
        const isDup = level.wires.some(w => w.sourceId === src.id && w.targetId === hNode.id);
        wireColor = (isSelf || isDup) ? '#ff4444' : '#39ff14';
      }
      const isInvalid = hNode && (hNode.id === src.id || level.wires.some(w => w.sourceId === src.id && w.targetId === hNode.id));
      ctx.save();
      // Wire line
      ctx.shadowColor = wireColor;
      ctx.shadowBlur = isInvalid ? 20 : 10;
      ctx.strokeStyle = wireColor;
      ctx.lineWidth = isInvalid ? 4 : 2;
      ctx.setLineDash(isInvalid ? [8, 6] : [6, 4]);
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(mouse.x, mouse.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Highlight source node
      ctx.beginPath();
      ctx.arc(src.x, src.y, 22, 0, Math.PI * 2);
      ctx.strokeStyle = wireColor;
      ctx.lineWidth = 3;
      ctx.stroke();
      // Invalid target: draw X and red ring on hovered node
      if (isInvalid && hNode) {
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(hNode.x, hNode.y, 30, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 4;
        ctx.stroke();
        // Draw X
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hNode.x - 10, hNode.y - 10);
        ctx.lineTo(hNode.x + 10, hNode.y + 10);
        ctx.moveTo(hNode.x + 10, hNode.y - 10);
        ctx.lineTo(hNode.x - 10, hNode.y + 10);
        ctx.stroke();
      }
      // Valid target: green ring on hovered node
      if (hNode && !isInvalid) {
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(hNode.x, hNode.y, 30, 0, Math.PI * 2);
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();

    // Tooltip on hovered node
    if (hoveredNodeId) {
      _drawNodeTooltip(level, hoveredNodeId, nodeValues);
    }

    // Wire tooltip (only when no node is hovered)
    if (!hoveredNodeId && Input.mouseCanvas) {
      const mc = Input.mouseCanvas;
      const hWire = getWireAtPoint(mc.x, mc.y, level);
      if (hWire) {
        _drawWireTooltip(level, hWire, wireValues, mc.x, mc.y);
      }
    }

    if (_explainActive) {
      ctx.save();
      ctx.translate(_offsetX, _offsetY);
      if (_scale !== 1) ctx.scale(_scale, _scale);
      _drawExplainHighlights(level);
      ctx.restore();
    }

    if (solved && !_explainActive) _drawSolvedHalo();
  }

  // ── Background ────────────────────────────────────────────
  function _drawBackground() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Dot Grid ──────────────────────────────────────────────
  function _drawGrid() {
    const spacing = 40;
    const offsetX = (W % spacing) / 2;
    const offsetY = (H % spacing) / 2;
    ctx.save();
    for (let x = offsetX; x < W; x += spacing) {
      for (let y = offsetY; y < H; y += spacing) {
        const isMajor = (Math.round((x - offsetX) / spacing) % 4 === 0) &&
                        (Math.round((y - offsetY) / spacing) % 4 === 0);
        ctx.fillStyle = isMajor ? C.gridAccent : C.grid;
        ctx.beginPath();
        ctx.arc(x, y, isMajor ? 1.5 : 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── Wires ─────────────────────────────────────────────────
  function _drawWires(level, wireValues) {
    const nodeMap = new Map(level.nodes.map(n => [n.id, n]));

    level.wires.forEach(wire => {
      const src = nodeMap.get(wire.sourceId);
      const dst = nodeMap.get(wire.targetId);
      if (!src || !dst) return;

      const val   = wireValues.get(wire.id);
      const isCLK = wire.isClockWire;

      const { color, glow, width } = _wireStyle(val, isCLK);

      const srcPt = _nodeOutputAnchor(src, wire.sourceOutputIndex || 0);
      const dstPt = _nodeInputAnchor(dst, wire.targetInputIndex, wire.isClockWire);

      ctx.save();

      // Glow layer
      if (val !== null || isCLK) {
        ctx.strokeStyle = glow;
        ctx.lineWidth   = width + 6;
        ctx.lineCap     = 'round';
        ctx.shadowColor = glow;
        ctx.shadowBlur  = isCLK ? 14 : (val === 1 ? 18 : 8);
        ctx.globalAlpha = isCLK ? 0.5 : 0.4;
        _drawWirePath(srcPt, dstPt);
        ctx.stroke();
      }

      // Dashed style for CLK wires
      if (isCLK) {
        ctx.setLineDash([8, 5]);
        ctx.lineDashOffset = (Date.now() / 60) % 13;
      }

      ctx.shadowBlur  = 0;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth   = width;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      _drawWirePath(srcPt, dstPt);
      ctx.stroke();

      if (isCLK) ctx.setLineDash([]);

      _drawSignalDot(srcPt.x, srcPt.y, val, width, isCLK);

      ctx.restore();
    });
  }

  function _wireStyle(val, isCLK) {
    if (isCLK) return { color: C.wireClock, glow: C.wireClockGlow, width: 2 };
    if (val === 1) return { color: C.wireHigh, glow: C.wireHighGlow, width: 2.5 };
    if (val === 0) return { color: C.wireLow,  glow: C.wireLowGlow,  width: 2   };
    return               { color: C.wireNull, glow: C.wireNull,     width: 1.5 };
  }

  function _drawWirePath(src, dst) {
    ctx.beginPath();
    if (_currentLayout === 'vertical') {
      const my = src.y + (dst.y - src.y) * 0.55;
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(src.x, my);
      ctx.lineTo(dst.x, my);
      ctx.lineTo(dst.x, dst.y);
    } else {
      const mx = src.x + (dst.x - src.x) * 0.55;
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(mx,    src.y);
      ctx.lineTo(mx,    dst.y);
      ctx.lineTo(dst.x, dst.y);
    }
  }

  function _drawSignalDot(x, y, val, wireW, isCLK) {
    if (val === null && !isCLK) return;
    ctx.save();
    ctx.fillStyle   = isCLK ? C.wireClock
                            : (val === 1 ? C.wireHigh : C.wireLow);
    ctx.shadowColor = isCLK ? C.wireClockGlow
                            : (val === 1 ? C.wireHighGlow : C.wireLowGlow);
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(x, y, wireW + 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Pulse Animation (data flow on STEP) ────────────────────
  let _pulseStart = 0;
  const PULSE_MS = 700;

  function startPulse() { _pulseStart = Date.now(); }

  function _drawPulses(level, wireValues) {
    const elapsed = Date.now() - _pulseStart;
    if (elapsed > PULSE_MS || !_pulseStart) return;
    const t = elapsed / PULSE_MS; // 0→1
    const nodeMap = new Map(level.nodes.map(n => [n.id, n]));

    level.wires.forEach(wire => {
      const src = nodeMap.get(wire.sourceId);
      const dst = nodeMap.get(wire.targetId);
      if (!src || !dst) return;
      const val = wireValues.get(wire.id) ?? null;

      const srcPt = _nodeOutputAnchor(src, wire.sourceOutputIndex || 0);
      const dstPt = _nodeInputAnchor(dst, wire.targetInputIndex, wire.isClockWire);

      // Compute point along the wire path at position t
      let px, py;
      if (_currentLayout === 'vertical') {
        const my = srcPt.y + (dstPt.y - srcPt.y) * 0.55;
        // 3 segments: src→mid1, mid1→mid2, mid2→dst
        const d1 = Math.abs(my - srcPt.y);
        const d2 = Math.abs(dstPt.x - srcPt.x);
        const d3 = Math.abs(dstPt.y - my);
        const total = d1 + d2 + d3;
        const pos = t * total;
        if (pos <= d1) {
          const s = d1 > 0 ? pos / d1 : 0;
          px = srcPt.x; py = srcPt.y + (my - srcPt.y) * s;
        } else if (pos <= d1 + d2) {
          const s = d2 > 0 ? (pos - d1) / d2 : 0;
          px = srcPt.x + (dstPt.x - srcPt.x) * s; py = my;
        } else {
          const s = d3 > 0 ? (pos - d1 - d2) / d3 : 0;
          px = dstPt.x; py = my + (dstPt.y - my) * s;
        }
      } else {
        const mx = srcPt.x + (dstPt.x - srcPt.x) * 0.55;
        const d1 = Math.abs(mx - srcPt.x);
        const d2 = Math.abs(dstPt.y - srcPt.y);
        const d3 = Math.abs(dstPt.x - mx);
        const total = d1 + d2 + d3;
        const pos = t * total;
        if (pos <= d1) {
          const s = d1 > 0 ? pos / d1 : 0;
          px = srcPt.x + (mx - srcPt.x) * s; py = srcPt.y;
        } else if (pos <= d1 + d2) {
          const s = d2 > 0 ? (pos - d1) / d2 : 0;
          px = mx; py = srcPt.y + (dstPt.y - srcPt.y) * s;
        } else {
          const s = d3 > 0 ? (pos - d1 - d2) / d3 : 0;
          px = mx + (dstPt.x - mx) * s; py = dstPt.y;
        }
      }

      // Draw pulse dot
      const pulseColor = wire.isClockWire ? '#ffcc00' : (val === 1 ? '#39ff14' : (val === 0 ? '#ff4444' : '#555'));
      const alpha = 1 - t * 0.4;
      const r = 8 + (1 - t) * 5;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pulseColor;
      ctx.shadowColor = pulseColor;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // ── Node Anchors ──────────────────────────────────────────

  // outputIndex: 0=Q (or normal), 1=QNot (FF only)
  function _nodeOutputAnchor(node, outputIndex) {
    outputIndex = outputIndex || 0;

    // ── Vertical layout: outputs go UP ──
    if (_currentLayout === 'vertical') {
      if (node.type === 'INPUT' || node.type === 'CLOCK')
        return { x: node.x, y: node.y - NODE.inputR };
      if (node.type === 'GATE_SLOT')
        return { x: node.x, y: node.y - NODE.gateH / 2 };
      return { x: node.x, y: node.y - 36 };   // larger output circle
    }

    if (node.type === 'INPUT' || node.type === 'CLOCK') {
      return { x: node.x + NODE.inputR, y: node.y };
    }
    if (node.type === 'GATE_SLOT') {
      return { x: node.x + NODE.gateW / 2, y: node.y };
    }
    if (Engine.FF_TYPES && Engine.FF_TYPES.has(node.type)) {
      const hw = NODE.ffW / 2;
      // Q: top-right, QNot: bottom-right
      const yOff = outputIndex === 1 ? 18 : -18;
      return { x: node.x + hw, y: node.y + yOff };
    }
    return { x: node.x + 36, y: node.y };
  }

  function _nodeInputAnchor(node, inputIndex, isClockWire) {
    // ── Vertical layout: inputs come from BELOW ──
    if (_currentLayout === 'vertical') {
      if (node.type === 'OUTPUT')
        return { x: node.x, y: node.y + 36 };   // larger output circle
      if (node.type === 'GATE_SLOT') {
        const spread  = 22;
        const offsetX = (inputIndex - 0.5) * spread;
        return { x: node.x + offsetX, y: node.y + NODE.gateH / 2 };
      }
      return { x: node.x, y: node.y + NODE.inputR };
    }

    if (node.type === 'OUTPUT') {
      return { x: node.x - 36, y: node.y };
    }
    if (node.type === 'GATE_SLOT') {
      const spread  = 18;
      const offsetY = (inputIndex - 0.5) * spread;
      return { x: node.x - NODE.gateW / 2, y: node.y + offsetY };
    }
    if (Engine.FF_TYPES && Engine.FF_TYPES.has(node.type)) {
      const hw = NODE.ffW / 2;
      if (isClockWire) {
        // CLK enters at the bottom-left with a small notch
        return { x: node.x - hw, y: node.y + 22 };
      }
      // Data inputs distributed on the left side
      const ffInputCount = _ffDataInputCount(node);
      const spread = 20;
      const totalH = (ffInputCount - 1) * spread;
      const offsetY = inputIndex * spread - totalH / 2;
      return { x: node.x - hw, y: node.y + offsetY - 10 };
    }
    return { x: node.x - NODE.inputR, y: node.y };
  }

  function _ffDataInputCount(node) {
    if (node.type === 'FF_SLOT') {
      return (node.ffType === 'SR' || node.ffType === 'JK') ? 2 : 1;
    }
    return { FLIPFLOP_D: 1, FLIPFLOP_T: 1, FLIPFLOP_SR: 2, FLIPFLOP_JK: 2 }[node.type] || 1;
  }

  // ── Nodes ─────────────────────────────────────────────────
  function _drawNodes(level, nodeValues, ffStates, hoveredNodeId, solved) {
    level.nodes.forEach(node => {
      const val     = nodeValues ? (nodeValues.get(node.id) ?? null) : null;
      const hovered = node.id === hoveredNodeId;

      if (node.type === 'INPUT')            _drawInputNode(node, val, hovered);
      else if (node.type === 'CLOCK')       _drawClockNode(node, val, hovered);
      else if (node.type === 'GATE_SLOT')   _drawGateNode(node, val, hovered);
      else if (node.type === 'MUX_SELECT')  _drawMuxSelectNode(node, val, hovered);
      else if (node.type === 'DISPLAY_7SEG') _draw7SegNode(node, hovered);
      else if (node.type === 'OUTPUT')      _drawOutputNode(node, val, hovered, solved);
      else if (node.type === 'FF_SLOT') {
        const ffState = ffStates.get(node.id) || { q: 0, qNot: 1 };
        _drawFfSlotNode(node, ffState, hovered);
      }
      else if (Engine.FF_TYPES && Engine.FF_TYPES.has(node.type)) {
        const ffState = ffStates.get(node.id) || { q: 0, qNot: 1 };
        _drawFlipFlopNode(node, ffState, hovered);
      }

      // Design mode: draw selection highlight
      if (State.designMode && State.selectedNodeId === node.id) {
        ctx.save();
        ctx.strokeStyle = '#a060ff';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = (Date.now() / 60) % 10;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    });
  }

  // ── INPUT node ────────────────────────────────────────────
  function _drawInputNode(node, val, hovered) {
    const r = NODE.inputR;
    ctx.save();
    if (val === 1) { ctx.shadowColor = C.wireHighGlow; ctx.shadowBlur = 20; }

    // Dynamic input with stepValues: main circle first, then mini-circles on top
    if (node.stepValues && node.stepValues.length > 1) {
      const steps = node.stepValues;
      const n = steps.length;
      const activeIdx = Math.min(_stepCount, n) - 1;
      const miniR = 8;
      const spacing = miniR * 2.5;
      const totalW = (n - 1) * spacing;
      const startX = node.x - totalW / 2;

      // Main circle background first
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(8,16,24,0.85)';
      ctx.fill();
      ctx.strokeStyle = val === 1 ? '#1a8a1a' : '#6a1a1a';
      ctx.lineWidth   = hovered ? 2.5 : 1.5;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // Mini-circles on top (inactive)
      for (let i = 0; i < n; i++) {
        if (i === activeIdx) continue;
        const cx = startX + i * spacing;
        const sv = steps[i];

        ctx.beginPath();
        ctx.arc(cx, node.y, miniR, 0, Math.PI * 2);
        ctx.fillStyle = sv === 1 ? 'rgba(40,180,15,0.45)' : 'rgba(200,50,50,0.4)';
        ctx.fill();
        ctx.strokeStyle = sv === 1 ? 'rgba(57,255,20,0.7)' : 'rgba(255,60,60,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = 'rgba(240,240,240,0.8)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sv.toString(), cx, node.y);
      }

      // Active mini-circle on top (brightest)
      if (activeIdx >= 0) {
        const acx = startX + activeIdx * spacing;
        const sv = steps[activeIdx];
        ctx.beginPath();
        ctx.arc(acx, node.y, miniR + 1, 0, Math.PI * 2);
        ctx.fillStyle = sv === 1 ? 'rgba(57,255,20,0.75)' : 'rgba(255,60,60,0.65)';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sv.toString(), acx, node.y);
      }
    } else {
      // Static input: normal drawing
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = val === 1 ? 'rgba(10,60,10,0.95)' : 'rgba(30,10,10,0.95)';
      ctx.fill();

      ctx.strokeStyle = val === 1 ? '#1a8a1a' : '#6a1a1a';
      ctx.lineWidth   = hovered ? 2.5 : 1.5;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      ctx.fillStyle    = val === 1 ? C.textHigh : C.textLow;
      ctx.font         = 'bold 18px JetBrains Mono, monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val !== null ? val.toString() : '?', node.x, node.y);
    }

    ctx.fillStyle    = C.textDim;
    ctx.font         = 'bold 15px JetBrains Mono, monospace';
    if (_currentLayout === 'vertical') {
      ctx.textBaseline = 'top';
      ctx.fillText(node.label || '', node.x, node.y + r + 6);
    } else {
      ctx.fillText(node.label || '', node.x, node.y - r - 12);
    }
    ctx.restore();
  }

  // ── CLOCK node ────────────────────────────────────────────
  function _drawClockNode(node, val, hovered) {
    const r   = NODE.clockR;
    const isH = val === 1;
    ctx.save();

    if (isH) { ctx.shadowColor = C.wireClockGlow; ctx.shadowBlur = 22; }

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isH ? 'rgba(0,40,60,0.96)' : 'rgba(5,15,25,0.96)';
    ctx.fill();

    ctx.strokeStyle = isH ? C.clockBorderHigh : C.clockBorder;
    ctx.lineWidth   = hovered ? 2.5 : 1.8;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Clock wave symbol
    ctx.strokeStyle = isH ? C.wireClock : 'rgba(0,150,190,0.5)';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    const bx = node.x - 14, by = node.y + 4, sw = 10, sh = 12;
    ctx.moveTo(bx,        by);
    ctx.lineTo(bx,        by - sh);
    ctx.lineTo(bx + sw,   by - sh);
    ctx.lineTo(bx + sw,   by);
    ctx.lineTo(bx + sw*2, by);
    ctx.stroke();

    // Label
    ctx.fillStyle    = C.textDim;
    ctx.font         = '10px JetBrains Mono, monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('CLK', node.x, node.y - r - 10);

    // Value
    ctx.fillStyle    = isH ? C.wireClock : 'rgba(0,150,190,0.5)';
    ctx.font         = 'bold 10px JetBrains Mono, monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(val !== null ? val.toString() : '?', node.x + 10, node.y + 4);

    ctx.restore();
  }

  // ── 7-SEGMENT DISPLAY node ─────────────────────────────────
  function _draw7SegNode(node, hovered) {
    const w = 80, h = 120;
    const x = node.x - w / 2;
    const y = node.y - h / 2;
    const segs = node._segments || [0,0,0,0,0,0,0]; // a,b,c,d,e,f,g
    ctx.save();

    // Background case
    if (hovered) { ctx.shadowColor = 'rgba(0,212,255,0.4)'; ctx.shadowBlur = 15; }
    ctx.fillStyle = '#0a0a0a';
    _roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = hovered ? '#00d4ff' : '#333';
    ctx.lineWidth = 2;
    _roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Segment geometry (relative to display center)
    const cx = node.x;
    const cy = node.y;
    const sw = 28;  // segment width
    const sh = 5;   // segment thickness
    const gap = 2;
    const vLen = 22; // vertical segment length

    const onColor = '#ff1a1a';
    const offColor = 'rgba(60,20,20,0.3)';
    const glowColor = 'rgba(255,26,26,0.4)';

    // Draw segments: a=top, b=top-right, c=bot-right, d=bottom, e=bot-left, f=top-left, g=middle
    function drawHSeg(sx, sy, on) {
      ctx.fillStyle = on ? onColor : offColor;
      if (on) { ctx.shadowColor = glowColor; ctx.shadowBlur = 8; }
      ctx.fillRect(sx - sw/2, sy - sh/2, sw, sh);
      ctx.shadowBlur = 0;
    }

    function drawVSeg(sx, sy, on) {
      ctx.fillStyle = on ? onColor : offColor;
      if (on) { ctx.shadowColor = glowColor; ctx.shadowBlur = 8; }
      ctx.fillRect(sx - sh/2, sy, sh, vLen);
      ctx.shadowBlur = 0;
    }

    const topY = cy - 28;
    const midY = cy - 2;
    const botY = cy + 24;
    const leftX = cx - 16;
    const rightX = cx + 16;

    // a: top horizontal
    drawHSeg(cx, topY, segs[0]);
    // b: top-right vertical
    drawVSeg(rightX, topY + gap, segs[1]);
    // c: bottom-right vertical
    drawVSeg(rightX, midY + gap, segs[2]);
    // d: bottom horizontal
    drawHSeg(cx, botY, segs[3]);
    // e: bottom-left vertical
    drawVSeg(leftX, midY + gap, segs[4]);
    // f: top-left vertical
    drawVSeg(leftX, topY + gap, segs[5]);
    // g: middle horizontal
    drawHSeg(cx, midY, segs[6]);

    // Label below
    ctx.fillStyle = '#555';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(node.label || '7-SEG', node.x, y + h + 4);

    ctx.restore();
  }

  // ── MUX_SELECT node (clickable toggle switch) ─────────────
  function _drawMuxSelectNode(node, val, hovered) {
    const w = 50, h = 30, r = 6;
    const x = node.x - w / 2;
    const y = node.y - h / 2;
    const isOn = val === 1;
    ctx.save();

    // Background
    ctx.fillStyle = isOn ? 'rgba(57,255,20,0.15)' : 'rgba(40,20,20,0.3)';
    if (hovered) { ctx.shadowColor = 'rgba(0,212,255,0.5)'; ctx.shadowBlur = 15; }
    _roundRect(ctx, x, y, w, h, r);
    ctx.fill();

    // Border
    ctx.strokeStyle = hovered ? '#00d4ff' : (isOn ? '#39ff14' : '#6a1a1a');
    ctx.lineWidth = hovered ? 2.5 : 2;
    _roundRect(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Toggle indicator (slider)
    const sliderX = isOn ? node.x + 8 : node.x - 8;
    ctx.beginPath();
    ctx.arc(sliderX, node.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = isOn ? '#39ff14' : '#ff4444';
    ctx.fill();
    ctx.strokeStyle = isOn ? '#2a8a2a' : '#8a2a2a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Value text on slider
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isOn ? '1' : '0', sliderX, node.y);

    // Label above
    ctx.fillStyle = isOn ? '#39ff14' : '#ff4444';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(node.label || '', node.x, y - 6);

    // "CLICK" hint when hovered
    if (hovered) {
      ctx.fillStyle = '#00d4ff';
      ctx.font = '7px JetBrains Mono, monospace';
      ctx.textBaseline = 'top';
      ctx.fillText('CLICK TO TOGGLE', node.x, y + h + 4);
    }

    ctx.restore();
  }

  // ── GATE_SLOT node ────────────────────────────────────────
  function _drawGateNode(node, val, hovered) {
    const { gateW: w, gateH: h, gateR: r } = NODE;
    const x = node.x - w / 2;
    const y = node.y - h / 2;
    ctx.save();

    const isEmpty = node.gate == null;
    if (hovered) { ctx.shadowColor = 'rgba(0,212,255,0.5)'; ctx.shadowBlur = 20; }

    ctx.fillStyle = isEmpty ? 'rgba(10,20,35,0.92)' : 'rgba(14,31,51,0.96)';
    _roundRect(ctx, x, y, w, h, r);
    ctx.fill();

    ctx.strokeStyle = hovered ? '#00d4ff' : (isEmpty ? '#3a5a7a' : '#2a5a90');
    ctx.lineWidth   = hovered ? 2 : 1.5;
    _roundRect(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.shadowBlur  = 0;

    if (isEmpty) {
      ctx.strokeStyle    = 'rgba(0,212,255,0.3)';
      ctx.lineWidth      = 1;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = (Date.now() / 80) % 12;
      _roundRect(ctx, x + 3, y + 3, w - 6, h - 6, r - 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle    = 'rgba(0,212,255,0.35)';
      ctx.font         = 'bold 20px JetBrains Mono, monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', node.x, node.y);
    } else {
      ctx.fillStyle    = C.textGate;
      ctx.font         = 'bold 13px JetBrains Mono, monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.gate, node.x, node.y - 7);

      if (val !== null) {
        ctx.fillStyle = val === 1 ? C.textHigh : C.textLow;
        ctx.font      = 'bold 11px JetBrains Mono, monospace';
        ctx.fillText(`= ${val}`, node.x, node.y + 10);
      }
    }

    if (isEmpty && hovered) {
      ctx.fillStyle    = '#00d4ff';
      ctx.font         = '8px JetBrains Mono, monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('DROP GATE HERE', node.x, y + h + 6);
    }

    ctx.restore();
  }

  // ── OUTPUT node ───────────────────────────────────────────
  function _drawOutputNode(node, val, hovered, solved) {
    const r = 36;
    ctx.save();

    const isSandbox = !!node.sandbox;
    const correct = !isSandbox && val !== null && val === node.targetValue;
    const hasTimeline = node.stepTargets && node.stepTargets.length > 1;
    if (isSandbox && val === 1) { ctx.shadowColor = C.wireHighGlow; ctx.shadowBlur = 15; }
    else if (correct) { ctx.shadowColor = C.wireHighGlow; ctx.shadowBlur = solved ? 30 : 20; }

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    if (hasTimeline) {
      ctx.fillStyle = 'rgba(8,16,24,0.75)';
    } else {
      ctx.fillStyle = correct ? 'rgba(10,50,10,0.96)'
                              : (val === null ? 'rgba(10,14,20,0.96)' : 'rgba(40,10,10,0.96)');
    }
    ctx.fill();

    ctx.strokeStyle = correct ? '#39ff14' : (hovered ? '#00d4ff' : '#1e3a50');
    ctx.lineWidth   = correct ? 2.5 : 1.5;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    ctx.strokeStyle = node.targetValue === 1 ? 'rgba(57,255,20,0.25)' : 'rgba(198,40,40,0.25)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dynamic output with stepTargets: mini-circles drawn on top of main circle
    if (hasTimeline) {
      const steps = node.stepTargets;
      const n = steps.length;
      const activeIdx = Math.min(_stepCount, n) - 1;
      const miniR = 8;
      const spacing = miniR * 2.5;
      const totalW = (n - 1) * spacing;
      const startX = node.x - totalW / 2;

      // Inactive mini-circles
      for (let i = 0; i < n; i++) {
        if (i === activeIdx) continue;
        const cx = startX + i * spacing;
        const sv = steps[i];

        ctx.beginPath();
        ctx.arc(cx, node.y, miniR, 0, Math.PI * 2);
        ctx.fillStyle = sv === 1 ? 'rgba(40,180,15,0.45)' : 'rgba(200,50,50,0.4)';
        ctx.fill();
        ctx.strokeStyle = sv === 1 ? 'rgba(57,255,20,0.7)' : 'rgba(255,60,60,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = 'rgba(240,240,240,0.8)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sv.toString(), cx, node.y);
      }

      // Active mini-circle (brightest)
      if (activeIdx >= 0) {
        const acx = startX + activeIdx * spacing;
        const sv = steps[activeIdx];
        ctx.beginPath();
        ctx.arc(acx, node.y, miniR + 1, 0, Math.PI * 2);
        ctx.fillStyle = sv === 1 ? 'rgba(57,255,20,0.75)' : 'rgba(255,60,60,0.65)';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sv.toString(), acx, node.y);
      }
    } else {
      // Static output: show current value and target
      ctx.fillStyle    = val === null ? C.wireNull : (val === 1 ? C.textHigh : C.textLow);
      ctx.font         = 'bold 22px JetBrains Mono, monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val !== null ? val.toString() : '?', node.x, isSandbox && !State.designMode ? node.y : node.y - 5);

      if (!isSandbox || State.designMode) {
        ctx.fillStyle    = 'rgba(100,150,170,0.7)';
        ctx.font         = 'bold 13px JetBrains Mono, monospace';
        ctx.textBaseline = 'middle';
        ctx.fillText(`→${node.targetValue}`, node.x, node.y + 16);
      }
    }

    // Traffic light colored labels for G/Y/R outputs
    const trafficColors = { 'G': '#39ff14', 'Y': '#ffcc00', 'R': '#ff4444', 'WALK': '#39ff14', 'UNLOCK': '#39ff14', 'FLOOR': '#00d4ff', 'DOOR': '#39ff14', 'ALARM': '#ff4444', 'VEND': '#39ff14', '5₪': '#ffcc00', '10₪': '#ffcc00', '15₪': '#ffcc00' };
    const labelColor = trafficColors[node.label] || C.textDim;
    ctx.fillStyle    = labelColor;
    ctx.font         = 'bold 16px JetBrains Mono, monospace';
    if (_currentLayout === 'vertical') {
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(node.label || '', node.x, node.y - r - 14);
    } else {
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(node.label || '', node.x, node.y - r - 12);
    }

    // Traffic light glow ring when output is active (val=1)
    if (trafficColors[node.label] && val === 1) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = trafficColors[node.label];
      ctx.lineWidth = 3;
      ctx.shadowColor = trafficColors[node.label];
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Elevator visual for DOOR output
    if (node.label === 'DOOR') {
      if (_currentLevel) {
        const floorNode = _currentLevel.nodes.find(n => n.label === 'FLOOR');
        const floorVal = floorNode ? (_currentNodeValues.get(floorNode.id) ?? null) : null;
        const doorOpen = val === 1;
        const atFloor1 = floorVal === 1;

        const ex = node.x + 55;
        const ey = node.y - 60;

        // Elevator shaft
        ctx.fillStyle = 'rgba(10,10,10,0.95)';
        _roundRect(ctx, ex, ey, 55, 110, 6);
        ctx.fill();
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        _roundRect(ctx, ex, ey, 55, 110, 6);
        ctx.stroke();

        // Floor divider
        ctx.beginPath();
        ctx.moveTo(ex, ey + 55);
        ctx.lineTo(ex + 55, ey + 55);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Floor labels
        ctx.fillStyle = '#555';
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('F1', ex - 4, ey + 27);
        ctx.fillText('F0', ex - 4, ey + 82);

        // Cabin (at floor 1 or floor 0)
        const cabinY = atFloor1 ? ey + 5 : ey + 60;
        const cabinColor = doorOpen ? '#39ff14' : '#2a5a90';
        if (doorOpen) { ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 10; }
        ctx.fillStyle = doorOpen ? 'rgba(57,255,20,0.2)' : 'rgba(42,90,144,0.3)';
        _roundRect(ctx, ex + 5, cabinY, 45, 45, 4);
        ctx.fill();
        ctx.strokeStyle = cabinColor;
        ctx.lineWidth = 2;
        _roundRect(ctx, ex + 5, cabinY, 45, 45, 4);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Door lines (open or closed)
        if (doorOpen) {
          // Open doors — gap in middle
          ctx.strokeStyle = '#39ff14';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ex + 8, cabinY + 5); ctx.lineTo(ex + 8, cabinY + 40);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ex + 47, cabinY + 5); ctx.lineTo(ex + 47, cabinY + 40);
          ctx.stroke();
        } else {
          // Closed doors — line in middle
          ctx.strokeStyle = '#2a5a90';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(ex + 27, cabinY + 5); ctx.lineTo(ex + 27, cabinY + 40);
          ctx.stroke();
        }

        // Status text below
        ctx.fillStyle = doorOpen ? '#39ff14' : '#888';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(doorOpen ? 'OPEN' : 'CLOSED', ex + 27, ey + 120);
      }
    }

    // Vending machine visual for VEND output
    if (node.label === '15₪' || node.label === 'VEND') {
      const vx = node.x + 55;
      const vy = node.y - 50;
      const vended = val === 1;

      // Machine body
      ctx.fillStyle = 'rgba(15,15,15,0.95)';
      _roundRect(ctx, vx, vy, 65, 95, 8);
      ctx.fill();
      ctx.strokeStyle = vended ? '#39ff14' : '#444';
      ctx.lineWidth = 2;
      if (vended) { ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 10; }
      _roundRect(ctx, vx, vy, 65, 95, 8);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Coin counter (3 slots)
      const coins = _currentLevel ? _currentLevel.nodes.filter(n => n.type === 'OUTPUT' && (n.label === '5₪' || n.label === '10₪' || n.label === '15₪')) : [];
      for (let i = 0; i < 3; i++) {
        const cx = vx + 14 + i * 14;
        const cy = vy + 18;
        const coinNode = coins[i];
        const coinVal = coinNode ? (_currentNodeValues.get(coinNode.id) ?? 0) : 0;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = coinVal === 1 ? '#ffcc00' : 'rgba(60,60,60,0.5)';
        ctx.fill();
        ctx.strokeStyle = coinVal === 1 ? '#ffcc00' : '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Price label
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('15₪', vx + 32, vy + 40);

      // Can dispenser
      if (vended) {
        // Can dropping out
        ctx.fillStyle = 'rgba(255,68,68,0.7)';
        _roundRect(ctx, vx + 15, vy + 55, 35, 20, 4);
        ctx.fill();
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 1.5;
        _roundRect(ctx, vx + 15, vy + 55, 35, 20, 4);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.fillText('COLA', vx + 32, vy + 65);
      } else {
        // Empty slot
        ctx.fillStyle = 'rgba(30,30,30,0.8)';
        _roundRect(ctx, vx + 15, vy + 55, 35, 20, 4);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        _roundRect(ctx, vx + 15, vy + 55, 35, 20, 4);
        ctx.stroke();
      }

      // Status
      ctx.fillStyle = vended ? '#39ff14' : '#888';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(vended ? 'ENJOY!' : 'INSERT COIN', vx + 32, vy + 88);
    }

    // Alarm siren visual for ALARM output
    if (node.label === 'ALARM') {
      const ax = node.x + 55;
      const ay = node.y - 25;
      const alarmOn = val === 1;

      // Siren body
      ctx.beginPath();
      ctx.arc(ax + 25, ay + 20, 22, 0, Math.PI * 2);
      ctx.fillStyle = alarmOn ? 'rgba(255,68,68,0.3)' : 'rgba(40,20,20,0.5)';
      ctx.fill();
      if (alarmOn) { ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 20; }
      ctx.strokeStyle = alarmOn ? '#ff4444' : '#555';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner circle
      ctx.beginPath();
      ctx.arc(ax + 25, ay + 20, 12, 0, Math.PI * 2);
      ctx.fillStyle = alarmOn ? 'rgba(255,68,68,0.6)' : 'rgba(60,30,30,0.4)';
      ctx.fill();
      ctx.strokeStyle = alarmOn ? '#ff6666' : '#444';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Exclamation or status
      ctx.fillStyle = alarmOn ? '#fff' : '#666';
      ctx.font = 'bold 14px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(alarmOn ? '!' : '-', ax + 25, ay + 20);

      // Pulse rings when active
      if (alarmOn) {
        const t = (Date.now() / 400) % 1;
        ctx.beginPath();
        ctx.arc(ax + 25, ay + 20, 22 + t * 15, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,68,68,${0.4 * (1 - t)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = alarmOn ? '#ff4444' : '#555';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(alarmOn ? 'TRIGGERED' : 'ARMED', ax + 25, ay + 50);
    }

    // Safe/vault visual for UNLOCK output
    if (node.label === 'UNLOCK') {
      const sx = node.x + 55;
      const sy = node.y - 35;
      const sw = 60, sh = 70;
      const unlocked = val === 1;

      // Safe body
      ctx.fillStyle = unlocked ? 'rgba(10,40,10,0.95)' : 'rgba(25,15,15,0.95)';
      _roundRect(ctx, sx, sy, sw, sh, 8);
      ctx.fill();
      ctx.strokeStyle = unlocked ? '#39ff14' : '#555';
      ctx.lineWidth = 2;
      if (unlocked) { ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 12; }
      _roundRect(ctx, sx, sy, sw, sh, 8);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Lock dial / handle
      const cx = sx + sw / 2;
      const cy = sy + sh / 2 - 5;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fillStyle = unlocked ? 'rgba(57,255,20,0.15)' : 'rgba(80,80,80,0.3)';
      ctx.fill();
      ctx.strokeStyle = unlocked ? '#39ff14' : '#666';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Lock icon or OPEN text
      ctx.fillStyle = unlocked ? '#39ff14' : '#ff4444';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(unlocked ? 'OPEN' : 'LOCKED', cx, cy);

      // Handle bar at bottom
      ctx.fillStyle = unlocked ? '#39ff14' : '#555';
      _roundRect(ctx, cx - 15, sy + sh - 18, 30, 8, 3);
      ctx.fill();
    }

    ctx.restore();
  }

  // ── FF_SLOT node (player-placeable flip-flop slot) ────────
  function _drawFfSlotNode(node, ffState, hovered) {
    const { ffW: w, ffH: h, ffR: r } = NODE;
    const x = node.x - w / 2;
    const y = node.y - h / 2;
    const isEmpty = !node.ffType;
    ctx.save();

    if (hovered) { ctx.shadowColor = 'rgba(160,96,255,0.5)'; ctx.shadowBlur = 22; }

    // Background
    ctx.fillStyle = isEmpty ? 'rgba(14,8,28,0.94)' : 'rgba(18,13,34,0.97)';
    _roundRect(ctx, x, y, w, h, r);
    ctx.fill();

    // Border
    ctx.strokeStyle = hovered ? '#a060ff' : (isEmpty ? '#3a1a6a' : '#5a2a9a');
    ctx.lineWidth   = hovered ? 2 : 1.5;
    _roundRect(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.shadowBlur  = 0;

    if (isEmpty) {
      // Animated dashed border
      ctx.strokeStyle    = 'rgba(160,96,255,0.35)';
      ctx.lineWidth      = 1;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = (Date.now() / 80) % 12;
      _roundRect(ctx, x + 3, y + 3, w - 6, h - 6, r - 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // ? placeholder
      ctx.fillStyle    = 'rgba(160,96,255,0.4)';
      ctx.font         = 'bold 18px JetBrains Mono, monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FF?', node.x, node.initialQ != null ? node.y - 10 : node.y);

      // Show initial Q state if defined
      if (node.initialQ != null) {
        ctx.fillStyle = node.initialQ === 1 ? '#39ff14' : '#ff4444';
        ctx.font      = 'bold 12px JetBrains Mono, monospace';
        ctx.fillText('Q\u2080=' + node.initialQ, node.x, node.y + 12);
      }

      if (hovered) {
        ctx.fillStyle    = '#a060ff';
        ctx.font         = '8px JetBrains Mono, monospace';
        ctx.textBaseline = 'top';
        ctx.fillText('DROP FF HERE', node.x, y + h + 6);
      }
    } else {
      // Placed — delegate to full FF drawing
      _drawFlipFlopNode(node, ffState, false);

      // Show initial Q below the FF until first STEP
      if (node.initialQ != null && _stepCount === 0) {
        ctx.fillStyle = node.initialQ === 1 ? '#39ff14' : '#ff4444';
        ctx.font      = 'bold 12px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Q\u2080=' + node.initialQ, node.x, y + h + 6);
      }
    }

    ctx.restore();
  }

  // ── FLIPFLOP node ─────────────────────────────────────────
  function _drawFlipFlopNode(node, ffState, hovered) {
    const { ffW: w, ffH: h, ffR: r } = NODE;
    const x = node.x - w / 2;
    const y = node.y - h / 2;
    const { q, qNot } = ffState;
    ctx.save();

    // Glow when active
    if (q === 1) { ctx.shadowColor = 'rgba(160,96,255,0.5)'; ctx.shadowBlur = 20; }
    if (hovered) { ctx.shadowColor = 'rgba(0,212,255,0.5)';  ctx.shadowBlur = 22; }

    // Background
    ctx.fillStyle = 'rgba(18,13,34,0.97)';
    _roundRect(ctx, x, y, w, h, r);
    ctx.fill();

    // Border
    ctx.strokeStyle = hovered ? C.accentCyan : (q === 1 ? C.ffBorderActive : C.ffBorder);
    ctx.lineWidth   = hovered ? 2 : 1.8;
    _roundRect(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Vertical divider line separating label area from Q outputs
    const divX = node.x + 14;
    ctx.strokeStyle = 'rgba(90,42,154,0.5)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(divX, y + 8);
    ctx.lineTo(divX, y + h - 8);
    ctx.stroke();

    // FF type label — from explicit ffType (FF_SLOT) or from node.type
    const ffLabel = node.ffType ||
      ({ FLIPFLOP_D: 'D', FLIPFLOP_SR: 'SR', FLIPFLOP_JK: 'JK', FLIPFLOP_T: 'T' }[node.type]) || '?';
    ctx.fillStyle    = '#c080ff';
    ctx.font         = 'bold 16px JetBrains Mono, monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ffLabel, node.x - 20, node.y);

    // Q output (top right of divider)
    const qColor = q === 1 ? C.ffQhigh : C.ffQlow;
    ctx.fillStyle    = 'rgba(200,200,200,0.5)';
    ctx.font         = '9px JetBrains Mono, monospace';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Q', divX + 5, node.y - 18);

    ctx.fillStyle    = qColor;
    ctx.font         = 'bold 14px JetBrains Mono, monospace';
    ctx.fillText(q.toString(), divX + 22, node.y - 18);

    // QNot output (bottom right of divider)
    const qnColor = qNot === 1 ? C.ffQhigh : C.ffQlow;
    ctx.fillStyle    = 'rgba(200,200,200,0.5)';
    ctx.font         = '9px JetBrains Mono, monospace';
    ctx.fillText('Q̄', divX + 5, node.y + 18);

    ctx.fillStyle    = qnColor;
    ctx.font         = 'bold 14px JetBrains Mono, monospace';
    ctx.fillText(qNot.toString(), divX + 22, node.y + 18);

    // CLK triangle symbol (bottom-left input port)
    ctx.fillStyle  = C.ffClkAccent;
    ctx.beginPath();
    const tx = x + 4, ty = node.y + 14;
    ctx.moveTo(tx,      ty - 6);
    ctx.lineTo(tx + 10, ty);
    ctx.lineTo(tx,      ty + 6);
    ctx.closePath();
    ctx.fill();

    // Node label above (with traffic light colors for G/Y/R)
    const ffTrafficColors = { 'G': '#39ff14', 'Y': '#ffcc00', 'R': '#ff4444' };
    ctx.fillStyle    = ffTrafficColors[node.label] || C.textDim;
    ctx.font         = '10px JetBrains Mono, monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(node.label || '', node.x, y - 10);

    ctx.restore();
  }

  // ── Solved Halo ───────────────────────────────────────────
  // ── Solve Animation ────────────────────────────────────────
  let _solveAnimStart = 0;
  const SOLVE_ANIM_MS = 1800;

  function startSolveAnim() { _solveAnimStart = Date.now(); }

  // ── Node Tooltip ───────────────────────────────────────────
  function _drawNodeTooltip(level, hoveredId, nodeValues) {
    const node = level.nodes.find(n => n.id === hoveredId);
    if (!node) return;

    // Build tooltip lines
    const lines = [];
    const val = nodeValues.get(node.id) ?? null;

    if (node.type === 'INPUT') {
      lines.push(node.label || node.id);
      lines.push('Value: ' + (val !== null ? val : '?'));
      if (node.stepValues) lines.push('Steps: ' + node.stepValues.join(','));
    } else if (node.type === 'OUTPUT') {
      lines.push(node.label || node.id);
      const correct = val !== null && val === node.targetValue;
      lines.push('Current: ' + (val !== null ? val : '?') + (correct ? ' \u2713' : ' \u2717'));
      lines.push('Target: ' + (node.targetValue ?? '?'));
      if (node.stepTargets) lines.push('Steps: ' + node.stepTargets.join(','));
    } else if (node.type === 'GATE_SLOT') {
      lines.push(node.label || node.id);
      lines.push(node.gate ? node.gate + ' gate' : 'Empty \u2014 drag a gate');
      if (val !== null) lines.push('Output: ' + val);
    } else if (node.type === 'FF_SLOT') {
      lines.push(node.label || node.id);
      lines.push(node.ffType ? node.ffType + '-FF' : 'Empty \u2014 drag a FF');
      const ffState = State.getFfStates().get(node.id);
      if (ffState) lines.push('Q=' + ffState.q);
    } else if (node.type === 'CLOCK') {
      lines.push('CLOCK');
      lines.push('Step: ' + (_stepCount || 0));
    } else if (node.type === 'MUX_SELECT') {
      lines.push(node.label || 'SWITCH');
      lines.push('Value: ' + (node.value ?? 0));
    }

    if (lines.length === 0) return;

    // Position: screen coords of node
    const sx = node.x * _scale + _offsetX;
    const sy = node.y * _scale + _offsetY;

    // Measure text
    ctx.save();
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    const lineH = 16;
    const pad = 8;
    let maxW = 0;
    lines.forEach(l => { maxW = Math.max(maxW, ctx.measureText(l).width); });
    const boxW = maxW + pad * 2;
    const boxH = lines.length * lineH + pad * 2;

    // Position tooltip above node, clamped to screen
    let tx = sx - boxW / 2;
    let ty = sy - 55 * _scale - boxH;
    if (tx < 4) tx = 4;
    if (tx + boxW > W - 4) tx = W - 4 - boxW;
    if (ty < 4) ty = sy + 50 * _scale + 8;

    // Background
    ctx.fillStyle = 'rgba(10, 14, 20, 0.94)';
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(tx, ty, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#c8d8f0';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
      if (i === 0) ctx.fillStyle = '#00d4ff';
      else ctx.fillStyle = '#c8d8f0';
      ctx.fillText(line, tx + pad, ty + pad + i * lineH);
    });
    ctx.restore();
  }

  // ── Wire Tooltip ───────────────────────────────────────────
  const GATE_SYMBOL = { AND: '·', OR: '+', XOR: '⊕', NAND: '·', NOR: '+', NOT: '¬' };

  function _getNodeExpr(nodeId, level, depth) {
    if (depth > 4) return '...';
    const node = level.nodes.find(n => n.id === nodeId);
    if (!node) return '?';
    if (node.type === 'INPUT') return node.label || 'IN';
    if (node.type === 'CLOCK') return 'CLK';
    if (node.type === 'MUX_SELECT') return node.label || 'SW';
    if (node.type === 'FF_SLOT') {
      const name = node.label || 'Q';
      return name;
    }
    if (node.type === 'GATE_SLOT' && node.gate) {
      const inputs = level.wires
        .filter(w => w.targetId === nodeId)
        .sort((a, b) => (a.targetInputIndex || 0) - (b.targetInputIndex || 0))
        .map(w => _getNodeExpr(w.sourceId, level, depth + 1));
      const g = node.gate;
      if (g === 'NOT') return `¬(${inputs[0] || '?'})`;
      const sym = GATE_SYMBOL[g] || g;
      const inner = inputs.join(` ${sym} `);
      if (g === 'NAND') return `¬(${inner})`;
      if (g === 'NOR') return `¬(${inner})`;
      return inner || '?';
    }
    return node.label || node.type;
  }

  function _drawWireTooltip(level, wire, wireValues, mx, my) {
    const val = wireValues.get(wire.id) ?? null;
    const src = level.nodes.find(n => n.id === wire.sourceId);
    if (!src) return;

    // Build expression
    const expr = _getNodeExpr(wire.sourceId, level, 0);
    const valStr = val !== null ? val.toString() : '?';
    const line = `${expr} = ${valStr}`;

    // Draw tooltip near mouse
    ctx.save();
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    const pad = 8;
    const tw = ctx.measureText(line).width + pad * 2;
    const th = 22;
    let tx = mx + 16;
    let ty = my - 30;
    if (tx + tw > W) tx = mx - tw - 8;
    if (ty < 4) ty = my + 16;

    ctx.fillStyle = 'rgba(10, 14, 20, 0.94)';
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffcc00';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(line, tx + pad, ty + th / 2);
    ctx.restore();
  }

  // ── Explain Animation ──────────────────────────────────────
  let _explainActive = false;
  let _explainNodes = [];    // ordered node IDs to highlight
  let _explainWires = [];    // ordered wire IDs to highlight
  let _explainStep = -1;
  let _explainTimer = null;
  let _explainHighlightNodes = new Set();
  let _explainHighlightWires = new Set();

  function startExplain(level) {
    if (!level) return;
    // Build topological order: inputs first, then gates/FFs by depth, then outputs
    const nodeMap = new Map(level.nodes.map(n => [n.id, n]));
    const inputs = level.nodes.filter(n => n.type === 'INPUT' || n.type === 'CLOCK');
    const gates = level.nodes.filter(n => n.type === 'GATE_SLOT' || n.type === 'FF_SLOT' || n.type === 'MUX_SELECT');
    const outputs = level.nodes.filter(n => n.type === 'OUTPUT');

    // Simple BFS ordering from inputs
    const visited = new Set();
    const order = [];
    const wireOrder = [];
    const queue = inputs.map(n => n.id);
    queue.forEach(id => { visited.add(id); order.push(id); });

    while (queue.length > 0) {
      const id = queue.shift();
      // Find outgoing wires
      const outWires = level.wires.filter(w => w.sourceId === id);
      outWires.forEach(w => {
        wireOrder.push(w.id);
        if (!visited.has(w.targetId)) {
          visited.add(w.targetId);
          order.push(w.targetId);
          queue.push(w.targetId);
        }
      });
    }

    _explainNodes = order;
    _explainWires = wireOrder;
    _explainStep = -1;
    _explainHighlightNodes = new Set();
    _explainHighlightWires = new Set();
    _explainActive = true;
    _advanceExplain();
  }

  function _advanceExplain() {
    _explainStep++;
    // Alternate: add a node, then its outgoing wires
    const totalSteps = _explainNodes.length + _explainWires.length;
    if (_explainStep >= totalSteps) {
      // Done — keep everything highlighted for a moment then stop
      _explainTimer = setTimeout(stopExplain, 1500);
      return;
    }

    // Interleave: nodes and wires
    let nodeIdx = 0, wireIdx = 0;
    for (let i = 0; i <= _explainStep; i++) {
      if (nodeIdx <= wireIdx && nodeIdx < _explainNodes.length) {
        _explainHighlightNodes.add(_explainNodes[nodeIdx]);
        nodeIdx++;
      } else if (wireIdx < _explainWires.length) {
        _explainHighlightWires.add(_explainWires[wireIdx]);
        wireIdx++;
      } else if (nodeIdx < _explainNodes.length) {
        _explainHighlightNodes.add(_explainNodes[nodeIdx]);
        nodeIdx++;
      }
    }

    Sound.play('step');
    _explainTimer = setTimeout(_advanceExplain, 400);
  }

  function stopExplain() {
    _explainActive = false;
    _explainHighlightNodes.clear();
    _explainHighlightWires.clear();
    if (_explainTimer) clearTimeout(_explainTimer);
    _explainTimer = null;
  }

  function isExplaining() { return _explainActive; }

  function _drawExplainHighlights(level) {
    if (!_explainActive) return;
    const nodeMap = new Map(level.nodes.map(n => [n.id, n]));

    // Dim everything first (draw a semi-transparent overlay)
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = C.bg;
    ctx.fillRect(-5000, -5000, 10000, 10000);
    ctx.restore();

    // Redraw highlighted wires brightly
    level.wires.forEach(wire => {
      if (!_explainHighlightWires.has(wire.id)) return;
      const src = nodeMap.get(wire.sourceId);
      const dst = nodeMap.get(wire.targetId);
      if (!src || !dst) return;
      const srcPt = _nodeOutputAnchor(src, wire.sourceOutputIndex || 0);
      const dstPt = _nodeInputAnchor(dst, wire.targetInputIndex, wire.isClockWire);
      ctx.save();
      ctx.strokeStyle = wire.isClockWire ? '#ffcc00' : '#39ff14';
      ctx.lineWidth = 3;
      ctx.shadowColor = wire.isClockWire ? '#ffcc00' : '#39ff14';
      ctx.shadowBlur = 12;
      if (wire.isClockWire) { ctx.setLineDash([8, 5]); }
      _drawWirePath(srcPt, dstPt);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    });

    // Redraw highlighted nodes brightly
    _explainHighlightNodes.forEach(nodeId => {
      const node = nodeMap.get(nodeId);
      if (!node) return;
      ctx.save();
      const isNew = nodeId === _explainNodes[Math.max(0,
        [..._explainHighlightNodes].length - 1)];
      const color = node.type === 'INPUT' ? '#39ff14'
        : node.type === 'CLOCK' ? '#ffcc00'
        : node.type === 'OUTPUT' ? '#00d4ff'
        : node.type === 'FF_SLOT' ? '#a060ff'
        : '#00d4ff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  function _drawSolvedHalo() {
    const elapsed = _solveAnimStart ? Date.now() - _solveAnimStart : SOLVE_ANIM_MS;
    const t = Math.min(elapsed / SOLVE_ANIM_MS, 1); // 0→1

    // Expanding ring wave
    const waveR = t * Math.max(W, H) * 0.8;
    const waveAlpha = 0.25 * (1 - t);
    ctx.save();
    ctx.strokeStyle = `rgba(57,255,20,${waveAlpha})`;
    ctx.lineWidth = 4 + (1 - t) * 8;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, waveR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Pulsing green vignette
    const pulse = 0.5 + 0.5 * Math.sin(elapsed / 120);
    const vigAlpha = 0.04 + 0.03 * pulse;
    const grad = ctx.createRadialGradient(W/2, H/2, H*0.1, W/2, H/2, H*0.75);
    grad.addColorStop(0, `rgba(57,255,20,0.0)`);
    grad.addColorStop(1, `rgba(57,255,20,${vigAlpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Glow pulse on output nodes
    if (_currentLevel) {
      ctx.save();
      ctx.translate(_offsetX, _offsetY);
      if (_scale !== 1) ctx.scale(_scale, _scale);
      const glowPulse = 15 + 15 * Math.sin(elapsed / 80);
      _currentLevel.nodes.forEach(n => {
        if (n.type === 'OUTPUT' && !n.sandbox) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, 40, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(57,255,20,${0.4 + 0.4 * Math.sin(elapsed / 80)})`;
          ctx.lineWidth = 3;
          ctx.shadowColor = '#39ff14';
          ctx.shadowBlur = glowPulse;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });
      ctx.restore();
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Hit Testing ───────────────────────────────────────────
  function getNodeAtPoint(px, py, nodes) {
    const x = (px - _offsetX) / _scale;
    const y = (py - _offsetY) / _scale;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.type === 'DISPLAY_7SEG') {
        const hw = 40 + 6, hh = 60 + 6;
        if (x >= n.x - hw && x <= n.x + hw && y >= n.y - hh && y <= n.y + hh) return n;
      } else if (n.type === 'MUX_SELECT') {
        const hw = 25 + 6, hh = 15 + 6;
        if (x >= n.x - hw && x <= n.x + hw && y >= n.y - hh && y <= n.y + hh) return n;
      } else if (n.type === 'GATE_SLOT') {
        const hw = NODE.gateW / 2 + 6;
        const hh = NODE.gateH / 2 + 6;
        if (x >= n.x - hw && x <= n.x + hw && y >= n.y - hh && y <= n.y + hh) return n;
      } else if (n.type === 'FF_SLOT' || (Engine.FF_TYPES && Engine.FF_TYPES.has(n.type))) {
        const hw = NODE.ffW / 2 + 6;
        const hh = NODE.ffH / 2 + 6;
        if (x >= n.x - hw && x <= n.x + hw && y >= n.y - hh && y <= n.y + hh) return n;
      } else {
        const r  = NODE.inputR + 6;
        const dx = x - n.x, dy = y - n.y;
        if (dx*dx + dy*dy <= r*r) return n;
      }
    }
    return null;
  }

  function canvasToWorld(px, py) {
    return {
      x: Math.round((px - _offsetX) / _scale),
      y: Math.round((py - _offsetY) / _scale),
    };
  }

  // Find the closest wire to a world point (for deletion)
  function getWireAtPoint(px, py, level) {
    if (!level) return null;
    const wx = (px - _offsetX) / _scale;
    const wy = (py - _offsetY) / _scale;
    const nodeMap = new Map(level.nodes.map(n => [n.id, n]));
    let closest = null;
    let closestDist = 20; // max distance in world coords

    level.wires.forEach(wire => {
      const src = nodeMap.get(wire.sourceId);
      const tgt = nodeMap.get(wire.targetId);
      if (!src || !tgt) return;
      // Simple distance from point to line segment
      const dx = tgt.x - src.x, dy = tgt.y - src.y;
      const len2 = dx*dx + dy*dy;
      if (len2 === 0) return;
      let t = ((wx - src.x) * dx + (wy - src.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px2 = src.x + t * dx, py2 = src.y + t * dy;
      const dist = Math.sqrt((wx - px2)*(wx - px2) + (wy - py2)*(wy - py2));
      if (dist < closestDist) {
        closestDist = dist;
        closest = wire;
      }
    });
    return closest;
  }

  function panBy(dx, dy) {
    _offsetX += dx;
    _offsetY += dy;
    _userPanned = true;
  }

  function zoomAt(px, py, delta) {
    const oldScale = _scale;
    const factor = delta > 0 ? 0.9 : 1.1; // scroll down = zoom out, up = zoom in
    _userZoom = Math.max(0.3, Math.min(4, _userZoom * factor));
    const newScale = (_userPanned || State.designMode) ? oldScale * factor : _baseScale * _userZoom;
    // Zoom toward mouse position
    _offsetX = px - (px - _offsetX) * (newScale / oldScale);
    _offsetY = py - (py - _offsetY) * (newScale / oldScale);
    _scale = newScale;
    _userPanned = true;
  }

  function resetPan() {
    _userPanned = false;
    _userZoom = 1;
  }

  return { init, render, resize, getNodeAtPoint, canvasToWorld, getWireAtPoint, panBy, zoomAt, resetPan, startSolveAnim, startPulse, setLightTheme, startExplain, stopExplain, isExplaining };

})();
