---
slug: pontos-aninhados
status: done
owner: dev
created_at: 2026-08-25
updated_at: 2026-08-25
classification: MICRO
risk: medium
source: direct-user-request
depends_on: editor-bloco-modal
budget_override: approved-by-user
---

# Simple Plan - Sub-itens de ponto em até 3 níveis

## Scope
Dar profundidade ao ponto do bloco: cada ponto ganha um nível de 0 a 2, editável
por recuar/avançar na linha do editor e desenhado com recuo no Palco. A ordem de
revelação da live não muda.

## Decisão de produto já tomada (usuário, 2026-08-25)
- **Sub-ponto é passo igual.** A lista continua uma sequência plana em ordem de
  profundidade (pai, depois filhos). O avanço revela e marca um por vez, exatamente
  como hoje. `src/features/stage/beats.ts` **não muda**: `doneCount`,
  `revealedBeats`, `currentBeat`, `beatToAdvance` e `beatToRewind` já operam sobre
  o array plano e continuam corretos. O nível é estrutura visual, não regra de fluxo.
- **3 níveis** (`depth` 0, 1 e 2). O teto de 30 pontos por bloco continua contando
  o total, sem distinção de nível.

## Context selected
- context:brief (dev/planning) — must_load: `form-fields-masks-and-validation`
  (erro inline nomeando o que falta, com `aria-invalid`), `source-code-language-convention`
  (`depth` em inglês no código; "nível" só no texto de interface), `output-brevity`,
  `simple-plan-lane`.
- Existing pattern to follow: `position`. Hoje o formulário não administra posição —
  a gaveta manda a lista inteira e `replaceBeats` grava o índice do envio como
  `position`. `depth` entra pelo mesmo caminho: campo escrito pelo cliente, gravado
  na reescrita completa, validado no servidor antes de qualquer escrita.
- Applicable rule/doc: `.aioson/rules/simple-plan-lane.md`;
  `.aioson/learnings/gotchas/backup-de-migracao-em-wal-copia-um-banco-vazio.md`
  (a migração nova cai no caminho de backup que já faz checkpoint antes de copiar —
  nada a fazer, só não regredir);
  `.aioson/learnings/gotchas/tres-defeitos-que-so-o-e2e-pegou.md` (id de rascunho
  do cliente nunca vira chave primária — `replaceBeats` já trata; a inserção com
  `depth` não pode reabrir isso).

## Implementation intelligence
- Framework leverage / boundary: **lista plana + `depth`, sem `parent_id`.** O pai de
  um ponto é o ponto anterior mais próximo com `depth` menor. Isso mantém
  `replaceBeats` e `copyBeats` com a mesma forma que já têm (reescrita ordenada por
  índice), mantém `listByOwners` com o mesmo `ORDER BY position, rowid`, e não cria
  chave estrangeira nova nem risco de órfão no banco. `parent_id` exigiria reescrever
  as três funções do repositório, o `copyBeats` para o Acervo teria de remapear ids,
  e nada disso compra comportamento.
- Migração aditiva `version: 4`,
  `ALTER TABLE beats ADD COLUMN depth INTEGER NOT NULL DEFAULT 0`.
  Ponto existente nasce no nível 0 — a leitura antiga continua idêntica.
- Validação de árvore em `shared/validation/beat.ts` (`BEAT_MAX_DEPTH = 2`):
  `depth` inteiro em `[0, BEAT_MAX_DEPTH]`; o **primeiro** ponto é obrigatoriamente
  nível 0; um ponto pode estar no máximo um nível abaixo do anterior (proíbe o salto
  órfão 0 → 2). Erro por linha em `beats.{index}.depth`, com copy nomeando o
  problema, no mesmo formato que `beats.{index}.text` já usa.
- Reuse over custom code — **normalizar em vez de mover subárvore.** No editor,
  recuar/avançar alteram só o `depth` da própria linha; depois de qualquer recuo,
  avanço, mover ou remover, uma passada `normalizeDepths` limita cada ponto a
  `depthAnterior + 1` (e o primeiro a 0). Isso dá o comportamento de subárvore de
  graça: avançar um pai empurra os filhos junto (eles ficam presos em `pai + 1`),
  recuar um pai mantém os filhos um nível abaixo dele, e remover um pai sobe os
  filhos um nível. Nenhum código de árvore, nenhum órfão possível, e o cliente só
  manda listas que o servidor aceita.
- Palco: `StageBeats` renderiza `data-nivel={beat.depth}`; o recuo e o degrau de
  tamanho de fonte por nível ficam em `stage.css`. `.pontos-palco` já tem
  `max-width: 900px` e o texto usa `clamp(17px, 2.1vw, 27px)` — o nível 2 precisa
  de um degrau menor para não estourar a faixa em janela baixa
  (ver `gotchas/palco-transborda-em-janela-baixa.md`).

## Done criteria
- No editor, cada linha de ponto tem avançar e recuar nível, desabilitados quando o
  movimento seria inválido, e o recuo visual da linha corresponde ao nível.
- Salvar e reabrir o bloco devolve os pontos com os mesmos níveis.
- No Palco, um sub-ponto aparece recuado sob o pai, e o avanço continua marcando
  um ponto por vez na ordem de cima para baixo — inclusive atravessando níveis.
- `POST`/`PUT` de bloco com `depth` fora de `[0,2]`, com o primeiro ponto em nível
  maior que 0, ou com salto de mais de um nível, responde 422 com erro de campo e
  **não** escreve no banco.
- Promover um bloco para o Acervo e voltar dele preserva os níveis (`copyBeats`).
- Banco existente abre sem perda: pontos gravados antes da migração viram nível 0.

## Useful options considered
- Include now: `normalizeDepths` no cliente (acima); desabilitar avançar na primeira
  linha e quando já está em `BEAT_MAX_DEPTH`; teste de unidade provando que a ordem
  de revelação com níveis é idêntica à de hoje.
- Defer: recolher/expandir uma subárvore no editor; arrastar para reordenar com
  nível; numeração hierárquica (1., 1.1, 1.1.1) no Palco.
- Escalate: **nada, dada a "Decisão de produto já tomada".** Se depois o desejo
  virar "o pai é só um título e o avanço pula ele", isso muda o fluxo da live e
  sai deste lane — vira @product.

## Out of scope
- Concha modal, seções e imagem opt-in do editor — plano `editor-bloco-modal`.
- Qualquer mudança em `beats.ts`, nas teclas do Palco (`useStageShortcuts`) ou no
  relatório/trajeto (`run_steps` não guarda ponto).
- `parent_id`, ordenação por árvore no SQL, ou API nova de ponto.

## Expected files
- `server/src/db/migrations.ts` — behavior (migração 4, coluna `depth`)
- `server/src/repositories/beatRepository.ts` — behavior (`toBeat`, `replaceBeats`, `copyBeats`)
- `shared/types.ts` — behavior (`Beat.depth`)
- `shared/validation/beat.ts` — behavior (`BEAT_MAX_DEPTH`, validação de árvore)
- `src/features/board/BeatFields.tsx` — behavior (avançar/recuar, `normalizeDepths`, recuo)
- `src/features/stage/StageBeats.tsx` — behavior (`data-nivel`)
- `src/features/board/board.css` — support (recuo da linha no editor)
- `src/features/stage/stage.css` — support (recuo e degrau de fonte por nível)
- `tests/api/blocks.test.ts` — support (persistência de `depth`; rejeição dos três casos inválidos)
- `tests/unit/beats.test.ts` — support (ordem de revelação inalterada com níveis)
- `tests/e2e/board.spec.ts` — support (criar sub-ponto, salvar, ver recuado no Palco)

Não mudam: `blockService.ts` e `libraryService.ts` (repassam `validateBeats` →
`replaceBeats` sem tocar em campo de ponto) e `http/apiCatalog.ts` (a descrição de
`beats` já é genérica).

Orçamento: 6 arquivos de comportamento, 11 caminhos, 4 módulos (`server/db`,
`server/repositories`, `shared`, `features/board` + `features/stage`).
**Acima do teto do lane** (5 comportamento / 8 caminhos / 2 módulos) e dentro do
teto MICRO (10 / 15). Estouro aprovado pelo usuário em 2026-08-25 após revisão de
escopo. Motivo causal: uma capacidade só — profundidade no ponto — que atravessa a
persistência porque `depth` precisa sobreviver ao recarregar, e atravessa o Palco
porque a profundidade só tem sentido se for visível no ar. Não há decisão de
produto ou arquitetura em aberto: o comportamento na live foi fixado acima e a
forma dos dados reusa `position`.

## Verification
- `pnpm test` (vitest: `tests/api/blocks.test.ts`, `tests/unit/beats.test.ts`)
- `pnpm build`
- `pnpm test:e2e tests/e2e/board.spec.ts tests/e2e/stage.spec.ts`
- Migração contra banco existente: abrir o app sobre um `clave.db` com pontos
  gravados antes da coluna e conferir que todos leem nível 0 e que o `.bak` da
  migração contém os dados (não um banco vazio — `gotchas/backup-de-migracao-em-wal...`).
- Smoke pelo caminho de produção: Bancada → editar bloco → avançar nível num ponto
  → `Salvar` → `Entrar no ar` → o sub-ponto aparece recuado e o avanço passa por ele.

## Session state
Next step: migração 4 + `Beat.depth` + `beatRepository`, provando a ida e volta no
`tests/api/blocks.test.ts` antes de encostar na interface.

## Notes
- **Correção ao plano.** A seção "Implementation intelligence" afirmava que
  `normalizeDepths` daria o comportamento de subárvore de graça. Está errado: o
  limite `anterior + 1` é **teto**, não igualdade. Com ele sozinho, avançar um pai
  deixaria o filho parado e o filho viraria irmão do próprio pai. Avanço, recuo,
  subir e descer passaram a operar sobre a subárvore inteira (`subtreeEnd` e
  `previousSiblingStart`, dois helpers de três linhas). `normalizeDepths` ficou
  como rede de segurança depois de remover uma linha.
- Consequência em `↑`/`↓`: eles movem o ponto com os filhos e trocam de lugar com
  o **irmão**, então ficam desabilitados quando não há irmão naquela direção — e
  não só nas pontas da lista, como antes. Sem isso, descer um pai o trocaria de
  lugar com o próprio filho.
- Migração 4 precisou ser idempotente. `ALTER TABLE ... ADD COLUMN` não tem
  `IF NOT EXISTS` no SQLite, e o teste `AC-clave-40` volta o `user_version` para 0
  e re-roda tudo — as migrações 2 e 3 já eram re-rodáveis por `CREATE TABLE IF NOT
  EXISTS`. Um `PRAGMA table_info(beats)` antes do `ALTER` faz o mesmo papel.
- Acréscimo dentro do escopo: ponto novo nasce irmão do último (`emptyBeat(depth)`),
  em vez de sempre no nível 0. Escrever uma lista de sub-pontos não devia exigir
  recuar cada linha.
- Caminhos além dos previstos (3 de suporte): `tests/e2e/stage.spec.ts` para provar
  o recuo e o avanço atravessando níveis no Palco — o plano listava o critério mas
  não o arquivo —, e `tests/e2e/helpers.ts`, que semeia nível e que o Plano A tinha
  deixado latentemente quebrado (ele preenchia o campo de imagem do ponto, agora
  opt-in, sem clicar no `+`). Total real: 7 de comportamento, 14 caminhos —
  dentro do teto MICRO (10 / 15).

## Evidência
- `npx vitest run` — **159/159**, incluindo os casos novos de rejeição
  (`depth` 3, `depth` 1.5, primeiro ponto em nível 1, salto 0→2) e a ida e volta
  pelo acervo preservando `[0,1,2,0]`.
- `npx playwright test` — **69/69**, com o teste novo do editor (aninhar, teto de
  três níveis, recuo carregando o filho, descer movendo a subárvore, nível
  sobrevivendo ao salvar) e o do Palco (recuo visível, `aria-level`, sub-ponto
  como passo seguinte e não revelado junto).
- `pnpm build` — limpo; `server/dist` regerado, que é o que o Play roda em
  modo marketplace.
- Migração contra o banco real do preview: todos os pontos gravados antes da
  coluna leem `depth: 0` pela API. `data/clave.db.bak` ficou com 118784 bytes,
  o mesmo tamanho do banco vivo — o checkpoint antes da cópia funcionou e o
  `.bak` não é um banco vazio.
- Smoke no preview do Play sobre o bloco real "Aioson Copy", sem salvar: níveis
  `0,0,0,0 → 0,1,2,0`, avançar desabilitado no teto e no primeiro ponto, recuo
  visual das linhas em `325 / 349 / 373 / 325`, `Esc` fechando sem gravar.
