# Etapa 03 — arquitetura e contrato para revisão

23/10/2026. Base `37c0ab0`, árvore inicialmente limpa, branch `feat/backend-ordens-v2`. Proposta para os checkpoints A/B da Dev Back Master; ainda não aprovada nem implementada. Dev Front Master aplicada ao transporte e à listagem existentes. Nenhum AGENTS.md encontrado no repositório. Runtime local Node 24.21.0, Express instalado 4.21.2, Mongoose 8.19.3; sem atualização de dependências.

## Evidências e escopo

- Inspeção: `backend/models/Order.js` contém equipamento único, marca obrigatória e numeração baseada na última OS criada.
- Inspeção: `backend/controllers/orderController.js` permite editar número/status, usa fallback `||` que impede limpar opcionais e devolve erros internos. A lista não tem paginação.
- Inspeção: `backend/routes/orders.js` protege todas as operações e reserva exclusão ao admin. Preservar acesso compartilhado, autenticação e revogação.
- Inspeção: `web/server/api.ts` transporta `/api/orders`; a listagem Next espera array legado. A adaptação precisa mudar junto da API, sem reduzir múltiplos equipamentos ao primeiro.
- Não verificável: conteúdo, índices efetivos, números anteriormente excluídos e backups do banco real. Nenhum acesso remoto realizado.

Entregar API v2, compatibilidade da listagem, transformação de fixtures e testes. Formulários completos, gestão de funcionários, Atlas e publicação ficam fora desta etapa.

## Modelo e organização propostos

Manter coleção `orders`, preservando `_id` e referências. Documentos novos terão `schemaVersion: 2`, `version`, `numero` imutável, sequência numérica interna, `cliente: {nome, telefone, email}`, `equipamentos` embutidos, datas, técnico textual, observações e autoria. Não criar uma segunda coleção de ordens que oculte dados antigos.

Equipamento: `_id` estável, nome obrigatório, marca/modelo/série opcionais, solicitação explícita (`relato` com descrição ou `testar`), andamento e retirada. Retirada nova usa instante UTC do servidor e ator autenticado. Exibição futura America/Sao_Paulo. Retirada histórica tem origem legado e horário desconhecido; ausência de horário não significa equipamento na empresa.

Separar `routes/ordersV2.js`, controller HTTP, `services/orders.js`, validação/DTO e transformação legada pura. Modelo Counter separado. Sem repository genérico, biblioteca nova ou mudança de framework. Serviços validam o documento completo antes da escrita com comparação de versão; não depender apenas de validadores parciais de update do Mongoose.

Limites e semântica seguem [API-V2](../contratos/API-V2.md): 1–100 equipamentos; página padrão 25/máximo 100; corpo 512 KiB; campos desconhecidos rejeitados. PATCH omisso preserva; opcional null/vazio limpa; obrigatório vazio é inválido. IDs, número, autoria, versão e retirada não são editáveis pelo payload. Datas civis permanecem datas, sem inventar instantes históricos.

## Contrato HTTP executável proposto

Somente ordens ganham `/api/v2`; autenticação continua em `/api/auth` com os contratos implementados na etapa 02. Os endpoints de auth/funcionários v2 do documento histórico continuam propostas fora deste trabalho.

| Operação | Contrato |
| --- | --- |
| GET `/api/v2/orders` | `{data, meta}`; filtros q/status/entrega, página e ordenação com desempate por `_id` |
| GET `/api/v2/orders/summary` | Contagens no conjunto filtrado inteiro; rota antes de `/:id` |
| GET `/api/v2/orders/:id` | `{data}` e ETag |
| POST `/api/v2/orders` | Cliente, itens, datas/opcionais; Idempotency-Key obrigatório; 201 nova ou 200 repetição reconhecida |
| PATCH `/api/v2/orders/:id` | Campos comuns permitidos; nunca substituir array ou alterar status/retirada |
| POST/PATCH/DELETE de equipamentos | Paths descritos em API-V2; não remover último item; composição bloqueada após primeira retirada até decisão |
| PUT retirada de equipamento | Corpo vazio, precondição e identidade; horário pelo servidor |
| DELETE ordem | Admin e precondição; 204; não afeta outra OS |

Todas as mutações de recurso existente exigem If-Match com ETag forte `"os-ID-vVERSION"`: 428 ausente, 412 desatualizado, 409 conflito de negócio. Sessão inválida 401; permissão 403; ID malformado 400; ausente 404; indisponibilidade 503. Envelope e limites seguem API-V2; requestId sem dados pessoais. Express 4 deve encaminhar rejeições assíncronas explicitamente ao handler central.

Atualização usa filtro `_id + version + schemaVersion`, valida estado candidato e grava equipamentos/agregado/versão juntos. Duas edições simultâneas: uma vence; outra recebe 412. Retirada repetida com versão atual devolve o primeiro horário sem novo efeito; versão antiga retorna 412 e exige releitura.

Idempotência: chave aleatória de 16–128 caracteres ASCII seguros por tentativa, escopo por ator, hash do payload normalizado e índice único parcial na OS. Metadados internos não entram no DTO. Mesma chave e conteúdo retornam OS existente; conteúdo distinto retorna 409. Corrida de inserção é recuperada consultando a chave vencedora. Após exclusão intencional, a garantia daquela chave deixa de existir, conforme contrato histórico; não anunciar garantia permanente.

## Numeração, índices e consultas

Contador atômico persistente e índice único de numero; nunca diminuir após exclusão. Inicialização exige inventário reconciliado de números válidos e máximo, não contagem. Números inválidos/duplicados bloqueiam inicialização; nenhuma renumeração automática. Banco novo descartável pode inicializar explicitamente zero nos testes. Banco real não será inicializado neste trabalho.

Escritas v1 devem ser interrompidas antes de inicializar o contador. O serviço v2 não inicializa contador implicitamente durante POST: se não preparado, responde indisponibilidade controlada. Inicialização repetida nunca reduz valor; conflitos detectados em vez de sobrescrever estado. Incremento e criação da OS são documentos distintos: falhas podem consumir números, sem transação apenas para impedir lacunas. Inventário histórico de exclusões continua necessário para afirmar não reutilização anterior.

Índices mínimos: numero único, ator/chave idempotente único parcial, dataEntrada/_id. Avaliar sequência/_id para ordenação numérica com explain em fixtures. Busca literal escapada e limitada; não aceitar objetos Mongo/regex arbitrária. Não afirmar que substring usa índice. Contagens e listagem podem observar instantes diferentes durante escritas; sem promessa de snapshot entre requisições.

## Decisões de negócio ainda não aprovadas

P01/P02/P11 continuam abertas. Para avançar no fluxo normal, propor:

1. Retirada antecipada permanece indisponível enquanto a empresa não decidir. Item Pronto pode ser retirado; Aguardando/Em andamento retorna conflito explícito.
2. Correção de retirada permanece indisponível, inclusive para admin, até definir permissão e histórico. Nenhum PATCH serve de atalho.
3. Inclusão/remoção de equipamentos após primeira retirada permanece indisponível até definição. Edição descritiva não altera a retirada.
4. **Agregado para revisão:** considerar somente equipamentos ainda na empresa. Todos Aguardando → Aguardando; todos Pronto → Pronto; mistura → Em andamento. Todos retirados → Entregue. Mostrar entrega parcial separadamente.

Exemplo sintético: OS com três itens, um sem marca e outro Testar, cliente sem e-mail. Após todos ficarem Pronto, retirar um: parcial 1/3 e OS Pronto, dois na empresa. Retirar os demais: completa 3/3 e Entregue. Se os dois restantes estiverem Aguardando e Pronto, a proposta mostra Em andamento + parcial 1/3. Essa agregação depende da revisão; ausência de resposta não aprova.

## Preservação e transição

- Transformação pura idempotente recebe fixture, preserva ID/número/dados conhecidos e gera ID de equipamento determinístico/estável. Segunda aplicação não muda o resultado. Campo ausente não vira Testar.
- Inspecionar documentos brutos, evitando getters legados que ocultam dados. Guardar valores históricos conhecidos; campos desconhecidos ou inválidos geram relatório de reconciliação sem descarte silencioso. Não aplicar limites novos truncando informações antigas.
- Leitura compatível dos legados precisa ser explícita e sem persistência automática: DTO marca legado/reconciliação, conserva dados conhecidos; registros incompatíveis não somem da lista. Escrita v2 em documento ainda legado retorna conflito de migração necessária. Não transformar dados reais ao fazer GET.
- Desativar mutações v1 com erro explícito de cliente incompatível e sem efeitos. Leituras v1 não achatam v2: se houver incompatibilidade no conjunto solicitado, retornar necessidade de atualização, sem lista incompleta silenciosa. Nenhum processo v1 antigo pode permanecer escritor no futuro corte.
- Next passa a consumir v2 por transporte fixo e DTO tipado; lista mostra todos os nomes ou quantidade com informação explícita, filtros/paginação do servidor e estados existentes. Sem formulários da etapa 04. Login/logout permanecem na API atual.
- Scripts preparados nesta etapa devem operar exclusivamente fixtures/ambiente descartável, sem ler `.env` ou URI real. Aplicador remoto e janela de manutenção dependem da etapa 05 autorizada.
- Reversão de aplicação exige versão que leia v2. Não voltar a um escritor v1 com novas OS presentes. Backup/restore, reconciliação de escritas pós-corte e inventário real continuam P15/P16/P24.

## Primeira fatia e ampliação

Após aprovação A/B: implementar criação com três equipamentos → persistência → GET, incluindo opcionais, Testar, acesso compartilhado, 401, entrada inválida, idempotência e numeração concorrente. Usar HTTP/MongoDB descartável; manter regressões de autenticação. Demonstrar resultados e limitações no checkpoint C antes de ampliar para edição/retiradas/consultas completas. Não prometer etapa concluída na primeira fatia.

Matriz de conclusão da etapa completa:

| Área | Evidência exigida |
| --- | --- |
| Dados | Três itens preservados após GET; sem marca/e-mail; Testar explícito; campos omitidos/null/vazio/unknown testados |
| Concorrência | Criações simultâneas sem número duplicado; repetição mesma chave; chave divergente; contador não recua; falha de inserção não cria OS parcial |
| Retirada | 1/3, depois 3/3; repetição preserva instante; versão antiga 412; corrida não perde retirada; exceções bloqueadas |
| Permissões | Sem sessão 401; outra conta consulta; atendente/técnico não excluem; admin exclui apenas alvo |
| Consultas | Limites, ordenação estável, filtros/contagens, página vazia, operadores rejeitados |
| Legado | IDs/números preservados; entregue sem horário continua histórico; falta de relato exige reconciliação; transformação repetida igual |
| Compatibilidade | Escritor v1 não altera v2; Next login/lista/logout/reload continuam com API real |
| Qualidade | Tipagem, lint, build, HTTP e navegador pertinentes; nenhum banco real |

## Referências oficiais consultadas

- [MongoDB: atomicidade](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/): escrita por documento e filtro de valor esperado fundamentam comparação de versão.
- [MongoDB: índices únicos](https://www.mongodb.com/docs/manual/core/index-unique/): duplicidades existentes impedem criação de índice; inventário antecede corte.
- [Mongoose 8: validação](https://mongoosejs.com/docs/8.x/docs/validation.html): unique não é validador; validar documento/subdocumentos e tratar conflito do índice.
- [Express 4](https://expressjs.com/en/4x/api.html) e [tratamento de erros](https://expressjs.com/en/guide/error-handling.html): a página geral atual trata Express 5; não presumir encaminhamento automático de Promise no Express 4 instalado.

Não se declara desempenho adequado por esses fundamentos; medições posteriores devem informar fixtures, método e limites.

## Revalidação da base nesta preparação

Windows/Node 24.21.0, dependências já instaladas; instalação limpa não repetida. `npm run check`: exit 0, tipagem e lint sem erros, 16 testes HTTP/Mongo descartável aprovados (12,93 s), build Next aprovado. Aviso Browserslist antigo permanece P20. `npm run test:e2e`: exit 0, seis testes Chromium aprovados (24,1 s). Aviso NO_COLOR/FORCE_COLOR sem falha. Parte dos estados vazio/401 usa interceptação declarada na suíte; login/listagem/logout e indisponibilidade exercitam API real isolada. Esses resultados revalidam a etapa 02, não comprovam a proposta v2. CI remoto, Atlas, dados reais e performance operacional não verificados.
