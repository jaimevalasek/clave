# Três defeitos que só o e2e do navegador pegou

**Escopo:** implementação do Clave (`src/features/board/*`, `server/src/repositories/attachmentRepository.ts`).
Todos os três passaram limpos pela tipagem, pelos testes de unidade e pelos testes de API.

## 1. O id de rascunho do anexo virava chave primária

A gaveta criava linhas de anexo com um id provisório para servir de `key` do React
(`novo-0`, `novo-1`…). O servidor gravava esse id como `attachments.id`. O primeiro
bloco com anexo funcionava; **o segundo estourava 500** por violação de PRIMARY KEY —
e a gaveta ficava aberta como se nada tivesse acontecido.

O teste de API não pegava porque cada caso montava a carga com id ausente. O e2e
pegou porque a suíte inteira compartilha um banco só e chega ao segundo bloco.

**Regra prática:** id vindo do cliente nunca vira chave primária. O `INSERT` gera o
id no servidor; o id recebido só serve para *reconhecer* uma linha que já existe.

```ts
// server/src/repositories/attachmentRepository.ts
const id = existingIds.has(attachment.id) ? attachment.id : randomUUID();
```

De quebra: bloco e anexos passaram a gravar numa transação só (`POST /api/blocks`
aceita `attachments`), então uma falha no meio não deixa mais bloco órfão.

## 2. A validação nativa do browser bloqueava a validação de domínio

`<input type="number" max="600">` dentro de um `<form>`: ao submeter com 900, o
Chrome **cancela o submit** e mostra a bolha nativa. O `onSubmit` nunca roda, a rota
nunca recebe a carga, e o erro inline com `aria-invalid` que a AC exige nunca aparece.

A tela parecia "não fazer nada". O teste de API passava, porque ele fala com a rota
direto.

**Regra prática:** formulário com validação de domínio leva `noValidate`. O gate é a
rota; a bolha nativa é ruído que esconde o gate.

## 3. Ids repetidos de droppable anulavam o arraste inteiro

O canvas da Bancada tem uma célula por coluna **em cada uma das quatro pistas**.
Registrar todas como `coluna-0`, `coluna-1`… fazia o dnd-kit sobrescrever o registro:
o arraste começava (a carta ganhava `.arrastando`), mas `over` vinha sempre nulo e
nada reordenava.

**Regra prática:** id de droppable/draggable é chave de registro global. Num grid,
o id carrega linha *e* coluna (`${lane}-coluna-${index}`), e o índice de destino vai
no `data`, não no id.

## Checagem mais barata

Antes de declarar uma superfície pronta, rodar o caminho no navegador **duas vezes
seguidas no mesmo banco**. Os três defeitos acima aparecem na segunda passada ou na
segunda linha — nunca na primeira.
