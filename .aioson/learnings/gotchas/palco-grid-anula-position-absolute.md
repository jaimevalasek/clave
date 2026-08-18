# A regra de camada do Palco anulava o posicionamento dos filhos diretos

**Escopo:** `.aioson/briefings/clave/prototype.html`, tela `#/palco/:id` (e qualquer porte dela
para a implementação).

## Os sintomas (três, a mesma causa)

1. O botão "segurar p/ notas" atravessava o deck de resgates, com a borda esticada de ponta a
   ponta da tela.
2. A tomada de tela (mídia em tela cheia) não cobria o topo: o deck e a linha de atalhos ficavam
   visíveis por cima dela.
3. O painel "só você vê" aparecia empilhado no fim da página em vez de flutuar no canto.

Todos pareciam bug de z-index. Nenhum era.

## A causa

A regra do dispositivo D-04 subia todo filho direto do Palco acima da poeira:

```css
.palco > :not(.poeira){position:relative;z-index:1}
```

Especificidade `0,2,0` contra `0,1,0` das regras dos próprios elementos
(`.botao-notas{position:absolute}`, `.tomada{position:fixed}`, `.painel-so-voce{position:fixed}`).
O seletor genérico vence, os elementos perdem o posicionamento, viram itens da grade
`grid-template-rows:auto 1fr auto` e caem em linhas implícitas de largura total.

## A correção

Nomear as três faixas em vez de usar um `:not()` genérico:

```css
.palco > .palco-topo, .palco > .palco-centro, .palco > .palco-rodape{position:relative;z-index:1}
```

As sobreposições já têm z-index próprio (70) e voltaram a funcionar. O botão de notas, além
disso, deixou de depender de posicionamento absoluto: mora em `.rodape-linha`, dentro do rodapé.

## Regra prática

Regra de camada nunca usa seletor universal sobre filhos. Nomeie o que deve subir. Se um seletor
de camada precisa mexer em `position`, ele está alterando layout, não pintura.

Ver também: `palco-transborda-em-janela-baixa.md`.
