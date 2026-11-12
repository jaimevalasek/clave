import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { mediaUrl } from '../../core/api';
import { COPY } from '../../core/vocabulary';
import { MAX_IMAGE_ZOOM, MIN_IMAGE_ZOOM } from '../../../shared/types';
import type { ImageBackground, ImageFrame } from '../../../shared/types';
import { changeAppearance, useAppearance } from './appearanceStore';
import { frameForWindow, frameOf, isDefaultFrame, nudgeFrame, visibleWindow, zoomFrame } from './imageFrame';
import type { Size, VisibleWindow } from './imageFrame';

type Point = { x: number; y: number };

/** The size of the window, which is what the capture shows. */
function useScreenSize(): Size {
  const [size, setSize] = useState<Size>(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

/** The frame as it is now: a drag keeps reading the latest one, not the one of its first render. */
function latestFrame(): ImageFrame {
  const { background } = useAppearance.getState();
  return frameOf(background.kind === 'image' ? background.frame : undefined);
}

function setFrame(frame: ImageFrame): void {
  const { background } = useAppearance.getState();
  if (background.kind === 'image') changeAppearance({ background: { ...background, frame } });
}

function isInside(point: Point, area: VisibleWindow): boolean {
  return point.x >= area.left && point.x <= area.left + area.width && point.y >= area.top && point.y <= area.top + area.height;
}

/**
 * Dragging over the small image: grabbing the rectangle keeps the hold; a
 * press outside brings the rectangle's center there. Points are fractions of
 * the small image, the same unit as the visible window.
 */
function useFrameDrag(natural: Size | null, screen: Size) {
  const boxRef = useRef<HTMLDivElement>(null);
  const hold = useRef<Point | null>(null);

  const pointAt = (event: PointerEvent<HTMLDivElement>): Point | null => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || !box.width || !box.height) return null;
    return { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height };
  };

  const moveTo = (point: Point) => {
    if (!natural || !hold.current) return;
    const frame = latestFrame();
    const area = visibleWindow(natural, screen, frame);
    setFrame(frameForWindow(area, point.x - hold.current.x, point.y - hold.current.y, frame));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const point = pointAt(event);
    if (!point || !natural) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const area = visibleWindow(natural, screen, latestFrame());
    const inside = isInside(point, area);
    hold.current = inside ? { x: point.x - area.left, y: point.y - area.top } : { x: area.width / 2, y: area.height / 2 };
    if (!inside) moveTo(point);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const point = hold.current ? pointAt(event) : null;
    if (point) moveTo(point);
  };

  const release = () => {
    hold.current = null;
  };

  return { boxRef, onPointerDown, onPointerMove, onPointerUp: release, onPointerCancel: release };
}

const ARROW_STEPS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1]
};

/** Arrows move the image 2 % (Shift: 10 %). */
function onArrowKey(event: KeyboardEvent<HTMLDivElement>): void {
  const step = ARROW_STEPS[event.key];
  if (!step) return;
  event.preventDefault();
  const size = event.shiftKey ? 10 : 2;
  setFrame(nudgeFrame(latestFrame(), step[0] * size, step[1] * size));
}

function boxStyleFor(natural: Size | null): CSSProperties | undefined {
  if (!natural || !natural.height) return undefined;
  return { aspectRatio: `${natural.width} / ${natural.height}`, width: `min(100%, ${(180 * natural.width) / natural.height}px)` };
}

function windowStyleFor(area: VisibleWindow): CSSProperties {
  return { left: `${area.left * 100}%`, top: `${area.top * 100}%`, width: `${area.width * 100}%`, height: `${area.height * 100}%` };
}

function FrameZoom({ frame }: { frame: ImageFrame }) {
  return (
    <div className="slider-row">
      <label htmlFor="frame-zoom">{COPY.appearance.frameZoom}</label>
      <input
        id="frame-zoom"
        type="range"
        min={MIN_IMAGE_ZOOM}
        max={MAX_IMAGE_ZOOM}
        step={5}
        value={frame.zoom}
        aria-valuetext={`${frame.zoom}%`}
        data-testid="frame-zoom"
        onChange={(event) => setFrame(zoomFrame(latestFrame(), Number(event.target.value)))}
      />
      <output htmlFor="frame-zoom" className="mono">
        {frame.zoom}%
      </output>
    </div>
  );
}

/**
 * "Enquadramento": the whole image in small, with a rectangle over the part
 * that shows on the screen. Dragging the rectangle (or the arrows) places the
 * image and the slider zooms it; the real background follows at once and is
 * saved after a short pause, like every appearance change.
 */
export function FramePicker({ image }: { image: ImageBackground }) {
  const [natural, setNatural] = useState<Size | null>(null);
  const screen = useScreenSize();
  const drag = useFrameDrag(natural, screen);
  const frame = frameOf(image.frame);
  const area = natural ? visibleWindow(natural, screen, frame) : null;

  return (
    <div className="frame-picker">
      <h4>{COPY.appearance.frameHeading}</h4>
      <div
        ref={drag.boxRef}
        className="frame-box"
        style={boxStyleFor(natural)}
        tabIndex={0}
        role="group"
        aria-label={`${COPY.appearance.frameLabel}: ${COPY.appearance.frameValue(frame.x, frame.y)}`}
        data-testid="frame-box"
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}
        onKeyDown={onArrowKey}
      >
        <img
          src={mediaUrl(image.value)}
          alt=""
          draggable={false}
          onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        />
        {area ? <span className="frame-window" style={windowStyleFor(area)} data-testid="frame-window" aria-hidden="true" /> : null}
      </div>
      <p className="mono-note">{COPY.appearance.frameHint}</p>
      <FrameZoom frame={frame} />
      <button
        type="button"
        className="btn"
        disabled={isDefaultFrame(image.frame)}
        onClick={() => changeAppearance({ background: { kind: 'image', value: image.value } })}
      >
        {COPY.appearance.frameReset}
      </button>
    </div>
  );
}
