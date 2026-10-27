# Clientes, laudos e técnicos — proposta concreta para revisão

Data: 27/10/2026. Base inspecionada: `b2515e6`, branch de origem `feat/hospedagem-netlify-render`; branch de trabalho `feat/clientes-laudos-tecnicos`.

**Atualização após aprovação:** o usuário aprovou os contratos concretos e a primeira jornada ("Aprovo pode fazer"). Lookup, criação transacional de cliente/OS, snapshot e formulário estão implementados localmente; a área Clientes completa, avaliações, seleção de técnico e reconciliação continuam planejadas. Ver entrega da primeira jornada em `../qa/CLIENTES-PRIMEIRA-JORNADA.md`. O restante deste documento registra o contrato do pacote completo, não funcionalidades integralmente entregues.

**Estado histórico da preparação:** As regras de produto foram confirmadas pelo usuário; contratos, limites técnicos e estrutura abaixo estão em revisão nos checkpoints A/B da Dev Back Master e arquitetura/design da Dev Front Master. Não há aprovação presumida da primeira jornada funcional. [Plano de telas e testes](../dev-front/CLIENTES-LAUDOS-TECNICOS.md).

## 1. Base e evidências

Confirmado por inspeção:

- `backend/models/OrderV2.js`: cliente embutido, técnico textual, equipamentos sem laudo/orçamento; mantém IDs, versão e histórico de retiradas.
- `backend/services/ordersV2.js`: criação com idempotência e contador, sem transação conjunta; edições fazem CAS por versão, mas reutilizam a validação de criação da OS inteira.
- `backend/services/orderInput.js`: telefone exige apenas algum dígito; aumentar esta validação em todas as operações impediria editar equipamentos de OS antigas com telefone incompleto.
- `backend/routes/employees.js`: consulta administrativa; não deve ser liberada para preencher o seletor de técnicos.
- `backend/services/orderQueries.js`: lista paginada, sem filtro por clienteId; busca textual não representa vínculo com cliente.
- `web/server/forward.ts`: valida ETag dos tipos `os` e `user`, incluindo o transporte `X-Resource-Version`; será necessário acrescentar `client`, mantendo a checagem final no Express.
- `backend/tests/orders-v2.test.js` e `stage05-fixture.test.js`: usam Mongo descartável standalone; criação transacional exigirá replica set nesses cenários. Funcionários e E2E já usam replica set.
- Versões instaladas: Node 24.21.0, npm 11.19.0, Next 16.4.2, React 19.3.1, Express 4.22.3 e Mongoose 8.24.7. Não se propõe atualização de dependências.

Execução da base e limitações: [registro de validação](../qa/CLIENTES-LAUDOS-TECNICOS-BASE.md). Banco remoto, números existentes, possíveis colisões e desempenho de produção não foram verificados nesta tarefa.

## 2. Regras confirmadas e matriz de acesso

Clientes são separados de User e não recebem acesso ao sistema. Um cadastro por telefone normalizado; nome/telefone obrigatórios, e-mail opcional. Laudo e vários serviços com valores individuais pertencem a cada equipamento. Técnico da OS é opcional, selecionado entre técnicos/admins ativos. Endereço, CPF/CNPJ, mensagens, garantia, pagamentos e aprovação comercial ficam fora.

| Operação | Admin | Técnico | Atendente | Sem sessão |
| --- | --- | --- | --- | --- |
| Consultar cliente, buscar telefone e ver suas OS | Sim | Sim | Sim | 401 |
| Criar cliente junto com nova OS | Sim | Sim | Sim | 401 |
| Editar cadastro de cliente existente | Sim | 403 | 403 | 401 |
| Editar laudo/serviços e atribuir técnico da OS | Sim | Sim | Sim | 401 |
| Listar apenas técnicos elegíveis | Sim | Sim | Sim | 401 |
| Gerenciar funcionários/excluir OS | Sim | 403 | 403 | 401 |
| Excluir/fundir cliente ou fazer cadastro independente | Não existe nesta entrega | Não existe | Não existe | Não existe |

O cadastro automático por um funcionário não concede edição de cliente existente. Não há isolamento de OS por técnico. A exclusão de uma OS não exclui o cliente ou outra OS.

## 3. Dados propostos

### Client, coleção clients

`_id`, `nome`, `telefone`, `email`, `version`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`.

- `telefone`: formato canônico `+55` seguido de DDD e número nacional; índice único completo, sem sparse/partial.
- `nome`: trim, 1–120 caracteres; sem comparação aproximada para identificar pessoas.
- `email`: opcional, até 254 caracteres, null se omitido/vazio na criação; não é chave única.
- `version`: inteiro >=1; autoria/instantes/ID gerados no servidor, nunca aceitos no payload.
- Não adicionar array de IDs de ordens no cliente: consultar orders por clienteId para evitar lista crescente e dupla manutenção.
- Campos internos de coordenação, se necessários, não entram no DTO nem mudam a versão pública por simples consulta.

### Telefone

Proposta técnica brasileira: aceitar 10 dígitos nacionais para fixo (assinante iniciado entre 2 e 5) ou 11 para celular (assinante iniciado em 9), DDD com dois dígitos e primeiro diferente de zero. Esta é validação sintática, não prova da existência/propriedade da linha ou de DDD atribuído.

Aceitar espaços, parênteses e hífen. Aceitar +55 explícito ou 55 em entrada de 12/13 dígitos; não remover 55 de uma entrada nacional de 10/11 dígitos, pois pode ser DDD. Rejeitar letras, outros países, ramal, prefixo de operadora, dígitos excedentes e + fora do início. Não inserir o nono dígito ou truncar uma entrada inválida.

Exibição: `(DD) 99999-9999` ou `(DD) 9999-9999`. Compartilhar função pura de normalização/formatador e fixtures de equivalência entre Node e Next (módulo ESM + declaração TypeScript, sem dependência nova). A API continua validando independentemente do navegador. Fixtures usam números sintéticos e nenhuma chamada externa.

### OS e compatibilidade

- Manter `_id`, numero, schemaVersion=2 e todos os campos atuais. Acrescentar `clienteId` e `tecnicoId`, nulos na leitura de documentos anteriores.
- `cliente` continua como snapshot na OS; não é espelho atualizado automaticamente do Client. Nova criação copia dados do cadastro selecionado no servidor.
- `tecnico` continua como nome registrado na atribuição; `tecnicoId` é referência ao User. Não sobrescrever o nome histórico ao renomear ou desativar funcionário.
- Trocar cliente/reescrever snapshot após criação não faz parte desta entrega. Admin corrige o cadastro em Clientes; a interface explica a diferença entre cadastro atual e dados registrados na ordem.
- Nas edições, validar apenas o campo/operação pretendido. A inclusão ou alteração de equipamento não deve exigir converter telefone antigo, nem apagar novos campos de outros equipamentos.
- DTO deve enumerar campos permitidos; nunca expor hashes de idempotência, campos internos de coordenação ou conteúdo da fonte de migração.

### Avaliação por equipamento

Acrescentar `laudo` (string/null), `servicos` (array), `avaliacaoAtualizadaPor` e `avaliacaoAtualizadaEm`. Cada serviço possui `_id` estável gerado no servidor, `descricao` e `valorCentavos` inteiro. Expor `totalServicosCentavos` calculado; não armazenar total enviado pelo cliente.

Limites técnicos propostos: laudo 5.000 caracteres; até 100 serviços por equipamento; descrição 1–500; valor individual entre 0 e 99.999.999 centavos; total por equipamento até 999.999.999 centavos. Esses tetos são proteção de entrada, não preços ou regras comerciais da empresa. Corpo da OS continua limitado a 512 KiB; avaliação isolada a 128 KiB.

`servicos: []` significa sem orçamento e total null. Um serviço de valor 0 significa orçamento informado de total 0. Limpar laudo vira null; retirar o último serviço resulta em lista vazia. Não preencher preço antigo com zero.

Autoria e instante registram a última alteração efetiva de laudo/serviços, inclusive limpeza, no servidor. Não se promete histórico completo de revisões de orçamento neste pacote. IDs e conteúdo de retiradas permanecem intactos; alterações de avaliação não mudam andamento ou status agregado. Campos ausentes em registros antigos são apresentados como não informados, sem inventar datas/autores.

## 4. Endpoints propostos

Prefixo Express `/api/v2`; transporte Next `/api`. Rotas fixas, sem destino controlado pelo cliente. Todos exigem sessão e `private, no-store`.

| Método / rota Express | Contrato | Resposta |
| --- | --- | --- |
| POST /clients/lookup | `{telefone}`; consulta exata sem efeitos; 1 KiB | 200 `{data: clientDTO ou null}`; ETag se encontrado |
| GET /clients | q até 100, page>=1, pageSize 1–100 (padrão 25) | 200 `{data:[],meta:{page,pageSize,total,totalPages}}` |
| GET /clients/:id | ID válido | 200 `{data:clientDTO}` + ETag; 404 ausente |
| PATCH /clients/:id | Admin, If-Match; nome/telefone/email apenas; 16 KiB | 200 DTO + ETag |
| GET /orders?clienteId=:id | Extensão explícita dos filtros existentes, também no summary | Lista de OS realmente vinculadas, paginada |
| GET /technicians | page/pageSize, ordenação nome e ID | DTO mínimo `{_id,name}` e meta, somente admin/tecnico ativos |
| POST /orders | Nova união de entrada de cliente descrita abaixo; Idempotency-Key | 201 criada ou 200 replay; DTO de OS + ETag |
| PATCH /orders/:id | Campos operacionais existentes e tecnicoId; If-Match | 200 OS + ETag |
| PUT /orders/:id/equipamentos/:eid/avaliacao | `{laudo,servicos}` completo; If-Match da OS | 200 OS completa + ETag |

Lookup usa POST para não colocar o telefone exato na URL; não cria cliente. Next aplica a proteção de origem a esse POST também. Consultas por nome/telefone na lista não devem ser registradas em logs com query string.

ClientDTO: `_id,nome,telefone,email,version,createdAt,updatedAt`; autoria técnica permanece armazenada, sem necessidade de expô-la na listagem. ETag `"client-ID-vVERSION"`. PATCH omitido preserva; email null/vazio limpa; nome/telefone null/vazio rejeitados. Campos desconhecidos, objetos Mongo e arrays inesperados: 400. Compare-and-swap por `_id + version`; 412 protege rascunho, 428 exige precondição.

Ordenação de clientes: nome ascendente e _id como desempate; busca literal escapada e limitada, telefone canônico quando a entrada for completa. Não prometer busca substring indexada. Índices iniciais: clients.telefone único, clients(nome,_id), orders(clienteId,dataEntrada desc,_id desc), sem TTL. Confirmar plano de consulta com fixtures; adicionar outros somente com evidência.

### Criação de OS

Exatamente uma forma:

1. Cliente selecionado: `clienteId` + `clienteVersion` recebidos da consulta; não aceitar `cliente` simultaneamente. Nome/telefone/email vêm do servidor. Se o cadastro mudou, 409 `CLIENT_CHANGED`, solicitar consulta/revisão antes de nova tentativa.
2. Cliente novo: `cliente:{nome,telefone,email?}`; sem clienteId/version. Resolver telefone no servidor mesmo que o navegador tenha recebido resultado vazio. Se já existir, reutilizar apenas se nome normalizado for idêntico e qualquer email não vazio enviado também coincidir. Caso contrário, 409 `CLIENT_REVIEW_REQUIRED`, sem sobrescrever dados e sem OS criada. Email ausente não apaga email existente. Sempre preferir seleção explícita por ID na UI após encontrar o cadastro.

Técnico: `tecnicoId` omitido/null significa sem atribuição; texto arbitrário de técnico não é aceito para criar vínculo. Equipamentos podem incluir laudo/serviços opcionais, com IDs novos gerados no servidor.

Exemplo sintético de entrada (IDs ilustrativos, não pessoas reais):

```json
{
  "clienteId":"000000000000000000000001",
  "clienteVersion":1,
  "dataEntrada":"2026-10-27",
  "tecnicoId":null,
  "equipamentos":[{
    "nome":"Equipamento sintético",
    "solicitacao":{"tipo":"testar"},
    "laudo":null,
    "servicos":[]
  }]
}
```

Exemplo de avaliação:

```json
{
  "laudo":"Diagnóstico sintético para o teste local.",
  "servicos":[
    {"descricao":"Serviço sintético A","valorCentavos":12000},
    {"descricao":"Serviço sintético B","valorCentavos":3500}
  ]
}
```

Resposta: serviços recebem IDs, total 15500 centavos, autoria da sessão e instante UTC; equipamento e demais dados da OS preservados. Serviços existentes enviam seu `_id`; aceitar somente IDs pertencentes à avaliação do mesmo equipamento, sem repetição. Substituir a lista é intencional neste endpoint; campos omitidos no PUT são erro, evitando limpeza involuntária. IDs ausentes criam serviços novos. Corpo não aceita total, autor, horário, retirada ou andamento.

### Erros

Preservar envelope `{error:{code,message,fields,requestId}}` existente; fields usa caminhos/códigos, sem valores recebidos. 400 validação; 401 sessão inválida; 403 permissão; 404 recurso; 409 conflito de negócio; 412 versão; 413 tamanho; 428 precondição; 503 indisponibilidade.

Novos códigos 409: `PHONE_IN_USE`, `CLIENT_REVIEW_REQUIRED`, `CLIENT_CHANGED`, `TECHNICIAN_UNAVAILABLE`, `CLIENT_SNAPSHOT_IMMUTABLE`, `TECHNICIAN_SELECTION_REQUIRED`. `503 CLIENTS_NOT_READY` se faltar índice/configuração necessária. Falha de banco/rede não é 401 nem resultado vazio. Não devolver erro bruto do driver ou dados do cadastro conflitante no erro; o usuário autorizado pode refazer a consulta.

## 5. Consistência, transações e repetição

Proposta: cliente novo, contador e OS na mesma transação de replica set. Justificativa: não deixar cliente órfão por tentativa de OS que falhou e preservar vínculo diante de concorrência. Não é uma promessa de numeração sem lacunas ou reutilização de números excluídos.

1. Autenticar, validar chave e procurar replay do ator/chave antes de depender do estado atual do cliente/técnico. Replay válido preserva a OS original mesmo se o cliente mudar depois.
2. Hash é sobre payload normalizado da tentativa, não sobre snapshot consultado posteriormente. Persistir versão do algoritmo para preservar replay de chaves anteriores. Documentos sem versão de hash usam normalização antiga para comparação; não invalidar replay histórico só por novo formato obrigatório de telefone.
3. Conferir explicitamente coleções/índices/contador preparados; não criar índices automaticamente ao importar modelos ou receber requisição.
4. Dentro da sessão: revalidar/resolver cliente e técnico, incrementar contador, inserir OS. Todas as operações recebem a mesma sessão e são sequenciais. Não usar Promise.all dentro de transação.
5. Para proteger a seleção contra edição concorrente do cadastro, fazer escrita condicional de um contador interno de coordenação no Client com versão esperada; não incrementar sua versão pública/updatedAt por criar uma OS. O PATCH administrativo concorre no mesmo documento. Após conflito/retry, se a versão selecionada mudou, responder CLIENT_CHANGED.
6. Atribuição nova de técnico usa escrita condicional interna no User (`active != false`, role elegível), na mesma transação da OS. Desativação/rebaixamento escreve no mesmo documento, causando revalidação em retry. O contador interno não revoga sessão nem muda versão administrativa. Atribuição já existente e omitida no PATCH é preservada sem exigir atividade atual.
7. Classificar E11000 pelo índice: idempotência, telefone ou número. Não rotular toda colisão como número duplicado. Após rollback por telefone, reler vencedor e repetir de forma limitada se os dados forem compatíveis; conflito divergente permanece explícito. Retry transacional nunca executa efeitos externos.
8. Confirmar sucesso somente após commit. Falhas em qualquer ponto não deixam cliente/OS parciais. Testes de falha usam injeção interna local, nunca endpoint de produção.

Edições de avaliação continuam atômicas em um documento com versão da OS. PATCH que muda tecnicoId precisa incluir a validação/coordenação do User e escrita da OS na mesma transação; demais alterações podem manter CAS em uma única operação.

## 6. Transição de dados e versões de aplicação

Leitura aditiva: documentos sem clienteId continuam visíveis; técnicos textuais permanecem identificados como históricos; equipamentos sem avaliação exibem campos vazios sem inventar conteúdo. V1 continua sem escrita.

Para cliente/tecnico textual enviado por frontend antigo no PATCH: aceitar somente cópia exatamente igual como no-op de compatibilidade; alterações efetivas retornam conflito orientando atualização da tela. O novo frontend não envia esses campos em edição de OS. Não bloquear alteração operacional legítima porque snapshot antigo não passa pela nova regra de telefone.

A criação inline antiga pode ser aceita pelo resolvedor seguro quando possui dados válidos e não altera cliente existente; telefone incompleto recebe erro explícito. Antes do corte, testar essa combinação. Frontend novo depende da API nova; não publicá-lo primeiro.

Reconciliação proposta, somente preparada/testada localmente:

1. Inventário agregado de ausência/validade de telefone, snapshots divergentes, vínculos existentes e técnicos textuais. Não imprimir documentos/dados pessoais.
2. Produzir plano revisável por IDs; número coincidente gera candidato, nunca aprovação automática de que se trata da mesma pessoa. Mesmo grupo com nome idêntico exige decisão de reconciliação antes de unir OS antigas.
3. Aplicador isolado recebe mapeamento explícito ordem→cliente, precondições de versão/hash e ID estável. Não altera snapshot, número, equipamento, retirada ou datas conhecidas. Não força conversão v1 neste pacote.
4. Repetir aplicação deve ser no-op; interromper/retomar não duplica cadastros. Um vínculo existente diferente gera exceção, nunca sobrescrita.
5. Preservar referências de fonte/proveniência apenas internamente; relatórios versionados contêm fixtures sintéticas. Dados reais não entram no Git.

Não oferecer executor genérico que aceite URI remota nesta primeira entrega; harness cria replica set próprio em loopback, sem ler .env/MONGODB_URI e sem destino fornecido por usuário. O executor operacional futuro terá revisão específica.

Corte futuro: inventário e backup autorizados → preparo de índices/replica set verificados → API compatível → frontend → reconciliação aprovada, mantendo aviso para OS antigas sem vínculo. Nenhum passo remoto está autorizado agora.

Rollback de aplicação exige build que preserve os novos campos e restrições. O backend antigo substitui arrays de equipamentos e não pode voltar a escrever após introdução de avaliações. Se não houver build compatível, suspender escrita. Nunca restaurar snapshot sobre novas OS sem reconciliar gravações posteriores; não remover Client ainda referenciado. Não limpar campos novos para forçar compatibilidade.

## 7. Critérios do primeiro fluxo e limites desta revisão

Primeira fatia após aprovação: lookup de telefone + POST/GET de OS com cliente + formulário e detalhe mínimo; testes reais HTTP/replica set/navegador, acesso negado, idempotência e rollback. Área Clientes completa, avaliações e técnicos ficam para expansão após demonstração/checkpoint C.

A proposta de telas é descritiva, baseada nas quatro imagens, sem protótipo funcional. Nenhuma decisão de negócio pendente exige nova pergunta; escolhas técnicas acima aguardam revisão como conjunto. O aceite funcional da primeira fatia só pode ocorrer depois da implementação e demonstração.

## Referências consultadas

- [MongoDB: atomicidade e concorrência](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/): operação atômica por documento e controle por valor esperado; a transação de criação conjunta é escolha deste projeto.
- [MongoDB: índices únicos](https://www.mongodb.com/docs/manual/core/index-unique/): unicidade precisa de índice, inclusive sob concorrência; não corrige duplicatas históricas.
- [Mongoose 8.x: transações](https://mongoosejs.com/docs/8.x/docs/transactions.html): sessão compartilhada, commit/rollback e evitar operações paralelas na sessão. Projeto instalado 8.24.7; página consultada identifica a linha 8.24.6.
- [MDN: input tel](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/tel): teclado/entrada de telefone não substituem validação; máscara e regras brasileiras são escolhas do projeto.
