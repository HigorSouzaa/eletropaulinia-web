# Clientes, laudos e técnicos — telas, sequência e matriz de testes

27/10/2026. Proposta descritiva para revisão; nenhuma tela nova implementada. [Contrato backend](../contratos/CLIENTES-LAUDOS-TECNICOS.md). Identidade atual: cartões brancos, fundo claro, ações laranja e tipografia existente. As quatro imagens móveis orientam continuidade, sem reproduzir seus dados pessoais.

## Arquitetura proposta

Next App Router mantém layouts e proteção de sessão no servidor; formulários, busca e diálogos são componentes cliente. Express valida todas as permissões/regras. Nenhum acesso direto do Next ao MongoDB, nova biblioteca ou novo estado global é necessário.

| Área | Arquivo/rota atual ou proposto | Responsabilidade |
| --- | --- | --- |
| Nova OS | web/NewOrder.tsx, /nova-ordem | Telefone primeiro, lookup, cliente novo/existente, técnico opcional e equipamentos |
| Clientes | web/Clients.tsx, app/(interno)/clientes/page.tsx | Consulta paginada e busca; sessão necessária |
| Detalhe de cliente | web/ClientDetail.tsx, app/(interno)/clientes/[id]/page.tsx | Cadastro atual, edição admin e histórico paginado das OS |
| Edição de OS | web/EditOrder.tsx | Snapshot de cliente somente leitura, seletor de técnico e avaliações por equipamento |
| Detalhe de OS | web/OrderDetail.tsx | Snapshot histórico, link para cliente quando vinculado, avaliação e orçamento por equipamento |
| Componentes | web/components/ClientLookup.tsx, TechnicianSelect.tsx, EquipmentAssessment.tsx, InternalNavigation.tsx | Estado e apresentação reutilizáveis, sem regras exclusivas do backend |
| Tipos e funções puras | web/types; shared/phone.js + declaração de tipos | DTOs compartilhados no frontend; normalização/formatador reutilizados pelo Node |
| Transporte | app/api/clients/*, app/api/technicians, rota de avaliação de equipamento | Caminhos fixos, sessão HttpOnly, no-store, proteção de origem e versão |
| Servidor | backend/models/Client.js, routes/clients.js, routes/technicians.js, services/clients.js | Módulos proporcionais aos padrões existentes, sem reestruturação global |

Nomes propostos podem ser ajustados para reutilizar arquivos existentes; não duplicar funções equivalentes. Ampliar allowlist de ApiPath e reconhecimento de ETag client, preservando a correção de X-Resource-Version da hospedagem.

## Proposta visual e de interação

### Nova OS

Manter título e cartões. Primeiro cartão: Telefone, resultado da consulta, Nome, E-mail opcional, Data de entrada e Técnico opcional. No celular, uma coluna; desktop pode usar duas, mantendo telefone antes de nome na ordem visual e de teclado.

Campo de telefone usa type=tel, autocomplete=tel e máscara sem impedir colar, apagar, editar no meio ou usar seleção. Não truncar prefixo +55 silenciosamente. Mensagem de resultado com aria-live=polite. Nome/email ficam editáveis somente após resultado vazio confirmado; para cliente existente, apresentar dados e acesso à ficha. Administrador também altera cadastro na ficha, não implicitamente pela OS.

Estados explícitos: incompleto, inválido, buscando, encontrado, novo, falha. Debounce proposto 350 ms após formato completo. Alteração do número incrementa geração da consulta e cancela a anterior; resultado só se aplica à geração/número/sessão atuais. Limpar vínculo e campos herdados antes de buscar outro número. Não disparar nova consulta por simples digitação de nome/email.

Lookup vazio libera o preenchimento; não cria registro. Estado de falha oferece tentar novamente e não permite concluir que o cliente é novo. POST de OS revalida tudo no servidor. Conflito de cliente preserva equipamentos/datas e exige nova seleção/revisão. Idempotency-Key permanece na repetição da mesma tentativa após falha de rede; nova tentativa só após mudança intencional de payload.

### Clientes

Navegação compartilhada inclui Ordens, Clientes e Funcionários (último só admin). Menu acessível também nas páginas internas móveis, sem depender do sidebar oculto no celular.

Lista: nome, telefone formatado, e-mail quando presente e ação Abrir. Sem contagem total de OS por linha que gere consulta por cliente. Detalhe: cartão de dados atuais e seção Ordens deste cliente; paginação do servidor e ordenação consistente. Usuários comuns só consultam; admin recebe ação Editar, com botão Salvar cadastro separado das ações de OS.

Em 412, manter rascunho e permitir ler/comparar dados atuais antes de reenviar. Não aplicar merge silencioso. Em telefone já usado, mensagem no campo sem expor dados extras de outra ficha. Nome/email/telefone opcionais/obrigatórios conforme contrato.

### Equipamento e técnico

Cada equipamento apresenta: identificação, relato/Testar, andamento/retirada, Laudo técnico, Serviços propostos e total. Laudo e serviços não são obrigatórios para receber equipamento. Lista de serviços permite descrição/valor, adicionar/remover; um serviço de valor zero aparece como R$ 0,00 e ausência de serviços como Sem orçamento informado.

Dinheiro é convertido por parser decimal para centavos, sem parseFloat * 100 como regra de persistência; rejeitar fração com mais de duas casas, sinal negativo e entrada ambígua. Resposta do servidor determina total definitivo. Botão Salvar laudo e serviços identifica o equipamento e não salva outro cartão silenciosamente.

Técnico: select acessível com Sem técnico, dados carregados da consulta mínima e todos os resultados paginados, sem truncar equipe na primeira página. Falha de carregamento não equivale a equipe vazia. Edição preserva responsável histórico mesmo ausente das opções; não remover atribuição quando consulta falhar. Servidor recusa nova atribuição se o funcionário deixou de ser elegível.

Datas civis mantêm o dia; instantes de alteração são armazenados em UTC e exibidos America/Sao_Paulo. Campos novos ausentes em OS antigas não recebem valores fictícios.

## Segurança e regressões

- Sessão revogada/401 limpa dados da conta; 403 mostra restrição; 503 conserva rascunho.
- Não persistir fichas/laudos em localStorage, URL de navegação ou cache público.
- Cancelar/ignorar respostas após logout, troca de conta ou desmontagem; não atualizar dados de outra sessão.
- Renderizar laudo/descrições como texto, sem HTML arbitrário. Não registrar conteúdo do formulário em logs.
- Campos disabled/ocultos são UX; autorização é exercida no Express também em chamadas diretas.
- Listagem de ordens, retirada antecipada/parcial, correção auditável, exclusão admin e gestão de funcionários continuam cobertas.
- Testar corpo excessivo, campos proibidos, operadores Mongo, origens inválidas e cabeçalhos de versão através do Next.

## Sequência e checkpoints

1. **Esta entrega:** base revalidada, contrato e proposta visual descritiva para revisão conjunta A/B backend + arquitetura/design frontend. Sem implementação principal.
2. **Depois da aprovação:** primeira jornada real telefone → cliente → OS → detalhe/recarga, incluindo autorização, idempotência, concorrência e rollback em banco descartável.
3. **Checkpoint C:** demonstrar essa jornada e seus limites; obter revisão funcional antes de ampliar o pacote.
4. **Expansão:** área Clientes, laudos/orçamentos, técnicos, compatibilidade e fixtures de reconciliação; concluir matriz abaixo.
5. **Entrega local:** docs/PENDENCIAS e evidências atualizadas, commits revisados. Publicação Netlify/Render e dados Atlas continuam separados e dependem de autorização posterior.

## Matriz de aceite planejada

Os testes abaixo ainda não existem para as novas funcionalidades; aprovação dos testes da base não os substitui.

| ID | Cenário | Evidência requerida |
| --- | --- | --- |
| CL01 | Telefone local/com máscara/+55 equivalentes; fixo/celular; DDD 55; entradas inválidas | Funções puras e HTTP, frontend/backend concordam sem truncamento |
| CL02 | Novo cliente + OS e consulta após recarga | HTTP/replica set + navegador real; um Client e clienteId persistido |
| CL03 | Consulta existente e segunda OS | Mesmo clienteId; snapshot correto; email opcional |
| CL04 | Falha após criação do cliente, antes da OS | HTTP e fault injection local; rollback remove todos os efeitos parciais |
| CL05 | Mesmo telefone em requisições simultâneas, nomes iguais e divergentes | Uma ficha; OS compatíveis vinculadas; conflito divergente sem sobrescrita |
| CL06 | Replay da chave após resposta perdida e após mudança do cadastro/técnico | Mesma OS, sem duplicata; payload diferente conflita; preservar chave antiga |
| CL07 | Lookup lento A após B, troca de sessão e falha de rede | Navegador; interceptações de atraso/falha identificadas como simulação |
| CL08 | Funcionário consulta/cria via OS e tenta PATCH do cadastro | HTTP 200/201/403; banco inalterado na operação negada |
| CL09 | Admin muda telefone/email; concorrência e colisão de telefone | 200/412/409; vínculos preservados, snapshots antigos iguais |
| CL10 | Histórico por cliente com várias páginas e nome coincidente de outra ficha | Filtro exato por ID, contagens/paginação coerentes |
| LA01 | Dois equipamentos com laudos/serviços independentes | HTTP + navegador e recarga; IDs preservados |
| LA02 | Total exato, zero versus ausência, teto, negativo, decimal indevido e campo total injetado | HTTP rejeita inválidos, soma correta calculada no servidor |
| LA03 | Editar/remover serviço; apagar laudo; autor/data e versão | GET e banco; alteração efetiva auditada, outros campos preservados |
| LA04 | Duas edições/retirada concorrentes; equipamento já retirado | CAS; rascunho preservado, histórico e agregado intactos |
| TE01 | Lista mínima; atribuir técnico/admin, negar atendente/inativo/ID ausente | HTTP e navegador, sem revelar credenciais/perfis administrativos extras |
| TE02 | Desativação/rebaixamento durante atribuição | Replica set; revalidação/coordenação, sem nova atribuição inválida |
| TE03 | Desativar responsável existente e editar observação | Nome histórico permanece; nenhuma exigência de reatribuir |
| CO01 | OS antigas sem link, telefone incompleto, técnico textual e sem avaliação | Leitura preservada e edição operacional sem revalidar snapshot indevidamente |
| CO02 | Frontend antigo envia snapshot/tecnico textual | Cópia igual no-op; alteração explícita recusada; campos novos preservados |
| CO03 | Reconciliação explícita repetida/interrompida e vínculo conflitante | Fixtures isoladas preservam IDs/dados; sem união automática |
| SE01 | 401, revogação, 403, origem, payload e campos maliciosos | API real + transporte Next; nenhuma mutação não autorizada |
| UI01 | URLs diretas, móvel 360/768/1280, teclado/foco/labels, máscara e moeda | Chromium; verificar overflow e estados. Não declarar Safari validado |
| RG01 | Suite atual + novos cenários | typecheck, lint, HTTP/Mongo, build, E2E; mocks e limitações identificados |

## Condições para publicação futura

Testes locais aprovados e revisão da primeira jornada são necessários, não autorização automática de push. Não atualizar Netlify/Render, não executar transformação/índices em Atlas, nem disparar deploy por push nesta tarefa. Validar transações, índices, colisões e backup no destino somente em uma etapa autorizada. Preservar pendências operacionais anteriores.
