/* ============================================================
   main.js — Circuit Designer — Bootstrap & App Loop
   ============================================================ */

(function () {

  // ── DOM References ────────────────────────────────────────
  const canvas      = document.getElementById('game-canvas');
  const levelName   = document.getElementById('level-name');
  const btnLevels   = document.getElementById('btn-levels');
  const menuOverlay = document.getElementById('menu-overlay');
  const menuBox     = document.getElementById('menu-box');
  const difficultyTabs = document.getElementById('difficulty-tabs');
  const levelGrid   = document.getElementById('level-grid');
  const btnMenuClose = document.getElementById('btn-menu-close');
  const infoOverlay = document.getElementById('info-overlay');
  const btnInfo     = document.getElementById('btn-info');
  const btnInfoClose = document.getElementById('btn-info-close');
  const instructionOverlay = document.getElementById('instruction-overlay');
  const instructionLevelName = document.getElementById('instruction-level-name');
  const instructionText = document.getElementById('instruction-text');
  const btnStart = document.getElementById('btn-start');
  const diagramOverlay = document.getElementById('diagram-overlay');
  const diagramTitle = document.getElementById('diagram-title');
  const diagramSubtitle = document.getElementById('diagram-subtitle');
  const diagramContent = document.getElementById('diagram-content');
  const btnDiagramClose = document.getElementById('btn-diagram-close');

  // ── Clock UI References ───────────────────────────────────
  const clockControls = document.getElementById('clock-controls');
  const btnStep       = document.getElementById('btn-step');
  const btnAutoClk    = document.getElementById('btn-auto-clk');
  const stepCountEl   = document.getElementById('step-count');

  let _rafId = null;
  let _menuVisible = false;
  let _currentLevelId = 1;

  // Gallery tab names for the menu
  const GALLERY_TABS = ['My Designs', 'Community', 'Showcase'];
  let currentMenuTab = 'Showcase';

  const TAB_DESCRIPTIONS = {
    'My Designs': 'Your personal collection of saved circuit designs.',
    'Community': 'Browse and load designs shared by other users from around the world.',
    'Showcase': 'Classic digital circuits — from basic gates to FSM controllers. 60 pre-built designs to explore, learn from, and remix.',
  };

  // ── Showcase categories ──────────────────────────────────
  const SHOWCASE_CATEGORIES = [
    'Fundamentals', 'Building Blocks', 'Advanced Circuits',
    'Flip-Flops', 'Sequential Logic', 'FSM Applications'
  ];
  let showcaseCategory = 'All';

  function _escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Colorize truth table bits ─────────────────────────────
  function colorizeTruthTableBits() {
    const cells = document.querySelectorAll('#truth-grid td');
    cells.forEach((cell) => {
      const value = cell.textContent.trim();
      cell.classList.remove('bit-0', 'bit-1');
      if (value === '0') cell.classList.add('bit-0');
      if (value === '1') cell.classList.add('bit-1');
    });
  }

  // ── Component Diagram ─────────────────────────────────────
  function renderComponentDiagram(componentKey) {
    const BG='#0d1320', NC='#39ff14', PC='#ffd700';
    const WC='#8ab4cc', VC='#4a8fff', GC='#ff5050';
    const AC='#ff9933', OC='#00d4ff', TC='#c8d8f0', DC='#4a6080';

    function T(cx,cy,type,gx,ty,by,lbl){
      const isN=type==='N', c=isN?NC:PC, px=cx-10, bR=5;
      const gEnd=isN?px:px-bR*2-2;
      const bub=isN?'':`<circle cx="${px-bR}" cy="${cy}" r="${bR}" fill="${BG}" stroke="${c}" stroke-width="2"/>`;
      const aY=isN?cy+12:cy-12;
      const arr=isN
        ?`<polygon points="${cx-4},${aY+9} ${cx+4},${aY+9} ${cx},${aY+1}" fill="${c}" opacity="0.88"/>`
        :`<polygon points="${cx-4},${aY-9} ${cx+4},${aY-9} ${cx},${aY-1}" fill="${c}" opacity="0.88"/>`;
      return `
        <line x1="${px}" y1="${cy-22}" x2="${px}" y2="${cy+22}" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
        <line x1="${px+1}" y1="${cy-12}" x2="${cx}" y2="${cy-12}" stroke="${c}" stroke-width="2.5"/>
        <line x1="${px+1}" y1="${cy+12}" x2="${cx}" y2="${cy+12}" stroke="${c}" stroke-width="2.5"/>
        <line x1="${cx}" y1="${cy-12}" x2="${cx}" y2="${cy+12}" stroke="${c}" stroke-width="2.5"/>
        ${bub}
        <line x1="${gx}" y1="${cy}" x2="${gEnd}" y2="${cy}" stroke="${AC}" stroke-width="2.5"/>
        <line x1="${cx}" y1="${cy-12}" x2="${cx}" y2="${ty}" stroke="${WC}" stroke-width="2"/>
        <line x1="${cx}" y1="${cy+12}" x2="${cx}" y2="${by}" stroke="${WC}" stroke-width="2"/>
        ${arr}
        <text x="${cx+16}" y="${cy+5}" fill="${c}" font-size="11" font-family="monospace" font-weight="bold">${lbl}</text>`;
    }

    function VDD(x,y){return `<line x1="${x-24}" y1="${y}" x2="${x+24}" y2="${y}" stroke="${VC}" stroke-width="3.5"/><text x="${x}" y="${y-8}" text-anchor="middle" fill="${VC}" font-size="10" font-family="monospace" font-weight="bold">VDD</text>`;}
    function VDDBAR(x1,x2,y){return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${VC}" stroke-width="3.5"/><text x="${(x1+x2)/2}" y="${y-8}" text-anchor="middle" fill="${VC}" font-size="10" font-family="monospace" font-weight="bold">VDD</text>`;}
    function GND(x,y){return `<line x1="${x-22}" y1="${y}" x2="${x+22}" y2="${y}" stroke="${GC}" stroke-width="3.5"/><line x1="${x-14}" y1="${y+7}" x2="${x+14}" y2="${y+7}" stroke="${GC}" stroke-width="2.5"/><line x1="${x-6}" y1="${y+14}" x2="${x+6}" y2="${y+14}" stroke="${GC}" stroke-width="2"/>`;}
    function IN(x,y,n){return `<circle cx="${x}" cy="${y}" r="17" fill="${BG}" stroke="#1e6fa0" stroke-width="2"/><text x="${x}" y="${y+5}" text-anchor="middle" fill="${TC}" font-size="14" font-family="monospace" font-weight="bold">${n}</text>`;}
    function OUTNODE(x,y){return `<circle cx="${x}" cy="${y}" r="6" fill="${OC}"/><line x1="${x+6}" y1="${y}" x2="${x+54}" y2="${y}" stroke="${OC}" stroke-width="2.5"/><text x="${x+60}" y="${y+5}" fill="${OC}" font-size="13" font-family="monospace" font-weight="bold">OUT</text>`;}
    function DOT(x,y,c){return `<circle cx="${x}" cy="${y}" r="4.5" fill="${c}"/>`;}
    function L(x1,y1,x2,y2,c,w){return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c||WC}" stroke-width="${w||2}"/>`;}
    function NOTE(t){return `<text x="22" y="444" fill="${DC}" font-size="11" font-family="monospace">${t}</text>`;}
    function SHELL(title,sub,body){return `<svg viewBox="0 0 720 460" xmlns="http://www.w3.org/2000/svg"><rect width="720" height="460" rx="14" fill="${BG}" stroke="#1a3060" stroke-width="1.5"/><text x="22" y="36" fill="${OC}" font-size="18" font-weight="700" font-family="monospace" letter-spacing="2">${title}</text><text x="22" y="56" fill="${DC}" font-size="11" font-family="monospace" letter-spacing="1">${sub}</text><line x1="22" y1="63" x2="698" y2="63" stroke="#1a3060" stroke-width="1"/>${body}</svg>`;}

    // Simplified — just NOT for now (the full set can be added later)
    switch(componentKey){
    case 'NOT':{
      const cx=340, vY=82, gY=418, pY=185, nY=318, mid=251, gx=118;
      return SHELL('NOT GATE','CMOS INVERTER',`
        ${VDD(cx,vY)}
        ${T(cx,pY,'P',gx,vY,mid,'P1')}
        ${DOT(cx,mid,OC)}${L(cx,mid,554,mid,OC,2.5)}${OUTNODE(554,mid)}
        ${T(cx,nY,'N',gx,mid,gY,'N1')}
        ${GND(cx,gY)}
        ${IN(56,mid,'A')}
        ${L(73,mid,gx,mid,AC,2.5)}
        ${L(gx,pY,gx,nY,AC,1.5)}
        ${DOT(gx,mid,AC)}
        ${NOTE('A=0: PMOS ON, NMOS OFF → OUT=1   |   A=1: NMOS ON, PMOS OFF → OUT=0')}
      `);}
    default: return '';
    }
  }

  function closeComponentDiagram() {
    diagramOverlay.classList.add('hidden');
    diagramOverlay.setAttribute('aria-hidden', 'true');
  }

  function setupComponentInfoButtons() {
    const titleMap = new Map([
      ['AND', { key: 'AND', label: 'AND' }],
      ['OR', { key: 'OR', label: 'OR' }],
      ['XOR', { key: 'XOR', label: 'XOR' }],
      ['NAND', { key: 'NAND', label: 'NAND' }],
      ['NOR', { key: 'NOR', label: 'NOR' }],
      ['NOT', { key: 'NOT', label: 'NOT' }],
      ['D', { key: 'D', label: 'D Flip-Flop' }],
      ['T', { key: 'T', label: 'T Flip-Flop' }],
      ['SR', { key: 'SR', label: 'SR Flip-Flop' }],
      ['JK', { key: 'JK', label: 'JK Flip-Flop' }],
    ]);

    document.querySelectorAll('#truth-grid h3').forEach(h3 => {
      const text = h3.textContent.trim().replace(/ .*/, '');
      const comp = h3.dataset.component || text;
      const entry = titleMap.get(comp);
      if (!entry) return;

      h3.style.cursor = 'pointer';
      h3.title = `Click to see ${entry.label} transistor structure`;
      h3.addEventListener('click', () => {
        const svg = renderComponentDiagram(entry.key);
        if (!svg) return;
        diagramTitle.textContent = entry.label + ' — Transistor Structure';
        diagramSubtitle.textContent = 'Simplified CMOS schematic';
        diagramContent.innerHTML = svg;
        diagramOverlay.classList.remove('hidden');
        diagramOverlay.setAttribute('aria-hidden', 'false');
      });
    });
  }

  // ── Auto-clock state ─────────────────────────────────────
  let _autoClkRunning  = false;
  let _autoClkInterval = null;

  function _updateStepCount() {
    stepCountEl.textContent = `STEP: ${State.stepCount}`;
  }

  function _setClockControlsVisible(visible) {
    clockControls.classList.toggle('hidden', !visible);
  }

  function _setFfPaletteVisible(visible) {
    const ffPalette = document.getElementById('ff-palette');
    const gatePalette = document.getElementById('gate-palette');
    ffPalette.classList.toggle('hidden', !visible);
    gatePalette.classList.toggle('hidden', visible);
    if (visible) {
      document.querySelectorAll('.ff-chip').forEach(chip => chip.classList.remove('hidden'));
    }
  }

  function _stopAutoClock() {
    if (_autoClkInterval) { clearInterval(_autoClkInterval); _autoClkInterval = null; }
    _autoClkRunning = false;
    btnAutoClk.classList.remove('running');
    btnAutoClk.textContent = 'AUTO CLK';
  }

  function _startAutoClock() {
    _autoClkRunning = true;
    btnAutoClk.classList.add('running');
    btnAutoClk.textContent = '■ STOP';
    _autoClkInterval = setInterval(() => {
      State.stepClock();
      Renderer.startPulse();
      _updateStepCount();
    }, 600);
  }

  btnStep.addEventListener('click', () => {
    if (!State.isSequentialLevel()) return;
    State.stepClock();
    Renderer.startPulse();
    Sound.play('step');
    _updateStepCount();
  });

  btnAutoClk.addEventListener('click', () => {
    if (_autoClkRunning) _stopAutoClock();
    else _startAutoClock();
  });

  // ── Core: Evaluate + Render ───────────────────────────────
  function tick() {
    const level = State.level;
    if (!level) return;

    const result = Engine.evaluate(level, State.getFfStates(), State.stepCount);
    State.setEvalResult(result);

    if (State.clockHigh) {
      State.lowerClock();
    }

    Renderer.render(level, result, State.hoveredNodeId, false, State.stepCount);

    // Record waveform data
    if (result.nodeValues) {
      Waveform.record(State.stepCount, result.nodeValues);
      if (Waveform.isVisible()) {
        Waveform.render();
      }
    }

    // Auto-save design
    if (State.designMode) _scheduleDesignSave();

    _rafId = requestAnimationFrame(tick);
  }

  let _designSaveTimer = null;
  function _scheduleDesignSave() {
    if (_designSaveTimer) return;
    _designSaveTimer = setTimeout(() => {
      _designSaveTimer = null;
      if (State.designMode && State.level) {
        localStorage.setItem('circuit_designer_design', JSON.stringify({
          nodes: State.level.nodes,
          wires: State.level.wires,
        }));
      }
    }, 2000);
  }

  function startLoop() {
    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = requestAnimationFrame(tick);
  }

  // ── Load Design Mode ─────────────────────────────────────
  function loadDesignMode() {
    const levelDef = LEVELS[0];
    Renderer.resetPan();
    State.setLevelIndex(0);
    State.setLevel(levelDef);
    _currentLevelId = levelDef.id;

    Waveform.reset();
    Waveform.setSignals(State.level);

    levelName.textContent = 'Design Mode';

    State.designMode = true;
    _setDesignMode(true);

    _stopAutoClock();

    // Show instruction on first visit
    if (!localStorage.getItem('circuit_designer_welcomed')) {
      instructionLevelName.textContent = 'CIRCUIT DESIGNER';
      if (levelDef.instructionHtml) {
        instructionText.innerHTML = levelDef.instructionHtml;
      } else {
        instructionText.textContent = levelDef.instruction;
      }
      instructionOverlay.classList.remove('hidden');
    }

    startLoop();

    // Tutorial
    if (!localStorage.getItem('circuit_designer_tut')) {
      setTimeout(() => _startTutorial(TUTORIAL_DESIGN_STEPS, 'circuit_designer_tut'), 500);
    }
  }

  // ── Design Mode ──────────────────────────────────────────
  const designToolbar = document.getElementById('design-toolbar');
  const designTools = document.querySelectorAll('.design-tool');

  function _setDesignMode(active) {
    designToolbar.classList.toggle('hidden', !active);
    document.getElementById('hud-right').style.display = active ? 'none' : '';
    document.getElementById('hud-center').style.display = active ? 'none' : '';
    if (active) {
      State.designTool = 'select';
      _updateDesignToolActive('select');
      if (State.level) {
        const saved = localStorage.getItem('circuit_designer_design');
        if (saved) {
          try {
            const data = JSON.parse(saved);
            State.level.nodes = data.nodes || [];
            State.level.wires = data.wires || [];
            let maxNum = 0;
            State.level.nodes.forEach(n => {
              const m = String(n.id).match(/(\d+)$/);
              if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
            });
            State.level.wires.forEach(w => {
              const m = String(w.id).match(/(\d+)$/);
              if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
            });
            State.nodeCounter = maxNum + 1;
          } catch (_) {
            State.level.nodes = [];
            State.level.wires = [];
          }
        } else {
          State.level.nodes = [];
          State.level.wires = [];
        }
      }
      Renderer.panBy(0, 0);
    }
  }

  function _updateDesignToolActive(tool) {
    designTools.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
  }

  // ── Property Editor ──────────────────────────────────────
  const designProps = document.getElementById('design-props');
  const propsType = document.getElementById('design-props-type');
  const propLabel = document.getElementById('prop-label');
  const propValueToggle = document.getElementById('prop-value-toggle');
  const propStepsRow = document.getElementById('prop-steps-row');
  const propSteps = document.getElementById('prop-steps');
  const propTargetToggle = document.getElementById('prop-target-toggle');
  const propStepTargetsRow = document.getElementById('prop-step-targets-row');
  const propStepTargets = document.getElementById('prop-step-targets');
  const propInitQToggle = document.getElementById('prop-initq-toggle');
  const propLabelRow = document.getElementById('prop-label-row');
  const propValueRow = document.getElementById('prop-value-row');
  const propTargetRow = document.getElementById('prop-target-row');
  const propInitQRow = document.getElementById('prop-initq-row');

  function _getSelectedNode() {
    if (!State.level || !State.selectedNodeId) return null;
    return State.level.nodes.find(n => n.id === State.selectedNodeId) || null;
  }

  function _updatePropsPanel() {
    const node = _getSelectedNode();
    if (!node || !State.designMode) {
      designProps.classList.add('hidden');
      return;
    }
    designProps.classList.remove('hidden');
    propsType.textContent = node.type;

    propLabelRow.style.display = '';
    propValueRow.style.display = (node.type === 'INPUT' || node.type === 'MUX_SELECT') ? '' : 'none';
    propStepsRow.style.display = node.type === 'INPUT' ? '' : 'none';
    propTargetRow.style.display = node.type === 'OUTPUT' ? '' : 'none';
    propStepTargetsRow.style.display = node.type === 'OUTPUT' ? '' : 'none';
    propInitQRow.style.display = node.type === 'FF_SLOT' ? '' : 'none';

    propLabel.value = node.label || '';
    if (node.type === 'INPUT') {
      propValueToggle.textContent = node.fixedValue ?? 0;
      propSteps.value = (node.stepValues || []).join(',');
    }
    if (node.type === 'MUX_SELECT') propValueToggle.textContent = node.value ?? 0;
    if (node.type === 'OUTPUT') {
      propTargetToggle.textContent = node.targetValue ?? 0;
      propStepTargets.value = (node.stepTargets || []).join(',');
    }
    if (node.type === 'FF_SLOT') propInitQToggle.textContent = node.initialQ ?? 0;
  }

  let _lastPropsNodeId = null;
  setInterval(() => {
    if (State.selectedNodeId !== _lastPropsNodeId) {
      _lastPropsNodeId = State.selectedNodeId;
      _updatePropsPanel();
    }
  }, 100);

  propLabel.addEventListener('input', () => {
    const node = _getSelectedNode();
    if (node) node.label = propLabel.value;
  });

  propValueToggle.addEventListener('click', () => {
    const node = _getSelectedNode();
    if (!node) return;
    if (node.type === 'INPUT') {
      node.fixedValue = (node.fixedValue ?? 0) ^ 1;
      propValueToggle.textContent = node.fixedValue;
    } else if (node.type === 'MUX_SELECT') {
      node.value = (node.value ?? 0) ^ 1;
      propValueToggle.textContent = node.value;
    }
  });

  propSteps.addEventListener('input', () => {
    const node = _getSelectedNode();
    if (!node || node.type !== 'INPUT') return;
    const vals = propSteps.value.split(',').map(s => parseInt(s.trim())).filter(v => v === 0 || v === 1);
    node.stepValues = vals.length > 0 ? vals : undefined;
  });

  propTargetToggle.addEventListener('click', () => {
    const node = _getSelectedNode();
    if (!node || node.type !== 'OUTPUT') return;
    node.targetValue = (node.targetValue ?? 0) ^ 1;
    propTargetToggle.textContent = node.targetValue;
  });

  propStepTargets.addEventListener('input', () => {
    const node = _getSelectedNode();
    if (!node || node.type !== 'OUTPUT') return;
    const vals = propStepTargets.value.split(',').map(s => parseInt(s.trim())).filter(v => v === 0 || v === 1);
    node.stepTargets = vals.length > 0 ? vals : undefined;
  });

  propInitQToggle.addEventListener('click', () => {
    const node = _getSelectedNode();
    if (!node || node.type !== 'FF_SLOT') return;
    node.initialQ = (node.initialQ ?? 0) ^ 1;
    propInitQToggle.textContent = node.initialQ;
  });

  // Tool selection
  designTools.forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      State.designTool = tool;
      _updateDesignToolActive(tool);
    });
  });

  // Prevent toolbar clicks from reaching canvas
  document.getElementById('design-toolbar').addEventListener('mousedown', (e) => { e.stopPropagation(); });
  document.getElementById('design-toolbar').addEventListener('click', (e) => { e.stopPropagation(); });

  document.getElementById('btn-design-clear').addEventListener('click', () => {
    if (!State.level) return;
    Sound.play('clear');
    State.level.nodes = [];
    State.level.wires = [];
    State.selectedNodeId = null;
    localStorage.removeItem('circuit_designer_design');
  });

  document.getElementById('btn-design-undo').addEventListener('click', () => {
    if (State.undo()) _updateStepCount();
  });
  document.getElementById('btn-design-redo').addEventListener('click', () => {
    if (State.redo()) _updateStepCount();
  });

  // Export
  document.getElementById('btn-design-export').addEventListener('click', () => {
    if (!State.level) return;
    const data = State.exportLevel();
    navigator.clipboard.writeText(data).then(() => {
      alert('Circuit JSON copied to clipboard!');
    }).catch(() => {
      prompt('Copy this JSON:', data);
    });
  });

  // Import
  document.getElementById('btn-design-import').addEventListener('click', () => {
    const json = prompt('Paste circuit JSON:');
    if (!json) return;
    try {
      const data = JSON.parse(json);
      if (data.nodes && data.wires) {
        State.level.nodes = data.nodes;
        State.level.wires = data.wires;
        State.selectedNodeId = null;
        let maxNum = 0;
        State.level.nodes.forEach(n => { const m = String(n.id).match(/(\d+)$/); if (m) maxNum = Math.max(maxNum, parseInt(m[1])); });
        State.level.wires.forEach(w => { const m = String(w.id).match(/(\d+)$/); if (m) maxNum = Math.max(maxNum, parseInt(m[1])); });
        State.nodeCounter = maxNum + 1;
      }
    } catch (_) {
      alert('Invalid JSON.');
    }
  });

  // Share (screenshot)
  document.getElementById('btn-design-share').addEventListener('click', () => {
    const gameCanvas = document.getElementById('game-canvas');
    const w = gameCanvas.width;
    const h = gameCanvas.height;
    const bannerH = 60;

    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h + bannerH;
    const octx = offscreen.getContext('2d');

    octx.fillStyle = '#0d1117';
    octx.fillRect(0, 0, w, bannerH);
    octx.strokeStyle = '#a060ff';
    octx.lineWidth = 2;
    octx.beginPath();
    octx.moveTo(0, bannerH);
    octx.lineTo(w, bannerH);
    octx.stroke();

    octx.fillStyle = '#a060ff';
    octx.font = 'bold 20px JetBrains Mono, monospace';
    octx.textAlign = 'left';
    octx.textBaseline = 'middle';
    octx.fillText('CIRCUIT DESIGNER', 20, 30);

    octx.fillStyle = '#555';
    octx.font = '12px JetBrains Mono, monospace';
    octx.textAlign = 'right';
    octx.fillText('Digital Logic Sandbox', w - 20, 30);

    octx.drawImage(gameCanvas, 0, bannerH);

    offscreen.toBlob(blob => {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'circuit.png', { type: 'image/png' })] })) {
        const file = new File([blob], 'circuit-designer.png', { type: 'image/png' });
        navigator.share({ title: 'Circuit Designer', text: 'Check out my circuit design!', files: [file] }).catch(() => {});
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'circuit-designer.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  });

  // ── Gallery ───────────────────────────────────────────────
  const GALLERY_KEY = 'circuit_designer_gallery';
  const AUTHOR_KEY = 'circuit_designer_author';
  const AUTHOR_ID_KEY = 'circuit_designer_author_id';
  if (!localStorage.getItem(AUTHOR_ID_KEY)) {
    localStorage.setItem(AUTHOR_ID_KEY, 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10));
  }
  const _authorId = localStorage.getItem(AUTHOR_ID_KEY);
  const galleryOverlay = document.getElementById('gallery-overlay');
  const galleryGrid = document.getElementById('gallery-grid');
  const galleryEmpty = document.getElementById('gallery-empty');
  const galleryLoading = document.getElementById('gallery-loading');
  const gallerySaveOverlay = document.getElementById('gallery-save-overlay');
  const gallerySaveName = document.getElementById('gallery-save-name');
  const gallerySaveAuthor = document.getElementById('gallery-save-author');
  const gallerySaveDesc = document.getElementById('gallery-save-desc');
  const gallerySaveCommunity = document.getElementById('gallery-save-community');
  const galleryTabs = document.querySelectorAll('.gallery-tab');
  let galleryActiveTab = 'showcase';
  const COMMUNITY_CACHE_KEY = 'circuit_designer_community_cache';
  let communityCache = null;

  function _loadCommunityCache() {
    try {
      const raw = localStorage.getItem(COMMUNITY_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }
  function _saveCommunityCache(items) {
    try {
      localStorage.setItem(COMMUNITY_CACHE_KEY, JSON.stringify(items));
    } catch (_) {}
  }

  function _loadGallery() {
    try {
      return JSON.parse(localStorage.getItem(GALLERY_KEY)) || [];
    } catch (_) { return []; }
  }
  function _saveGalleryLocal(items) {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(items));
  }

  function _loadNodeCounter(item) {
    let maxNum = 0;
    (item.nodes || []).forEach(n => {
      const m = String(n.id).match(/(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
    });
    (item.wires || []).forEach(w => {
      const m = String(w.id).match(/(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
    });
    return maxNum + 1;
  }

  function _loadDesignIntoCanvas(item) {
    if (State.level && State.level.nodes.length > 0) {
      if (!confirm('Loading will replace your current design. Continue?')) return;
    }
    // Return to design mode if in test mode
    if (!State.designMode) {
      _returnToDesignMode();
    }
    State.level.nodes = JSON.parse(JSON.stringify(item.nodes));
    State.level.wires = JSON.parse(JSON.stringify(item.wires));
    State.selectedNodeId = null;
    State.nodeCounter = _loadNodeCounter(item);
    galleryOverlay.classList.add('hidden');
    closeMenuOverlay();
  }

  const _likedDesigns = new Set(JSON.parse(localStorage.getItem('circuit_designer_liked') || '[]'));
  function _saveLiked() { localStorage.setItem('circuit_designer_liked', JSON.stringify([..._likedDesigns])); }

  function _findCommunityItem(btn) {
    const docId = btn.dataset.docId;
    if (!docId || !communityCache) return null;
    const idx = communityCache.findIndex(c => c.id === docId);
    return idx >= 0 ? { item: communityCache[idx], idx } : null;
  }

  function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function _renderCard(item, idx, source) {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    const date = new Date(item.date).toLocaleDateString();
    const nodes = (item.nodes || []).length;
    const wires = (item.wires || []).length;
    const likes = item.likes || 0;
    const isCommunity = source === 'community';
    const isShowcase = source === 'showcase';
    const liked = isCommunity && item.id && _likedDesigns.has(item.id);
    const isOwn = isCommunity && item.authorId && item.authorId === _authorId;
    const did = isCommunity ? ` data-doc-id="${item.id || ''}"` : '';

    let categoryBadge = '';
    if (isShowcase && item.category) {
      categoryBadge = `<div class="gallery-card-category">${_esc(item.category)}</div>`;
    }

    card.innerHTML =
      `<div class="gallery-card-name">${_esc(item.name)}</div>` +
      categoryBadge +
      (item.author ? `<div class="gallery-card-author">by ${_esc(item.author)}</div>` : '') +
      (item.desc ? `<div class="gallery-card-desc">${_esc(item.desc)}</div>` : '') +
      `<div class="gallery-card-meta">${nodes} nodes · ${wires} wires${!isShowcase ? ' · ' + date : ''}</div>` +
      `<div class="gallery-card-actions">` +
        `<button class="gallery-btn-load" data-idx="${idx}" data-src="${source}"${did}>LOAD</button>` +
        (isCommunity ? `<button class="gallery-btn-like${liked ? ' liked' : ''}"${did}>${liked ? '♥' : '♡'} ${likes}</button>` : '') +
        ((isCommunity || isShowcase) ? `<button class="gallery-btn-save-copy" data-idx="${idx}" data-src="${source}"${did}>SAVE COPY</button>` : '') +
        (isOwn ? `<button class="gallery-btn-delete-community"${did}>DELETE</button>` : '') +
        (source === 'local' ? `<button class="gallery-btn-edit" data-idx="${idx}">EDIT</button>` : '') +
        (source === 'local' ? `<button class="gallery-btn-delete" data-idx="${idx}">DELETE</button>` : '') +
      `</div>`;
    return card;
  }

  const gallerySearch = document.getElementById('gallery-search');
  let gallerySearchQuery = '';

  gallerySearch.addEventListener('input', () => {
    gallerySearchQuery = gallerySearch.value.trim().toLowerCase();
    _renderGallery();
  });

  function _filterItems(items) {
    if (!gallerySearchQuery) return items.map((item, idx) => ({ item, idx }));
    return items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) =>
        (item.name || '').toLowerCase().includes(gallerySearchQuery) ||
        (item.author || '').toLowerCase().includes(gallerySearchQuery) ||
        (item.desc || '').toLowerCase().includes(gallerySearchQuery) ||
        (item.category || '').toLowerCase().includes(gallerySearchQuery)
      );
  }

  function _renderMyGallery() {
    const items = _loadGallery();
    const filtered = _filterItems(items);
    galleryGrid.innerHTML = '';
    galleryLoading.classList.add('hidden');
    galleryEmpty.textContent = gallerySearchQuery
      ? 'No designs match your search.'
      : 'No saved designs yet. Build a circuit and click SAVE TO GALLERY.';
    galleryEmpty.classList.toggle('hidden', filtered.length > 0);
    filtered.forEach(({ item, idx }) => {
      galleryGrid.appendChild(_renderCard(item, idx, 'local'));
    });
  }

  async function _renderCommunityGallery(forceRefresh) {
    galleryGrid.innerHTML = '';
    galleryEmpty.classList.add('hidden');

    const localCache = communityCache || _loadCommunityCache();
    if (localCache && !forceRefresh) {
      communityCache = localCache;
      _renderCommunityCards();
    } else {
      galleryLoading.classList.remove('hidden');
    }

    try {
      const db = window._fbDb;
      if (db) {
        const snap = await db.collection('designs').orderBy('date', 'desc').limit(100).get();
        const freshData = [];
        snap.forEach(d => freshData.push({ id: d.id, ...d.data() }));
        communityCache = freshData;
        _saveCommunityCache(communityCache);
      }
      _renderCommunityCards();
    } catch (err) {
      if (!localCache) galleryLoading.textContent = 'Failed to load community designs.';
      console.error('Community gallery error:', err);
    }
  }

  function _renderCommunityCards() {
    if (!communityCache) return;
    const filtered = _filterItems(communityCache);
    galleryGrid.innerHTML = '';
    galleryLoading.classList.add('hidden');
    galleryEmpty.textContent = gallerySearchQuery
      ? 'No community designs match your search.'
      : 'No community designs yet. Be the first to share!';
    galleryEmpty.classList.toggle('hidden', filtered.length > 0);
    filtered.forEach(({ item, idx }) => {
      galleryGrid.appendChild(_renderCard(item, idx, 'community'));
    });
  }

  function _renderShowcaseGallery() {
    galleryGrid.innerHTML = '';
    galleryLoading.classList.add('hidden');
    const designs = typeof SHOWCASE_DESIGNS !== 'undefined' ? SHOWCASE_DESIGNS : [];

    // Category filter buttons
    const filterRow = document.createElement('div');
    filterRow.className = 'showcase-filter-row';
    const allBtn = document.createElement('button');
    allBtn.className = `showcase-filter-btn${showcaseCategory === 'All' ? ' active' : ''}`;
    allBtn.textContent = `All (${designs.length})`;
    allBtn.addEventListener('click', () => { showcaseCategory = 'All'; _renderShowcaseGallery(); });
    filterRow.appendChild(allBtn);
    SHOWCASE_CATEGORIES.forEach(cat => {
      const count = designs.filter(d => d.category === cat).length;
      if (count === 0) return;
      const btn = document.createElement('button');
      btn.className = `showcase-filter-btn${showcaseCategory === cat ? ' active' : ''}`;
      btn.textContent = `${cat} (${count})`;
      btn.addEventListener('click', () => { showcaseCategory = cat; _renderShowcaseGallery(); });
      filterRow.appendChild(btn);
    });
    galleryGrid.appendChild(filterRow);

    let filtered = showcaseCategory === 'All' ? designs : designs.filter(d => d.category === showcaseCategory);
    // Apply search
    if (gallerySearchQuery) {
      filtered = filtered.filter(d =>
        (d.name || '').toLowerCase().includes(gallerySearchQuery) ||
        (d.desc || '').toLowerCase().includes(gallerySearchQuery) ||
        (d.category || '').toLowerCase().includes(gallerySearchQuery)
      );
    }

    galleryEmpty.textContent = 'No showcase designs match your search.';
    galleryEmpty.classList.toggle('hidden', filtered.length > 0);

    filtered.forEach((item, idx) => {
      const realIdx = designs.indexOf(item);
      galleryGrid.appendChild(_renderCard(item, realIdx, 'showcase'));
    });
  }

  function _renderGallery() {
    if (galleryActiveTab === 'my') {
      _renderMyGallery();
    } else if (galleryActiveTab === 'community') {
      _renderCommunityGallery(false);
    } else {
      _renderShowcaseGallery();
    }
  }

  // Tab switching
  galleryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      galleryActiveTab = tab.dataset.tab;
      galleryTabs.forEach(t => t.classList.toggle('active', t === tab));
      _renderGallery();
    });
  });

  // Open save dialog
  document.getElementById('btn-design-gallery-save').addEventListener('click', () => {
    if (!State.level) return;
    if (State.level.nodes.length === 0) {
      alert('Nothing to save — place some components first.');
      return;
    }
    gallerySaveName.value = '';
    gallerySaveAuthor.value = localStorage.getItem(AUTHOR_KEY) || '';
    gallerySaveDesc.value = '';
    const fbReady = !!window._fbDb;
    gallerySaveCommunity.checked = fbReady;
    gallerySaveCommunity.disabled = !fbReady;
    gallerySaveCommunity.parentElement.style.opacity = fbReady ? '' : '0.4';
    gallerySaveCommunity.parentElement.title = fbReady ? '' : 'Community sharing unavailable';
    gallerySaveOverlay.classList.remove('hidden');
    gallerySaveName.focus();
  });

  document.getElementById('btn-gallery-save-cancel').addEventListener('click', () => {
    gallerySaveOverlay.classList.add('hidden');
  });

  document.getElementById('btn-gallery-save-confirm').addEventListener('click', async () => {
    const name = gallerySaveName.value.trim() || 'Untitled';
    const author = gallerySaveAuthor.value.trim() || 'Anonymous';
    const desc = gallerySaveDesc.value.trim();
    const shareToCommunity = gallerySaveCommunity.checked;

    localStorage.setItem(AUTHOR_KEY, author);

    const designData = {
      name,
      author,
      authorId: _authorId,
      desc,
      date: Date.now(),
      likes: 0,
      nodes: JSON.parse(JSON.stringify(State.level.nodes)),
      wires: JSON.parse(JSON.stringify(State.level.wires)),
    };

    const items = _loadGallery();
    items.unshift(designData);
    _saveGalleryLocal(items);

    if (shareToCommunity) {
      if (!window._fbDb) {
        alert('Community sharing unavailable. Saved locally only.');
      } else {
        try {
          const docRef = window._fbDb.collection('designs').doc();
          const docId = docRef.id;
          docRef.set(designData).catch(err => console.error('Community save failed:', err));
          const savedItem = Object.assign({}, designData, { id: docId });
          if (communityCache) { communityCache.unshift(savedItem); } else { communityCache = [savedItem]; }
          _saveCommunityCache(communityCache);
        } catch (err) {
          console.error('Failed to share:', err);
        }
      }
    }

    gallerySaveOverlay.classList.add('hidden');
    Sound.play('clear');
  });

  // Open gallery
  document.getElementById('btn-design-gallery').addEventListener('click', () => {
    _renderGallery();
    galleryOverlay.classList.remove('hidden');
  });

  document.getElementById('btn-gallery-close').addEventListener('click', () => {
    galleryOverlay.classList.add('hidden');
  });

  // Gallery card actions (delegated)
  galleryGrid.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.classList.contains('showcase-filter-btn')) return; // handled separately
    const localIdx = parseInt(btn.dataset.idx);
    const src = btn.dataset.src;

    if (btn.classList.contains('gallery-btn-load')) {
      let item;
      if (src === 'showcase') {
        item = (typeof SHOWCASE_DESIGNS !== 'undefined') ? SHOWCASE_DESIGNS[localIdx] : null;
      } else if (src === 'community') {
        const found = _findCommunityItem(btn);
        item = found ? found.item : null;
      } else {
        item = _loadGallery()[localIdx];
      }
      if (!item) return;
      _loadDesignIntoCanvas(item);
    }

    if (btn.classList.contains('gallery-btn-like')) {
      const found = _findCommunityItem(btn);
      if (!found) return;
      const { item: ci } = found;
      const docId = ci.id;
      const alreadyLiked = _likedDesigns.has(docId);
      const prevLikes = ci.likes || 0;
      if (alreadyLiked) { _likedDesigns.delete(docId); ci.likes = Math.max(0, prevLikes - 1); }
      else { _likedDesigns.add(docId); ci.likes = prevLikes + 1; }
      _saveLiked();
      btn.classList.toggle('liked', !alreadyLiked);
      btn.innerHTML = `${!alreadyLiked ? '♥' : '♡'} ${ci.likes}`;
      if (window._fbDb) {
        window._fbDb.collection('designs').doc(docId).update({
          likes: firebase.firestore.FieldValue.increment(alreadyLiked ? -1 : 1)
        }).catch(err => {
          console.error('Like update failed:', err);
          if (alreadyLiked) { _likedDesigns.add(docId); } else { _likedDesigns.delete(docId); }
          _saveLiked(); ci.likes = prevLikes;
          btn.classList.toggle('liked', alreadyLiked);
          btn.innerHTML = `${alreadyLiked ? '♥' : '♡'} ${prevLikes}`;
        });
      }
    }

    if (btn.classList.contains('gallery-btn-save-copy')) {
      let item;
      if (src === 'showcase') {
        item = (typeof SHOWCASE_DESIGNS !== 'undefined') ? SHOWCASE_DESIGNS[localIdx] : null;
      } else {
        const found = _findCommunityItem(btn);
        item = found ? found.item : null;
      }
      if (!item) return;
      const localItems = _loadGallery();
      localItems.unshift({
        name: item.name + ' (copy)',
        author: item.author || '',
        desc: item.desc || '',
        date: Date.now(),
        nodes: JSON.parse(JSON.stringify(item.nodes)),
        wires: JSON.parse(JSON.stringify(item.wires)),
      });
      _saveGalleryLocal(localItems);
      alert(`"${item.name}" saved to your designs!`);
    }

    if (btn.classList.contains('gallery-btn-edit')) {
      const items = _loadGallery();
      if (localIdx < 0 || localIdx >= items.length) return;
      const item = items[localIdx];
      const newName = prompt('Name:', item.name);
      if (newName === null) return;
      const newDesc = prompt('Description:', item.desc || '');
      if (newDesc === null) return;
      item.name = newName.trim() || item.name;
      item.desc = newDesc.trim();
      _saveGalleryLocal(items);
      _renderMyGallery();
    }

    if (btn.classList.contains('gallery-btn-delete-community')) {
      const found = _findCommunityItem(btn);
      if (!found) return;
      if (!confirm(`Delete "${found.item.name}" from community?`)) return;
      window._fbDb.collection('designs').doc(found.item.id).delete().catch(err => console.error('Delete failed:', err));
      communityCache.splice(found.idx, 1);
      _saveCommunityCache(communityCache);
      _renderCommunityGallery(false);
    }

    if (btn.classList.contains('gallery-btn-delete')) {
      const items = _loadGallery();
      if (localIdx < 0 || localIdx >= items.length) return;
      if (!confirm(`Delete "${items[localIdx].name}"?`)) return;
      items.splice(localIdx, 1);
      _saveGalleryLocal(items);
      _renderMyGallery();
    }
  });

  // Close overlays on backdrop click
  galleryOverlay.addEventListener('click', (e) => {
    if (e.target === galleryOverlay) galleryOverlay.classList.add('hidden');
  });
  gallerySaveOverlay.addEventListener('click', (e) => {
    if (e.target === gallerySaveOverlay) gallerySaveOverlay.classList.add('hidden');
  });

  // ── Test / Back to Edit ──────────────────────────────────
  const btnDesignTest = document.getElementById('btn-design-test');
  const btnDesignBack = document.getElementById('btn-design-back');

  btnDesignTest.addEventListener('click', () => {
    if (!State.level) return;
    State.designMode = false;
    // Refresh waveform signals from current nodes before testing
    Waveform.reset();
    Waveform.setSignals(State.level);
    const initResult = Engine.evaluate(State.level, State.getFfStates(), 0);
    if (initResult.nodeValues) Waveform.record(0, initResult.nodeValues);
    document.getElementById('design-tools').classList.add('hidden');
    btnDesignTest.classList.add('hidden');
    btnDesignBack.classList.remove('hidden');
    document.getElementById('hud-right').style.display = '';
    document.getElementById('hud-center').style.display = '';
    const isSequential = State.isSequentialLevel();
    _setClockControlsVisible(isSequential);
    _updateStepCount();
    _setFfPaletteVisible(isSequential);
    if (isSequential) Input.refreshChips();
  });

  function _returnToDesignMode() {
    if (!State.level) return;
    State.designMode = true;
    State.designTool = 'select';
    _updateDesignToolActive('select');
    document.getElementById('design-tools').classList.remove('hidden');
    btnDesignTest.classList.remove('hidden');
    btnDesignBack.classList.add('hidden');
    document.getElementById('hud-right').style.display = 'none';
    document.getElementById('hud-center').style.display = 'none';
    _setClockControlsVisible(false);
    _setFfPaletteVisible(false);
  }

  btnDesignBack.addEventListener('click', _returnToDesignMode);

  // ── Menu Overlay (Gallery browser) ────────────────────────
  function renderMenuGallery() {
    levelGrid.innerHTML = '';
    renderMenuTabs();

    if (currentMenuTab === 'My Designs') {
      _renderMenuGalleryItems(levelGrid, _loadGallery(), 'local');
    } else if (currentMenuTab === 'Community') {
      _renderMenuGalleryCommunity(levelGrid);
    } else {
      _renderMenuShowcase(levelGrid);
    }
  }

  function renderMenuTabs() {
    difficultyTabs.innerHTML = '';
    const tabDescEl = document.getElementById('tab-description');

    GALLERY_TABS.forEach(tabName => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = `difficulty-tab${currentMenuTab === tabName ? ' active' : ''}`;
      tab.addEventListener('click', () => {
        currentMenuTab = tabName;
        renderMenuGallery();
      });
      const label = document.createElement('span');
      label.className = 'tab-label';
      label.textContent = tabName;
      tab.appendChild(label);

      tab.addEventListener('mouseenter', () => {
        tabDescEl.textContent = TAB_DESCRIPTIONS[tabName] || '';
      });
      tab.addEventListener('mouseleave', () => {
        tabDescEl.textContent = TAB_DESCRIPTIONS[currentMenuTab] || '';
      });

      difficultyTabs.appendChild(tab);
    });

    tabDescEl.textContent = TAB_DESCRIPTIONS[currentMenuTab] || '';
  }

  function _renderMenuGalleryItems(container, items, source) {
    const filtered = _filterMenuItems(items);
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'difficulty-empty';
      empty.textContent = menuGallerySearchQuery
        ? 'No designs match your search.'
        : source === 'local'
          ? 'No saved designs yet. Build a circuit and save it!'
          : 'No community designs yet.';
      container.appendChild(empty);
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'menu-gallery-grid';
    filtered.forEach(({ item, idx }) => {
      grid.appendChild(_renderCard(item, idx, source));
    });
    container.appendChild(grid);

    // Delegated click handler
    grid.onclick = async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const localIdx = parseInt(btn.dataset.idx);
      const src = btn.dataset.src;

      if (btn.classList.contains('gallery-btn-load')) {
        let item;
        if (src === 'showcase') {
          item = (typeof SHOWCASE_DESIGNS !== 'undefined') ? SHOWCASE_DESIGNS[localIdx] : null;
        } else if (src === 'community') {
          const found = _findCommunityItem(btn);
          item = found ? found.item : null;
        } else {
          item = _loadGallery()[localIdx];
        }
        if (!item) return;
        _loadDesignIntoCanvas(item);
      }

      if (btn.classList.contains('gallery-btn-save-copy')) {
        let item;
        if (src === 'showcase') {
          item = (typeof SHOWCASE_DESIGNS !== 'undefined') ? SHOWCASE_DESIGNS[localIdx] : null;
        } else {
          const found = _findCommunityItem(btn);
          item = found ? found.item : null;
        }
        if (!item) return;
        const localItems = _loadGallery();
        localItems.unshift({
          name: item.name + ' (copy)',
          author: item.author || '',
          desc: item.desc || '',
          date: Date.now(),
          nodes: JSON.parse(JSON.stringify(item.nodes)),
          wires: JSON.parse(JSON.stringify(item.wires)),
        });
        _saveGalleryLocal(localItems);
        alert(`"${item.name}" saved to your designs!`);
      }

      if (btn.classList.contains('gallery-btn-edit')) {
        const localItems = _loadGallery();
        if (localIdx < 0 || localIdx >= localItems.length) return;
        const it = localItems[localIdx];
        const newName = prompt('Name:', it.name);
        if (newName === null) return;
        const newDesc = prompt('Description:', it.desc || '');
        if (newDesc === null) return;
        it.name = newName.trim() || it.name;
        it.desc = newDesc.trim();
        _saveGalleryLocal(localItems);
        renderMenuGallery();
      }

      if (btn.classList.contains('gallery-btn-delete')) {
        const localItems = _loadGallery();
        if (localIdx < 0 || localIdx >= localItems.length) return;
        if (!confirm(`Delete "${localItems[localIdx].name}"?`)) return;
        localItems.splice(localIdx, 1);
        _saveGalleryLocal(localItems);
        renderMenuGallery();
      }

      if (btn.classList.contains('gallery-btn-like')) {
        const found = _findCommunityItem(btn);
        if (!found) return;
        const { item: ci } = found;
        const docId = ci.id;
        const alreadyLiked = _likedDesigns.has(docId);
        const prevLikes = ci.likes || 0;
        if (alreadyLiked) { _likedDesigns.delete(docId); ci.likes = Math.max(0, prevLikes - 1); }
        else { _likedDesigns.add(docId); ci.likes = prevLikes + 1; }
        _saveLiked();
        btn.classList.toggle('liked', !alreadyLiked);
        btn.innerHTML = `${!alreadyLiked ? '♥' : '♡'} ${ci.likes}`;
        if (window._fbDb) {
          window._fbDb.collection('designs').doc(docId).update({
            likes: firebase.firestore.FieldValue.increment(alreadyLiked ? -1 : 1)
          }).catch(err => {
            if (alreadyLiked) { _likedDesigns.add(docId); } else { _likedDesigns.delete(docId); }
            _saveLiked(); ci.likes = prevLikes;
            btn.classList.toggle('liked', alreadyLiked);
            btn.innerHTML = `${alreadyLiked ? '♥' : '♡'} ${prevLikes}`;
          });
        }
      }

      if (btn.classList.contains('gallery-btn-delete-community')) {
        const found = _findCommunityItem(btn);
        if (!found) return;
        if (!confirm(`Delete "${found.item.name}" from community?`)) return;
        window._fbDb.collection('designs').doc(found.item.id).delete().catch(err => console.error('Delete failed:', err));
        communityCache.splice(found.idx, 1);
        _saveCommunityCache(communityCache);
        renderMenuGallery();
      }
    };
  }

  async function _renderMenuGalleryCommunity(container) {
    const localCache = communityCache || _loadCommunityCache();
    if (localCache) {
      communityCache = localCache;
      _renderMenuGalleryItems(container, communityCache, 'community');
    } else {
      container.innerHTML = '<div class="difficulty-empty">Loading community designs...</div>';
    }

    try {
      const db = window._fbDb;
      if (db) {
        const snap = await db.collection('designs').orderBy('date', 'desc').limit(100).get();
        const freshData = [];
        snap.forEach(d => freshData.push({ id: d.id, ...d.data() }));
        communityCache = freshData;
        _saveCommunityCache(communityCache);
        // Re-render
        container.innerHTML = '';
        renderMenuTabs();
        _renderMenuGalleryItems(container, communityCache, 'community');
      }
    } catch (err) {
      if (!localCache) container.innerHTML = '<div class="difficulty-empty">Failed to load community designs.</div>';
    }
  }

  function _renderMenuShowcase(container) {
    const designs = typeof SHOWCASE_DESIGNS !== 'undefined' ? SHOWCASE_DESIGNS : [];

    // Category filter
    const filterRow = document.createElement('div');
    filterRow.className = 'showcase-filter-row';
    const allBtn = document.createElement('button');
    allBtn.className = `showcase-filter-btn${showcaseCategory === 'All' ? ' active' : ''}`;
    allBtn.textContent = `All (${designs.length})`;
    allBtn.addEventListener('click', () => { showcaseCategory = 'All'; renderMenuGallery(); });
    filterRow.appendChild(allBtn);
    SHOWCASE_CATEGORIES.forEach(cat => {
      const count = designs.filter(d => d.category === cat).length;
      if (count === 0) return;
      const btn = document.createElement('button');
      btn.className = `showcase-filter-btn${showcaseCategory === cat ? ' active' : ''}`;
      btn.textContent = `${cat} (${count})`;
      btn.addEventListener('click', () => { showcaseCategory = cat; renderMenuGallery(); });
      filterRow.appendChild(btn);
    });
    container.appendChild(filterRow);

    // Search
    const searchRow = document.createElement('div');
    searchRow.className = 'menu-gallery-search-row';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search showcase designs...';
    searchInput.maxLength = 30;
    searchInput.className = 'menu-gallery-search';
    searchInput.value = menuGallerySearchQuery;
    searchInput.addEventListener('input', () => {
      menuGallerySearchQuery = searchInput.value.trim().toLowerCase();
      renderMenuGallery();
    });
    searchRow.appendChild(searchInput);
    container.appendChild(searchRow);

    let filtered = showcaseCategory === 'All' ? designs : designs.filter(d => d.category === showcaseCategory);
    if (menuGallerySearchQuery) {
      filtered = filtered.filter(d =>
        (d.name || '').toLowerCase().includes(menuGallerySearchQuery) ||
        (d.desc || '').toLowerCase().includes(menuGallerySearchQuery) ||
        (d.category || '').toLowerCase().includes(menuGallerySearchQuery)
      );
    }

    const gridContainer = document.createElement('div');
    gridContainer.className = 'menu-gallery-grid';
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'difficulty-empty';
      empty.textContent = 'No showcase designs match your filter.';
      gridContainer.appendChild(empty);
    } else {
      filtered.forEach(item => {
        const realIdx = designs.indexOf(item);
        gridContainer.appendChild(_renderCard(item, realIdx, 'showcase'));
      });
    }
    container.appendChild(gridContainer);

    // Delegated clicks
    gridContainer.onclick = (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx);

      if (btn.classList.contains('gallery-btn-load')) {
        const item = designs[idx];
        if (!item) return;
        _loadDesignIntoCanvas(item);
      }

      if (btn.classList.contains('gallery-btn-save-copy')) {
        const item = designs[idx];
        if (!item) return;
        const localItems = _loadGallery();
        localItems.unshift({
          name: item.name + ' (copy)',
          author: item.author || '',
          desc: item.desc || '',
          date: Date.now(),
          nodes: JSON.parse(JSON.stringify(item.nodes)),
          wires: JSON.parse(JSON.stringify(item.wires)),
        });
        _saveGalleryLocal(localItems);
        alert(`"${item.name}" saved to your designs!`);
      }
    };
  }

  let menuGallerySearchQuery = '';

  function _filterMenuItems(items) {
    if (!menuGallerySearchQuery) return items.map((item, idx) => ({ item, idx }));
    return items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) =>
        (item.name || '').toLowerCase().includes(menuGallerySearchQuery) ||
        (item.author || '').toLowerCase().includes(menuGallerySearchQuery) ||
        (item.desc || '').toLowerCase().includes(menuGallerySearchQuery)
      );
  }

  function openMenuOverlay() {
    renderMenuGallery();
    menuOverlay.classList.remove('hidden');
    menuOverlay.setAttribute('aria-hidden', 'false');
    _menuVisible = true;
  }

  function closeMenuOverlay() {
    menuOverlay.classList.add('hidden');
    menuOverlay.setAttribute('aria-hidden', 'true');
    _menuVisible = false;
  }

  // ── Tutorial ───────────────────────────────────────────────
  const tutorialOverlay = document.getElementById('tutorial-overlay');
  const tutorialBox = document.getElementById('tutorial-box');
  const tutorialStepNum = document.getElementById('tutorial-step-num');
  const tutorialText = document.getElementById('tutorial-text');
  const tutorialArrow = document.getElementById('tutorial-arrow');
  const btnTutorialNext = document.getElementById('btn-tutorial-next');
  const btnTutorialSkip = document.getElementById('btn-tutorial-skip');

  const TUTORIAL_DESIGN_STEPS = [
    { text: 'Welcome to <span style="color:#a060ff">Circuit Designer</span>! Build any digital circuit from scratch on this canvas.', target: null },
    { text: 'The <span style="color:#00d4ff">toolbar on the left</span> has your tools. Select a component and click the canvas to place it.', target: '#design-tools', arrow: 'left' },
    { text: '<span style="color:#39ff14">INPUT</span> — signal source.<br><span style="color:#c8d8f0">OUTPUT</span> — measurement point.<br><span style="color:#00d4ff">GATE</span> — logic gate slot.', target: '#design-tools', arrow: 'left' },
    { text: '<span style="color:#a060ff">FF</span> — flip-flop.<br><span style="color:#ffcc00">CLK</span> — clock signal.<br><span style="color:#00d4ff">SWITCH</span> — MUX select.<br><span style="color:#c8d8f0">7SEG</span> — 7-segment display.', target: '#design-tools', arrow: 'left' },
    { text: 'Select <span style="color:#00d4ff">WIRE</span> mode to draw connections between components.', target: '#design-tools', arrow: 'left' },
    { text: 'Click any component with <span style="color:#00d4ff">SELECT</span> to edit its <span style="color:#a060ff">properties</span> — labels, values, initial states.', target: '#design-props', arrow: 'left' },
    { text: '<span style="color:#39ff14">SAVE TO GALLERY</span> saves your design. Check the box to share it with the community!', target: '#btn-design-gallery-save', arrow: 'left' },
    { text: '<span style="color:#39ff14">GALLERY</span> lets you browse your designs, community creations, and 60 pre-built showcase circuits.', target: '#btn-design-gallery', arrow: 'left' },
    { text: '<span style="color:#00d4ff">TEST</span> runs your circuit. Use STEP to advance the clock and watch signals propagate.', target: '#btn-design-test', arrow: 'left' },
    { text: '<span style="color:#00d4ff">EXPORT</span> copies as JSON. <span style="color:#00d4ff">IMPORT</span> loads JSON. <span style="color:#39ff14">SHARE</span> creates a screenshot.', target: '#btn-design-export', arrow: 'left' },
    { text: 'You\'re all set! Start placing components and build something amazing.', target: null },
  ];

  let _tutorialStep = 0;
  let _tutorialActive = false;
  let _tutorialSteps = [];
  let _tutorialKey = '';

  function _startTutorial(steps, storageKey) {
    if (localStorage.getItem(storageKey) === '1') return;
    _tutorialSteps = steps;
    _tutorialKey = storageKey;
    _tutorialActive = true;
    _tutorialStep = 0;
    tutorialOverlay.classList.remove('hidden');
    _showTutorialStep();
  }

  function _showTutorialStep() {
    if (_tutorialStep >= _tutorialSteps.length) {
      _endTutorial();
      return;
    }
    const step = _tutorialSteps[_tutorialStep];
    tutorialStepNum.textContent = `STEP ${_tutorialStep + 1} / ${_tutorialSteps.length}`;
    tutorialText.innerHTML = step.text;
    btnTutorialNext.textContent = _tutorialStep === _tutorialSteps.length - 1 ? 'START!' : 'NEXT ➜';

    tutorialArrow.className = '';
    if (!step.target) {
      tutorialBox.style.left = '50%';
      tutorialBox.style.top = '50%';
      tutorialBox.style.transform = 'translate(-50%, -50%)';
      tutorialArrow.style.display = 'none';
    } else {
      tutorialBox.style.transform = '';
      tutorialArrow.style.display = '';
      const el = document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        const boxW = 340;
        if (step.arrow === 'left') {
          tutorialBox.style.left = Math.max(8, rect.left - boxW - 20) + 'px';
          tutorialBox.style.top = rect.top + 'px';
          tutorialArrow.className = 'arrow-right';
          tutorialArrow.style.left = (rect.left - 22) + 'px';
          tutorialArrow.style.top = (rect.top + 16) + 'px';
        } else if (step.arrow === 'down') {
          tutorialBox.style.left = Math.max(8, rect.left - 40) + 'px';
          tutorialBox.style.top = (rect.bottom + 16) + 'px';
          tutorialArrow.className = 'arrow-up';
          tutorialArrow.style.left = (rect.left + rect.width / 2 - 10) + 'px';
          tutorialArrow.style.top = (rect.bottom - 2) + 'px';
        } else {
          tutorialBox.style.left = '50%';
          tutorialBox.style.top = '50%';
          tutorialBox.style.transform = 'translate(-50%, -50%)';
          tutorialArrow.style.display = 'none';
        }
      }
    }
  }

  function _nextTutorialStep() {
    _tutorialStep++;
    if (_tutorialStep >= _tutorialSteps.length) {
      _endTutorial();
    } else {
      _showTutorialStep();
    }
  }

  function _endTutorial() {
    _tutorialActive = false;
    tutorialOverlay.classList.add('hidden');
    localStorage.setItem(_tutorialKey, '1');
  }

  btnTutorialNext.addEventListener('click', _nextTutorialStep);
  btnTutorialSkip.addEventListener('click', _endTutorial);

  // ── Button Handlers ───────────────────────────────────────
  btnStart.addEventListener('click', () => {
    instructionOverlay.classList.add('hidden');
    localStorage.setItem('circuit_designer_welcomed', '1');
  });

  document.getElementById('btn-undo').addEventListener('click', () => {
    if (State.undo()) { Sound.play('undo'); _updateStepCount(); }
  });

  document.getElementById('btn-clear-gates').addEventListener('click', () => {
    Sound.play('clear');
    State.resetLevel();
  });

  btnLevels.addEventListener('click', openMenuOverlay);
  btnMenuClose.addEventListener('click', closeMenuOverlay);
  menuOverlay.addEventListener('click', (e) => {
    if (e.target === menuOverlay) closeMenuOverlay();
  });

  // ── Info Overlay ──────────────────────────────────────────
  function openInfoOverlay() {
    closeComponentDiagram();
    infoOverlay.classList.remove('hidden');
    infoOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeInfoOverlay() {
    closeComponentDiagram();
    infoOverlay.classList.add('hidden');
    infoOverlay.setAttribute('aria-hidden', 'true');
  }

  btnInfo.addEventListener('click', openInfoOverlay);
  btnInfoClose.addEventListener('click', closeInfoOverlay);
  btnDiagramClose.addEventListener('click', closeComponentDiagram);
  infoOverlay.addEventListener('click', (e) => { if (e.target === infoOverlay) closeInfoOverlay(); });
  diagramOverlay.addEventListener('click', (e) => { if (e.target === diagramOverlay) closeComponentDiagram(); });

  // ── Keyboard Shortcuts ────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    const _isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
    if (_isTyping && e.key !== 'Escape') return;

    // Undo: Ctrl+Z
    if (e.ctrlKey && !e.shiftKey && e.code === 'KeyZ') {
      e.preventDefault();
      if (State.undo()) _updateStepCount();
      return;
    }
    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if ((e.ctrlKey && e.code === 'KeyY') || (e.ctrlKey && e.shiftKey && e.code === 'KeyZ')) {
      e.preventDefault();
      if (State.redo()) _updateStepCount();
      return;
    }

    // Design mode shortcuts
    if (State.designMode && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const shortcut = {
        'KeyS': 'select', 'KeyI': 'place-input', 'KeyO': 'place-output',
        'KeyG': 'place-gate', 'KeyF': 'place-ff', 'KeyC': 'place-clock',
        'KeyM': 'place-mux', 'Digit7': 'place-7seg', 'KeyW': 'wire', 'KeyD': 'delete',
      }[e.code];
      if (shortcut) {
        e.preventDefault();
        State.designTool = shortcut;
        _updateDesignToolActive(shortcut);
        return;
      }
      if (e.code === 'KeyT') { e.preventDefault(); btnDesignTest.click(); return; }
      if (e.code === 'KeyE') { e.preventDefault(); document.getElementById('btn-design-export').click(); return; }
      if (e.code === 'KeyR') { e.preventDefault(); document.getElementById('btn-design-share').click(); return; }
      if (e.code === 'KeyP') { e.preventDefault(); document.getElementById('btn-design-import').click(); return; }
      if (e.code === 'KeyX') { e.preventDefault(); document.getElementById('btn-design-clear').click(); return; }
      if (e.code === 'KeyL') { e.preventDefault(); document.getElementById('btn-design-gallery').click(); return; }
      if (e.code === 'KeyK') { e.preventDefault(); document.getElementById('btn-design-gallery-save').click(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (State.selectedNodeId) {
          e.preventDefault();
          State.deleteNode(State.selectedNodeId);
        }
        return;
      }
    }

    // Toggle waveform: W (non-design mode)
    if (e.code === 'KeyW' && !e.ctrlKey && !e.altKey && !e.metaKey && !State.designMode) {
      toggleWaveform();
      return;
    }
    // STEP: Space
    if (e.code === 'Space') {
      e.preventDefault();
      if (State.isSequentialLevel() && !State.designMode) {
        State.stepClock();
        Renderer.startPulse();
        _updateStepCount();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (!diagramOverlay.classList.contains('hidden')) { closeComponentDiagram(); return; }
      if (!infoOverlay.classList.contains('hidden')) { closeInfoOverlay(); return; }
      if (!galleryOverlay.classList.contains('hidden')) { galleryOverlay.classList.add('hidden'); return; }
      if (!menuOverlay.classList.contains('hidden')) { closeMenuOverlay(); return; }
    }
  });

  colorizeTruthTableBits();
  setupComponentInfoButtons();

  // ── Sound ─────────────────────────────────────────────────
  const btnMute = document.getElementById('btn-mute');
  function _updateMuteBtn() {
    btnMute.textContent = Sound.isMuted() ? '🔇' : '🔊';
    btnMute.classList.toggle('muted', Sound.isMuted());
  }
  btnMute.addEventListener('click', () => { Sound.toggleMute(); _updateMuteBtn(); });
  _updateMuteBtn();

  // ── Input Callbacks ───────────────────────────────────────
  Input.init(canvas, {
    onGatePlaced:  () => {},
    onHoverChange: () => {},
  });

  // ── Chip Tooltip ──────────────────────────────────────────
  const chipTooltip = document.getElementById('chip-tooltip');
  const GATE_TT = {
    AND:  { name: 'AND', formula: 'Z = A · B', inputs: ['A','B'], rows: [[0,0,0],[0,1,0],[1,0,0],[1,1,1]] },
    OR:   { name: 'OR',  formula: 'Z = A + B', inputs: ['A','B'], rows: [[0,0,0],[0,1,1],[1,0,1],[1,1,1]] },
    XOR:  { name: 'XOR', formula: 'Z = A ⊕ B', inputs: ['A','B'], rows: [[0,0,0],[0,1,1],[1,0,1],[1,1,0]] },
    NAND: { name: 'NAND', formula: 'Z = ¬(A · B)', inputs: ['A','B'], rows: [[0,0,1],[0,1,1],[1,0,1],[1,1,0]] },
    NOR:  { name: 'NOR',  formula: 'Z = ¬(A + B)', inputs: ['A','B'], rows: [[0,0,1],[0,1,0],[1,0,0],[1,1,0]] },
    NOT:  { name: 'NOT',  formula: 'Z = ¬A', inputs: ['A'], rows: [[0,1],[1,0]] },
  };
  const FF_TT = {
    D:  { name: 'D Flip-Flop', formula: "Q' = D", desc: 'Captures D on clock edge' },
    T:  { name: 'T Flip-Flop', formula: "Q' = Q ⊕ T", desc: 'Toggles when T=1, holds when T=0' },
    SR: { name: 'SR Flip-Flop', formula: "Q' = S + ¬R·Q", desc: 'S=SET, R=RESET, both=SET dominates' },
    JK: { name: 'JK Flip-Flop', formula: "Q' = J·¬Q + ¬K·Q", desc: 'Like SR but J=K=1 toggles' },
  };

  function _buildGateTooltip(gate) {
    const tt = GATE_TT[gate];
    if (!tt) return '';
    const cols = [...tt.inputs, 'Z'];
    let html = `<div class="chip-tt-name">${tt.name}</div><table><tr>`;
    cols.forEach(c => { html += `<th>${c}</th>`; });
    html += '</tr>';
    tt.rows.forEach(row => { html += '<tr>'; row.forEach(v => { html += `<td class="v${v}">${v}</td>`; }); html += '</tr>'; });
    html += `</table><div class="chip-tt-formula">${tt.formula}</div>`;
    return html;
  }

  function _buildFfTooltip(ff) {
    const tt = FF_TT[ff];
    if (!tt) return '';
    return `<div class="chip-tt-name">${tt.name}</div><div>${tt.desc}</div><div class="chip-tt-formula">${tt.formula}</div>`;
  }

  document.querySelectorAll('.gate-chip').forEach(chip => {
    chip.addEventListener('mouseenter', (e) => {
      const gate = chip.dataset.gate;
      const ff = chip.dataset.ff;
      let html = '';
      if (gate) html = _buildGateTooltip(gate);
      else if (ff) html = _buildFfTooltip(ff);
      if (!html) return;
      chipTooltip.innerHTML = html;
      chipTooltip.classList.remove('hidden');
      const rect = chip.getBoundingClientRect();
      chipTooltip.style.top = (rect.bottom + 6) + 'px';
      const ttW = chipTooltip.offsetWidth;
      const maxLeft = window.innerWidth - ttW - 8;
      chipTooltip.style.left = Math.max(4, Math.min(rect.left, maxLeft)) + 'px';
    });
    chip.addEventListener('mouseleave', () => {
      chipTooltip.classList.add('hidden');
    });
  });

  // ── Renderer Init & Resize ────────────────────────────────
  Renderer.init(canvas);
  window.addEventListener('resize', () => { Renderer.resize(); if (Waveform.isVisible()) Waveform.render(); });

  // ── Waveform Init ────────────────────────────────────────
  const waveformPanel = document.getElementById('waveform-panel');
  const btnWaveform = document.getElementById('btn-waveform');
  Waveform.init(document.getElementById('waveform-canvas'));

  function toggleWaveform() {
    if (Waveform.isVisible()) {
      Waveform.hide();
      waveformPanel.classList.add('hidden');
      btnWaveform.classList.remove('active');
    } else {
      waveformPanel.offsetHeight;
      waveformPanel.classList.remove('hidden');
      Waveform.show();
      btnWaveform.classList.add('active');
    }
  }

  btnWaveform.addEventListener('click', toggleWaveform);
  document.getElementById('btn-waveform-close').addEventListener('click', toggleWaveform);

  // ── Palette Highlight ─────────────────────────────────────
  const gatePalette = document.getElementById('gate-palette');
  const ffPaletteEl = document.getElementById('ff-palette');

  setInterval(() => {
    const h = State.hoveredNodeId;
    let highlightGate = false, highlightFf = false;
    if (h && State.level) {
      const node = State.level.nodes.find(n => n.id === h);
      if (node && node.type === 'GATE_SLOT') highlightGate = true;
      if (node && node.type === 'FF_SLOT') highlightFf = true;
    }
    gatePalette.classList.toggle('highlight', highlightGate);
    ffPaletteEl.classList.toggle('highlight', highlightFf);
  }, 100);

  // ── Start ─────────────────────────────────────────────────
  loadDesignMode();

})();
