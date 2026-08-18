# Aprendizados do projeto

Uma linha por arquivo. Carregue o arquivo só quando o título casar com a tarefa atual.

- `gotchas/peso-tipografico-vira-textura.md` — negrito como padrão (700/800 em quase tudo) passa nos gates visuais e ainda assim faz a tela parecer pesada; o sistema de 4 pesos do Clave e como conferir.
- `gotchas/visual-guia-nao-e-tour.md` — o gate só verifica que existe tour, não que ele cobre o produto inteiro; separação entre tour de 5 passos e guia completo.
- `gotchas/palco-grid-anula-position-absolute.md` — `.palco > :not(.poeira){position:relative}` derrubava o posicionamento de filhos diretos do Palco (botão de notas, tomada, painel privado) e os jogava na grade.
- `gotchas/palco-transborda-em-janela-baixa.md` — tela cheia em grade com `min-height:0` encolhe a faixa mas não recorta: em janela baixa o conteúdo pinta por cima do rodapé; como testar.
