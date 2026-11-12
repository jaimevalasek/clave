---
slug: palco-carrossel-anexos
status: done
owner: dev
created_at: 2026-09-20
updated_at: 2026-09-20
classification: MICRO
risk: low
source: direct-user-request
---

# Simple Plan - Carrossel de anexos no Palco

## Scope
No Palco, os anexos do bloco no ar deixam de ser chips lado a lado e passam a
aparecer um por página, com a mídia visível (imagem/vídeo) ou o cartão do link,
navegação por setas e a mesma ação de tela cheia / só você já configurada no
modal de anexos.

## Context selected
- context:select / fallback evidence: `context:brief` (dev/executing) — must_load
  `source-code-language-convention`, `disk-first-artifacts`, `output-brevity`,
  `implementation-structure-and-data-access`. `brain:query` visual-quality: 0 nós.
- Existing pattern to follow: `StageBeats` + `beatToAdvance`/`beatToRewind` — o
  avanço do Palco já percorre itens do bloco antes de trocar de bloco.
  `AttachmentViewer`/`resolveFileSource` já resolvem origem de imagem, vídeo e
  URL. `fullscreen` já vive no rascunho do modal (`AttachmentFields`).
- Applicable rule/doc: `.aioson/rules/simple-plan-lane.md` (orçamento),
  `.aioson/docs/dev/visual-implementation.md` (Palco = identidade tinta, ouro só
  em ação, peso 800 só no título gigante), gotchas `palco-transborda-em-janela-baixa`
  e `palco-grid-anula-position-absolute`.

## Implementation intelligence
- Framework leverage: o atalho `espaço`/`→`/`←` de `useStageShortcuts` continua
  chamando `advance`/`back`. Depois dos pontos, o mesmo caminho percorre as
  páginas do carrossel e só então troca de bloco. Sem atalho novo e sem biblioteca
  de carrossel.
- Structure and data boundary: nenhuma mudança de API, validação ou persistência.
  `Attachment.fullscreen` e o checkbox "Toma a tela capturada ao abrir" ficam
  como estão. O carrossel é composição de Palco (`src/features/stage/`) com CSS
  dos anexos já existente.
- Reuse over custom code: origem da mídia via `resolveFileSource`/`resolveVideoSource`;
  abrir/copiar reusa `openAttachment` (tomada vs painel privado). Anexo sem
  `fullscreen` não pinta a mídia na camada pública — só o cartão "SÓ VOCÊ".

## Done criteria
- Bloco com anexos no Palco mostra **um** item por vez, com a imagem (ou o
  cartão do link / texto) visível no quadro, não uma fileira de chips.
- `→` / espaço avançam: pontos restantes → próxima página de anexo → próximo bloco.
  `←` percorre o caminho inverso. Controles clicáveis no carrossel só mudam de
  página (desabilitados nas pontas).
- "abrir" / "copiar" e a marca TELA CHEIA / SÓ VOCÊ continuam na página atual;
  tela cheia ainda abre a tomada capturada, sem tela cheia ainda abre o painel
  privado.
- `pnpm test tests/unit` e o spec e2e de anexos passam.

## Useful options considered
- Include now: inserir as páginas no `advance`/`back` já existente; quadro 16:9
  com `max-height` para não transbordar o rodapé; contador `2 / 3` em mono;
  placeholder público para anexo privado.
- Defer: iframe do link na camada pública (sites bloqueiam embed; o cartão +
  abrir cobre o pedido); estender `FULLSCREEN_CAPABLE_TYPES` para `link`.
- Escalate: nada. A opção de tela cheia já existe no modal de anexos; não é
  regra nova de produto.

## Out of scope
- Mudar o modal de editar bloco / `AttachmentFields`.
- Workflow da feature `clave` (permanece intocado).
- Auto-abrir a tomada ao entrar na página.

## Expected files
- `src/features/stage/StageCarousel.tsx` (behavior)
- `src/features/stage/StagePage.tsx` (behavior)
- `src/features/attachments/attachments.css` (behavior)
- `src/features/stage/stage.css` (behavior)
- `tests/e2e/attachments.spec.ts` (support)
- `tests/unit/slides.test.ts` (support)
- `src/features/stage/slides.ts` (behavior)

## Verification
- `pnpm exec vitest run tests/unit/slides.test.ts tests/unit/beats.test.ts` — 21 passed
- `pnpm exec playwright test tests/e2e/attachments.spec.ts` — 6 passed
- `pnpm exec playwright test tests/e2e/stage.spec.ts` — 13 passed
- `pnpm exec tsc --noEmit -p tsconfig.json` — passed

## Session state
Next step: done.

## Notes
- Feature `clave` ativa no pulse está em QA e é outro trabalho; este plano não
  chama `workflow:next`.
- Tela cheia continua sendo o checkbox do modal de anexos. O Palco só passa a
  mostrar a mídia pública no quadro e a abrir a tomada pelo botão da página.
- Anexo privado não pinta o arquivo na camada capturada; link mostra o host no
  quadro e abre no painel "só você".
