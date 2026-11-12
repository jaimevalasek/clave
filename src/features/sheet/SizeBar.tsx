import type { MouseEvent } from 'react';
import { COPY } from '../../core/vocabulary';
import { BLOCK_SIZES, canAdjustFontPx } from '../../../shared/blockSize';
import type { BlockSize } from '../../../shared/blockSize';
import { adjustBlockFont, setBlockSize } from './formatOps';
import './format.css';

/** A click on the bar keeps the caret in the text being written. */
function keepCaret(event: MouseEvent): void {
  if (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable) event.preventDefault();
}

interface SizeBarProps {
  blockKey: string;
  size: BlockSize;
  fontPx: number;
}

/**
 * The bar above a text block, shown on focus or pointer
 * (AC-pauta-revelavel-35, -36): P, M, G and Título (Ctrl+Alt+1 to 4), then
 * A− and A+ in 4 px steps inside the range of the size, with the value in px;
 * at the limit the button is off. Every control is reachable by Tab once the
 * text is left with Esc (AC-pauta-revelavel-53) and the bar wraps on a phone
 * (AC-pauta-revelavel-54).
 */
export function SizeBar({ blockKey, size, fontPx }: SizeBarProps) {
  return (
    <div className="size-bar" data-testid="size-bar" onMouseDown={keepCaret}>
      <div role="radiogroup" aria-label={COPY.format.sizeGroup}>
        {BLOCK_SIZES.map((option, index) => {
          const { short, name } = COPY.format.sizes[option];
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={option === size}
              aria-label={name}
              title={COPY.format.sizeTitle(name, index + 1)}
              data-size-option={option}
              onClick={() => setBlockSize(blockKey, option)}
            >
              {short}
            </button>
          );
        })}
      </div>
      <div className="fine" role="group" aria-label={COPY.format.fineGroup}>
        <button
          type="button"
          aria-label={COPY.format.smaller}
          title={COPY.format.smallerTitle}
          disabled={!canAdjustFontPx(size, fontPx, -1)}
          onClick={() => adjustBlockFont(blockKey, -1)}
        >
          A−
        </button>
        <button
          type="button"
          aria-label={COPY.format.larger}
          title={COPY.format.largerTitle}
          disabled={!canAdjustFontPx(size, fontPx, 1)}
          onClick={() => adjustBlockFont(blockKey, 1)}
        >
          A+
        </button>
        <span className="px" aria-live="polite" data-testid="size-px">
          {COPY.format.px(fontPx)}
        </span>
      </div>
    </div>
  );
}
