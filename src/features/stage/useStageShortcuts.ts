import { useEffect } from 'react';

export interface StageActions {
  advance(): void;
  back(): void;
  drawRescue(): void;
  finish(): void;
  /** `N` é hold-to-show: a nota existe só enquanto a tecla está pressionada. */
  setNoteVisible(visible: boolean): void;
  /** Enquanto há sobreposição aberta, as teclas de condução ficam suspensas. */
  overlayOpen: boolean;
  closeOverlay(): void;
  enabled: boolean;
}

const EDITABLE = /^(INPUT|TEXTAREA|SELECT)$/;

/**
 * Atalhos do Palco: `espaço`/`→` avançam (primeiro pelos pontos do bloco, depois
 * de bloco), `←` volta pelo mesmo caminho, `R` saca resgate, `N` mostra a nota
 * enquanto pressionada e `Esc` encerra. Cada um tem controle clicável
 * equivalente na barra do Palco.
 */
export function useStageShortcuts(actions: StageActions): void {
  const {
    advance,
    back,
    drawRescue,
    finish,
    setNoteVisible,
    overlayOpen,
    closeOverlay,
    enabled
  } = actions;

  useEffect(() => {
    if (!enabled) return undefined;

    const inEditableField = () => EDITABLE.test(document.activeElement?.tagName ?? '');

    const onKeyDown = (event: KeyboardEvent) => {
      if (inEditableField()) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        if (overlayOpen) closeOverlay();
        else finish();
        return;
      }
      if (overlayOpen) return;

      if (event.key === ' ' || event.key === 'ArrowRight') {
        event.preventDefault();
        advance();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        back();
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        drawRescue();
      } else if ((event.key === 'n' || event.key === 'N') && !event.repeat) {
        event.preventDefault();
        setNoteVisible(true);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'n' || event.key === 'N') setNoteVisible(false);
    };
    // Soltar a tecla fora da janela não pode deixar a nota no ar.
    const onBlur = () => setNoteVisible(false);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [advance, back, drawRescue, finish, setNoteVisible, overlayOpen, closeOverlay, enabled]);
}
