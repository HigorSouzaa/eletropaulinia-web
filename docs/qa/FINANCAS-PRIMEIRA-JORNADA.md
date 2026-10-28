# Finanças — primeira jornada local

Data: 28/10/2026. Branch: `feat/financas-operacionais`. Checkpoints de arquitetura e contratos aprovados; revisão funcional C pendente.

## Implementado

- Admin registra explicitamente um recebimento por equipamento, em centavos, com chave idempotente. Retirada não cria receita.
- Express valida valor, motivo para divergência do orçamento, sessão e perfil. Funcionário sem perfil admin consulta o resumo e o recebimento, mas não cria.
- A gravação usa transação e trava de versão da OS; o índice único impede dois recebimentos ativos para o mesmo equipamento.
- A exclusão da OS com lançamento financeiro retorna conflito e preserva o histórico.
- A página da OS oferece o registro por equipamento; `/financas` mostra somente o total confirmado de todos os tempos, identificado como primeira etapa.

## Evidências locais

- `npm run check`: 76 testes backend, tipagem, lint e build aprovados.
- `node --test tests/finance.test.js` em `backend/`: três testes aprovados, inclusive concorrência, autorização, idempotência, diferença de orçamento e bloqueio de exclusão.
- `npm run test:e2e -- --grep 'admin confirma um equipamento'`: um teste Chromium aprovado com API e Mongo descartável. O pagamento de um item soma R$ 120,00; a retirada do outro, sem pagamento, não soma receita.
- `npm run test:e2e`: 29 testes Chromium aprovados. A OS sintética financeira é removida por controle exclusivo do runner descartável após o cenário, preservando o isolamento da listagem legada.

## Limites para revisão funcional

Não há estorno, despesas, recorrências, previsões, filtros por período nem gráficos. O resumo atual não implementa a série temporal do contrato completo. Índices foram preparados apenas no Mongo descartável; não houve alteração no Atlas ou publicação. Antes da expansão, o usuário deve revisar a jornada pelo checkpoint C das skills.
