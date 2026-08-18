# Grade de tela cheia transborda em janela baixa e o conteúdo encavala

**Escopo:** telas em `position:fixed` com `grid-template-rows` (o Palco do Clave; qualquer
cenografia de tela cheia da implementação).

## O que escapou

O usuário abriu o Palco numa janela baixa (~550px de altura) e o resultado foi tudo sobreposto:
o título gigante por cima das cartas do deck, a linha de atalhos cruzando o título, as linhas da
pauta atravessando o texto. Parecia "quebrou tudo"; era transbordamento silencioso.

## A causa

```css
.palco{position:fixed;inset:0;display:grid;grid-template-rows:auto 1fr auto}
.palco-centro{min-height:0}   /* deixa a faixa encolher... */
```

`min-height:0` permite que a faixa central encolha abaixo do conteúdo, mas **não recorta nem faz
rolar**: o conteúdo excedente continua sendo pintado, e pinta em cima das faixas vizinhas. E o
título usava `clamp(38px, 5.6vw, 78px)`, que só responde à largura — numa janela larga e baixa ele
fica enorme justamente onde não cabe.

## O gate que ficou verde

O runtime do `verify:artifact` mede overflow **horizontal** a 360px e a dobra do marcador
primário. Nenhuma métrica olha janela baixa, e sobreposição vertical não gera scrollbar: nada a
detectar.

## Checagem mais barata

Abrir a tela cheia em ~550px de altura e comparar caixas, não olhar o screenshot:

```js
titulo.getBoundingClientRect().bottom > rodape.getBoundingClientRect().top  // true = encavalado
```

Vale para 1878x550 (larga e baixa, o pior caso) e 1280x600.

## O que ficou no lugar

`overflow:hidden` na faixa central, `min-height:0` + `overflow:auto` nos dois blocos internos
(cada um rola dentro da própria área), título respondendo também à altura
(`clamp(30px, min(5.6vw, 11.5vh), 78px)`) e um `@media (max-height:660px)` que comprime relógios,
paddings e cartas. Bônus achado no caminho: `.selo-resgate` esticava na largura toda porque era
item de flex column com `align-items:stretch`; agora tem `align-self:flex-start`.

Ver também: `palco-grid-anula-position-absolute.md`.
