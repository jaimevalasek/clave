// Planned state versus take progress (RULE-pauta-revelavel-02/03). A block is
// on screen only when it is visible in the take and every ancestor is too.
// `takeVisible` + `revealStep` are the progress of the take: every reveal gets
// the next step number, and hiding the last step undoes it as a group.

import { subtreeEnd } from './sheetTree.js';

export interface RevealNode {
  depth: number;
  plannedVisible: boolean;
  takeVisible: boolean;
  revealStep: number | null;
  collapsed?: boolean;
}

/** On-screen flag for every block, in one pass over a valid flat tree. */
export function shownFlags(nodes: readonly Pick<RevealNode, 'depth' | 'takeVisible'>[]): boolean[] {
  const shownAtDepth: boolean[] = [];
  return nodes.map((node) => {
    const parentShown = node.depth === 0 ? true : (shownAtDepth[node.depth - 1] ?? false);
    const shown = node.takeVisible && parentShown;
    shownAtDepth[node.depth] = shown;
    return shown;
  });
}

export function isShown(nodes: readonly Pick<RevealNode, 'depth' | 'takeVisible'>[], index: number): boolean {
  return shownFlags(nodes.slice(0, index + 1))[index] ?? false;
}

/** "N de M na tela": only what is actually on screen counts (AC-pauta-revelavel-31). */
export function countShown(nodes: readonly Pick<RevealNode, 'depth' | 'takeVisible'>[]): number {
  return shownFlags(nodes).filter(Boolean).length;
}

export function plannedCounts(nodes: readonly Pick<RevealNode, 'plannedVisible'>[]): { visible: number; hidden: number } {
  const visible = nodes.filter((node) => node.plannedVisible).length;
  return { visible, hidden: nodes.length - visible };
}

/** Next step number for a block revealed now. */
export function nextRevealStep(nodes: readonly Pick<RevealNode, 'revealStep'>[]): number {
  return nodes.reduce((max, node) => Math.max(max, node.revealStep ?? 0), 0) + 1;
}

/**
 * Which blocks the sheet mounts. With the preparation view off, only what is
 * on screen exists in the page (RULE-pauta-revelavel-01). In preparation every
 * block shows, except the sub-items of a collapsed topic (AC-pauta-revelavel-43).
 */
export function mountedFlags(nodes: readonly RevealNode[], preparing: boolean): boolean[] {
  if (!preparing) return shownFlags(nodes);
  let collapsedDepth = Number.POSITIVE_INFINITY;
  return nodes.map((node) => {
    if (node.depth > collapsedDepth) return false;
    collapsedDepth = node.collapsed ? node.depth : Number.POSITIVE_INFINITY;
    return true;
  });
}

/** Why a reveal or hide command changes nothing. */
export type RevealRefusal = 'empty' | 'all-shown' | 'nothing-revealed';

export interface RevealChange<T> {
  nodes: T[];
  /** Indexes of the blocks whose take state changed. */
  changed: number[];
}

function withTake<T extends RevealNode>(nodes: readonly T[], indexes: readonly number[], visible: boolean, step: number | null): T[] {
  const targets = new Set(indexes);
  return nodes.map((node, index) =>
    targets.has(index) ? { ...node, takeVisible: visible, revealStep: visible ? step : null } : node
  );
}

/** The first block not on screen, in vertical order. Its ancestors are always on screen. */
function firstHidden(nodes: readonly RevealNode[]): number {
  return shownFlags(nodes).indexOf(false);
}

/**
 * PageDown: the first block not on screen appears, one at a time, crossing
 * levels (AC-pauta-revelavel-22).
 */
export function revealNext<T extends RevealNode>(nodes: readonly T[]): RevealChange<T> | RevealRefusal {
  if (nodes.length === 0) return 'empty';
  const index = firstHidden(nodes);
  if (index < 0) return 'all-shown';
  return { nodes: withTake(nodes, [index], true, nextRevealStep(nodes)), changed: [index] };
}

/**
 * Shift+PageDown: the next topic appears with all of its sub-items, as one
 * step that a single PageUp undoes (AC-pauta-revelavel-24).
 */
export function revealNextTopic<T extends RevealNode>(nodes: readonly T[]): RevealChange<T> | RevealRefusal {
  if (nodes.length === 0) return 'empty';
  const index = firstHidden(nodes);
  if (index < 0) return 'all-shown';
  const changed: number[] = [];
  for (let position = index; position < subtreeEnd(nodes, index); position += 1) {
    if (!nodes[position].takeVisible) changed.push(position);
  }
  return { nodes: withTake(nodes, changed, true, nextRevealStep(nodes)), changed };
}

/**
 * PageUp: the last step still on screen goes away as a group
 * (AC-pauta-revelavel-23). Blocks shown because they are planned visible were
 * never revealed in this take, so they are not undone.
 */
export function hideLast<T extends RevealNode>(nodes: readonly T[]): RevealChange<T> | RevealRefusal {
  const shown = shownFlags(nodes);
  let last = 0;
  nodes.forEach((node, index) => {
    if (shown[index] && node.revealStep !== null) last = Math.max(last, node.revealStep);
  });
  if (last === 0) return 'nothing-revealed';
  const changed = nodes.flatMap((node, index) => (node.revealStep === last ? [index] : []));
  return { nodes: withTake(nodes, changed, false, null), changed };
}

/**
 * The eye of one block (AC-pauta-revelavel-25). Hiding takes only that block
 * out of the take; its sub-items go with it because a block needs its
 * ancestors (RULE-pauta-revelavel-03). Showing brings the block back with any
 * hidden ancestor, so it really reaches the screen.
 */
export function toggleEye<T extends RevealNode>(nodes: readonly T[], index: number): RevealChange<T> | null {
  if (index < 0 || index >= nodes.length) return null;
  if (isShown(nodes, index)) return { nodes: withTake(nodes, [index], false, null), changed: [index] };
  const changed = [index];
  let depth = nodes[index].depth;
  for (let position = index - 1; position >= 0 && depth > 0; position -= 1) {
    if (nodes[position].depth >= depth) continue;
    depth = nodes[position].depth;
    if (!nodes[position].takeVisible) changed.unshift(position);
  }
  return { nodes: withTake(nodes, changed, true, nextRevealStep(nodes)), changed };
}

/** "Nova tomada": every block goes back to how it was planned and no step is left (RULE-pauta-revelavel-02). */
export function newTake<T extends RevealNode>(nodes: readonly T[]): T[] {
  return nodes.map((node) =>
    node.takeVisible === node.plannedVisible && node.revealStep === null
      ? node
      : { ...node, takeVisible: node.plannedVisible, revealStep: null }
  );
}
