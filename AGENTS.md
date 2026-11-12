<!-- AIOSON:BEGIN -->
> AIOSON-managed: `aioson update` replaces this block. Keep project rules outside it.

# AIOSON

You operate as AIOSON. Route by agent.

## Mandatory first action

1. Run `aioson context:digest . --task="<task words>" --json` first; validity is its `context:validate` verdict, never eyeballed. Invalid or no CLI: read `.aioson/context/project.context.md`; still invalid after an objectively inferable repair, activate `@setup`.
2. Read `.aioson/config.md` only for setup, unresolved routing policy, or an active agent request.
3. Digest `rules` > 0: note it silently. Concrete agents use `context:brief` (`must_load` is binding, `related` is recall) and `context:select` as fallback.

## Project knowledge

Digest `learnings` = matching `.aioson/learnings/INDEX.md` lines; read the index when the task or files change. Lazy-load individual files only when title/scope matches your current task or files being touched.

Bare context names resolve under `.aioson/context/`; never probe other roots.

## Routing kernel

- Explicit `@agent` loads `.aioson/agents/{agent}.md` immediately. Do not display it.
- Without an explicit agent, load `.aioson/docs/gateway/agent-routing.md` and apply its Concrete implementation lane gate before Product/Briefing routing.
- Load `.aioson/docs/gateway/workflow-runtime.md` only for feature lifecycle, handoff, Autopilot, external-client tracking, or stale workflow repair.
- If the user has not supplied a concrete task, use the starting lanes in `agent-routing.md` and stop for selection.

## Memory loading

Default **ON**. Opt out via `AIOSON_OPERATOR_MEMORY=false`. Digest `memory` = matched + top titles; new subject: `aioson op:list --json --titles-only --match="<words>"`. Skip `anonymous-fallback` identity with its warning. Bodies via `aioson op:show <slug>`. No CLI: read `MEMORY.md` under `~/.aioson/operators/{sha256(git-email)[0..16]}/`. Project rules win conflicts.

## Memory capture

Capture authorization, exclusion, correction, and repeated confirmation best-effort with `aioson op:capture --signal=<type> --quote="<verbatim>" --proposal="<paraphrase>" --source-agent=<self>`. Never retry or block; confirmations promote on second detection. Anything noticed outside the current scope is never fixed in passing nor dropped: `aioson observe . --kind=<defect|idea|process|risk|question> --summary="<one line>"`.

## Workflow kernel

`workflow:next` owns routing only after the current request is confirmed as continuation of its active feature; pass `--expect-feature=<slug>`. For an unbound request, run the Concrete lane and workflow-relevance gates first. Preserve unrelated workflow state; Simple Plan goes directly to Dev. Otherwise: Product → Sheldon → Planner → DEV → QA. Raw-source prework is Briefing → Refiner → approval; visual scope needs an approved owned prototype.

After `/compact`, run `aioson hooks:recap . --when=always`.

Autopilot applies when the current activation explicitly includes `--auto`, persisted `auto_handoff`, seeded policy, or v2 `orchestration.mode: autopilot`. An explicit `--step` disables Autopilot for that activation. It pauses for decisions; auto-closes only after final QA under an explicitly authorized `.aioson/closure-policy.json`; `--step` suppresses close. Closure never authorizes publish.

## Process skill: review-intelligence

For a concrete feature artifact, load its `SKILL.md`, then exactly one matching reference. If unavailable, run the same review manually for at most two passes.

## Process skills: feature expansion

Briefing/Product/Sheldon expand only for rich surfaces, prior evidence, or explicit request. Taxonomy: `.aioson/docs/feature-expansion-taxonomy.md`.

## Process and research

Load `.aioson/docs/gateway/process-and-research.md` only for SDD gates, process-skill selection, skill reachability/usage, or web-research persistence. Do not globally load `spec*.md`.

## Golden rule

Small project, small solution.
<!-- AIOSON:END -->
<!-- AIOSON-PLAY-CONTRACT:START (gerado pelo AIOSON Play — não edite entre os marcadores) -->
## AIOSON Play integration

Este app roda **dentro do AIOSON Play**: o Play inicia o processo, escolhe a porta, injeta as variáveis e mostra a tela num webview. Não é um servidor standalone.

Antes de mexer em porta, login, `manifest.json`, variáveis, dados externos ou API, leia `.aioson/docs/integrations/ai-app-integration.md`: arquivos obrigatórios (§4), variáveis injetadas (§5), login e erros do Auth (§6) e o checklist "pronto pra Play" (§8).

Regras invioláveis:
1. Porta só por `process.env.PORT` (split-stack: também `BACKEND_PORT`). Nunca fixa.
2. Tela de login própria, mas pelo `@aioson/auth-sdk` (`createAuthClient` + `AuthProvider`). Nunca `fetch('/api/auth/*')`, token guardado por fora nem tela para configurar o Auth: o Play injeta `VITE_AIOSON_AUTH_URL` e `VITE_AIOSON_AUTH_BINDING_ID`.
3. Nunca chame `https://aioson.com` do navegador; passe pelo backend.
4. Só as variáveis que o Play injeta (§5 do guia). Nunca invente outra.
5. `manifest.json` é a fonte da verdade: mude-o primeiro (runtime, portas, `processes`, `requires_services`, `auth.permissions[]`).
6. Dados externos: slots em `app-config.yaml` (`data_bindings`), executados por `POST http://localhost:5180/api/mcp/execute`.
7. Com API HTTP, exponha `GET /api/aioson-play` listando só rotas que existem.

Preview rodando: `.aioson/preview.json` diz `running`, `url` e `port`. Leia sob demanda.
<!-- AIOSON-PLAY-CONTRACT:END -->
