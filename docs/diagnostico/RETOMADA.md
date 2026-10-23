# Eletro Paulínia — diagnóstico e plano de retomada

Data: 22/10/2026. Escopo: somente `HigorSouzaa/eletropaulinia-web`. Objetivo: uso real; frontend Next.js/TypeScript, API Node.js/Express separada e MongoDB Atlas. Nenhuma migração, alteração de aplicação, operação em banco ou publicação foi executada.

## 1. Resumo e evidências

A base contém uma aplicação React/Vite e uma API Express/Mongoose conectadas por Axios. Há implementação de autenticação e ordens, mas **não há evidência suficiente para considerá-la pronta para operação**. Cadastro público permite escolher administrador; há perda de campos no formulário, falhas de sincronização de sessão, edição sem espera da resposta, ausência de paginação e riscos na numeração concorrente. Migrar o framework sem resolver esses pontos preservaria os problemas.

Legenda: **I** = confirmada por inspeção; **E** = validada em execução; **H** = hipótese a investigar; **N** = não verificável com os acessos/ambiente disponíveis. Código existente não equivale a fluxo validado ponta a ponta.

- **I/E:** clone inicialmente limpo, `main`, SHA [`959d360156ea0a426e81a7548071b22b60f89d55`](https://github.com/HigorSouzaa/eletropaulinia-web/commit/959d360156ea0a426e81a7548071b22b60f89d55), commit inicial de 12/11/2025. Apenas esse commit é alcançável pela main.
- **I/E:** branch remota `feat-wp-chat`, SHA [`d42e5a3c53f67479f3080ac0ccd86486e052c96d`](https://github.com/HigorSouzaa/eletropaulinia-web/commit/d42e5a3c53f67479f3080ac0ccd86486e052c96d), de 18/11/2025: WhatsApp, Socket.IO, QR code, conversas e renomeação de Ordens para Dashboard; 19 arquivos alterados em relação à main. Não incorporada à main.
- **I:** a branch WhatsApp inicia serviço externo automaticamente; reset HTTP e handlers Socket.IO não apresentam autenticação no servidor inspecionado. Não foi executada, conectada a conta nem incorporada ao escopo funcional. Retomá-la exige decisão própria e revisão de autorização/sessões.
- **E:** consultas de issues e PRs ao conector GitHub não retornaram itens. **I:** não há `.github` versionado nas duas refs, scripts de testes ou AGENTS.md encontrado na árvore/ancestrais consultados. Isso não comprova ausência de configuração externa no provedor.
- **I:** o README mistura Supabase e MongoDB, menciona arquivos `.env.example` ausentes e usa instruções de instalação incompletas. Não foram encontrados imports de Supabase/Firebase na aplicação principal. Não há evidência de migração pendente de um banco desses provedores.
- **H:** o ponto de parada provável é uma primeira integração de ordens seguida de um experimento de WhatsApp em branch separada. Histórico curto não revela motivo do abandono nem estado de eventual produção.

## 2. Arquitetura e inventário atuais

```text
BrowserRouter → AuthProvider + OrderProvider → páginas/componentes
          Axios + Bearer lido de localStorage
                      ↓
Express → rotas → protect/authorize → controllers → Mongoose → MongoDB
```

Versões declaradas, não necessariamente versões resolvidas: React/React DOM `^18.3.1`, React Router `^7.9.5`, Axios `^1.6.2`; Vite `^5.4.2`, TypeScript `^5.5.3`, Tailwind `^3.4.1`, ESLint `^9.9.1`; Express `^4.18.2`, Mongoose `^8.0.3`, JWT `^9.0.2`, bcryptjs `^2.4.3`, express-validator `^7.0.1` (declarado, sem uso encontrado nas rotas/controllers). Há lockfiles separados. Backend JavaScript ESM, sem tipagem ou lint específico.

Fontes: [package.json](../../package.json), [backend/package.json](../../backend/package.json), [App.tsx](../../legacy/src/App.tsx), [api.ts](../../legacy/src/services/api.ts), [server.js](../../backend/server.js).

| Área | Implementação e observação — I |
|---|---|
| Rotas web | `/login`, `/ordens`, `/nova-ordem`, `/editar-ordem/:id`; `/` redireciona. Links Clientes/Relatórios não têm rotas correspondentes nem fallback global |
| UI | Layout, Sidebar, FormInput, StatusBadge, StatusModal, OrderDetailsModal, ProtectedRoute |
| Auth | POST `/api/auth/register` público; POST `/api/auth/login` público; GET `/api/auth/me` protegido |
| Ordens | GET/POST `/api/orders`; GET/PUT `/api/orders/:id`; PATCH `/api/orders/:id/status`; DELETE `/api/orders/:id` restrito a admin; demais operações exigem apenas autenticação |
| Usuários | username único, nome, hash de senha, role admin/tecnico/atendente, createdAt. Senha excluída por padrão nas consultas |
| Ordens | numero único, cliente, telefone, equipamento, marca, número de série, defeito, status, datas, técnico textual, observações, createdBy e timestamps |
| Estados | Aguardando, Em andamento, Pronto, Entregue. Enum existe; transições entre estados não são restringidas |
| Índices | numero, cliente, status e dataEntrada; numero declarado tanto unique como índice explícito; conferir índices efetivos no banco |
| Integrações | MongoDB por URI e imagem externa Unsplash no login; WhatsApp somente na branch separada |

Variáveis atuais: `VITE_API_URL` (endereço público da API), `MONGODB_URI` (conexão privada), `JWT_SECRET` (segredo), `JWT_EXPIRE` (expiração), `PORT` (porta), `NODE_ENV` (ambiente). Na branch WhatsApp há `FRONTEND_URL`. Nenhum valor foi incluído neste relatório.

Execução prevista: `npm ci` em raiz e backend; frontend `npm run dev`, backend `npm run dev`/`npm start`. Frontend possui build, preview, lint e typecheck. O script raiz `new` muda para backend e volta a executar `cd backend`, indicando caminho incorreto; substituir futuramente por comandos explícitos. Não há configuração de deploy versionada identificada.

## 3. Matriz funcional e fluxos

Todos os fluxos abaixo têm implementação inspecionada; persistência real e navegação em navegador permanecem **N** nesta etapa.

| Fluxo | Estado | Evidência, falhas e aceite necessário |
|---|---|---|
| Login/sessão | Parcial — I | [AuthContext](../../legacy/src/contexts/AuthContext.tsx) guarda token/usuário no localStorage e restaura JSON sem validar `/me`. Login chama username, mas tela diz e-mail. Aceite: sessão validada, credenciais inválidas e indisponibilidade diferenciadas |
| Expiração/logout | Parcial — I | [api.ts](../../legacy/src/services/api.ts) apaga storage no 401 sem atualizar AuthContext; logout não limpa OrderContext. Aceite: revogação/expiração definida e nenhum dado da conta anterior após troca |
| Listagem/busca | Parcial — I | [OrderContext](../../legacy/src/contexts/OrderContext.tsx) busca somente na montagem e só com token; login posterior não dispara nova busca. [Ordens](../../legacy/src/pages/Ordens.tsx) filtra toda a coleção no cliente e não usa loading. Aceite: carregar após login, diferenciar vazio/erro/carregando, paginar e filtrar na API |
| Criação | Parcial — I | [NovaOrdem](../../legacy/src/pages/NovaOrdem.tsx) aceita vários equipamentos, envia somente `equipamentos[0]`; e-mail não tem estado/payload/schema. Aguarda POST, mas não apresenta erro nem bloqueia envio duplicado. Aceite: nenhum campo silenciosamente descartado; definir cardinalidade e e-mail com a empresa |
| Detalhamento | Parcial — I | Modal usa objeto da lista; mostra só parte dos campos. GET individual existe, não é usado nesse fluxo. Aceite: dados atualizados e todos os campos relevantes definidos |
| Edição | Parcial — I | [EditarOrdem](../../legacy/src/pages/EditarOrdem.tsx) usa `order.id`, mas contrato TS declara `_id`; não aguarda PUT e navega imediatamente. Mongoose pode serializar virtual `id`, portanto a falha runtime depende do payload; incompatibilidade tipada é concreta. Depende da lista em memória e pode mostrar não encontrado durante carregamento. Aceite: GET por ID, estado de carga/404 e confirmação de gravação |
| Status | Parcial — I | [StatusModal](../../legacy/src/components/StatusModal.tsx) fecha antes do resultado; handler não aguarda a Promise. API valida enum, não regra de transição. Aceite: aguardar sucesso, mostrar falha e aplicar transições aprovadas |
| Exclusão | Parcial — I/N | Endpoint exige admin; não há ação correspondente no frontend. Aceite: decidir se exclusão é permitida, testar autorização e política de retenção antes de expor UI |
| Administração de usuários | Ausente como fluxo | Há register e scripts de criação; não há interface/API completa de gestão, desativação e troca de senha. Definir processo operacional mínimo sem inventar módulo completo |
| Clientes/relatórios/recuperação | Ausente | Links sem implementação; recuperação usa `href="#"`; lembrar-me não muda persistência. Retirar promessas falsas ou aprovar funcionalidade, sem adicioná-la automaticamente |

## 4. Achados e backlog priorizado

P0: bloqueio de exposição/uso real. P1: necessário para concluir os fluxos existentes. P2: melhoria opcional. Prioridades são do diagnóstico, não uma avaliação de exploração em produção.

| ID/prioridade | Evidência e impacto | Dependência e critério observável de conclusão |
|---|---|---|
| B01/P0 — I | [auth routes](../../backend/routes/auth.js) publica registro; [controller](../../backend/controllers/authController.js) aceita role do corpo. Um cliente pode solicitar admin sem sessão | Definir provisionamento; chamada anônima não cria privilegiado e matriz de perfis passa testes negativos |
| B02/P0 — I/N | `backend/seed-admin.json`, `backend/create-admin.js` e README têm credenciais padrão; uso real desconhecido | Responsável verificar se foram usadas; retirar valores dos artefatos e, se ativos, executar rotação autorizada. Não basta apagar arquivo para remover histórico |
| B03/P0 — I/H | [protect](../../backend/middleware/auth.js) chama next mesmo se User.findById retorna null; GET de ordens não usa req.user. Token válido de usuário removido pode continuar lendo dados | Teste local com usuário sintético removido; todas as rotas privadas retornam 401 quando principal não existe. Revogação geral ainda precisa de política |
| B04/P0 — I/N | Ordens acessíveis a qualquer autenticado; createdBy é registrado mas não filtra consultas. Existência de violação por recurso depende das regras reais | Aprovar matriz de acesso por perfil/recurso; testar acesso permitido e proibido. Não presumir que toda ordem pertence exclusivamente ao criador |
| B05/P0 — I | Equipamentos extras e e-mail descartados na criação | Definir uma ou várias peças por OS e necessidade de e-mail; validar payload e recarga sem perda de campos aceitos |
| B06/P0 — I/H | [Order model](../../backend/models/Order.js) lê última ordem e incrementa número; concorrência pode repetir, índice pode rejeitar e exclusão pode reutilizar número. PUT permite alterar numero | Definir imutabilidade/formato; contador atômico inicializado pelo maior número válido, índice único verificado e teste concorrente sem colisões/reuso |
| B07/P1 — I | Sessão e lista não acompanham login/logout/401; JSON inválido pode quebrar inicialização | Contrato de sessão; teste login→lista→logout→outra conta e reload sem dados residuais |
| B08/P1 — I | Edição/status navegam ou fecham antes da resposta; contrato id inconsistente; [updateOrder](../../backend/controllers/orderController.js) usa `valor || anterior`, impedindo limpar opcionais | Contratos de campos; gravar/limpar campos, aguardar resposta e manter formulário em erro |
| B09/P1 — I | Controllers retornam error.message e 500 para validação/CastError; sem validação explícita de tipo no login e sem limites de abuso | Schema de entrada por endpoint, erros 400/401/403/404/409/429 consistentes, sem detalhes internos; testar entradas objeto/null/inválidas sem afirmar exploração não demonstrada |
| B10/P1 — I/H | GET sem paginação/projeção, filtro em memória; risco cresce com volume. Índices declarados não provam consultas eficientes | Volume e filtros reais; limites de página, ordenação estável, explain e p95/p99 medidos; comparar estatísticas globais com página |
| B11/P1 — I | API chama connectDB sem await antes de listen; raiz informa sucesso sem checar banco; CORS aberto, sem rate limit ou tratamento global | Ambiente de execução definido; readiness falha sem banco, inicialização previsível, origens aprovadas e encerramento gracioso. CORS não substitui autenticação |
| B12/P1 — I/N | Sem CI/testes, exemplos de ambiente ausentes, documentação divergente | Build/tipos/lint/testes em clone limpo e CI; exemplos sem segredos; versões e runtime fixados após compatibilidade |
| B13/P1 — I/N | Labels sem associação em FormInput, modais sem semântica/foco/Escape, sidebar fixa de 256px sem navegação mobile. Impacto visual não medido | Testar teclado, foco, nomes acessíveis e larguras 360/768/1280px; modal utilizável e sem bloqueio da área principal |
| B14/P0 — N | Atlas, dados existentes, backup e restauração não acessados | Inventariar dados; staging isolado; backup e restauração comprovados em destino separado antes do corte |
| M01/P2 — I | Clientes/Relatórios/recuperação/lembrar-me são promessas sem fluxo | Decidir remover entrada ou especificar necessidade; não construir módulos sem aprovação |
| M02/P2 — I/N | Branch WhatsApp não integrada e com superfícies sem autenticação | Decisão de produto e revisão própria; não mergear como parte automática da migração |

Outros pontos: hook de senha chama `next()` sem retornar quando a senha não mudou; possível rehash/falha em futura atualização de usuário (**H**, precisa teste). Updates não têm política explícita de concorrência otimista; definir resultado de duas edições simultâneas. Datas usam ISO/UTC e formatação local; validar dia civil próximo à meia-noite. Nenhuma exploração, carga ou escrita em sistema real foi realizada.

## 5. Arquitetura de destino proposta

```text
apps/web/                 Next.js + TypeScript
  app/login/page.tsx
  app/(operacao)/layout.tsx
  app/(operacao)/ordens/page.tsx
  app/(operacao)/nova-ordem/page.tsx
  app/(operacao)/editar-ordem/[id]/page.tsx
  components/ features/ lib/api/
apps/api/                 Node.js + Express
  src/app.js              composição sem listen, para testar
  src/server.js           conexão, listen e shutdown
  src/config/ middleware/
  src/modules/auth/       rotas, validação, controller, serviço
  src/modules/orders/     rotas, validação, controller, serviço, modelo
  tests/
docs/                     contratos, decisões, operação e migração
```

Proposta organizacional, não código criado. Não exige microserviços nem troca de Mongoose. Backend pode manter JS inicialmente; TypeScript no backend é opção posterior, não decisão do usuário.

Reutilizar componentes visuais, estilos Tailwind, schemas e regras que passarem revisão. Adaptar formulários, acessibilidade, contratos e API client. Substituir Vite/BrowserRouter por App Router, links por next/link e navegação por next/navigation. Remover somente boilerplate sem uso e referências Supabase comprovadamente obsoletas.

Layouts e páginas podem ser componentes de servidor; formulários, modais e filtros interativos são componentes de cliente. Providers devem ter escopo limitado. Não ler localStorage durante renderização no servidor. Essa divisão segue a [documentação de componentes Next.js](https://nextjs.org/docs/app/getting-started/server-and-client-components).

Proposta para sessão: Express continua responsável por autenticar/autorizar; preferir cookie HttpOnly/Secure com política SameSite e proteção CSRF adequada às origens escolhidas. Definir expiração, invalidação e logout antes de implementar. Preferência por uma origem pública com `/api` encaminhado à API separada; depende da hospedagem. Next pode chamar Express no servidor encaminhando somente a credencial necessária. Uma camada BFF só se necessária para sessão/origens; não duplica regras nem acessa MongoDB. Não escolher biblioteca adicional nesta análise.

Dados de ordens e sessão não devem entrar em cache público/compartilhado. Declarar comportamento de leitura dinâmica/sem cache conforme versão escolhida, limpar estado ao trocar usuário e atualizar lista/detalhe após mutações. Testar dois usuários. Consultar [fetching Next.js](https://nextjs.org/docs/app/getting-started/fetching-data); não depender de defaults de versões antigas.

Somente a API recebe MONGODB_URI/JWT_SECRET. Endereço público pode usar variável NEXT_PUBLIC quando necessário; endereço interno do servidor permanece privado. Separar configurações por ambiente e validar presença no startup. Fixar versão estável suportada de Next/React/Node no ciclo de implementação após conferir compatibilidade; não tratar versões antigas do README como recomendação.

Atlas: usuários de banco com privilégios mínimos, TLS e acesso de rede restrito aos serviços; bancos/credenciais de desenvolvimento, teste e produção separados. Reutilizar conexão Mongoose por processo, dimensionar pool por medição e instâncias. Confirmar disponibilidade de backup/restauração no plano escolhido; não presumir recurso gratuito. Fontes: [segurança Atlas](https://www.mongodb.com/docs/atlas/reference/faq/security/) e [backup/restauração](https://www.mongodb.com/docs/atlas/backup-restore-cluster/).

## 6. Plano incremental e preservação dos dados

1. **Baseline:** manter SHA de origem, concluir verificações e levantar decisões pendentes. Commits pequenos em branches descritivas; sem push/merge/deploy automático.
2. **Contratos e riscos:** decidir permissões, provisionamento, cardinalidade de equipamento, estados e retenção. Especificar contratos e testes de B01–B09 antes de mudar o modelo principal.
3. **API e testes:** fechar cadastro privilegiado, autenticação, validação, numeração e erros; extrair app de listen, usar banco de teste isolado. Preservar compatibilidade com cliente atual enquanto viável.
4. **Fatia Next:** login→lista→criar uma OS→recarregar/detalhar. Usar API separada, sem levar WhatsApp. Provar happy path, acesso negado e falha de rede antes de ampliar.
5. **Paridade:** edição/status, filtros/paginação, feedback, acessibilidade e mobile. Remover entradas sem funcionalidade ou implementar somente as aprovadas.
6. **Dados/Atlas:** inventariar banco de origem, contagens, IDs, índices, duplicidades, datas e números malformados. Exportar backup autorizado; importar primeiro em staging isolado; preservar IDs/referências/hashes compatíveis. Ensaio com comparação de contagens/campos e relatório de exceções. Não assumir que origem é local ou vazia.
7. **Homologação e corte:** restore ensaiado, permissões e carga representativa validadas, observabilidade e documentação. Corte somente com autorização posterior e janela operacional acordada.

Reversão: manter aplicação anterior e backup identificados, mudanças de schema preferencialmente aditivas, scripts idempotentes e registro das transformações. Antes de corte, definir pausa de escrita e reconciliação. Restaurar snapshot antigo após novas ordens implica perda dessas gravações; não é rollback aceitável sem plano de captura/reconciliação. Não executar restauração sobre dados existentes durante ensaio.

## 7. Plano de validação e operação

- Unidade/contrato: campos obrigatórios, limpar opcionais, enum/transições aprovadas, IDs inválidos, erros, datas e numeração.
- API com banco descartável: registro anônimo negado, login inválido, ausência/expiração de token, usuário removido, matriz de perfis/recursos, persistência, duplicidade e concorrência. Mocks isolados não comprovam integração MongoDB.
- E2E: login sem refresh carrega lista; logout/segunda conta limpa dados; criar e recarregar preserva todos os campos; deep link de edição; 401/403/404/500 e rede indisponível mantêm UI coerente; status só confirma após resposta.
- Acessibilidade/responsividade: teclado, foco de modais, retorno de foco, labels e contrastes medidos; viewports 360/768/1280.
- Desempenho: medir bundle e requests; em ambiente autorizado registrar volume, dados sintéticos, hardware, duração, latências p50/p95/p99 e erros. Baseline sequencial para login/lista/detalhe; depois plano limitado de concorrência com limites e critérios de interrupção acordados. Nenhuma meta numérica de capacidade foi inventada.
- Operação: readiness com banco indisponível, reconexão/shutdown, logs com request ID sem tokens/dados pessoais, tratamento de erros, HTTPS, restauração em destino separado. Recomendações apoiadas nas práticas oficiais de [segurança Express](https://expressjs.com/advanced/best-practice-security/) e [desempenho](https://expressjs.com/en/advanced/best-practice-performance/).

## 8. Primeiro ciclo recomendado e decisões necessárias

Primeiro ciclo de implementação: ambiente reproduzível + contratos de sessão/permissões + correção dos bloqueios de registro/usuário inválido + testes API com dados sintéticos. Ainda sem migração integral de UI. Aceite: nenhum cadastro privilegiado anônimo, usuário removido recebe 401, matriz inicial de acesso passa testes, lint/tipagem/build conhecidos e testes executáveis em clone limpo. Em seguida iniciar a fatia Next da etapa 4.

Decisões da empresa: quem usa e quem pode ver/alterar/excluir cada OS; como usuários são provisionados; uma ou várias peças por OS; e-mail é necessário; transições de status; exclusão/retensão; dados existentes e localização; volume e simultaneidade; hospedagem/domínios; janela de manutenção e tolerância à perda/indisponibilidade. WhatsApp é decisão separada. Não bloqueiam este diagnóstico, mas condicionam contratos e corte.

## 9. Verificações desta sessão

Ambiente local Windows, Node v24.21.0 e npm 11.19.0. Sem node_modules e sem `.env` na raiz/backend no início. Não foram carregadas credenciais nem iniciado o backend. Não há benchmark da API, teste de persistência/Atlas ou validação em navegador nesta análise.

Resultados completos em [VALIDACAO.md](VALIDACAO.md): build aprovado; typecheck com três erros; lint com quatro erros e dois avisos. Auditoria npm: 36 pacotes sinalizados na raiz e 14 no backend, incluindo ferramentas de desenvolvimento; não equivalem a vulnerabilidades exploráveis confirmadas. Acrescentar B15/P1 ao backlog para triagem/atualização compatível, elevando a P0 riscos críticos alcançáveis. Reproduções isoladas com banco simulado confirmaram que register aceita admin e protect avança com usuário null; schema rejeita status desconhecido. Integração HTTP/banco permanece não verificada.

Falhas de ferramenta/ambiente não contam como testes aprovados. Inspeção de código e plano não certificam segurança ou capacidade de produção.
