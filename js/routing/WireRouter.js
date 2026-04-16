/**
 * WireRouter — Manhattan wire routing engine.
 *
 * Computes clean orthogonal paths between source and target anchors.
 * Supports:
 *   - Automatic Manhattan routing (horizontal → vertical → horizontal)
 *   - User-defined waypoints that override auto-routing
 *   - Obstacle avoidance (routes around component bounding boxes)
 *   - Junction detection (where wires share the same segment)
 */
import { NODE } from '../rendering/Theme.js';
import { FF_TYPE_SET } from '../components/Component.js';

const GRID_SNAP = 10;      // Snap waypoints to this grid
const MARGIN = 20;          // Clearance around obstacles
const CHANNEL_SPACING = 12; // Space between parallel wires in the same channel

/**
 * Snap a coordinate to the nearest grid point.
 */
function snap(v) {
  return Math.round(v / GRID_SNAP) * GRID_SNAP;
}

/**
 * Get the bounding box of a node (for obstacle avoidance).
 */
function _nodeBBox(node) {
  let hw, hh;
  if (node.type === 'GATE_SLOT') {
    hw = NODE.gateW / 2 + MARGIN;
    hh = NODE.gateH / 2 + MARGIN;
  } else if (node.type === 'FF_SLOT' || FF_TYPE_SET.has(node.type)) {
    hw = NODE.ffW / 2 + MARGIN;
    hh = NODE.ffH / 2 + MARGIN;
  } else if (node.type === 'DISPLAY_7SEG') {
    hw = 40 + MARGIN;
    hh = 60 + MARGIN;
  } else if (node.type === 'MUX_SELECT') {
    hw = 25 + MARGIN;
    hh = 15 + MARGIN;
  } else {
    hw = NODE.inputR + MARGIN;
    hh = NODE.inputR + MARGIN;
  }
  return {
    x: node.x - hw,
    y: node.y - hh,
    w: hw * 2,
    h: hh * 2,
    cx: node.x,
    cy: node.y,
  };
}

/**
 * Check if a point is inside a bounding box.
 */
function _insideBBox(px, py, box) {
  return px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h;
}

/**
 * Check if a horizontal segment (y fixed, x from x1 to x2) intersects a bbox.
 */
function _hSegIntersects(y, x1, x2, box) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  return y >= box.y && y <= box.y + box.h && maxX >= box.x && minX <= box.x + box.w;
}

/**
 * Check if a vertical segment (x fixed, y from y1 to y2) intersects a bbox.
 */
function _vSegIntersects(x, y1, y2, box) {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  return x >= box.x && x <= box.x + box.w && maxY >= box.y && minY <= box.y + box.h;
}

/**
 * Compute a Manhattan route from src to dst.
 * Returns an array of {x, y} points forming the path.
 *
 * @param {{x: number, y: number}} src - Source anchor point
 * @param {{x: number, y: number}} dst - Target anchor point
 * @param {object[]} [waypoints] - Optional user-defined waypoints
 * @param {object[]} [obstacles] - Nodes to route around (excluding src/dst nodes)
 * @param {number} [channelOffset=0] - Offset for parallel wires
 * @returns {{x: number, y: number}[]}
 */
export function computeRoute(src, dst, waypoints, obstacles, channelOffset = 0) {
  // If user defined waypoints, build a Manhattan path through them
  if (waypoints && waypoints.length > 0) {
    return _routeThroughWaypoints(src, dst, waypoints);
  }

  // Auto-route: smart Manhattan routing
  return _autoRoute(src, dst, obstacles || [], channelOffset);
}

/**
 * Route through user-defined waypoints using Manhattan segments.
 * Each segment pair creates an L-shaped or Z-shaped connection.
 */
function _routeThroughWaypoints(src, dst, waypoints) {
  const points = [{ x: src.x, y: src.y }];
  let current = { x: src.x, y: src.y };

  for (const wp of waypoints) {
    // Connect current to waypoint with an L-bend
    const snapped = { x: snap(wp.x), y: snap(wp.y) };
    // Horizontal first, then vertical
    if (current.x !== snapped.x) {
      points.push({ x: snapped.x, y: current.y });
    }
    if (current.y !== snapped.y) {
      points.push({ x: snapped.x, y: snapped.y });
    }
    current = snapped;
  }

  // Connect last waypoint to destination
  if (current.x !== dst.x) {
    points.push({ x: dst.x, y: current.y });
  }
  if (current.y !== dst.y) {
    points.push({ x: dst.x, y: dst.y });
  }
  // Ensure final point is exactly dst
  const last = points[points.length - 1];
  if (last.x !== dst.x || last.y !== dst.y) {
    points.push({ x: dst.x, y: dst.y });
  }

  return _dedup(points);
}

/**
 * Automatic Manhattan routing with obstacle avoidance.
 * Strategy: try several routing patterns and pick the best (fewest bends, no collisions).
 */
function _autoRoute(src, dst, obstacles, channelOffset) {
  const boxes = obstacles.map(_nodeBBox);

  // Apply channel offset to the midpoint for parallel wire spacing
  const offset = channelOffset * CHANNEL_SPACING;

  // Try different routing strategies and pick the first collision-free one
  const candidates = [
    // Strategy 1: H-V-H (horizontal, vertical, horizontal) — standard
    _routeHVH(src, dst, offset),
    // Strategy 2: V-H-V (vertical, horizontal, vertical)
    _routeVHV(src, dst, offset),
    // Strategy 3: H-V-H with shifted midpoint
    _routeHVH(src, dst, offset + (dst.x - src.x) * 0.1),
    // Strategy 4: Simple L-bend (H then V)
    _routeLBend(src, dst),
  ];

  // Score each candidate: prefer no collisions, fewer bends, shorter total length
  let best = candidates[0];
  let bestScore = Infinity;

  for (const path of candidates) {
    const collisions = _countCollisions(path, boxes);
    const bends = path.length - 2; // each intermediate point is a bend
    const length = _pathLength(path);
    const score = collisions * 10000 + bends * 100 + length;
    if (score < bestScore) {
      bestScore = score;
      best = path;
    }
  }

  return best;
}

/**
 * H-V-H routing: horizontal → vertical → horizontal
 */
function _routeHVH(src, dst, offset) {
  const mx = snap(src.x + (dst.x - src.x) * 0.5 + offset);
  const points = [
    { x: src.x, y: src.y },
    { x: mx,    y: src.y },
    { x: mx,    y: dst.y },
    { x: dst.x, y: dst.y },
  ];
  return _dedup(points);
}

/**
 * V-H-V routing: vertical → horizontal → vertical
 */
function _routeVHV(src, dst, offset) {
  const my = snap(src.y + (dst.y - src.y) * 0.5 + offset);
  const points = [
    { x: src.x, y: src.y },
    { x: src.x, y: my },
    { x: dst.x, y: my },
    { x: dst.x, y: dst.y },
  ];
  return _dedup(points);
}

/**
 * L-bend routing: horizontal then vertical (or vice versa).
 */
function _routeLBend(src, dst) {
  // Choose the bend that results in horizontal-first
  const points = [
    { x: src.x, y: src.y },
    { x: dst.x, y: src.y },
    { x: dst.x, y: dst.y },
  ];
  return _dedup(points);
}

/**
 * Count how many segments of a path collide with obstacle bboxes.
 */
function _countCollisions(path, boxes) {
  let count = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    for (const box of boxes) {
      if (a.y === b.y) {
        // Horizontal segment
        if (_hSegIntersects(a.y, a.x, b.x, box)) count++;
      } else {
        // Vertical segment
        if (_vSegIntersects(a.x, a.y, b.y, box)) count++;
      }
    }
  }
  return count;
}

/**
 * Total path length (Manhattan distance).
 */
function _pathLength(path) {
  let len = 0;
  for (let i = 0; i < path.length - 1; i++) {
    len += Math.abs(path[i + 1].x - path[i].x) + Math.abs(path[i + 1].y - path[i].y);
  }
  return len;
}

/**
 * Remove consecutive duplicate points.
 */
function _dedup(points) {
  const result = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    if (prev.x !== points[i].x || prev.y !== points[i].y) {
      result.push(points[i]);
    }
  }
  return result;
}

/**
 * Remove redundant intermediate points that are collinear.
 * e.g., (0,0) → (5,0) → (10,0) becomes (0,0) → (10,0)
 */
export function simplifyPath(points) {
  if (points.length <= 2) return points;
  const result = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const next = points[i + 1];
    const curr = points[i];
    // If all three points are on the same horizontal or vertical line, skip curr
    const sameH = prev.y === curr.y && curr.y === next.y;
    const sameV = prev.x === curr.x && curr.x === next.x;
    if (!sameH && !sameV) {
      result.push(curr);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

/**
 * Detect junctions: points where multiple wires share a coordinate.
 * Returns an array of { x, y } junction points that should be drawn as dots.
 *
 * @param {Map<string, {x,y}[]>} wirePaths - Map of wireId → path points
 * @returns {{x: number, y: number}[]}
 */
export function detectJunctions(wirePaths) {
  // Collect all segment endpoints (bend points) across all wires
  const pointCounts = new Map(); // "x,y" → count of wires passing through

  for (const [wireId, path] of wirePaths) {
    // For each bend point (not start/end), mark it
    const visited = new Set();
    for (let i = 0; i < path.length; i++) {
      const key = `${Math.round(path[i].x)},${Math.round(path[i].y)}`;
      if (!visited.has(key)) {
        visited.add(key);
        pointCounts.set(key, (pointCounts.get(key) || 0) + 1);
      }
    }
    // Also check if any point of this wire lies on a segment of another wire
    // (T-junction detection) — done via segment intersection below
  }

  // Points where 2+ wires share a coordinate (basic junction)
  const junctions = [];
  for (const [key, count] of pointCounts) {
    if (count >= 2) {
      const [x, y] = key.split(',').map(Number);
      junctions.push({ x, y });
    }
  }

  // T-junction detection: check if any wire's bend point lies on another wire's segment
  const allPaths = [...wirePaths.entries()];
  for (let i = 0; i < allPaths.length; i++) {
    const [idA, pathA] = allPaths[i];
    for (let j = i + 1; j < allPaths.length; j++) {
      const [idB, pathB] = allPaths[j];
      // Check each point of A against segments of B
      _findTJunctions(pathA, pathB, junctions);
      _findTJunctions(pathB, pathA, junctions);
    }
  }

  // Deduplicate
  const seen = new Set();
  return junctions.filter(j => {
    const key = `${Math.round(j.x)},${Math.round(j.y)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Find points in pathA that lie on segments of pathB (T-junctions).
 */
function _findTJunctions(pathA, pathB, junctions) {
  for (const pt of pathA) {
    for (let k = 0; k < pathB.length - 1; k++) {
      const s1 = pathB[k], s2 = pathB[k + 1];
      if (_pointOnSegment(pt, s1, s2)) {
        // Don't add if it's already an endpoint of the segment
        if ((pt.x === s1.x && pt.y === s1.y) || (pt.x === s2.x && pt.y === s2.y)) continue;
        junctions.push({ x: pt.x, y: pt.y });
      }
    }
  }
}

/**
 * Check if point p lies on the Manhattan segment from s1 to s2.
 */
function _pointOnSegment(p, s1, s2) {
  const tolerance = 2;
  if (s1.y === s2.y) {
    // Horizontal segment
    if (Math.abs(p.y - s1.y) > tolerance) return false;
    const minX = Math.min(s1.x, s2.x);
    const maxX = Math.max(s1.x, s2.x);
    return p.x >= minX - tolerance && p.x <= maxX + tolerance;
  }
  if (s1.x === s2.x) {
    // Vertical segment
    if (Math.abs(p.x - s1.x) > tolerance) return false;
    const minY = Math.min(s1.y, s2.y);
    const maxY = Math.max(s1.y, s2.y);
    return p.y >= minY - tolerance && p.y <= maxY + tolerance;
  }
  return false;
}

/**
 * Compute channel offset for a wire based on how many parallel wires
 * share the same source or target node.
 *
 * @param {object} wire - The wire to compute offset for
 * @param {object[]} allWires - All wires in the scene
 * @returns {number} offset index (-1, 0, 1, etc.)
 */
export function computeChannelOffset(wire, allWires) {
  // Find sibling wires (same source or same target)
  const siblings = allWires.filter(w =>
    w.id !== wire.id && (w.sourceId === wire.sourceId || w.targetId === wire.targetId)
  );
  if (siblings.length === 0) return 0;

  // Find this wire's index among siblings
  const group = [wire, ...siblings].sort((a, b) => (a.id > b.id ? 1 : -1));
  const idx = group.indexOf(wire);
  const mid = (group.length - 1) / 2;
  return idx - mid;
}
