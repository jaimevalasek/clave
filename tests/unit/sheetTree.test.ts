import { describe, expect, it } from 'vitest';
import {
  MAX_DEPTH,
  firstInvalidDepth,
  indentRefusal,
  moveSubtree,
  moveSubtreeBefore,
  normalizeDepths,
  removeAndPromote,
  shiftSubtree
} from '../../shared/sheetTree';

interface Node {
  name: string;
  depth: number;
}

/** Builds a flat tree from "name:depth" pairs, e.g. tree('A:0 a:1 B:0'). */
function tree(spec: string): Node[] {
  return spec.split(' ').map((pair) => {
    const [name, depth] = pair.split(':');
    return { name, depth: Number(depth) };
  });
}

function show(nodes: Node[] | null): string | null {
  return nodes ? nodes.map((node) => `${node.name}:${node.depth}`).join(' ') : null;
}

function valid(nodes: Node[] | null): boolean {
  return nodes !== null && firstInvalidDepth(nodes.map((node) => node.depth)) === -1;
}

describe('AC-pauta-revelavel-40 — Tab and Shift+Tab move the block and its sub-items one level', () => {
  it('indents a block under the topic right above it, taking its sub-items along', () => {
    expect(show(shiftSubtree(tree('A:0 B:0 b:1'), 1, 1))).toBe('A:0 B:1 b:2');
  });

  it('outdents a sub-item with its own sub-items', () => {
    expect(show(shiftSubtree(tree('A:0 B:1 b:2'), 1, -1))).toBe('A:0 B:0 b:1');
  });

  it('refuses to indent the first block or a block already below its neighbour (no topic right above)', () => {
    expect(indentRefusal(tree('A:0 B:0'), 0)).toBe('no-parent');
    expect(indentRefusal(tree('A:0 B:1'), 1)).toBe('no-parent');
    expect(shiftSubtree(tree('A:0 B:1'), 1, 1)).toBeNull();
  });

  it(`refuses to go past level ${MAX_DEPTH} for the block or any of its sub-items`, () => {
    expect(indentRefusal(tree('A:0 B:1 C:2 D:2'), 3)).toBe('too-deep');
    expect(indentRefusal(tree('A:0 B:0 b:1 c:2'), 1)).toBe('too-deep');
    expect(shiftSubtree(tree('A:0 B:0 b:1 c:2'), 1, 1)).toBeNull();
  });

  it('accepts a block whose previous neighbour is deeper: it becomes a sibling of that neighbour', () => {
    expect(indentRefusal(tree('A:0 a:1 B:0'), 2)).toBeNull();
    expect(show(shiftSubtree(tree('A:0 a:1 B:0'), 2, 1))).toBe('A:0 a:1 B:1');
  });

  it('leaves a top-level block alone on Shift+Tab', () => {
    expect(shiftSubtree(tree('A:0 B:0'), 1, -1)).toBeNull();
  });

  it('lets the caller restyle every shifted node and only those', () => {
    const restyled = shiftSubtree(tree('A:0 B:0 b:1 C:0'), 1, 1, (node) => ({ ...node, name: node.name.toUpperCase() }));
    expect(show(restyled)).toBe('A:0 B:1 B:2 C:0');
  });
});

describe('AC-pauta-revelavel-42 — moving a topic takes the whole subtree and keeps the tree valid', () => {
  it('Alt+↓ jumps over the next topic and all of its sub-items', () => {
    expect(show(moveSubtree(tree('A:0 a:1 B:0 b:1 b2:2'), 0, 1))).toBe('B:0 b:1 b2:2 A:0 a:1');
  });

  it('Alt+↑ jumps over the previous topic and its sub-items', () => {
    expect(show(moveSubtree(tree('A:0 a:1 B:0 b:1'), 2, -1))).toBe('B:0 b:1 A:0 a:1');
  });

  it('moves a sub-item among its siblings', () => {
    expect(show(moveSubtree(tree('A:0 x:1 y:1'), 2, -1))).toBe('A:0 y:1 x:1');
    expect(show(moveSubtree(tree('A:0 x:1 y:1'), 1, 1))).toBe('A:0 y:1 x:1');
  });

  it('a sub-item moved above its topic becomes a topic (levels normalized)', () => {
    const moved = moveSubtree(tree('A:0 x:1 x2:2'), 1, -1);
    expect(show(moved)).toBe('x:0 x2:1 A:0');
    expect(valid(moved)).toBe(true);
  });

  it('does nothing at the edges of the sheet', () => {
    expect(moveSubtree(tree('A:0 B:0'), 0, -1)).toBeNull();
    expect(moveSubtree(tree('A:0 B:0 b:1'), 1, 1)).toBeNull();
  });

  it('a drag lands the subtree before the target, with the end of the list as a target', () => {
    expect(show(moveSubtreeBefore(tree('A:0 a:1 B:0 C:0'), 0, 3))).toBe('B:0 A:0 a:1 C:0');
    expect(show(moveSubtreeBefore(tree('A:0 a:1 B:0 C:0'), 0, 4))).toBe('B:0 C:0 A:0 a:1');
    expect(show(moveSubtreeBefore(tree('A:0 B:0 C:0 c:1'), 2, 0))).toBe('C:0 c:1 A:0 B:0');
  });

  it('a drop inside or right next to its own subtree changes nothing', () => {
    expect(moveSubtreeBefore(tree('A:0 a:1 B:0'), 0, 0)).toBeNull();
    expect(moveSubtreeBefore(tree('A:0 a:1 B:0'), 0, 1)).toBeNull();
    expect(moveSubtreeBefore(tree('A:0 a:1 B:0'), 0, 2)).toBeNull();
  });

  it('deleting a topic moves its sub-items one level up', () => {
    expect(show(removeAndPromote(tree('A:0 B:0 b:1 b2:2 C:0'), 1))).toBe('A:0 b:0 b2:1 C:0');
  });

  it('RULE-pauta-revelavel-04 holds after every move, delete and pasted insertion', () => {
    const start = tree('A:0 a:1 a2:2 B:0 b:1 C:0 c:1 c2:2');
    for (let index = 0; index < start.length; index += 1) {
      for (const direction of [-1, 1] as const) {
        const moved = moveSubtree(start, index, direction);
        if (moved) expect(valid(moved)).toBe(true);
      }
      for (let target = 0; target <= start.length; target += 1) {
        const dropped = moveSubtreeBefore(start, index, target);
        if (dropped) expect(valid(dropped)).toBe(true);
      }
      expect(valid(removeAndPromote(start, index))).toBe(true);
    }
    // A pasted list enters at any level: normalizing clamps only what breaks the rule.
    const pasted = normalizeDepths([...tree('A:0'), ...tree('p:2 q:2 r:1'), ...tree('B:0')]);
    expect(show(pasted)).toBe('A:0 p:1 q:2 r:1 B:0');
    expect(valid(pasted)).toBe(true);
  });
});
