# Peso tipográfico vira textura quando é o padrão

**Escopo:** qualquer superfície visual do Clave (protótipo de briefing, implementação futura).

## O que escapou

O build 4 do `prototype.html` tinha ~35 declarações de peso, e a maioria delas era `700` (mono) ou
`800` (display): eyebrows, nav, rótulos de pista, réguas, chips, timecodes, títulos de página, de
gaveta, de modal e de tour. Quando quase tudo é negrito, o negrito deixa de ser hierarquia e vira
textura: o usuário lê a tela como "pesada" e "cansativa" sem conseguir apontar um elemento errado.
Foi exatamente essa a rejeição ("muitas fontes que estão em negrito, deixar mais suave").

## O gate que ficou verde

`verify:artifact --kind=visual` mede **famílias** de fonte (`fonts 0`), aderência a token, grade de
espaçamento e contraste. Nenhuma dessas métricas olha a **distribuição de pesos**, então uma tela
inteira em 700/800 passa limpa.

## Checagem mais barata

Contar os pesos antes de declarar o build pronto:

```bash
grep -oE 'font(-weight)?: ?[0-9]{3}' prototype.html | sort | uniq -c | sort -rn
```

Se as declarações `>= 700` passam de ~15% do total, o peso não está sendo usado como sinal.

## O que ficou no lugar (build 5)

Quatro pesos, com papel fixo: **400** corpo · **500** estrutura e voz da máquina (mono, rótulos,
títulos de item) · **600** hierarquia (headings, ação primária, estados ao vivo) · **800**
exclusivo do título gigante do Palco, que é a única voz gritada e ainda precisa sobreviver à
compressão do YouTube. Ênfase inline deixou de ser `<b>` e virou `.termo` (cor + meio passo de
peso); `b,strong` foram normalizados para 500 para impedir regressão silenciosa.

Ver também: `visual-guia-nao-e-tour.md`.
