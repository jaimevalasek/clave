import { describe, expect, it } from 'vitest';
import {
  countShown,
  hideLast,
  mountedFlags,
  newTake,
  plannedCounts,
  revealNext,
  revealNextTopic,
  shownFlags,
  toggleEye
} from '../../shared/reveal';
import type { RevealNode } from '../../shared/reveal';
import { makeTextBlock, useSheet } from '../../src/features/sheet/sheetStore';

interface Node extends RevealNode {
  name: string;
}

/**
 * Builds a sheet from "name:depth:flags" items. Flags: `p` planned visible,
 * `t` visible in the take, `c` collapsed; a number is the reveal step.
 * Example: sheet('A:0:pt B:0 b:1:t3').
 */
function sheet(spec: string): Node[] {
  return spec.split(' ').map((item) => {
    const [name, depth, flags = ''] = item.split(':');
    const step = /\d+/.exec(flags);
    return {
      name,
      depth: Number(depth),
      plannedVisible: flags.includes('p'),
      takeVisible: flags.includes('t'),
      revealStep: step ? Number(step[0]) : null,
      collapsed: flags.includes('c')
    };
  });
}

function onScreen(nodes: readonly Node[]): string {
  const shown = shownFlags(nodes);
  return nodes.filter((_, index) => shown[index]).map((node) => node.name).join(' ');
}

function nodesOf(result: unknown): Node[] {
  if (typeof result === 'string' || result === null) throw new Error(`refused: ${String(result)}`);
  return (result as { nodes: Node[] }).nodes;
}

describe('planned state versus take progress', () => {
  it('AC-pauta-revelavel-21 — a new block is planned "começa oculto", whatever the take does with it', () => {
    useSheet.setState({ preparing: false });
    const live = makeTextBlock([], { depth: 0 });
    expect(live.plannedVisible).toBe(false);
    // Written live with the preparation view off, it is on screen as a step of this take.
    expect(live.takeVisible).toBe(true);
    expect(live.revealStep).toBe(1);

    useSheet.setState({ preparing: true });
    const prepared = makeTextBlock([], { depth: 0 });
    expect(prepared.plannedVisible).toBe(false);
    expect(prepared.takeVisible).toBe(false);
    expect(prepared.revealStep).toBeNull();
    useSheet.setState({ preparing: false });
  });

  it('AC-pauta-revelavel-21 — reveal, hide and the eye change the take, never the plan', () => {
    const start = sheet('A:0:p B:0 C:0:p');
    const planned = start.map((node) => node.plannedVisible);
    let nodes = nodesOf(revealNext(start));
    nodes = nodesOf(toggleEye(nodes, 2));
    nodes = nodesOf(revealNextTopic(nodes));
    nodes = nodesOf(hideLast(nodes));
    expect(nodes.map((node) => node.plannedVisible)).toEqual(planned);
  });

  it('AC-pauta-revelavel-21 — "Nova tomada" copies the plan into the take and clears every step', () => {
    const nodes = newTake(sheet('A:0:pt B:0:t1 C:0:p D:0:t2'));
    expect(nodes.map((node) => [node.name, node.takeVisible, node.revealStep])).toEqual([
      ['A', true, null],
      ['B', false, null],
      ['C', true, null],
      ['D', false, null]
    ]);
  });

  it('AC-pauta-revelavel-29 — the take dialog counts what starts visible and hidden', () => {
    expect(plannedCounts(sheet('A:0:p B:0 C:0:p D:0'))).toEqual({ visible: 2, hidden: 2 });
    expect(plannedCounts(sheet('A:0:p B:0'))).toEqual({ visible: 1, hidden: 1 });
  });
});

describe('what is on screen', () => {
  it('AC-pauta-revelavel-31 — "N de M na tela" does not count a sub-item whose topic is hidden', () => {
    // b1 and b2 are visible in the take, but their topic B is not.
    const nodes = sheet('A:0:t B:0 b1:1:t b2:2:t C:0:t');
    expect(countShown(nodes)).toBe(2);
    expect(onScreen(nodes)).toBe('A C');
  });

  it('AC-pauta-revelavel-31 — a level-2 item needs both its sub-item and its topic', () => {
    expect(countShown(sheet('A:0:t a:1 x:2:t'))).toBe(1);
    expect(countShown(sheet('A:0:t a:1:t x:2:t'))).toBe(3);
  });

  it('AC-pauta-revelavel-27 — with the preparation view off only what is on screen is mounted', () => {
    const nodes = sheet('A:0:t B:0 b:1:t C:0:t');
    expect(mountedFlags(nodes, false)).toEqual([true, false, false, true]);
  });

  it('AC-pauta-revelavel-43 — in preparation everything is mounted except the sub-items of a collapsed topic', () => {
    const nodes = sheet('A:0:c a1:1:t a2:2 B:0 b:1:c x:2 C:0');
    expect(mountedFlags(nodes, true)).toEqual([true, false, false, true, true, false, true]);
    // With the preparation view off, collapsing changes nothing on screen.
    const live = sheet('A:0:tc a:1:t');
    expect(mountedFlags(live, false)).toEqual([true, true]);
  });
});

describe('reveal and hide', () => {
  it('AC-pauta-revelavel-22 — PageDown shows the first block not on screen, one at a time, crossing levels', () => {
    let nodes = sheet('A:0:pt B:0 b:1 c:2 D:0');
    const order: string[] = [];
    for (let press = 0; press < 4; press += 1) {
      const result = revealNext(nodes);
      if (typeof result === 'string') throw new Error(result);
      order.push(result.changed.map((index) => result.nodes[index].name).join(''));
      nodes = result.nodes;
    }
    expect(order).toEqual(['B', 'b', 'c', 'D']);
    expect(onScreen(nodes)).toBe('A B b c D');
    expect(nodes.map((node) => node.revealStep)).toEqual([null, 1, 2, 3, 4]);
  });

  it('AC-pauta-revelavel-22 — everything on screen and an empty sheet are refusals, not changes', () => {
    expect(revealNext(sheet('A:0:pt B:0:t1'))).toBe('all-shown');
    expect(revealNext([])).toBe('empty');
    expect(revealNextTopic([])).toBe('empty');
  });

  it('AC-pauta-revelavel-22 — revealing a hidden topic brings along sub-items planned visible', () => {
    const result = revealNext(sheet('T:0 a:1:pt b:1'));
    expect(onScreen(nodesOf(result))).toBe('T a');
  });

  it('AC-pauta-revelavel-23 — PageUp hides the last revealed block, and says so when nothing was revealed', () => {
    let nodes = nodesOf(revealNext(sheet('A:0:pt B:0 C:0')));
    nodes = nodesOf(revealNext(nodes));
    expect(onScreen(nodes)).toBe('A B C');
    nodes = nodesOf(hideLast(nodes));
    expect(onScreen(nodes)).toBe('A B');
    nodes = nodesOf(hideLast(nodes));
    expect(onScreen(nodes)).toBe('A');
    // A planned-visible block was never revealed in this take.
    expect(hideLast(nodes)).toBe('nothing-revealed');
  });

  it('AC-pauta-revelavel-24 — Shift+PageDown reveals the topic with its sub-items and one PageUp hides the group', () => {
    const start = sheet('A:0:pt T:0 t1:1 t2:1 x:2 U:0');
    const revealed = revealNextTopic(start);
    if (typeof revealed === 'string') throw new Error(revealed);
    expect(revealed.changed.map((index) => revealed.nodes[index].name)).toEqual(['T', 't1', 't2', 'x']);
    expect(onScreen(revealed.nodes)).toBe('A T t1 t2 x');
    expect(new Set(revealed.changed.map((index) => revealed.nodes[index].revealStep))).toEqual(new Set([1]));

    const hidden = nodesOf(hideLast(revealed.nodes));
    expect(onScreen(hidden)).toBe('A');
  });

  it('AC-pauta-revelavel-23 — PageUp skips a step that is no longer on screen', () => {
    // b was revealed last (step 2), but its topic B was then hidden by the eye.
    const nodes = sheet('A:0:t1 B:0 b:1:t2');
    expect(onScreen(nodes)).toBe('A');
    expect(onScreen(nodesOf(hideLast(nodes)))).toBe('');
  });
});

describe('the eye', () => {
  it('AC-pauta-revelavel-25 — hiding a topic hides its sub-items; showing brings back only that block', () => {
    let nodes = sheet('T:0:pt a:1:pt b:1:pt U:0:pt');
    nodes = nodesOf(toggleEye(nodes, 0));
    expect(onScreen(nodes)).toBe('U');
    expect(countShown(nodes)).toBe(1);
    nodes = nodesOf(toggleEye(nodes, 0));
    expect(onScreen(nodes)).toBe('T a b U');

    nodes = nodesOf(toggleEye(nodes, 1));
    expect(onScreen(nodes)).toBe('T b U');
  });

  it('AC-pauta-revelavel-25 — showing a sub-item whose topic is hidden shows the topic too, as one step', () => {
    const result = toggleEye(sheet('T:0 a:1 b:1'), 2);
    if (!result) throw new Error('no change');
    expect(onScreen(result.nodes)).toBe('T b');
    expect(result.nodes[0].revealStep).toBe(result.nodes[2].revealStep);
    expect(onScreen(nodesOf(hideLast(result.nodes)))).toBe('');
  });
});
