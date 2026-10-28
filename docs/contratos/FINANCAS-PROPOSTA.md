# Finanças — diagnóstico e arquitetura propostos (checkpoint A)

Data: 28/10/2026. Branch: `feat/financas-operacionais`, baseada em `91ccc4a`. Estado: arquitetura e direção visual aprovadas pelo usuário em 28/10/2026. Contrato B em [FINANCAS-API-DADOS.md](FINANCAS-API-DADOS.md) aguarda revisão; nenhuma API/tela/modelo financeiro implementado e nenhum banco real alterado.

## Evidências da base

- `backend/models/OrderV2.js`: orçamento `avaliacao.servicos[].valorCentavos` e `totalCentavos` por equipamento; `retirada.retiradoEm` individual. Não há campo de pagamento.
- `backend/services/ordersV2.js`: retirar equipamento grava evento de retirada e atualiza a OS; não grava receita. Correção da retirada preserva histórico.
- `backend/app.js`: Express concentra a API e a autorização; `protect` resolve funcionário ativo e `authorize('admin')` restringe mutações já existentes.
- `web/Orders.tsx`: navegação atual possui Ordens, Clientes e Funcionários. A área Finanças precisa de entrada na navegação móvel e desktop.
- Busca local em `backend/`, `web/` e `legacy/` não encontrou módulo financeiro reaproveitável. Isto não prova que ele nunca existiu em outro commit.
- A base do produto está em produção piloto. Esta etapa só permite implementação local com Mongo descartável; publicação depende de autorização posterior.

## Arquitetura proposta

Fluxo: Next `/financas` → transporte restrito em `/api/financas/*` → Express `/api/v2/finance/*` → modelos de eventos financeiros e consultas Mongo. Express é autoridade de validação, permissão e totais. Todos os funcionários autenticados consultam; somente admin altera.

Manter orçamento dentro do equipamento como proposta comercial. Criar lançamentos de receita confirmada separados da OS, vinculados por IDs de OS/equipamento e com resumo histórico. Isto impede que edição de orçamento ou retirada gerem receita retroativa. Despesas gerais e de peças usam lançamentos próprios; peça vinculada entra uma vez na soma geral e também no recorte da OS. Recorrência mensal define competências únicas; cada ocorrência distingue previsto de pago. Histórico de correção/estorno deve ser auditável.

Consultas agregadas do servidor para cartões, série temporal e tabelas paginadas. `dataPagamento` rege receita no período; `dataEfetiva` rege despesa paga; competência rege previsão de fixos. Previsão de orçamento é um recorte de equipamentos ainda não pagos, com subconjunto `Pronto` e sem retirada. Separar rigorosamente os números de caixa e expectativa. Datas armazenadas em UTC, agrupadas em `America/Sao_Paulo`. Valores em centavos inteiros e limites seguros na API, compatíveis com o orçamento existente.

### Interface proposta

Nova entrada “Finanças” na navegação atual. `/financas` com filtro no topo (dia, mês, ano ou intervalo), três cartões de caixa (recebido, despesas pagas, resultado operacional) e dois cartões de previsão (orçamentos abertos e prontos aguardando retirada). Gráfico com séries identificadas e tabela abaixo; abas “Recebimentos”, “Despesas” e “Previsões”. Sem depender apenas de cor para distinguir estados. Admin vê botões de registrar pagamento, despesa e recorrência; demais funcionários veem dados sem formulários de mutação. Cada lançamento abre origem, valor, data e correções. Preservar cartões, cores e tipografia do produto; responsivo em 360/768/1280 px, com tabela rolável quando necessário. Carregamento, vazio, erro, sessão expirada e retry distintos.

### Primeira jornada para checkpoint C

Com Mongo descartável: admin registra pagamento de um equipamento em OS com dois itens; a API grava evento idempotente; resumo financeiro mostra apenas o valor confirmado; funcionário não admin consulta mas recebe 403 ao tentar criar. Retirar o outro item sem pagamento não altera a receita. O navegador comprova a mesma jornada. Depois de demonstrar esta fatia, aguardar revisão funcional antes de expandir para despesas, recorrências e gráficos.

## Riscos e condições de aceite

- Retirada, orçamento e pagamento são fatos distintos. Ausência de evento significa receita não verificada, nunca pagamento zero presumido.
- Uma OS pode ter retiradas parciais, pagamentos antes/depois da retirada, retorno e orçamento alterado. Lançamentos mantêm valor e referência próprios.
- Exclusão de OS com lançamentos financeiros exige contrato antes de código: impedir, preservar referência histórica ou fluxo de cancelamento auditado. Não aceitar desaparecimento silencioso.
- Mais de um pagamento por equipamento, descontos, estornos e devoluções precisam de regra concreta no checkpoint B; não inferir por silêncio.
- Despesas recorrentes não podem ser somadas como saída paga sem confirmação de pagamento; execução repetida não duplica competência.
- Consultas devem filtrar por período no servidor e ter paginação/índices; nenhuma métrica de desempenho foi medida na base real.
- Não criar valores históricos a partir das cinco OS existentes no Atlas.

## Próximo checkpoint

Após aprovação desta arquitetura e direção visual, apresentar contrato B: payloads/erros, IDs, índices, permissões, idempotência, recorrência, exclusão de OS e matriz de testes. Somente após aprovação B implementar a primeira jornada C. Checkpoint A e direção visual aprovados; B e C ainda pendentes.

Referências de modelagem, a revalidar conforme versão do servidor: [MongoDB — valores monetários](https://www.mongodb.com/docs/manual/tutorial/model-monetary-data/), [MongoDB — agrupamento por data](https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateTrunc/), [MongoDB — atomicidade](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/).
