# Etapa 03 — backend de ordens e compatibilidade Next

23/10/2026. Branch `feat/backend-ordens-v2`, continuação de `8c22443`. O usuário respondeu “Pode aprovar então” à demonstração do primeiro fluxo: checkpoint C aprovado para ampliar dentro do Prompt 03. Nenhuma autorização de publicação, banco real ou telas completas da etapa 04 foi inferida.

Commit da implementação completa deste ciclo: `f063d7e`. A primeira fatia permanece no histórico em `df1e852`; documentação e decisões iniciais em `6f949fa` e `8c22443`.

## Entregas verificáveis

- API v2 cria, consulta, edita e exclui ordens; inclui/edita/remove equipamentos e registra retirada por item.
- Nome/telefone do cliente e identificação do equipamento obrigatórios; marca/modelo/série/e-mail opcionais. Relato explícito ou Testar, sem preencher informação histórica ausente.
- Mutações existentes exigem ETag/If-Match. Ausência retorna 428; versão desatualizada 412. Escrita de item, status agregado e incremento de versão ocorre no mesmo documento, com filtro de versão. Não depende de transação entre documentos.
- Retirada usa instante UTC do servidor e funcionário autenticado. Com versão atual, repetição retorna primeiro evento sem alteração; com versão antiga retorna 412. Todos retirados → Entregue. Entre os presentes: todos Pronto → Pronto, todos Aguardando → Aguardando, demais combinações → Em andamento. Entrega parcial é dimensão separada.
- Retirada antecipada, correção e alteração de composição após primeira retirada permanecem explicitamente indisponíveis. Edição descritiva não sobrescreve retirada. Admin pode excluir a OS completa, conforme regra confirmada.
- Exclusão administrativa exige versão; remove somente documento alvo, equipamentos embutidos e eventual origem histórica embutida. Não toca outras ordens nem reduz contador. Segunda exclusão retorna 404.
- Número imutável, contador atômico, índice único e idempotência por ator/chave. Falhas podem consumir números. Não prometer sequência sem lacunas ou não reutilização de números excluídos antes do contador existir.
- Paginação no servidor, busca literal escapada, filtros de status/entrega, ordenação estável e summary do conjunto filtrado. Página padrão 25, máximo 100; page máximo técnico 1.000.000. Query inválida retorna 400, consulta limitada a 5 segundos. Não aceitar operadores/regex arbitrária.
- Next usa transporte fixo `/api/orders` → `/api/v2/orders`, sem acesso ao MongoDB nem regras de negócio duplicadas. Busca/filtros/páginas no servidor; todos os nomes de equipamentos aparecem, sem achatamento. Estados de sessão, erro, vazio e retry preservados. Interface e identidade visual mantidas; busca ocupa largura útil no mobile.

## Contratos e erros

Rotas de ordens sob `/api/v2/orders`: GET/POST raiz, GET summary, GET/PATCH/DELETE :id, POST :id/equipamentos, PATCH/DELETE :id/equipamentos/:eid, PUT :id/equipamentos/:eid/retirada. DELETE OS somente admin; demais operações compartilham acesso entre funcionários. Auth permanece `/api/auth`; gestão de funcionários não implementada nesta etapa.

Criação: `{data: OS}`, 201 + Location + ETag; repetição reconhecida 200. Consulta individual 200; lista `{data: OS[], meta:{page,pageSize,total,totalPages}}`; summary `{data:{total,equipamentos,retirados,porStatus:[{status,total}]}}`. Meta e summary não são contagem apenas da página. Consultas separadas podem observar instantes distintos durante escritas; não prometem snapshot transacional.

Envelope de erro v2 `{error:{code,message,fields?,requestId}}`. Além dos códigos gerais de API-V2: NUMBERING_NOT_READY (503), NUMBER_CONFLICT, LEGACY_MIGRATION_REQUIRED, COMPOSITION_LOCKED, LAST_EQUIPMENT, EQUIPMENT_NOT_READY e INVALID_PROGRESS (409). Tipo/enum inválido é validação 400; tentativa de mudar andamento após retirada é conflito 409. Sem stack, erro bruto ou valores de campos nos erros. Parser 512 KiB. Sessão inválida 401; banco/rede/timeout indisponível 503. Auth existente continua autoridade de identidade, perfil e revogação.

## Legado, índices e reversão

Leitura v2 inclui documentos antigos sem gravação automática. DTO marca `compatibility.legacy/readOnly/requiresReconciliation`; dados desconhecidos ficam null. Item Entregue histórico tem retirada `{origem:"legado",retiradoEm:null,registradoPor:null}` e andamento desconhecido null, sem inventar Pronto. Ausência de relato não vira Testar. Campos malformados continuam no registro original, sem derrubar a renderização; precisam de reconciliação.

`transformLegacy` é função pura e idempotente. Preserva ID/número/referências e dados conhecidos; ID de equipamento é determinístico. Dados obrigatórios inválidos bloqueiam transformação com caminhos de campo, sem valores pessoais. Fonte completa fica em `migration.original`, interna e omitida dos DTOs, para preservar valores extras/semântica original. Não imprimir/exportar essa fonte em relatórios. Retenção/exclusão segue a OS, sem TTL.

`node backend/scripts/transform-order-fixtures.js --fixtures-only` processa somente fixtures sintéticas embutidas: três entradas, duas transformações e uma bloqueada por falta de relato, zero escritas. A suíte HTTP também aplica transformação somente no Mongo descartável, relê, confere IDs/retirada desconhecida e valida o schema. Não existe modo de aplicar esse script a uma URI real.

Índices v2: `numero` único; `createdBy + creationKey` único parcial, apenas schemaVersion 2 e chave string (legado migrado não recebe chave fictícia); `dataEntrada desc + _id desc`. Índice de contador _id. Mudança do índice parcial em relação à primeira fatia exige preparação explícita no ambiente de destino; não executar drop/syncIndexes automático. POST verifica índices obrigatórios e contador antes de alocar, falhando fechado se não preparados. A preparação e reconciliação de máximo foram executadas somente em fixtures; aplicador operacional depende de inventário/backup na etapa 05.

Com documentos somente v2, a consulta por data usa ordenação nativa e índice. Com legado misto, datas e números precisam de normalização na agregação: caminho transitório pode varrer/ordenar em memória. Busca substring também pode varrer; sem alegação de busca indexada ou capacidade em volume real. Índices adicionais exigem medição do volume efetivo. Existência de legado é verificada por consulta adicional; otimização depende da retirada desse caminho após corte validado.

Escritores HTTP v1 bloqueados; controllers de escrita e gerador baseado na última OS removidos. GET v1 não converte v2 em primeiro equipamento: retorna necessidade de atualização quando incompatível. Next já utiliza v2. Código antigo não deve ser reativado sobre coleção com v2.

Reversão futura: suspender escritas, preservar backup e inventário antes do corte, guardar aplicação compatível com v2, reconciliar alterações posteriores. A fonte embutida não substitui backup nem restauração e não autoriza descartar novas OS. Não restaurar um snapshot antigo por cima de dados novos. Nenhum banco real foi inventariado ou transformado; índices reais, duplicidades, números apagados e backups permanecem desconhecidos.

## Testes e limites

Windows, Node 24.21.0, Express 4.21.2, Mongoose 8.19.3, MongoDB descartável 8.0.17, Chromium Playwright. Dependências preservadas; instalação limpa não repetida.

- `npm run check`: tipagem/lint/build e 36 testes HTTP/Mongo passaram. Primeiro lint apontou variável de descarte não utilizada; corrigida sem relaxar regra. Checks posteriores passaram.
- Após revisão dos dados legados, `npm --prefix backend test`: 36 aprovados; suíte específica v2 repetida após último ajuste de dados malformados: 20 aprovados.
- `npm run test:e2e`: sete cenários, incluindo banco misto com 27 ordens, paginação real, busca por segundo equipamento e exibição dos demais. Estados vazio/parte dos erros usam interceptação declarada; jornada principal e indisponibilidade do servidor usam Express/Mongo real isolado.
- Capturas desktop 1280px e mobile 360px inspecionadas. Não é auditoria completa de acessibilidade; telas futuras mantêm P14.
- `git diff --check`, script de fixtures e lint executados. Avisos remanescentes: Browserslist antigo (P20) e NO_COLOR/FORCE_COLOR no runner. Nenhuma atualização indiscriminada.

Medição local limitada em teste: 50 OS sintéticas, dez GET paginados sequenciais, mediana observada 16,18 ms e máximo 19,83 ms numa execução; inclui HTTP/autenticação/Mongo em loopback. Explain da consulta nativa por data retornou 25 documentos, examinou 25 e usou o índice composto. Não cobre caminho misto, substring com grande volume, Atlas, concorrência representativa ou latência de hospedagem; não comprova desempenho de produção.

| Critério | Evidência |
| --- | --- |
| Três itens, marca/email opcionais, Testar | Criação e GET por outra conta, IDs/campos comparados ao Mongo |
| Limpeza e edição sem perda | PATCH null/vazio, ausência preservada, IDs e demais itens conferidos |
| Retirada parcial/completa e repetição | 1/3 e 3/3, relógio servidor/ator, primeiro instante preservado, versão antiga 412 |
| Concorrência | Duas edições e duas retiradas: um sucesso/um 412; releitura e nova tentativa preservam efeito vencedor |
| Numeração/idempotência | 16 criações distintas, oito tentativas iguais, máximo reconciliado, exclusão sem recuo, índices/contador ausentes |
| Permissões | Sem sessão 401, acesso compartilhado, exclusão não admin 403, admin exclui apenas alvo |
| Consultas | Limites, total fora da página, summary/filtros, regex literal, página fora do fim |
| Legado | Leitura sem escrita, entregue sem horário, fonte preservada, transformação repetida igual, malformados reconciliáveis |
| Next | Login/logout/recarga/troca de conta, lista mista, todos os equipamentos, paginação e busca real |

Não houve CI remoto, carga em produção, Atlas, backup/restore real, push, merge ou deploy. P18 permanece bloqueio de publicação por dependências/controles operacionais ainda pendentes.

## Próxima etapa

Prompt 04: formulários, detalhe, edição e retirada no Next e gestão de funcionários, usando contratos existentes. Não implementar isso automaticamente. As exceções de retirada e política de funcionários ainda exigem decisões. Preparação operacional do banco, reconciliação e aplicação/rollback autorizados pertencem à etapa 05. Segurança/abuso/dependências continuam etapa 06 antes de publicação.

Validação final de navegador após ajuste mobile e revisão do legado: sete testes aprovados em 25,5 s, sem retries. Build final e lint final passaram. Captura mobile revisada confirmou campo de busca em largura útil. Arquivos principais: backend/services/ordersV2.js, orderQueries.js, legacyOrders.js, backend/models/OrderV2.js, backend/routes/ordersV2.js, web/Orders.tsx, web/server/api.ts, app/api/orders/route.ts e respectivas suítes. Controllers/modelo legados perderam os caminhos de escrita/numeração antigos. Nenhuma dependência ou lockfile alterado.
