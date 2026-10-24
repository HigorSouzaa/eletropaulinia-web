# API e dados v2 — contrato e histórico

**Estado atual após etapa 04 e exceções posteriores:** endpoints de ordens integrados às telas Next. Auth continua em `/api/auth`; cadastro administrativo permanece `/api/auth/register`. `/api/v2/employees` lista/consulta/edita, `/api/v2/employees/:id/access` desativa/reativa e `/api/v2/employees/:id/password-reset` redefine senha presencialmente. Os dois últimos revogam sessões anteriores por versão de sessão. [Contrato de Funcionários](../dev-back/ETAPA-04-FUNCIONARIOS-CONTRATO.md). As regras novas de retirada e composição estão no adendo ao fim deste documento; trechos antigos abaixo são históricos. [Etapa 03](../dev-back/ETAPA-03-ENTREGA.md).

Estado: especificação, não implementada. Regras confirmadas em [README](README.md); decisões excepcionais pendentes não são autorizadas por este documento. Prefixo proposto /api/v2 para impedir mudança silenciosa de payload no cliente Vite.

Atualização etapa 03: arquitetura e contrato de ordens aprovados após 6f949fa. Apenas POST /api/v2/orders e GET /api/v2/orders/:id implementados na primeira fatia; demais endpoints abaixo continuam especificação. Autenticação permanece /api/auth. [Entrega parcial e limitações](../dev-back/ETAPA-03-PRIMEIRO-FLUXO.md). O estado inicial acima é histórico, não descrição de conclusão de toda a API.

## Convenções e limites técnicos propostos

JSON UTF-8. IDs opacos de 24 caracteres hexadecimais para OS/equipamento/funcionário; gerados pelo servidor. Campos desconhecidos rejeitados com 400. Rejeitar objetos/arrays onde se espera string; não aceitar operadores Mongo do cliente. Limites abaixo são proteção técnica inicial, revisáveis conforme inventário, não regras históricas da empresa.

| Campo | Entrada/limite |
| --- | --- |
| cliente.nome | String aparada, 1–120 caracteres |
| cliente.telefone | String aparada 1–32; aceitar formatação e +; validar presença de dígitos; não impor celular brasileiro de 11 dígitos |
| cliente.email | Opcional, até 254, formato de e-mail; não identifica cliente único |
| equipamentos | 1–100 por OS; limite técnico proposto, inventário deve detectar legados acima dele |
| equipamento.nome | 1–160 |
| marca, modelo | Opcionais, até 120 cada |
| numeroSerie | Opcional, até 120; não impor unicidade sem regra |
| solicitacao.tipo | relato ou testar |
| solicitacao.descricao | Obrigatória 1–2000 para relato; null/omitida para testar |
| tecnico | Texto opcional até 120, compatibilidade com atribuição atual |
| observacoes | Texto opcional até 5000 |
| dataEntrada, dataPrevista | Datas civis YYYY-MM-DD; entrada obrigatória no contrato de criação, prevista opcional |
| motivo excepcional | 1–500 quando o fluxo correspondente for aprovado |
| corpo | Máximo proposto 512 KiB; 413 acima disso |
| version | Inteiro >=1, retornado pelo servidor; não é data nem número da OS |

Campos opcionais ausentes na criação viram null; no PATCH ausentes não mudam, null limpa e string vazia aparada normaliza para null. Obrigatórios não aceitam null/vazio. Lista vazia de equipamentos é inválida. Senhas não sofrem trim. Datas civis preservam semântica existente; instantes de retirada/criação/atualização usam ISO 8601 UTC. Exibição local America/Sao_Paulo. Não converter uma data civil em meia-noite local para depois mudar o dia.

OS: _id, numero imutável, schemaVersion=2, version, cliente, equipamentos, dataEntrada, dataPrevista, tecnico, observacoes, status derivado, entrega derivada, createdBy, createdAt, updatedAt. Equipamentos embutidos têm _id estável, nome, marca, modelo, numeroSerie, solicitacao, andamento, retirada.

## Andamento e retirada

Proposta: andamento por equipamento usa Aguardando, Em andamento ou Pronto. Retirada é dimensão separada e não é um quinto estado comercial. Não aceitar Entregue no PATCH genérico.

- retirada=null: permanece na empresa.
- retirada={retiradoEm, registradoPor}: entregue, com instante do servidor e ator da sessão.
- entrega.situacao: nenhuma, parcial ou completa; retirados e total derivados.
- OS status=Entregue somente com todos retirados.
- Nos demais casos, proposta de agregação entre itens ainda presentes: todos Pronto → Pronto; todos Aguardando → Aguardando; qualquer outra combinação → Em andamento.
- UI mostra “Retirada parcial (1/3)” separadamente, mesmo que agregado seja Pronto.
- Agregação entre andamentos heterogêneos é proposta técnica a revisar; preserva o vocabulário atual, mas não é comportamento já existente.
- Alteração de andamento em item retirado: 409 até correção autorizada da retirada.
- Não permitir retirar antes de Pronto enquanto a exceção de negócio não for decidida. Se aprovada, exigir motivo e registrar a exceção sem alterar falsamente andamento para Pronto.
- Correção de retirada depende de decisão de perfil. Proposta: operação dedicada com motivo, preservando evento anterior e instante da correção dentro da OS; não sobrescrever horário silenciosamente.
- Remoção de equipamento já retirado deve retornar 409; exclusão administrativa da OS continua definitiva. Inclusão/remoção de itens após primeira retirada requer decisão explícita; proposta inicial bloquear alteração de composição, permitindo correção dos dados descritivos com version.

Legacy: OS Entregue sem horário conhecido deve conservar entrega histórica, com origem=legado e retiradoEm=null; isso não é item pendente. Exceção de leitura/migração, nunca aceita como nova retirada pelo cliente. Dados antigos não ganham relato Testar, marca ou horário fictícios.

## Endpoints propostos

Todos exceto login exigem sessão. Express aplica a matriz de permissões e valida IDs antes da consulta. 404 para ID válido inexistente; 400 para formato inválido.

| Método e caminho relativo a /api/v2 | Entrada | Sucesso |
| --- | --- | --- |
| POST /auth/login | username, password | 200 perfil público e sessão via transporte escolhido |
| GET /auth/me | Sessão | 200 {data: funcionário público} |
| POST /auth/logout | Sessão | 204, revoga sessão atual |
| GET /orders | page, pageSize, q, status, entrega, sort, direction | 200 {data: OS[], meta: paginação} |
| GET /orders/summary | Mesmos filtros de busca/status/entrega | 200 {data: contagens calculadas no banco} |
| GET /orders/:id | ID | 200 {data: OS}, ETag |
| POST /orders | cliente, equipamentos sem IDs, datas e opcionais | 201 {data: OS}, Location e ETag |
| PATCH /orders/:id | Campos editáveis de cliente/datas/técnico/observações; If-Match | 200 {data: OS}, ETag novo |
| POST /orders/:id/equipamentos | Equipamento sem ID; If-Match | 201 {data: OS} |
| PATCH /orders/:id/equipamentos/:eid | Descrição/solicitação/andamento; If-Match | 200 {data: OS} |
| DELETE /orders/:id/equipamentos/:eid | If-Match | 200 {data: OS}; nunca remover último |
| PUT /orders/:id/equipamentos/:eid/retirada | Corpo vazio no fluxo normal; If-Match | 200 {data: OS}; horário pelo servidor |
| DELETE /orders/:id | Admin; If-Match | 204; segunda exclusão 404 |
| POST /orders/:id/equipamentos/:eid/correcoes-retirada | Motivo; If-Match | Reservado; sem habilitar antes de definir permissão |
| GET /employees | Admin; page/pageSize/q/role/active | 200 {data: funcionários públicos[], meta} |
| POST /employees | Admin; username/name/password/role | 201 perfil público, sem sessão nova |
| PATCH /employees/:id | Admin; name/role; If-Match | 200 perfil público |
| PATCH /employees/:id/access | Admin; active; If-Match | Proposto, depende da regra de desligamento |
| POST /employees/:id/password-reset | Admin; nova senha; If-Match | Proposto 204, depende da regra de recuperação |

Rotas estáticas /orders/summary precedem /orders/:id. Os métodos de equipamentos evitam substituição acidental de todo array. Alterar status geral pela rota antiga não pode contornar as retiradas.

Listagem: page >=1, padrão 1; pageSize 1–100, padrão 25. q até 100 caracteres, busca literal escapada (sem regex arbitrária) em numero/cliente.nome/telefone/equipamento.nome; não prometer busca por índice para substring. status enum atual; entrega nenhuma/parcial/completa; sort permitido dataEntrada, createdAt ou numero, padrão dataEntrada desc com _id como desempate. numero ordenado por sequência numérica interna. Parâmetros inválidos 400. Meta: page,pageSize,total,totalPages. Página além do fim retorna array vazio. Summary usa os mesmos filtros, não apenas a página.

## Concorrência, número e idempotência

Resposta individual ETag: "os-ID-vVERSION". Exigir If-Match em edição, exclusão e retiradas: ausente 428 PRECONDITION_REQUIRED; divergente 412 VERSION_CONFLICT; regra de negócio 409. Filtro da atualização inclui _id e version; atualizar equipamento e projeções da OS no mesmo comando/documento e incrementar version. Não confiar em read → save sem proteção de concorrência.

Retirada repetida: verificar sessão, recurso e precondição; se versão atual e item já retirado, devolver mesmo horário sem incrementar versão. Com ETag antigo, devolver 412 sem modificar; cliente relê e reconhece que a retirada já ocorreu, sem repeti-la. Idempotência é de efeito, não promessa de resposta idêntica.

POST de OS deve aceitar chave de idempotência aleatória por tentativa lógica; índice único por ator/chave e hash de payload persistidos na própria OS. Mesma chave+payload retorna OS existente, sem criar duplicata; chave reutilizada com payload diferente 409. Nunca derivar chave de dados pessoais. Exclusão definitiva remove também esse registro; não repetir uma criação após exclusão intencional. Gaps de numeração em tentativas falhas são aceitáveis.

Número: contador atômico persistente, índice único de numero, imutável pelo cliente. Inicializar acima do máximo válido existente; inventariar históricos/exportações para não prometer ausência de reutilização de números já excluídos antes do contador existir. Nunca reduzir contador ao excluir. Geração usa incremento atômico, mas contador e OS são documentos distintos: falha de inserção pode consumir número. Não exigir transação só para evitar lacunas.

Proposta de índices: numero único, (_id,version) via filtro com _id indexado, (dataEntrada desc,_id desc), e (status,dataEntrada desc,_id desc) se plano de consulta justificar. Não criar todos os índices sugeridos sem explain/dados representativos. Sem TTL nas OS. Único para username e para chave idempotente quando presente. Contagens e lista podem observar instantes diferentes sob novas escritas; não prometer snapshot transacional sem necessidade.

MongoDB confirma atomicidade por documento e filtros com valor esperado para concorrência; isso fundamenta a proposta, não comprova sua implementação. [Documentação](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/).

## Erros

Envelope v2:
```json
{"error":{"code":"VALIDATION_ERROR","message":"Dados inválidos","fields":[{"path":"equipamentos.0.nome","code":"REQUIRED"}],"requestId":"exemplo-sintetico"}}
```

400 VALIDATION_ERROR/INVALID_ID/INVALID_JSON; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND; 409 BUSINESS_CONFLICT/USERNAME_TAKEN/IDEMPOTENCY_CONFLICT; 412 VERSION_CONFLICT; 413 PAYLOAD_TOO_LARGE; 428 PRECONDITION_REQUIRED; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 503 SERVICE_UNAVAILABLE. Não incluir valores submetidos, stack, senha, URI ou erro bruto do driver. requestId serve correlação sem dados pessoais. Falha de banco não deve deslogar usuário como se fosse 401.

## Funcionários e sessão

Manter username como login: 3–100, name 1–120, perfis existentes, padrão atendente; username imutável nesta proposta para evitar novo fluxo. Preservar sensibilidade a maiúsculas atual até inventário de colisões; não converter existentes automaticamente. Senhas novas 12 caracteres mínimos e 72 bytes máximos conforme primeiro ciclo; login legado continua aceitando senha menor. Validar política em todas as entradas administrativas, não apenas no schema.

Proposta de desligamento: active=false, sessões revogadas, createdBy/referências preservados. Nunca remover ou rebaixar/desativar o último admin ativo; concorrência entre duas operações requer proteção transacional/invariante, não somente contar antes de salvar. Proposta de recuperação: admin redefine senha por canal manual, invalida sessões e exige troca no próximo login; endpoint adicional de troca própria deve ser especificado se essa proposta for escolhida. Não implementar recuperação incompleta como se estivesse aprovada. Nenhum hash/token em DTO de funcionário. Sem exclusão de funcionário nesta proposta.

Transporte de sessão e cache descritos em [arquitetura](ARQUITETURA-E-TRANSICAO.md). Express continua autoridade mesmo quando Next bloqueia uma página.

## Exemplo sintético: criação e retirada parcial

POST /api/v2/orders:
```json
{
  "cliente":{"nome":"Cliente de teste","telefone":"0000000000","email":null},
  "dataEntrada":"2026-10-23",
  "equipamentos":[
    {"nome":"Ventilador","marca":null,"solicitacao":{"tipo":"relato","descricao":"Não liga"}},
    {"nome":"Liquidificador","solicitacao":{"tipo":"testar"}},
    {"nome":"Ferro","solicitacao":{"tipo":"relato","descricao":"Não aquece"}}
  ]
}
```

201: exemplo de DTO completo com opcionais normalizados; IDs e horários são fictícios.
```json
{
  "data":{
    "_id":"000000000000000000000001","numero":"OS-0101","schemaVersion":2,"version":1,
    "cliente":{"nome":"Cliente de teste","telefone":"0000000000","email":null},
    "dataEntrada":"2026-10-23","dataPrevista":null,"tecnico":null,"observacoes":null,
    "equipamentos":[
      {"_id":"000000000000000000000011","nome":"Ventilador","marca":null,"modelo":null,"numeroSerie":null,"solicitacao":{"tipo":"relato","descricao":"Não liga"},"andamento":"Aguardando","retirada":null},
      {"_id":"000000000000000000000012","nome":"Liquidificador","marca":null,"modelo":null,"numeroSerie":null,"solicitacao":{"tipo":"testar","descricao":null},"andamento":"Aguardando","retirada":null},
      {"_id":"000000000000000000000013","nome":"Ferro","marca":null,"modelo":null,"numeroSerie":null,"solicitacao":{"tipo":"relato","descricao":"Não aquece"},"andamento":"Aguardando","retirada":null}
    ],
    "status":"Aguardando","entrega":{"situacao":"nenhuma","retirados":0,"total":3},
    "createdBy":"000000000000000000000099",
    "createdAt":"2026-10-23T13:00:00.000Z","updatedAt":"2026-10-23T13:00:00.000Z"
  }
}
```

1. PATCH do item 11 com {"andamento":"Pronto"}, If-Match versão 1 → OS versão 2.
2. PUT retirada do item 11 com {}, If-Match versão 2 → versão 3; retirada={retiradoEm:"2026-10-23T14:00:00.000Z",registradoPor:"000000000000000000000099"}; entrega parcial 1/3; outros itens intactos.
3. GET confirma mesmos dados após recarga. Horário acima é exemplo da resposta, não entrada aceita.
4. Preparar itens 12 e 13 individualmente; retirar cada um com ETag vigente.
5. Só após última retirada: entrega completa 3/3 e status Entregue.
6. DELETE por atendente → 403 FORBIDDEN, sem mutação.

Exemplo de paginação sem resultados: {"data":[],"meta":{"page":1,"pageSize":25,"total":0,"totalPages":0}}.
Exemplo de funcionário público: {"data":{"_id":"000000000000000000000099","username":"funcionario-teste","name":"Funcionário de teste","role":"atendente","active":true,"version":1}}. active/version são campos propostos, não existentes hoje.
# Atualização executada — exceções de retirada (24/10/2026)

As regras anteriores deste documento sobre bloquear retirada antes de Pronto e composição após a primeira retirada são históricas. A decisão recente do usuário permite retirada de qualquer andamento, correção por todos os funcionários e alteração da composição após retirada. A API mantém `ETag`/`If-Match` e autenticação para essas mutações.

- `PUT /orders/:id/equipamentos/:eid/retirada`: corpo vazio; registra horário UTC e funcionário mesmo se o item estiver Aguardando ou Em andamento. Não altera artificialmente o andamento para Pronto. Repetição com versão atual mantém o primeiro evento; versão antiga retorna 412.
- `POST /orders/:id/equipamentos/:eid/correcoes-retirada`: `{ "motivo": "Lançamento por engano" }`; qualquer funcionário autenticado pode corrigir uma retirada operacional. Exige motivo não vazio até 500 caracteres, `If-Match` e item atualmente retirado. O estado atual volta a `retirada: null`; `historicoRetiradas` preserva o evento original, a correção, horários, autores e motivo. Sem retirada retorna 409 `NO_PICKUP_TO_CORRECT`; entrega histórica de origem legada não é corrigida por este endpoint.
- `POST /orders/:id/equipamentos` e `DELETE /orders/:id/equipamentos/:eid` continuam disponíveis após retirada. Não é permitido remover o último item nem item retirado ou com histórico de retirada (`EQUIPMENT_HISTORY_LOCKED`). Incluir novo item após OS Entregue reabre o agregado conforme os itens ainda presentes. Alterações concorrentes retornam 412.

O histórico permanece embutido na OS e nunca é aceito como entrada genérica de edição. Cópias antigas de documentos v2 sem `historicoRetiradas` recebem a retirada existente no histórico no momento da primeira correção. A regra de excluir a OS inteira por admin permanece separada.
