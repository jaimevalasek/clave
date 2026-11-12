import { describe, expect, it } from 'vitest';
import { frameForWindow, isDefaultFrame, nudgeFrame, visibleWindow, zoomFrame } from '../../src/features/appearance/imageFrame';

// Framing of the background image (simple plan enquadrar-imagem-de-fundo):
// "cover" on the screen, the x % y % point of the image fixed on the x % y %
// point of the screen, zoom around that point.

const screen = { width: 1600, height: 900 };
const wide = { width: 3200, height: 1200 }; // wider than the screen: the sides are cut
const centered = { x: 50, y: 50, zoom: 100 };

describe('visibleWindow — the part of the image on the screen', () => {
  it('at 100 % a wider image shows its whole height and a centered slice of its width', () => {
    // cover scale = max(1600/3200, 900/1200) = 0.75 → the image is 2400 × 900 on screen.
    const area = visibleWindow(wide, screen, centered);
    expect(area.height).toBe(1);
    expect(area.width).toBeCloseTo(1600 / 2400);
    expect(area.left).toBeCloseTo((1 - 1600 / 2400) / 2);
    expect(area.top).toBe(0);
  });

  it('x at 0 % shows the left edge, at 100 % the right edge', () => {
    expect(visibleWindow(wide, screen, { ...centered, x: 0 }).left).toBe(0);
    const right = visibleWindow(wide, screen, { ...centered, x: 100 });
    expect(right.left + right.width).toBeCloseTo(1);
  });

  it('the zoom shrinks the window around the frame point', () => {
    const area = visibleWindow(wide, screen, { x: 25, y: 75, zoom: 200 });
    expect(area.width).toBeCloseTo(1600 / 4800);
    expect(area.height).toBeCloseTo(0.5);
    expect(area.left).toBeCloseTo(0.25 * (1 - 1600 / 4800));
    expect(area.top).toBeCloseTo(0.75 * 0.5);
  });

  it('an image not loaded yet shows whole', () => {
    expect(visibleWindow({ width: 0, height: 0 }, screen, centered)).toEqual({ left: 0, top: 0, width: 1, height: 1 });
  });
});

describe('frameForWindow — a dragged rectangle back into a frame', () => {
  it('is the inverse of visibleWindow', () => {
    const frame = { x: 30, y: 60, zoom: 180 };
    const area = visibleWindow(wide, screen, frame);
    expect(frameForWindow(area, area.left, area.top, { ...centered, zoom: 180 })).toEqual(frame);
  });

  it('stops at the edges of the image', () => {
    const area = visibleWindow(wide, screen, { ...centered, zoom: 200 });
    expect(frameForWindow(area, -0.4, 2, { ...centered, zoom: 200 })).toEqual({ x: 0, y: 100, zoom: 200 });
  });

  it('keeps the position on an axis where the whole image is already on screen', () => {
    const area = visibleWindow(wide, screen, { ...centered, y: 20 });
    expect(area.height).toBe(1);
    expect(frameForWindow(area, 0, 0.3, { ...centered, y: 20 })).toEqual({ x: 0, y: 20, zoom: 100 });
  });
});

describe('arrows, zoom and default', () => {
  it('moves by steps inside 0–100 and zooms inside 100–300', () => {
    expect(nudgeFrame(centered, 2, -10)).toEqual({ x: 52, y: 40, zoom: 100 });
    expect(nudgeFrame({ ...centered, x: 99 }, 10, 0).x).toBe(100);
    expect(zoomFrame(centered, 350).zoom).toBe(300);
    expect(zoomFrame(centered, 40).zoom).toBe(100);
  });

  it('no frame and the centered 100 % frame are the default', () => {
    expect(isDefaultFrame(undefined)).toBe(true);
    expect(isDefaultFrame(centered)).toBe(true);
    expect(isDefaultFrame({ ...centered, zoom: 105 })).toBe(false);
  });
});
