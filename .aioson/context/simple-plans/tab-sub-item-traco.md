---
slug: tab-sub-item-traco
status: done
owner: dev
created: 2026-11-12
---

# Tab no começo de uma linha nova vira sub-item com traço

## Objetivo

Na Bancada, Enter + Tab numa linha nova de um texto cria um sub-item abaixo (com "–") sem mexer no bloco de cima; o marcador dos sub-itens passa de "•"/"◦" para "–".

## Pedido do dono (2026-11-12)

Escreveu "Tópico 01", Enter, Tab para criar um sub-item: o bloco inteiro recuou e ganhou a bolinha. Quer o item pai intacto e a linha de baixo recuada com um traço; traço como padrão no lugar da bolinha.

## Context selected

- `context:digest` válido (MICRO, pt-BR); feature pauta-revelavel fechada (QA PASS), sem feature ativa.
- Código: `TextBlockEditor.tsx` (Enter único = quebra de linha no mesmo bloco; Enter duplo no fim = bloco novo), `useSheetShortcuts.ts` (Tab recua o bloco inteiro), `structureOps.ts`/`sheetStore.ts` (`shiftBlock`, `continueAfter`), `SheetBlock.tsx` (`TreeMarks`).
- Testes: `tests/e2e/subitems.spec.ts`, `tests/e2e/paste.spec.ts` (marcadores), `tests/unit/textMarks.test.ts`.

## Implementation intelligence

- Padrão existente: `continueAfter` (novo bloco de texto, sub-item um tamanho abaixo, abre tópico recolhido) e `shiftBlock` (recusas `no-parent`/`too-deep` com toast em `useBlockActions`).
- Regra nova: Tab (sem Shift) com cursor recolhido no começo de uma linha que não é a primeira → o texto antes do cursor fica no bloco (sem a quebra final); o texto a partir do cursor vira o primeiro sub-item (profundidade +1, um tamanho abaixo), focado no início. Bloco já no nível 2 → toast "too-deep", nada muda. Qualquer outro Tab segue recuando o bloco inteiro (AC-40 intacto).
- Estrutura: helper de DOM em `domText.ts`, fatia de runs em `shared/textMarks.ts`, operação em `structureOps.ts`, ação+toast em `useBlockActions.ts`, roteamento do Tab em `useSheetShortcuts.ts`.

## Paths

- behavior: `src/features/sheet/useSheetShortcuts.ts`, `src/features/sheet/structureOps.ts`, `src/features/sheet/useBlockActions.ts`, `src/features/sheet/domText.ts`, `src/features/sheet/SheetBlock.tsx`
- support: `shared/textMarks.ts`, `tests/unit/textMarks.test.ts`, `tests/e2e/subitems.spec.ts`, `tests/e2e/paste.spec.ts`
- Revisão de escopo: 9 paths (>8) só por testes de apoio; um único resultado observável, sem promoção.

## Useful options considered

- include now: dividir na linha do cursor; "–" nos dois níveis de sub-item.
- defer: Shift+Tab numa linha do meio "subindo" só aquela linha (não pedido).
- escalate: nenhum.

## Done criteria / verificação

- `pnpm test` (unit) e `pnpm exec tsc --noEmit -p tsconfig.json` verdes.
- `pnpm exec playwright test tests/e2e/subitems.spec.ts tests/e2e/paste.spec.ts` verde, incluindo o novo caso Enter+Tab.

## Resultado (2026-11-12)

- Feito: `branchLine` (structureOps) + `caretAtLaterLineStart` (domText) + `sliceRuns` (textMarks); Tab roteado em `useSheetShortcuts`; marcador "–" em `SheetBlock`; `TextBlockEditor` zera o "Enter duas vezes" ao voltar o foco (evita que Enter no item pai crie bloco sem querer depois do Tab).
- `pnpm exec tsc --noEmit -p tsconfig.json`: ok. `pnpm test`: 14 arquivos, 170 testes ok.
- `pnpm exec playwright test tests/e2e/subitems.spec.ts tests/e2e/paste.spec.ts`: 12/12 ok (novo caso Enter+Tab, recusa no nível 3).
- Captura de tela conferida: tópico intacto, sub-itens com "–" em âmbar nos níveis 1 e 2.

## Ajuste 2 (2026-11-12)

- Retorno do dono: digitou a 2ª linha e deu Tab com o cursor no fim dela; o bloco inteiro recuou e o "Tópico 01" ganhou o traço.
- Correção: Tab com o cursor em qualquer ponto de uma linha que não seja a primeira divide o bloco no começo dessa linha (`caretOnLaterLine`), mantendo o cursor na mesma posição dentro do sub-item. Tab na primeira linha continua recuando o bloco inteiro.
- Verificação: tsc ok; `pnpm test` 170 ok; e2e subitems/paste/sheet/formatting 27/27 ok (novo caso "Tab depois de digitar a 2ª linha").

## Ajuste 3 (2026-11-12) — sub-itens funcionam como lista

- Retorno do dono: no 2.1 não deu; "está pulando linha"; Shift+Tab deveria voltar um nível; um traço em cada nível. Dados reais: `Teste 1.1\nTeste item 2` num bloco só (Enter quebrava a linha dentro do sub-item).
- Revisão de escopo: 7 arquivos de comportamento (> 5) por um único resultado observável (lista de sub-itens). Pedido direto do dono, sem promoção.
- Feito:
  - Enter num sub-item cria o próximo item no mesmo nível (primeiro filho se o item tem filhos); Enter num item vazio sobe um nível (até virar tópico); Shift+Enter quebra a linha dentro do item (`nextListItem`, `TextBlockEditor`). Nos tópicos (nível 0) o Enter segue o AC-11 (quebra; duas vezes = bloco novo).
  - Shift+Tab numa linha de baixo de um sub-item transforma essa linha num item um nível acima (`branchLine` com `delta`).
  - Sub-item ao subir/descer de nível adota o tamanho do item de cima no mesmo nível (`matchSiblings`); tópicos mantêm um tamanho por nível.
  - Fora do Preparo, sub-itens ficam colados na linha de cima (sem linha em branco); a barra de tamanhos do sub-item vai para a direita (`sheet.css`, `format.css`). No Preparo o espaço continua, para "recolher"/"começa oculto".
- Verificação: tsc ok; `pnpm test` 170 ok; `pnpm exec playwright test` (suíte inteira) 78/78 ok, com os casos novos "lista com Enter" e "Shift+Enter + Shift+Tab na linha". Capturas conferidas (viva e Preparo).
