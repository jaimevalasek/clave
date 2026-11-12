---
slug: palco-links-navegador
status: done
owner: dev
created_at: 2026-09-20
updated_at: 2026-09-20
classification: MICRO
risk: low
source: direct-user-request
---

# Simple Plan - Links de anexo abrem no navegador

## Scope
No Palco, um anexo do tipo `link` (e um `file` cuja origem já é http/https)
abre no navegador do sistema ao clicar **abrir**. O webview do Play não segue
`target="_blank"`; o backend do app pede ao SO para abrir a URL.

## Context selected
- context:select / fallback evidence: `context:brief` (dev/executing) — must_load
  `source-code-language-convention`, `disk-first-artifacts`, `output-brevity`.
  ProductBridge (`localhost:5180`) não expõe endpoint de abrir URL.
- Existing pattern to follow: `openAttachment` em `StagePage` já ramifica por
  tipo (copiar vs tomada vs painel). `api.post` same-origin. Catálogo
  `API_ENDPOINTS` precisa listar a rota nova (`tests/api/platform.test.ts`).
- Applicable rule/doc: `.aioson/rules/simple-plan-lane.md`,
  `.aioson/rules/security-baseline.md` SEC-SBD-06 (allowlist de scheme),
  `.aioson/rules/implementation-structure-and-data-access.md` (rota fina,
  lógica no service). Feature `palco-carrossel-anexos` no pulse é outro
  trabalho; este plano não chama `workflow:next`.

## Implementation intelligence
- Framework leverage: `URL` nativo para normalizar; `child_process.spawn`
  (`cmd /c start`, `open`, `xdg-open`) sem pacote `open`. Express JSON +
  `HttpError`/`validationFailed` já usados nas outras rotas.
- Structure and data boundary: validação e spawn no service
  `server/src/services/openUrl.ts`; rota só lê `body.url` e responde.
  O Palco não pinta o link na camada capturada — só dispara a abertura.
- Reuse over custom code: `isWebUrl` para decidir o ramo `file`; flash do
  Palco para confirmar ou nomear a falha.

## Done criteria
- **abrir** num anexo `link` no Palco chama `POST /api/open-url` e não abre o
  painel "só você" nem a tomada.
- Só `http:`/`https:` sem credenciais, até 2048 caracteres; `javascript:`,
  `file:`, `data:` e scheme desconhecido voltam 422.
- Flash confirma a abertura ou nomeia a falha.
- Verificação listada abaixo passa.

## Useful options considered
- Include now: abrir direto no **abrir** (sem segundo clique no `<a>`);
  `file` com URL web no mesmo ramo; opener injetável nos testes.
- Defer: iframe do site no quadro; tornar o cartão inteiro clicável; trocar o
  `<a target="_blank">` residual do painel/tomada (o Palco deixa de usá-lo
  para `link`).
- Escalate: nada. Não há decisão de produto — o anexo link já existia e a
  ação esperada é abrir no navegador.

## Out of scope
- Workflow da feature `clave` / `palco-carrossel-anexos`.
- Embed de página no Palco.
- Abrir arquivos locais no aplicativo do SO.

## Expected files
- `server/src/services/openUrl.ts` (behavior)
- `server/src/routes/openUrl.ts` (behavior)
- `src/features/stage/StagePage.tsx` (behavior)
- `server/src/app.ts` (support)
- `server/src/http/apiCatalog.ts` (support)
- `tests/api/openUrl.test.ts` (support)
- `tests/e2e/attachments.spec.ts` (support)

## Verification
- `pnpm exec vitest run tests/api/openUrl.test.ts tests/api/platform.test.ts` — 13 passed
- `pnpm exec playwright test tests/e2e/attachments.spec.ts` — 6 passed
- `pnpm exec tsc --noEmit -p tsconfig.json` — passed
- `aioson rules:check . --changed` — 0 violations

## Session state
Next step: done.

## Notes
- SSRF de faixa privada é N/A: o servidor não busca a URL; só pede ao SO
  para abrir no navegador do apresentador.
- Prototype binding: none — Palco de produção em `StagePage.tsx`.
- O preview do Play que já estava no ar ficou sem API (proxy 500); o e2e
  subiu o entrypoint de produção à parte e passou. Reabrir o Clave no Play
  para pegar o backend novo.
