# O tour prova que existe explicação, não que ela é completa

**Escopo:** protótipos de briefing e onboarding do produto.

## O que escapou

O build 4 tinha o tour de primeira abertura exigido pelo contrato (4 passos, marcador, botão `?`
para reabrir). Os 4 passos cobriam só a tela em que o tour abre — Bancada, curva, resgates e o
botão do Palco. Pautas, Acervo e Relatório nunca eram explicados, e nada dizia o que o produto é
antes de explicar como usá-lo. Para quem já conhece o produto isso parece completo; para um leigo,
falta o começo e o fim do fluxo. A rejeição foi literal: "explicando como usar, mais para leigo
entender de forma completa".

## O gate que ficou verde

`verify:artifact --kind=visual` procura o **marcador** `data-aioson-tour` e o controle de reabrir.
Presença de tour é binária: ele não compara os passos com o mapa de superfície operacional.

## Checagem mais barata

Cruzar a explicação com a tabela `## Superfície operacional modelada` do `prototype-manifest.md`:
toda tela listada ali precisa aparecer na explicação, e a primeira frase precisa dizer o que o
produto é (não como clicar). Se uma tela do mapa não é citada, a explicação está incompleta.

## O que ficou no lugar (build 5)

Duas camadas, com papéis diferentes: o **tour** de 5 passos (abre sozinho, começa por "o que é o
Clave" e termina apontando o guia) e o **guia completo** no botão `Como usar`, com quatro
movimentos na ordem de uma live real (montar a pauta, ler a curva, conduzir no Palco, relatório e
acervo), a tabela das seis teclas e um bloco honesto de "o que este protótipo ainda não faz".
Assim o overlay continua curto (3–5 passos, como manda o brain vq-016) sem que a completude fique
faltando em algum lugar.

Ver também: `peso-tipografico-vira-textura.md`.
