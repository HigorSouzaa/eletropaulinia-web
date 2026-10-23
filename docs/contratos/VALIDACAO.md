# Validação, backlog e continuidade

23/10/2026. Base executada: 557f3b5 (código do ciclo 1 preservado). Windows, Node v24.21.0, npm 11.19.0; dependências já instaladas. Não foi repetido setup limpo nesta etapa. Comando: npm run check, exit 0.

## Resultados observados

| Verificação | Resultado nesta execução |
| --- | --- |
| tsc --noEmit -p tsconfig.app.json | Passou |
| eslint . | Zero erros; dois avisos react-refresh/only-export-components nos contextos |
| node --test --test-concurrency=1 tests/*.test.js | 13 passaram, zero falhas; duração reportada 35.560,6566 ms |
| vite build | Passou; Vite 5.4.21; 1543 módulos; 32,02 s |
| Artefatos de build | JS 250,05 kB, gzip 79,80 kB; CSS 17,76 kB, gzip 3,83 kB |
| Avisos de build | Dados Browserslist/caniuse-lite e baseline-browser-mapping antigos; nenhuma atualização automática |
| Documentação | Links relativos, exemplos JSON e diff verificados antes do commit |

Testes usam mongodb-memory-server-core 11.3.0 com MongoDB 8.0.17 em loopback, URI temporária criada pela própria suíte. Nenhum banco real foi acessado. Build gera dist ignorado pelo Git. Tempo local inclui condições da máquina; não representa benchmark nem latência de API.

Os 13 testes revalidam cadastro protegido, usuário removido, login/hash/perfil, tokens inválidos/expirados, perfis administrativos, validação/duplicidade, senha sem rehash, CRUD legado/permissões, erro JSON, mudança de perfil, bootstrap e startup incompleto. [Código](../../backend/tests/auth.test.js).

Não houve validação de navegador nesta etapa, CI remoto, Atlas, restauração, carga ou jornada v2. Os exemplos v2 são especificação sintética; nenhum teste existente os valida.

## Matriz regra → teste futuro

| ID | Regra/cenário | Resultado observável | Camada | Estado |
| --- | --- | --- | --- | --- |
| T01 | Usuário sem sessão/expirado/removido | 401 e nenhuma alteração | HTTP+Mongo | Legado validado; repetir v2 |
| T02 | Três perfis e acesso compartilhado | Funcionário B acessa OS criada por A | HTTP+Mongo | Matriz legada validada; ampliar cenário entre contas |
| T03 | Cadastro/exclusão administrativos | Atendente/técnico 403, admin permitido | HTTP+Mongo | Legado validado |
| T04 | Criar três equipamentos | Todos persistem com IDs após GET/recarga | API+navegador | Pendente v2 |
| T05 | Sem marca/modelo/série/e-mail | Cria e lê opcionais null sem perda | API+UI | Pendente |
| T06 | Nome/telefone/nome do equipamento ausentes | 400 por campo; UI mantém valores | API+UI | Pendente |
| T07 | Relato ou Testar | Testar sem relato aceito; relato vazio rejeitado | API+UI | Pendente |
| T08 | Primeira retirada | Apenas um item marcado, instante servidor, parcial 1/3 | API+UI | Pendente |
| T09 | Segunda/última retirada | Restantes preservados; Entregue somente 3/3 | API+UI | Pendente |
| T10 | Repetir retirada | Mesmo instante; versão antiga 412 sem efeitos extras | HTTP+Mongo | Pendente |
| T11 | Retirada antes de Pronto/correção | Comportamento conforme decisão futura; sem atalho de status | API+UI | Bloqueado pela decisão |
| T12 | Edições concorrentes | Apenas versão vigente aceita; outra 412, rascunho preservado | API+UI | Pendente |
| T13 | Criações simultâneas/repetidas | Números únicos, idempotência sem duplicata; contador não recua | HTTP+Mongo | Pendente |
| T14 | Limpar opcionais/omitir/valores null | Limpar não mantém valor antigo; omissão preserva | HTTP+Mongo | Pendente |
| T15 | Consulta/filtros/paginação | Ordenação estável, meta coerente e summary fora da página | HTTP+Mongo | Pendente |
| T16 | Sessão no navegador | Login/logout/401/troca de conta limpam estados e requisições antigas | E2E | Pendente |
| T17 | Deep link/recarga/falha de rede | Detalhe por ID, erro distinto de vazio, retry sem perda | E2E | Pendente |
| T18 | Funcionários/perfis | DTO sem senha; gestão 403 para não admin; último admin protegido inclusive concorrência | HTTP+Mongo | Pendente |
| T19 | Desligamento/recuperação | Regra aprovada, sessão revogada e referências históricas preservadas | API+UI | Depende da decisão |
| T20 | Legado com data desconhecida | IDs/números preservados; nenhum horário inventado | Migração em fixtures | Pendente |
| T21 | Retenção/exclusão | OS antiga continua consultável; exclusão remove somente OS alvo e itens | HTTP+Mongo | Pendente v2 |
| T22 | Erros/limites/abuso | 400/413/429 genéricos, sem stack ou dados pessoais | HTTP | Parcial legado; ampliar |
| T23 | Backup/reversão | Restore isolado reconciliado, gravações pós-corte preservadas | Operação autorizada | Não verificado |
| T24 | Mobile/acessibilidade | Teclado, labels, foco e estados em 360/768/1280px | Navegador | Não verificado |

## Backlog priorizado

P0 = bloqueia uso real por perda de informação/segurança/integridade; P1 = necessário para operação completa; P2 = otimização medida. Não há percentuais de conclusão.

| Pendência | Evidência/impacto | Prioridade | Dependência | Conclusão observável |
| --- | --- | --- | --- | --- |
| Múltiplos equipamentos e opcionais | NovaOrdem envia primeiro; modelo exige marca | P0 | Contrato v2 | T04–T07 |
| Retirada individual e agregado | Model/controller não têm retirada | P0 | Regras de exceção para casos excepcionais | T08–T11 |
| Número e concorrência | pre-save último número, update sem versão | P0 | Modelo/counter/índices reconciliados | T12–T13 |
| Sessão/cache | Contextos e interceptor desconectados | P0 | Arquitetura sessão da etapa 02 | T01/T16 |
| Validação/erros/autorização | Controller de OS devolve error.message, campos sem contrato estrito | P0 | API v2 | T03/T14/T22 |
| Dados/restore | Estado do banco real desconhecido | P0 para corte | Acesso/inventário/backup autorizado | T20/T23 |
| Triagem de dependências/CORS/abuso | app.js cors aberto; alertas históricos não retriados | P0 antes de publicação | Etapa 06 e ambiente definido | Achados aplicáveis tratados e regressões; sem afirmar vulnerabilidade nova sem triagem |
| Next base | App ainda React Router/Vite | P1, primeira implementação solicitada | Revisão arquitetural | Login/lista real com sessão protegida |
| Fluxos completos e funcionários | API de gestão ausente; deep links dependem da lista | P1 | API v2, decisões de acesso | T17–T19 |
| Paginação e filtros | Order.find sem limite | P1 | Contrato consulta | T15 e limites comprovados |
| UI acessível e erros | Modal não aguarda status | P1 | Fluxos Next | T17/T24 |
| Otimização adicional | Sem perfil de consultas/latência real | P2 | Fixtures representativas e alvo autorizado | Medir baseline, justificar índices/mudanças |
| Hospedagem e homologação | Nenhum deploy/aceite da empresa nesta etapa | P1 antes de liberação | Etapas 05–07 | Plano de corte aprovado, smoke e aceite reais |

Garantia/envios/WhatsApp/clientes completos/relatórios avançados/redesign não entram neste backlog de execução principal.

## Primeiro ciclo seguinte

Etapa 02: apresentar arquitetura concreta com a proposta de sessão/transportes; selecionar versões compatíveis; construir somente base Next, login, layout e listagem real. Preservar rotas/estilos úteis e documentar adaptador legado.

Aceite: login e erro de credencial, API indisponível, logout, 401, recarga e troca de conta; nenhuma informação de sessão anterior; build/tipos/lint/testes pertinentes; navegação desktop/móvel. Não declarar paridade dos formulários múltiplos antes das etapas 03–04.

## Checklist de continuidade

- [x] Revalidar primeiro ciclo.
- [x] Mapear divergências código/regras.
- [x] Especificar API, dados, erros, permissões e exemplos.
- [x] Propor arquitetura e compatibilidade, preservando Express.
- [x] Registrar limites de dados/Atlas e testes pendentes.
- [ ] Resolver exceções de retirada e gestão de acesso conforme respostas do usuário.
- [ ] Revisar proposta técnica de agregado, limites, sessão e composição após retirada.
- [ ] Executar etapa 02 quando solicitada, com os checkpoints aplicáveis.
- [ ] Executar etapas 03–08 respeitando dependências e autorizações.

Não executar migração, publicar ou modificar dados reais como consequência de concluir este documento.
