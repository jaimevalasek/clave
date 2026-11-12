// Flat tree of the sheet (RULE-pauta-revelavel-04). A block's parent is the
// nearest previous block with a smaller depth; the first block sits at depth 0,
// no block goes more than one level below the previous one, and the deepest
// level is 2.

export const MAX_DEPTH = 2;

export interface TreeNode {
  depth: number;
}

/** Index right after the last descendant of `nodes[index]`. */
export function subtreeEnd(nodes: readonly TreeNode[], index: number): number {
  const depth = nodes[index]?.depth ?? 0;
  let end = index + 1;
  while (end < nodes.length && nodes[end].depth > depth) end += 1;
  return end;
}

export function hasChildren(nodes: readonly TreeNode[], index: number): boolean {
  return index + 1 < nodes.length && nodes[index + 1].depth > nodes[index].depth;
}

/** Index of the first depth that breaks the tree rule, or -1 when valid. */
export function firstInvalidDepth(depths: readonly number[]): number {
  let previous = -1;
  for (let index = 0; index < depths.length; index += 1) {
    const depth = depths[index];
    if (!Number.isInteger(depth) || depth < 0 || depth > MAX_DEPTH || depth > previous + 1) {
      return index;
    }
    previous = depth;
  }
  return -1;
}

/** Clamps every depth into a valid tree, keeping the nodes that already fit. */
export function normalizeDepths<T extends TreeNode>(nodes: readonly T[]): T[] {
  let previous = -1;
  return nodes.map((node) => {
    const depth = Math.min(Math.max(0, Math.min(MAX_DEPTH, Math.trunc(node.depth) || 0)), previous + 1);
    previous = depth;
    return depth === node.depth ? node : { ...node, depth };
  });
}

/** Removes one block; its descendants move one level up. */
export function removeAndPromote<T extends TreeNode>(nodes: readonly T[], index: number): T[] {
  if (index < 0 || index >= nodes.length) return [...nodes];
  const end = subtreeEnd(nodes, index);
  const next = nodes.map((node, position) =>
    position > index && position < end ? { ...node, depth: node.depth - 1 } : node
  );
  next.splice(index, 1);
  return normalizeDepths(next);
}

/** Why Tab refuses to indent a block (BR-pauta-revelavel-08). */
export type IndentRefusal = 'no-parent' | 'too-deep';

/**
 * Tab needs a topic right above the block (the previous block sits at the same
 * level or deeper) and the whole subtree must still fit under MAX_DEPTH.
 */
export function indentRefusal(nodes: readonly TreeNode[], index: number): IndentRefusal | null {
  if (index <= 0 || index >= nodes.length) return 'no-parent';
  if (nodes[index].depth > nodes[index - 1].depth) return 'no-parent';
  const end = subtreeEnd(nodes, index);
  for (let position = index; position < end; position += 1) {
    if (nodes[position].depth + 1 > MAX_DEPTH) return 'too-deep';
  }
  return null;
}

/**
 * Tab (`delta = 1`) or Shift+Tab (`delta = -1`): the block and its whole
 * subtree move one level. `restyle` lets the caller adjust every moved node
 * (a text changes size). Null when the shift is not allowed.
 */
export function shiftSubtree<T extends TreeNode>(
  nodes: readonly T[],
  index: number,
  delta: 1 | -1,
  restyle?: (node: T) => T
): T[] | null {
  if (index < 0 || index >= nodes.length) return null;
  if (delta > 0 ? indentRefusal(nodes, index) !== null : nodes[index].depth === 0) return null;
  const end = subtreeEnd(nodes, index);
  const next = nodes.map((node, position) => {
    if (position < index || position >= end) return node;
    const shifted = { ...node, depth: node.depth + delta };
    return restyle ? restyle(shifted) : shifted;
  });
  return normalizeDepths(next);
}

/**
 * Drag: the block and its subtree land before `target`, an index of the
 * current list (`nodes.length` is the end). Null when it lands where it is.
 */
export function moveSubtreeBefore<T extends TreeNode>(nodes: readonly T[], index: number, target: number): T[] | null {
  if (index < 0 || index >= nodes.length || target < 0 || target > nodes.length) return null;
  const end = subtreeEnd(nodes, index);
  if (target >= index && target <= end) return null;
  const group = nodes.slice(index, end);
  const rest = [...nodes.slice(0, index), ...nodes.slice(end)];
  const at = target > end ? target - group.length : target;
  return normalizeDepths([...rest.slice(0, at), ...group, ...rest.slice(at)]);
}

/**
 * Alt+↑ / Alt+↓: the block and its subtree jump over the previous or next
 * group (a block with its own sub-items). Null at the edge of the sheet.
 */
export function moveSubtree<T extends TreeNode>(nodes: readonly T[], index: number, direction: -1 | 1): T[] | null {
  if (index < 0 || index >= nodes.length) return null;
  if (direction < 0) {
    if (index === 0) return null;
    let target = index - 1;
    while (target > 0 && nodes[target].depth > nodes[index].depth) target -= 1;
    return moveSubtreeBefore(nodes, index, target);
  }
  const end = subtreeEnd(nodes, index);
  if (end >= nodes.length) return null;
  return moveSubtreeBefore(nodes, index, subtreeEnd(nodes, end));
}
