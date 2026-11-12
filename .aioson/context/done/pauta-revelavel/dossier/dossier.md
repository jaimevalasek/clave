---
feature_slug: pauta-revelavel
schema_version: "1.2"
created_by: dossier-init
created_at: 2026-11-11T06:33:26.796Z
status: active
classification: MEDIUM
last_updated_by: dossier-init
last_updated_at: 2026-11-11T06:33:26.796Z
bootstrap_hash: 04a4d0e3b93e
---
## Why

_(não encontrado — preencher manualmente)_

## What

A Pauta revelável inteira, substituindo a superfície do Clave:

1. **Pautas e coluna**: lista de pautas, coluna única, régua, salvamento automático (CAP pautas, coluna).
2. **Entrada**: digitar, colar, soltar, dividir texto, lista como hierarquia, falhas de mídia (CAP entrada).
3. **Revelação**: planejado × progresso, PgDn/PgUp, olho, tópico inteiro, preparo, nova tomada, rolagem (CAP revelar).
4. **Mídia**: imagem, vídeo e áudio no bloco, tocando no comando (CAP mídia).
5. **Formatação e sub-itens**: tamanhos com ajuste, cor e negrito por trecho, Tab e Shift+Tab, marcador, linha-guia, recolher (CAP formatação, sub-itens, organizar).
6. **Aparência**: 5 temas, destaque, fundo (CAP aparência).
7. **Migração e limpeza**: pautas antigas convertidas, modelo de live retirado (CAP migração).
8. **Tour e Play**: tour novo e contrato do Play (CAP tour, play).

## Code Map

```yaml
files: []
modules: []
patterns: []
```

## Rules & Design-Docs aplicáveis

_(populado via dossier:link-rule)_

## Agent Trail

_(18 older Agent Trail entries, 2026-11-11 to 2026-11-11, are in [dossier-trail-archive.md](dossier-trail-archive.md); phases they name: 1, 2, 3, 4, 5, 6. Read it for an earlier phase's evidence, verdict or decision.)_

<!-- sha256:7f88a44959b2ca949d637b80e1684c2369cd849285ff43f5934d5e9b84cc0484 -->
**2026-11-11T19:10:29.057Z** | @dev | _Agent Trail_

Phase 5 implemented: CAP formatacao/aparencia/coluna — AC-35, 36, 37, 38, 46, 08 (Aparência on the ruler), 53 (sizes by Tab after Esc), 54 (bars wrap at 360px, 44px targets). Paths: shared/types.ts (THEME_IDS, GRADIENT_IDS, Background, Preferences, isHexColor), shared/validation/preferences.ts (new: parseBackground, isThemeId, shared by service and repository read), shared/textMarks.ts (applyMark, clearMarks, isRangeBold by offset); server/src/{repositories/preferenceRepository (theme/accent/background JSON, accent null deletes the row, hand-edited rows fall back to default),services/preferenceService (422 per field, nothing written on any error; image must exist in media folder),http/apiCatalog}.ts; src/features/appearance/{themes (5 palettes + 6 text colors per theme from identity.md, 3 gradients),contrast,applyAppearance,appearanceStore (new: serial PUT, 250 ms debounce, 5 s retry),AppearancePanel,appearance.css}; src/main.tsx (default palette on :root before first paint), src/App.tsx (loadAppearance in boot, panel mounted once); src/ui/tokens.css (palette removed: themes.ts is the single source); src/core/api.ts (mediaUrl moved from MediaBlock); src/features/sheet/{SizeBar,FormatBar,formatOps (new),format.css (new, split from sheet.css),domText (selectionOffsets/selectOffsets),TextBlockEditor (Ctrl+B, Ctrl+I/U blocked, selection restored after a mark),sheetStore (focusRequest.selection, replaceText extra),useBlockActions (resize/adjustFont + range toast),useSheetShortcuts (Ctrl+Alt+1-4 / −/= by event.code in capture),SheetBlock,SheetColumn (FormatBar),SheetRuler (Aparência)}; vocabulary.ts. Verification: vitest 245/245 (themes 14 new, textMarks +7, preferences rewritten in English 10); playwright full suite 67/67 (formatting 5, appearance 3 new); pnpm build OK; rules:check RULES=OK (LOW nowIso stays for Phase 6); ac:test-audit: 35-38, 46, 53, 54 covered, AC-39 citation moved next to its assertion (now covered); harness:check 4/4. Production smoke: pnpm build + pnpm start 5280/3380 (AIOSON_APP_DIR=test-results/prod-smoke-f5), browser:run format-and-appearance.json PASS 71/71 — Título 52px with 58.24px line height and block height on the 44px step, A+ 56, A− to 44 disabled, Ctrl+Alt+= 48, P resets to 22, Ctrl+Alt+4 back to Título; 'vamos' red + Ctrl+B bold only on the passage, persisted and back after reload; Aparência: Porcelana applies at once (body rgb(241,237,227), red text rgb(191,61,71)), pale accent warns below 4,5:1, 'Usar a do tema', Gradiente 2, image uploaded through POST /api/media 201 and PUT /api/preferences 200, veil 0.9 kept, holds in a new rundown and after a fresh boot. Screenshots desktop/360px checked. Defect found and fixed: SizeBar placed before the text broke the Shift+Tab path to the trash (organize.spec AC-44/-53); it now follows the text in DOM order (still drawn above). Deviations: none of product; technical: appearanceStore.ts, formatOps.ts, format.css and shared/validation/preferences.ts are new files outside the plan list; the size bar hides while a passage is selected so the two bars never overlap.

<!-- sha256:6e45d8598909e99c25ecce1a16b72499ef56e0a378766daca4a3185affd0a9a7 -->
**2026-11-11T19:10:39.410Z** | @dev | _Agent Trail_

Phase 5 closed; next: phase 6. Decisions not on disk: Palette lives only in src/features/appearance/themes.ts: tokens.css has no colors, main.tsx applies the default before the first paint and App boot awaits loadAppearance (a failed GET falls back to the default, never blocks). The Appearance panel is an aside, not a modal: sheet keys keep working; Esc closes it in a capture listener and focus returns to the opener. F6 tour step 'aparência' should target data-aioson-tour="appearance" on the ruler button. SizeBar must stay after the text in DOM order (Shift+Tab to the trash, Esc+Tab to the sizes). Formatting rebuilds the editor from the model and restores the passage through focusRequest.selection; offsets come from domText (a <br> counts 1). Size keys use event.code (AltGr layouts type ¹²³ on Ctrl+Alt+digit). Walkthroughs: browser:run has no file or selection step, so format-and-appearance.json sets a Range and input.files via DataTransfer in eval and resets /api/preferences first (a stopped run leaves the theme on disk). Smoke app dir prod-smoke-f5 used; F6 needs a fresh name. AC-47 citation is weak in legacyImport.test.ts (OBS-c27957) and AC-50 is F6: ac:test-audit --strict stays BLOCKED on them until F6.

<!-- sha256:e79322b0f6404c2c6e0ba8018f8ea957990eed94417c4e90092818db45078721 -->
**2026-11-11T19:14:06.227Z** | @dev | _Agent Trail_

Phase 6 preflight: CAP tour/play/migracao/pautas/coluna; AC-50, 51, 56, 08 (Como usar), 53 (tour traps focus); trace gaps 0; retire paths clean in git status (committed in 398a288). Write paths: server/src/{app,http/apiCatalog,routes/rundowns,services/rundownService,repositories/rundownRepository}.ts; shared/types.ts; retire live routes/services/repositories/shared validation/tests per Implementation Delta F6; src/features/guide/{GuideLayer,TourOverlay,guideContent,guide.css} (+ tourStore.ts new: lets the ruler reopen the tour), GuidePanel.tsx retired; src/features/sheet/{SheetRuler (Como usar + data-aioson-tour reveal/preparation),SheetColumn (data-aioson-tour sheet/paste + data-aioson-primary)}; src/App.tsx; src/core/vocabulary.ts; tests/api/platform.test.ts, tests/e2e/{platform,tour}.spec.ts, tests/e2e/fixtures.ts; walkthrough first-open.json. Focused check: pnpm vitest run tests/api/platform.test.ts + pnpm playwright test tour/platform. Smoke: pnpm build + pnpm start 5280/3380 (AIOSON_APP_DIR=test-results/prod-smoke-f6) + browser:run first-open.json. Prototype binding current (prototype.html PASSOS/abrirTour).

<!-- sha256:de46c24475565f68558dd6228691681ad8d4c5669453f83422b56ed899ae2bdf -->
**2026-11-11T19:31:27.242Z** | @dev | _Agent Trail_

Phase 6 implemented: CAP tour/play/migracao/pautas/coluna — AC-50 (5-step tour with spotlight: sheet, reveal, paste, preparation, appearance; Pular/Próximo/Começar; Esc; opens once on the first sheet on screen, tourSeen on disk; 'Como usar' on the ruler reopens from step 1), AC-51 (catalog = 15 routes, no runs/report/library/blocks/beats/open-url, no GET /api/rundowns/:id), AC-56 (network log: every request same host, Inter + JetBrains Mono from /fonts, media from /api/media), AC-08 (full ruler incl. 'Como usar'), AC-53 (tour traps focus, sheet keys inert behind it, focus back to the opener). Paths: server/src/{app (4 routers),http/apiCatalog,routes/rundowns,services/rundownService,repositories/rundownRepository (summary without live fields)}.ts; shared/types.ts (live types gone, RundownKind kept: kind stays optional in the API); retired 26 files per Implementation Delta F6 (live routes/services/repositories, shared/track + 4 validations, 6 test files) and GuidePanel.tsx; src/features/guide/{GuideLayer,TourOverlay,guideContent,guide.css,tourStore (new)}; src/features/sheet/{SheetRuler (Como usar + data-aioson-tour reveal/preparation),SheetColumn (data-aioson-tour sheet/paste + data-aioson-primary)}; src/App.tsx; src/core/vocabulary.ts (COPY.tour, howToUse); src/ui/fonts.css comment; tests/api/platform.test.ts (rewritten in English, 13), tests/e2e/{tour.spec.ts (new, 6),platform.spec.ts (+AC-56),fixtures.ts}; tests/api/legacyImport.test.ts (AC-47 on it() titles, OBS-c27957 fixed); walkthrough .aioson/qa/walkthroughs/pauta-revelavel/first-open.json. Verification: vitest 168/168; playwright full 74/74; pnpm build OK; migrate-check v6 OK; smoke-boot OK (15 routes); harness:check 4/4; rules:check RULES=OK 0 violations; ac:test-audit --strict PASS (57/57 covered). Production smoke: pnpm build + pnpm start 5280/3380 (AIOSON_APP_DIR=test-results/prod-smoke-f6), /api/aioson-play lists 15 routes, browser:run first-open.json PASS 60/60 (list without tour, tour on the first rundown created, spotlight framing per step, Tab wraps in the card, PageDown inert behind it, Começar writes tourSeen, no tour after reload, Como usar reopens, Esc returns focus, catalog and resource-origin checks); screenshots of steps 1, 2, 3, 5 checked against the prototype. Not run here (needs a human in the Play dev-link): the real script recorded with OBS (paste text/list/media, format, indent, reorder, PageDown/Shift+PageDown, Ctrl+Enter, new take, restart) plus the F4 pending Explorer drop/print paste/R2 spike. Deviations: none of product; technical: tourStore.ts is a new file (lets the ruler reopen the tour); SheetColumn.tsx got the two tour anchors though outside the F6 modify list; a missing anchor shows the card centered over a full veil instead of skipping the step. Open: OBS-246f13 (question: prototype list header has Como usar/Aparência, the shipped list does not), OBS-6f24c9 (risk, for QA).

<!-- sha256:42c818ce4156af411903d719ba9ed01844d7b70d073f8ee04a3d70cf7b263d0b -->
**2026-11-11T19:31:27.648Z** | @dev | _Agent Trail_

Phase 6 closed; implementation complete (phases 1-6). Decisions not on disk: the tour opens by itself only when a sheet is ready on screen and tourSeen is false (GuideLayer watches useSheet status), so a fresh install sees it on the first rundown created, never on the list; closing by any exit writes tourSeen best effort (a failed PUT shows it again next boot). Tour Esc goes through useFocusTrap (capture, stopPropagation); the appearance panel's Esc yields to any role=dialog. Anchors: data-aioson-tour sheet/reveal/paste/preparation/appearance. Smoke dir prod-smoke-f6 used.

<!-- sha256:0382b1759fa6bd2c091b12002ee6f661691cc591f2867e7cc9d1af48ba746c24 -->
**2026-11-11T19:36:16.089Z** | @dev | _Agent Trail_

Phase 6 closed; next: QA. Decisions not on disk: Tour opens by itself only when a sheet is ready and tourSeen is false (never on the list); any exit writes tourSeen best effort. workflow:next --complete=dev is blocked by the harness validation gate (progress.json waiting_validation) although harness:check is 4/4 and verification:plan skips validator: OBS-2292af. Tour CSS aligned to the 4px grid after agent:done flagged off-grid spacing; the remaining visual warnings are cumulative (risk OBS for QA).

<!-- sha256:48cf40d685b9025c145e2798fce13b9342293d6ee3d12534d9611a0dd3b5463f -->
**2026-11-11T19:55:04.345Z** | @qa | _Agent Trail_

QA verdict: PASS (independent session). CAP/AC evidence: 12/12 CAP, 57/57 AC PASS — vitest 168/168, playwright 74/74, QA walkthroughs on pnpm build + pnpm start over a copy of the real v5 data (qa-production-smoke 120/120, qa-paste-production 23/23, qa-capture-check 6/6); real-data migration v5->v6 verified (WAL in .bak, old tables kept, idempotent on restart); independent WCAG contrast min 4.67:1. Production smoke: PageDown on the migrated rundown -> PUT /api/rundowns/:id/sheet 200 -> counter 0->1 de 5, progress survives reload and process restart; injected PUT failure keeps the screen and retries in 5 s. Gate D approved. Blockers: none. Carried (non-blocking): OBS-6f24c9 (Low, confirmed), OBS-246f13 (product question), OBS-e8705f (advisory; 'unused effects' part is a false positive). workflow:next --complete=qa blocked by the harness contract validation (OBS-2292af): needs a @validator verdict in .aioson/plans/pauta-revelavel/last-validator-output.json.

<!-- sha256:ad878db178e8abaf257351aeecebcb1fb7bece336ebe28fa6c3ba72cfa6aeb9a -->
**2026-11-11T23:59:52.117Z** | @validator | _Agent Trail_

Validator verdict: overall_score=1, ready_for_done_gate=true. Failures: none (harness:check 2026-11-11T23:59:06Z, 4/4, integrity ok). An earlier run at 23:51Z failed RG-smoke (exit 1, spec unknown) and passed on 2 re-runs: OBS-da8480 flaky e2e, OBS-4e7c83 harness stdout truncation on Windows.

## Revision Requests

_(vazio)_
