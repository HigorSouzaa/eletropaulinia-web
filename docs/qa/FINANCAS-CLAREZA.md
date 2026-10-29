# Finanças — clareza visual, validação local

Branch `feat/financas-clareza-visual`, derivada de `25341db` (moldura compartilhada). Os três checkpoints da Dev Front Master foram aprovados pelo usuário para este escopo.

O resumo filtrado da API Express agora inclui `expensesByCategory`, calculado de despesas `pago` por `paidAt` no período da loja. A soma é conferida contra `expensesCentavos` no servidor. A lista paginada não alimenta a rosca. Receita, estornos, previsão e resultado operacional não mudaram de fórmula. A interface separa lançamentos efetivos de previsões e informa que os recortes de prontos e retirados estão contidos no total de orçamentos em aberto. Cores de categorias são estáveis; a tabela apresenta os mesmos valores sem depender da cor.

| Comportamento | Evidência local |
| --- | --- |
| Despesa prevista não entra no total; ao pagar, entra na categoria | `backend/tests/finance.test.js`; 84 testes HTTP/MongoDB aprovados |
| Duas categorias somam o cartão e aparecem na rosca | `tests/finance-visual.spec.ts`, API e Mongo descartável; 3 testes financeiros Chromium aprovados |
| Período vazio não exibe fatias fictícias | `tests/finance-visual.spec.ts` |
| Larguras 360, 768 e 1280 sem transbordamento horizontal | `tests/finance-visual.spec.ts`; capturas sintéticas em `test-results/financas-primeira-tela-*.png` |
| Estorno, recorrência prevista, sessão e troca de conta | Testes existentes; suíte completa de 32 testes Chromium aprovada antes do refinamento final de texto e cor |

`npm run typecheck`, `npm run lint` e `npm run build` passaram após o refinamento. `npx playwright test tests/finance-visual.spec.ts tests/finance.spec.ts` passou (3/3). Os testes usam dados sintéticos em Mongo descartável. As capturas não contêm dados de clientes reais e não são versionadas.

Limites: dispositivos físicos e desempenho da agregação com volume representativo no Atlas não foram medidos. As regras financeiras e os filtros existentes não foram alterados. Sem push, merge, deploy ou alteração do banco remoto.
