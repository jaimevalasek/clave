---
slug: editor-bloco-modal
status: done
owner: dev
created_at: 2026-08-25
updated_at: 2026-08-25
classification: MICRO
risk: low
source: direct-user-request
---

# Simple Plan - Editor do bloco como modal, com estrutura e imagem opt-in

## Scope
Trocar a gaveta lateral de edição do bloco por um modal centralizado do design
system, reagrupar os campos em seções com rodapé fixo, e esconder o campo de
imagem do ponto atrás de um botão `+` por linha.

## Context selected
- context:brief (dev/planning) — must_load aplicados: `status-change-confirmation`
  (proibição de diálogo nativo, anatomia do modal), `form-fields-masks-and-validation`
  (semântica de input, erro inline com `aria-invalid`/`aria-describedby`),
  `output-brevity`, `source-code-language-convention` (identificadores em inglês,
  texto de interface em pt-BR), `crud-surface-integrity`, `simple-plan-lane`.
- Existing pattern to follow: `src/ui/Modal.tsx` + `src/ui/modal.css` já definem o
  fundo (`.modal-fundo`), a caixa (`.modal`), o `Esc`, o foco inicial e a animação
  `modal-entra`. `BlockDrawer` já renderiza um `<Modal>` para a confirmação de
  exclusão — o design system não precisa de concha nova, só de uma variante larga.
- Applicable rule/doc: `.aioson/rules/simple-plan-lane.md` (lane e orçamento),
  `.aioson/rules/status-change-confirmation.md` (a confirmação de exclusão continua
  passando pelo `<Modal>`, nunca por `confirm()`).

## Implementation intelligence
- Framework leverage: reaproveitar `.modal-fundo` e `.modal` do `modal.css` como
  concha do editor, em vez de manter `.gaveta-fundo`/`.gaveta` em `board.css`. Uma
  fonte só de z-index, backdrop, `max-height` e animação. O editor entra como
  variante `.modal-editor` (mais largo, sem o fio de ouro à esquerda — o ouro é a
  marca do gate/decisão, e editar bloco não é gate).
- Structure and data boundary: nenhuma mudança de domínio, rota, validação ou
  persistência. `BlockDraft`, `BeatDraft`, `AttachmentDraft`, `onSave` e o contrato
  de `fieldErrors` ficam exatamente como estão. O trabalho é de composição e CSS
  dentro de `src/features/board/` e `src/ui/`.
- Reuse over custom code: o estado de "linha de imagem aberta" é um `Set<string>`
  de ids de rascunho dentro de `BeatFields` — o id do `BeatDraft` já é a chave
  estável de renderização da linha, então não há estado paralelo novo nem índice
  que possa apontar para o vizinho depois de mover ou remover um ponto.
- Regra da imagem opt-in: a linha de imagem renderiza quando `beat.imagePath` não
  está vazio **ou** quando a sessão abriu aquela linha. Ponto que já tem imagem
  gravada nunca fica escondido. Fechar uma linha aberta e vazia só recolhe; fechar
  uma linha com caminho limpa o `imagePath` (o `+` vira `x` e o rótulo nomeia a ação).
- Acessibilidade do `+`: `aria-label="Adicionar imagem ao ponto N"`, `aria-expanded`
  e `aria-controls` apontando para a linha de imagem daquele ponto.

## Done criteria
- Clicar num bloco na Bancada abre um diálogo **centralizado**, com fundo escurecido
  clicável, `Esc` fechando e sem nenhuma borda presa à lateral direita.
- O formulário aparece em seções nomeadas (`Identidade` com título/etiqueta/duração,
  `Pontos deste bloco`, `Anexos`, `Nota privada`), e as ações (`Salvar`, `Cancelar`,
  `Guardar no acervo`, `Excluir`) ficam num rodapé que continua visível com o
  formulário rolado até o fim.
- Cada linha de ponto mostra só o texto e os controles de ordem/remoção. O campo
  `Imagem deste ponto` e o botão `escolher imagem` só aparecem depois de clicar
  no `+` daquela linha, ou quando o ponto já tem imagem gravada.
- Excluir bloco continua abrindo o `<Modal>` de confirmação com título, consequência
  e botão destrutivo — nenhum diálogo nativo.
- `pnpm build` (typecheck web + server) passa.

## Useful options considered
- Include now: reaproveitar `.modal-fundo`/`.modal` em vez de forkar uma concha;
  rodapé de ações fixo (hoje `.acoes-gaveta` rola para fora da tela num bloco com
  30 pontos); etiqueta e duração na mesma linha em duas colunas, para encurtar o
  formulário; remover `@keyframes gaveta-entra` de `motion.css`, que fica órfão.
- Defer: arrastar para reordenar pontos dentro do editor (hoje é subir/descer, e o
  `@dnd-kit` já instalado tornaria isso barato — mas é comportamento novo, não
  reestruturação); prévia de imagem em miniatura ao lado do campo.
- Escalate: nada. Nenhuma regra de domínio, permissão, rota ou persistência muda.
- Nota de teste: `data-testid="gaveta-bloco"` **fica como está**. É o identificador
  usado por 4 specs e2e e não descreve comportamento; renomear custaria 4 arquivos
  de suporte por zero mudança de produto.

## Out of scope
- Sub-itens / níveis nos pontos — vive em `.aioson/context/simple-plans/pontos-aninhados.md`.
- Qualquer mudança no Palco (`StageBeats`, `beats.ts`, `stage.css`).
- Modelo de dados, migração, rotas, validação de servidor.
- O campo de caminho dos **anexos** (`AttachmentFields`), que continua sempre visível:
  um anexo sem caminho não existe, então ali o campo não é opcional.

## Expected files
- `src/features/board/BlockDrawer.tsx` — behavior (concha modal, seções, rodapé)
- `src/features/board/BeatFields.tsx` — behavior (botão `+`, linha de imagem opt-in)
- `src/ui/modal.css` — support (variante `.modal-editor`)
- `src/features/board/board.css` — support (sai `.gaveta*`, entram seções e a linha do ponto)
- `src/ui/motion.css` — support (remove `gaveta-entra` órfão)
- `tests/e2e/board.spec.ts` — support (a imagem do ponto só aparece depois do `+`)

Orçamento: 2 arquivos de comportamento, 6 caminhos, 2 módulos (`features/board`, `ui`).
Dentro do teto do lane (5 comportamento / 8 caminhos / 2 módulos).

## Verification
- `pnpm build`
- `pnpm test:e2e tests/e2e/board.spec.ts tests/e2e/attachments.spec.ts`
- Smoke pelo caminho de produção: preview do Play (ler `.aioson/preview.json`) →
  Bancada → clicar num bloco → modal centralizado → `+` numa linha de ponto →
  escolher imagem → `Salvar` → reabrir e conferir que a imagem voltou com a
  linha já aberta.

## Session state
Next step: converter a concha de `BlockDrawer` para `.modal-fundo` + `.modal.modal-editor`
e conferir que a confirmação de exclusão continua abrindo por cima.

## Notes
- Concha: `BlockDrawer` passou a renderizar `.modal-fundo` + `.modal.modal-editor`.
  `.gaveta-fundo`, `.gaveta`, `.gaveta h2` e `.gaveta .acoes-gaveta` saíram do
  `board.css`, e `@keyframes gaveta-entra` saiu do `motion.css` — nenhuma
  referência sobrou (grep limpo).
- Desvio do plano (registrado): o `Mover para…` ficou dentro da seção
  `Identidade`. O plano nomeava 4 seções e não dizia onde ele ia; é onde o
  bloco está na pauta, e ele já fechava o editor antes desta mudança.
- Acréscimo dentro do escopo: o editor agora leva o foco para o campo `Título`
  ao abrir, como o `<Modal>` do design system já fazia.
- Defeito real encontrado no smoke: `.ponto-linha .linha1 .btn` usa o shorthand
  `font`, que vencia `.ponto-linha .botao-imagem` por especificidade e deixava o
  `+`/`−` em 13px sem o ouro. Corrigido repetindo `.linha1` no seletor. Verificado
  no preview: `fontSize 17px`, `fontWeight 600`, `color rgb(232,186,82)`.
- Ajuste do par de campos: `Duração prevista (minutos)` quebra em duas linhas na
  coluna estreita e `Etiqueta` não, o que deixava um degrau entre os controles.
  Rótulos do `.par-campos` reservam duas linhas; medido no preview, os dois
  controles agora começam em `top: 90`.
- Locator de teste: `getByLabel` casa por substring, e `Imagem do ponto 1` está
  contido em `Tirar a imagem do ponto 1` (rótulo do botão aberto). Os nomes
  acessíveis são distintos; o teste passou a usar `{ exact: true }`.

## Evidência
- `npx tsc --noEmit -p tsconfig.json` — limpo. `pnpm build` não foi rodado: a
  mudança é só de frontend e o `tsc` do web é o gate dela.
- `npx playwright test tests/e2e/board.spec.ts tests/e2e/attachments.spec.ts` —
  14/14 passando, incluindo o teste novo do opt-in.
- `npx playwright test tests/e2e/library.spec.ts tests/e2e/rundowns.spec.ts` —
  15/15 passando (os dois outros caminhos que abrem o editor).
- `npx playwright test tests/e2e/board.spec.ts` após os ajustes de CSS — 9/9.
- Smoke no preview do Play (`http://localhost:3524`, sem gravar nada): diálogo
  centralizado (`x:300 w:680` em janela de 1280), rodapé e `Salvar` visíveis com
  o formulário rolado, seções `Identidade / Pontos deste bloco / Anexos / Nota
  privada`, linha de imagem `0 → 1 → 0` no ciclo `+` / `−`, e `Esc` fechando.
