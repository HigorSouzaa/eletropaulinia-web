# Finanças — contratos propostos (checkpoint B)

Data: 28/10/2026. Branch `feat/financas-operacionais`. A arquitetura e direção visual em [FINANCAS-PROPOSTA.md](FINANCAS-PROPOSTA.md) foram aprovadas pelo usuário. Este documento é proposta de API/dados e escolhas operacionais para aprovação antes de codificar. Não há lançamentos financeiros atuais nem migração remota autorizada.

## 1. Decisões técnicas recomendadas para aprovação

1. **Um recebimento confirmado por equipamento nesta versão.** Valor pode ser menor ou maior que o orçamento, com motivo obrigatório quando divergir. Isto representa o valor efetivamente cobrado como um único acerto, não uma parcela. Segunda cobrança exige estornar/corrigir ou uma decisão futura sobre parcelas. A primeira fatia fica simples e impede dupla contagem; pagamentos parciais ficam fora até regra própria.
2. **Forma de pagamento opcional**, dentre dinheiro, Pix, cartão, transferência ou outro. Não guardar dados de cartão, conta ou comprovante nesta etapa. Caso a loja precise conciliar caixa por meio, tornar a forma obrigatória em etapa posterior.
3. **Correção de recebimento por estorno integral auditado seguido de novo lançamento.** O evento original não é apagado; devolução parcial de dinheiro fica fora desta versão até regra específica. O estorno exige motivo e admin, é idempotente e referencia o recebimento original. O painel subtrai no dia do estorno, preservando a data original do recebimento.
4. **OS com lançamento financeiro não pode ser excluída**, mesmo se o lançamento foi estornado; admin recebe conflito com instrução de consultar Finanças. Esta regra protege histórico e evita referência órfã. Exceções de descarte exigem novo fluxo formal, não atalho de banco.

Se alguma recomendação não atender à operação da empresa, alterar o contrato antes da primeira implementação.

## 2. Dados

Coleção `financeReceipts` (índices explícitos, sem criação na importação): `_id`, `orderId`, `equipmentId`, `orderNumberSnapshot`, `equipmentNameSnapshot`, `budgetSnapshotCentavos` nullable, `amountCentavos` inteiro positivo, `method` opcional, `confirmedAt` UTC do servidor, `confirmedBy` User ID, `differenceReason` obrigatório se houver orçamento e o valor divergir, `requestKey`, `voidedAt/By/Reason` nullable e `version`. Não guardar nome/telefone de cliente no lançamento; detalhe autorizado pode seguir referência para a OS. Índice único de equipamento para recebimento **ativo**, e índice único de chave de tentativa por admin. Estorno não remove documento. Um equipamento historicamente já pago e estornado pode receber novo lançamento; regras de unicidade devem considerar ativo/estornado sem permitir corrida entre dois admins. Manter limite numérico seguro e excluir `amountCentavos`/autoria/instantes do PATCH genérico de OS.

Coleção `financeExpenses`: `_id`, `description`, `category` (aluguel, internet, água, energia, peça, outra), `amountCentavos` inteiro positivo, `state` previsto/pago/cancelado, `dueDate` civil opcional, `paidAt` UTC nullable, `orderId/equipmentId` opcionais somente para peça vinculada, snapshot mínimo, `recurrenceId` e `competence` YYYY-MM opcionais, `createdBy/At`, `updatedBy/At`, `version`, `history` append-only com valor/estado anterior, ator, instante e motivo. Peças compradas e pagas são despesas efetivas; peça ainda não paga é prevista. Uma peça vinculada é um único documento: recorte da OS soma esse mesmo documento, sem duplicar saída geral.

Coleção `financeRecurrences`: `_id`, `description`, `category`, `amountCentavos`, `startCompetence`, `endCompetence` nullable, `active`, `createdBy/At`, `version`, `history`. Cada competência tem um documento de despesa com índice único `(recurrenceId, competence)`. Geração idempotente em lote limitado até competência solicitada/atual, sem depender exclusivamente de cron; reexecutar não duplica. Alterar regra afeta apenas competências futuras ainda não materializadas; ajustar mês individual não altera regra nem outros meses. Mês cancelado permanece registrado.

Não inserir documentos retroativos sem fonte verificada. As cinco OS existentes no piloto não ganham recebimentos. Não presumir aprovação comercial, imposto, estoque ou contabilidade formal.

## 3. API Express e transporte Next

Prefixo Express `/api/v2/finance`; prefixo Next `/api/financas`. Todos os GET exigem funcionário ativo; POST/PATCH exigem admin via `authorize('admin')`. Rotas Next são fixas e encaminham métodos permitidos, sessão HttpOnly, checagem de origem/CSRF, `Idempotency-Key` ou ETag quando aplicável. Express recalcula totais e aplica permissão.

| Método e caminho Express | Corpo/consulta principal | Resultado |
| --- | --- | --- |
| `POST /receipts` | `{orderId,equipmentId,amountCentavos,method?,differenceReason?}` + `Idempotency-Key` | 201 `{data}`; replay da mesma tentativa 200 |
| `GET /receipts` | `from,to,page,pageSize,orderId?` | 200 `{data:[],meta}` |
| `POST /receipts/:id/void` | `{reason}` + `If-Match` | 200 lançamento estornado; replay não altera efeito |
| `GET /summary` | `from,to,granularity=day\|month\|year` | 200 cartões e séries, com origem temporal definida |
| `GET /forecast` | `from?,to?,page,pageSize` | 200 equipamentos com orçamento, status e saldo previsto; não é receita |
| `POST /expenses` | descrição, categoria, centavos, estado, data, referência opcional | 201 `{data}` |
| `GET /expenses` | período, estado, categoria, paginação | 200 `{data:[],meta}` |
| `PATCH /expenses/:id` | campos editáveis + motivo + `If-Match` | 200 `{data}`/ETag; histórico append-only |
| `POST /recurrences` | descrição, categoria, centavos, vigência | 201 `{data}` |
| `PATCH /recurrences/:id` | alterações futuras/cancelamento + motivo + `If-Match` | 200 `{data}`/ETag |
| `POST /recurrences/materialize` | `{throughCompetence}` com limite | contagem agregada criada/existente; idempotente |

Corpos aceitam somente campos listados. Omissão em PATCH preserva; `null` limpa apenas opcionais declarados; valor vazio não equivale a zero. `page` 1..100000, `pageSize` 1..100; intervalo máximo de consulta proposto: 366 dias no gráfico diário e 10 anos no mensal/anual, com erro 400 para excesso. Não aceitar operadores Mongo/regex arbitrários. Valores 1..999999999 centavos por lançamento, total agregado verificado contra limite de inteiro seguro. Datas `YYYY-MM-DD` representam calendário da loja; instante UTC continua intacto. Evitar `skip` excessivo se volume representar custo, medindo primeiro.

Respostas de erro padronizadas: 400 `VALIDATION_ERROR`/`INVALID_PERIOD`; 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 404 `NOT_FOUND`; 409 `ALREADY_PAID`, `RECEIPT_VOIDED`, `FINANCIAL_HISTORY_BLOCKS_DELETE`, `IDEMPOTENCY_CONFLICT`; 412 `VERSION_CONFLICT`; 428 `PRECONDITION_REQUIRED`; 503 `SERVICE_UNAVAILABLE`. Nunca retornar stack, URI, token ou dados pessoais em erro/log.

Índices propostos: receipts `(confirmedAt,_id)`, `(orderId,equipmentId)`, chave única de tentativa e unicidade de recebimento ativo por equipamento; expenses `(paidAt,_id)`, `(state,dueDate,_id)`, `(orderId,equipmentId)`; recurrences `(active,startCompetence)` e expenses `(recurrenceId,competence)` único parcial. Explicar e testar a semântica de índice parcial com `null`/ausência antes de instalar. Leituras com `maxTimeMS`; agregação filtra antes de agrupar. Não executar `syncIndexes` em Atlas.

## 4. Cálculos e datas

Receita no período = soma dos recebimentos com `confirmedAt` no intervalo menos estornos com `voidedAt` no intervalo. Um recebimento em outubro estornado em novembro aparece positivo em outubro e negativo em novembro, sem reescrever o passado. Despesa paga usa `paidAt`; pagamento de recorrência usa o mesmo campo, enquanto `competence` é rótulo de previsão. Resultado operacional = receita líquida do período - despesas pagas. Não rotular como lucro fiscal/contábil.

Previsão operacional: equipamento com `avaliacao.totalCentavos !== null` e sem recebimento ativo. Subconjunto `Pronto` e sem retirada. Equipamentos já retirados mas não pagos permanecem em uma categoria separada “retirados pendentes de pagamento”, não desaparecem. Valor zero orçado é conhecido, distinto de ausência de orçamento; filtros evitam soma dupla. Despesa prevista não reduz caixa, mas pode aparecer em painel separado. Resultado por OS/equipamento = recebimento líquido - peças pagas vinculadas; se custo não informado, mostrar margem não calculável e não supor custo zero.

Série diária/mensal/anual usa fuso `America/Sao_Paulo`, limites de período inclusivos na UI e intervalo UTC semiaberto na consulta. Testar viradas de 23:59/00:00, mês, ano e horário de verão histórico; datas civis não devem mudar de dia por conversão inadvertida.

## 5. Conflitos, auditoria e integridade

Criar recebimento em transação MongoDB com leitura condicionada da OS/equipamento e índice único ativo; confirmar que equipamento pertence à OS. Idempotência por admin/chave e hash de payload; resposta perdida e repetição não geram segundo pagamento. A validação da permissão ocorre no Express e o lançamento só usa o ator da sessão. Pagamento pode preceder ou suceder retirada; exibir isso, sem alterar `retirada` nem `status`.

Estorno exige versão atual; corrida entre dois admins devolve 412 ou replay seguro. Nenhum endpoint de edição genérica de OS altera lançamentos. Alterar orçamento após pagamento deixa `budgetSnapshotCentavos` e `amountCentavos` intactos. Correção de retirada não desfaz pagamento. Excluir OS com qualquer histórico financeiro retorna 409 no Express, com verificação atômica/serialização adequada para evitar corrida com novo pagamento. Documentar se um bloqueio/"fence" na OS é necessário. Desativar funcionário não apaga autoria.

Recorrência materializa em transação ou upsert com índice único; dois processos concorrentes produzem uma ocorrência por competência. Correções de despesas usam versão/ETag e histórico. Erros de validação não deixam lançamentos parciais.

## 6. Frontend e estados

`/financas` usa mesma navegação e identidade visual; somente admin vê ações de escrita. Topo: filtro de data e cinco cartões. Gráfico responsivo com legenda textual e tabela de dados acessível; definir necessidade real antes de adicionar biblioteca de gráficos. Abas: recebimentos, despesas e previsões, cada uma com paginação no servidor. Formulário de pagamento nasce do equipamento na OS ou do painel, mostra orçamento, valor efetivo, diferença e motivo; confirma somente após resposta 201/200. Conflito mantém rascunho. As telas usam `no-store`, ignoram respostas de sessão anterior e tratam 401/403/409/412/503 distintamente. Em 360 px sem estouro ou dependência de gesto horizontal para ações essenciais.

## 7. Migração e reversão

Adicionar coleções/índices de forma aditiva em banco descartável primeiro. Inventariar registros reais, backup/restauração isolada e índices existentes antes de qualquer operação remota autorizada. Backend novo antes do frontend; versões antigas não conhecem a área financeira. OS antigas continuam legíveis; orçamento e retirada antigos não geram receita. Rollback de aplicação precisa manter bloqueio de exclusão/histórico financeiro ou suspender escrita; não apagar coleções novas nem restaurar snapshot sobre lançamentos posteriores.

## 8. Matriz mínima de testes

| ID | Cenário | Evidência esperada |
| --- | --- | --- |
| FI01 | Admin paga um dos dois equipamentos | Um lançamento, receita só do pago, OS/retirada intactas |
| FI02 | Repetição e corrida de pagamentos | Mesmo efeito ou 409, sem duplicidade |
| FI03 | Funcionário consulta e tenta gravar | GET 200, POST 403 |
| FI04 | Orçamento diferente, ausência e zero | Motivo exigido na divergência; ausência não vira zero |
| FI05 | Retirada antes/depois e correção | Pagamento independente de status/retirada |
| FI06 | Estorno e versão concorrente | Histórico preservado; caixa corrige no dia do estorno |
| FI07 | Peça vinculada e despesa geral | Soma geral uma vez e recorte da OS coerente |
| FI08 | Recorrência mensal repetida/concorrente | Uma competência; mês ajustado/cancelado isolado |
| FI09 | Datas/filtros/gráfico | Totais, tabelas e séries iguais no fuso da loja |
| FI10 | OS com histórico financeiro | Exclusão negada sem apagar dados |
| FI11 | Falhas e troca de sessão | Rascunho preservado; sem dados de outra conta |
| FI12 | Legado e retorno | Sem receita inventada; retorno só pago explicitamente |

Primeira fatia após aprovação B: FI01–FI04, FI10 (bloqueio), API→Mongo descartável→UI mínima, mais rollback de falha dentro da transação. Demonstrar e aguardar checkpoint C antes de expandir. Testes existentes de OS, retirada, funcionários e sessão continuam no gate. Nenhum deploy, push ou Atlas nesta etapa.

Referências: [MongoDB — valores monetários](https://www.mongodb.com/docs/manual/tutorial/model-monetary-data/), [atomicidade](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/), [agregação temporal](https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateTrunc/).
