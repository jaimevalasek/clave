# Refinement Report — clave

- Source briefing: .aioson/briefings/clave/briefings.md
- Feedback: .aioson/briefings/clave/refinement-feedback.applied-round3.json
- Source hash: 8f1af9d1be5881f8b882ac10e3b041ee78902b19ade022998e7600750e23da4e
- Applied hash: 05da4b6c4d85a2b37ec4b5ee1b8d2ac5ad85fad43819ae71fb3dd83e37a4acd7
- Status: applied
- Round: 3
- Next action: approve_briefing
- Approved review authority: binding

> **Reparo de linhagem (2026-08-18, @briefing-refiner, autorizado pelo usuário).** O `applied_hash` acima foi reemitido depois de uma migração de formato que renomeou **três rótulos de cabeçalho** das tabelas de linhagem para a forma canônica do framework: `### Source Inventory` `ID` → `Source`; `### Source Promise Map` `ID` → `Promise` e `Promise` → `Approved intent`. Nenhuma linha, promessa, decisão ou escopo foi alterado — o `diff` contra o backup tem exatamente duas linhas, ambas de cabeçalho. Hash anterior do briefing: `aa9c5d37c5678a50952e80408b85d2ee5909046fab9cdce56cd9594d9313a640` (backup íntegro em `.aioson/briefings/clave/lineage-migration/backups/`); registro da migração em `.aioson/briefings/clave/lineage-migration/reports/`. O `source_hash` e o arquivo de feedback do round 3 seguem inalterados, então as decisões F13, F14 e F15 continuam **binding** sob `.aioson/docs/briefing/review-authority.md`. A escrita saiu fora do CLI porque `briefing:migrate-lineage` recusa a tabela híbrida (`source_promise_map_columns: Legacy Source Promise Map is missing: state`), `briefing:sources` é somente leitura e exige pack de diretório, e `briefing:apply-feedback` está fora de elegibilidade com PRD já gerado.

## Approved Review Decisions

- F13 [legacy_recommendation] open-questions: legacy-recommendation — Atualizar a questão 9 e o gap de autoridade visual para registrar a nova rota; anotar no Source Promise Map que o sistema visual do PROM-009 foi substituído por decisão do usuário, preservando as sub-promessas vigentes. O protótipo owned já foi reconstruído sobre o DNA (prototype.html + manifest, status draft). | rationale: Decisão explícita do usuário no chat de 2026-08-15: "usar a skill interface-design + o design system novo... é ouro e black". Identity extraída e verificada; protótipo reconstruído.
- F14 [legacy_recommendation] open-questions: legacy-recommendation — Marcar a questão 10 como resolvida citando researchs/clave-rundown-concorrentes/summary.md; anotar na questão 11 e no risco de cenografia a evidência de researchs/clave-cenografia-e-marcadores/summary.md (o teste real no OBS continua necessário); atualizar ## Sources, que hoje afirma 'nenhuma pesquisa web nesta sessão'. | rationale: Pesquisa executada e persistida nesta sessão; claim sustentado.
- F15 [legacy_recommendation] open-questions: legacy-recommendation — Registrar como nova questão aberta [decision-required] para o Product decidir se entra na fase 5 — nunca como escopo aprovado pelo refinamento. | rationale: Registrada como questão 13 [decision-required] — o Product decide; não vira escopo aqui.

## Approved Source References

- .aioson/briefings/clave/identity.md
- .aioson/briefings/clave/prototype-manifest.md
- researchs/clave-rundown-concorrentes/summary.md
- researchs/clave-cenografia-e-marcadores/summary.md

## Findings

- F13 [pending-decision/high] (accepted) open-questions: O usuário substituiu, por instrução explícita no chat (2026-08-15), a rota de autoridade visual decidida no round 1 (originação direta do design system §5 da fonte): a autoridade passa a ser o AIOSON Design-DNA v1 'Tinta & Ouro' por referência — identity.md do briefing extraído de aioson-com/.aioson/explorations/aioson-ecosystem-identity/runs/variant-d/design-dna (variante selecionada, rodadas 9–11 de 2026-08-11/12), consumido pela skill interface-design. O identity.md da raiz da exploração (2026-08-09) foi verificado como desatualizado (identidade azul anterior) e descartado. Do §5 sobrevivem: cor codifica tipo (via mapa tipo→metal), coreografia de entrada palavra-a-palavra, timecode em mono, prefers-reduced-motion.
- F14 [gap/medium] (accepted) open-questions: A questão 10 [research-able] foi respondida nesta sessão com 4 consultas web persistidas em researchs/: o claim competitivo da fonte se sustenta — Cuez é automação broadcast/newsroom (NRCS, agentes de IA em control room), Rundown Studio é rundown linear cronometrado, e o mais próximo (Storyflow) tem apenas 'backup plans' estáticos; nenhum instrumenta curva de energia ou deck de desvio acionável. A pesquisa também reduziu o risco da questão 11: cores saturadas sobre fundo escuro sobrevivem melhor à compressão que tons pastéis.
- F15 [scope-suggestion/low] (accepted) open-questions: Ideia nova derivada da pesquisa (não é escopo aprovado): 'marcadores inteligentes' — as regras de qualidade de capítulos do YouTube são determinísticas (ideal 90s–4min; 5min anula a navegação; 00:00 obrigatório) e a Bancada já conhece a duração prevista de cada bloco, então o Clave pode avaliar a qualidade dos futuros capítulos antes da live e sugerir fusões na exportação. Custo baixo, valor direto no PROM-006.

## Applied Changes

- risks: text changed
- identified-gaps: text changed
- sources: text changed
- open-questions: text changed

## Skipped Changes

- None

## Unresolved Comments

- None

## Blocking Items

- None
