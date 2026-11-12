import { DEFAULT_IMAGE_FRAME, MAX_IMAGE_ZOOM, MIN_IMAGE_ZOOM } from '../../../shared/types';
import type { ImageFrame } from '../../../shared/types';

// Framing of the background image. The screen shows the image as "cover"
// (filling the screen), placed by `x`/`y` and scaled by `zoom` around that same
// point (tokens.css). These functions say which part of the image that leaves
// on the screen, as fractions of the image, and turn a dragged rectangle back
// into a frame.

export interface Size {
  width: number;
  height: number;
}

/** The part of the image on the screen: left/top/width/height as fractions (0 to 1) of the image. */
export interface VisibleWindow {
  left: number;
  top: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function frameOf(frame: ImageFrame | undefined): ImageFrame {
  return frame ?? DEFAULT_IMAGE_FRAME;
}

export function isDefaultFrame(frame: ImageFrame | undefined): boolean {
  const { x, y, zoom } = frameOf(frame);
  return x === DEFAULT_IMAGE_FRAME.x && y === DEFAULT_IMAGE_FRAME.y && zoom === DEFAULT_IMAGE_FRAME.zoom;
}

/**
 * "Cover" scales the image so it fills the screen; the zoom scales it further.
 * With a position in percent, the x % point of the image sits on the x % point
 * of the screen, so the window starts at x × (1 − window width).
 */
export function visibleWindow(image: Size, screen: Size, frame: ImageFrame): VisibleWindow {
  if (image.width <= 0 || image.height <= 0 || screen.width <= 0 || screen.height <= 0) {
    return { left: 0, top: 0, width: 1, height: 1 };
  }
  const cover = Math.max(screen.width / image.width, screen.height / image.height);
  const scale = (cover * frame.zoom) / 100;
  const width = Math.min(1, screen.width / (scale * image.width));
  const height = Math.min(1, screen.height / (scale * image.height));
  return { left: (frame.x / 100) * (1 - width), top: (frame.y / 100) * (1 - height), width, height };
}

/**
 * The frame that puts the window's top-left corner at `left`/`top` (fractions
 * of the image). On an axis where the whole image is on screen the position
 * changes nothing, so it stays as it was.
 */
export function frameForWindow(window: VisibleWindow, left: number, top: number, frame: ImageFrame): ImageFrame {
  const room = { x: 1 - window.width, y: 1 - window.height };
  const x = room.x > 1e-6 ? oneDecimal(clamp(left / room.x, 0, 1) * 100) : frame.x;
  const y = room.y > 1e-6 ? oneDecimal(clamp(top / room.y, 0, 1) * 100) : frame.y;
  return { ...frame, x, y };
}

/** Arrow keys: the position moves `step` percent on one axis, inside 0–100. */
export function nudgeFrame(frame: ImageFrame, dx: number, dy: number): ImageFrame {
  return { ...frame, x: oneDecimal(clamp(frame.x + dx, 0, 100)), y: oneDecimal(clamp(frame.y + dy, 0, 100)) };
}

export function zoomFrame(frame: ImageFrame, zoom: number): ImageFrame {
  return { ...frame, zoom: Math.round(clamp(zoom, MIN_IMAGE_ZOOM, MAX_IMAGE_ZOOM)) };
}
