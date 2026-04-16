# Circuit Designer Pro

**Professional digital circuit design & debugging workbench — built for the browser.**

Circuit Designer Pro is a visual EDA tool for designing, simulating, and debugging digital logic circuits. It provides a clean canvas with drag-and-drop components, real-time signal propagation, waveform analysis, and intuitive debugging tools — all in the browser with zero installation.

Built for industry use: clean visuals, clear signal flow, and a simple interface that keeps even complex circuits readable and easy to debug.

---

## Vision

A **professional circuit design and debugging platform** for hardware engineers who need to quickly build, test, and troubleshoot digital circuits. The emphasis is on clarity — every circuit should look clean and be immediately understandable, not a tangled mess of wires and components.

### Core Principles

- **Clarity above all** — Clean layout, clear signal flow, readable at a glance
- **Debugging-first** — Every feature helps the user find and fix problems faster
- **Zero friction** — No installation, no signup, instant productivity
- **Industry-grade** — Built for professionals, not a classroom toy

---

## Current State

The project is based on a fully functional digital logic simulator with:

- HTML5 Canvas rendering at 60 FPS with pan/zoom
- Logic gates (AND, OR, XOR, NAND, NOR, NOT)
- Sequential elements (D-FF, T-FF, SR-FF, JK-FF)
- Special components (Clock, MUX, 7-segment display)
- Wire routing with Bézier curves and signal coloring
- Waveform viewer (timing diagrams)
- DAG-based topological evaluation engine
- Undo/redo, export/import, dark/light themes

---

## Development Plan

The development is split into two parts:

### Part 1 — Working Professional Tool (MVP)

Build a fully functional, professional-grade design and debugging platform using the **existing component set** (logic gates, flip-flops, clock, MUX, 7-segment display). The goal is to get the tool working properly as a professional product before adding new components.

#### Phase 1: Core Architecture Refactor
> *Solid foundation for a professional tool*

- [ ] Refactor to ES Modules with clean separation of concerns
- [ ] Introduce a formal component model (base class for all circuit elements)
- [ ] Replace global state with a centralized state manager (event-driven)
- [ ] Add a command pattern for all user actions (robust undo/redo)
- [ ] Implement a proper scene graph replacing flat node arrays
- [ ] Remove game/educational scaffolding (levels, showcase, gallery)

#### Phase 2: Professional Wire Routing
> *Clean, readable wiring that doesn't become spaghetti*

- [ ] Manhattan (orthogonal) wire routing with auto-path
- [ ] Wire junctions and explicit splits (T-junction, cross-over)
- [ ] Net naming — label wires for cross-referencing
- [ ] Color-coded signal groups
- [ ] Wire drag-to-reroute
- [ ] Auto-routing with obstacle avoidance

#### Phase 3: Simulation Engine Upgrade
> *Accurate and debuggable simulation*

- [ ] Gate propagation delay modeling (configurable per component)
- [ ] Glitch detection and hazard analysis
- [ ] Multi-clock domain support
- [ ] Breakpoints — pause simulation on signal conditions
- [ ] Step-by-step execution with full state inspection
- [ ] Simulation speed control (slow-mo to max speed)
- [ ] Signal value formats: binary, hex, decimal
- [ ] Oscillation/loop detection with clear error reporting

#### Phase 4: Debugging Workbench
> *The core differentiator — find problems fast*

- [ ] **Signal Probes** — attach probes to any wire, view live values
- [ ] **Watch List** — pin signals to a persistent panel for monitoring
- [ ] **Waveform Viewer Pro** — multi-signal timeline with zoom, cursors, markers, measurements
- [ ] **Truth Table Generator** — auto-generate truth tables for any sub-circuit
- [ ] **Signal Tracing** — highlight signal path from source to destination
- [ ] **Error Overlay** — highlight nodes with undefined/conflicting signals
- [ ] **Timing Diagram Export** — export waveforms as SVG/PNG

#### Phase 5: Professional UX
> *Clean, efficient interface for daily use*

- [ ] Component search palette (Ctrl+K style)
- [ ] Mini-map for navigation
- [ ] Configurable snap-to-grid
- [ ] Align & distribute tools
- [ ] Copy/paste, multi-select (rubber-band + Shift+click)
- [ ] Zoom-to-fit, zoom-to-selection
- [ ] Annotation layer — text labels, boxes, arrows
- [ ] Project save/load with IndexedDB
- [ ] Export: PNG, SVG, JSON

---

### Part 2 — Extended Component Library

Once the tool is stable and fully functional with the base components, expand the library to cover a wide range of real-world digital components.

#### Combinational Logic
- [ ] Half Adder, Full Adder
- [ ] Comparator
- [ ] Decoder, Encoder, Priority Encoder
- [ ] Barrel Shifter

#### Arithmetic
- [ ] ALU
- [ ] N-bit Adder / Subtractor
- [ ] Multiplier

#### Memory
- [ ] Register, Register File
- [ ] RAM, ROM
- [ ] FIFO, Shift Register

#### I/O & Interface
- [ ] LED matrix
- [ ] DIP switch array
- [ ] Hex display
- [ ] Button (momentary / toggle)
- [ ] Tri-state buffer

#### Bus & Connectivity
- [ ] Multi-bit bus wires (data bus, address bus)
- [ ] Bus splitter / merger
- [ ] Bus notation and labeling

#### Custom Components
- [ ] Group sub-circuits into reusable blocks (hierarchical design)
- [ ] Component parameter configuration (bit width, initial values)
- [ ] Import/export custom component libraries

---

## MVP Summary

**Part 1** delivers a complete, professional circuit design tool with:

1. Clean modular architecture
2. Professional wire routing with clear, readable layouts
3. Accurate simulation with breakpoints and step execution
4. Debugging tools: probes, waveform viewer, truth tables, signal tracing
5. Polished UX with search, mini-map, annotations, and export

All built on the existing component set: **logic gates, flip-flops, clock, MUX, and 7-segment display**.

**Target audience**: Hardware engineers and professionals in the industry who need a fast, visual tool to design and debug digital circuits.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Rendering | HTML5 Canvas 2D |
| Language | JavaScript (ES Modules) |
| Storage | IndexedDB (local) + Firebase (cloud) |
| Styling | CSS with custom properties (dark/light themes) |
| Font | JetBrains Mono |
| Build | None (zero-build static hosting) |

---

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd Circuit-Designer

# No build step — open index.html or use any static server:
npx serve .
```

---

## License

TBD
