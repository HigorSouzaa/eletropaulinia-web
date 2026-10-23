# Arquitetura e transição — proposta

Não implementada. Destino definido pelo usuário: Next.js/TypeScript, Express separado, MongoDB Atlas. Versões de Next/React devem ser fixadas na etapa 02 após verificar runtime/peer dependencies; nenhum pacote foi instalado nesta etapa. Base atual declara React ^18.3.1, Vite ^5.4.2, TypeScript ^5.5.3, Express ^4.18.2 e Mongoose ^8.0.3; runtime executado Node 24.21.0/npm 11.19.0.

## Organização proporcional

Manter um repositório e backend/ separado; não exigir monorepo framework, filas ou microserviços. Estrutura proposta:

```text
app/
  login/page.tsx
  (interno)/layout.tsx
  (interno)/ordens/page.tsx
  (interno)/ordens/[id]/page.tsx
  (interno)/nova-ordem/page.tsx
  (interno)/editar-ordem/[id]/page.tsx
  (interno)/funcionarios/page.tsx
  api/session/login/route.ts
  api/session/logout/route.ts
  api/business/[...path]/route.ts
src/
  components/                 # reaproveitar UI
  features/orders/            # formulários e interação
  features/employees/
  lib/server/express-client.ts
  lib/client/api.ts
  types/                      # DTOs; sem modelos de banco
backend/
  app.js
  server.js
  routes/
  middleware/
  controllers/
  services/                   # regras e operações atômicas
  models/
  tests/
docs/contratos/
```

Controllers traduzem HTTP; serviços aplicam regras; modelos acessam MongoDB. Não criar camada repository genérica sem uso concreto. Manter JavaScript do backend nesta etapa é compatível com TypeScript do frontend. Contratos podem gerar tipos mais tarde, sem adicionar biblioteca apenas para isso.

## Rotas e componentes

/login e /ordens preservadas; /nova-ordem e /editar-ordem/:id mantêm equivalentes App Router. Detalhe ganha URL /ordens/:id além do modal, permitindo recarga. Funcionários é nova rota administrativa. Layout, Sidebar, FormInput, badges e estilos Tailwind reaproveitáveis com ajustes de links/acessibilidade. Não reutilizar cegamente o tipo Order de equipamento único.

Servidor: layout, página inicial e consultas autenticadas via Express. Cliente: formulários, modal, filtros interativos e estados transitórios. Não marcar aplicação inteira use client. Browser APIs somente em componentes cliente; eliminar sessão baseada em localStorage ao concluir transição de autenticação. Contexto não substitui busca individual de detalhe. Preservar estilos atuais, teclado, foco e larguras móveis; sem redesign autorizado.

## Sessão e comunicação propostas

Topologia proposta: navegador → Next, mesma origem; Next → Express, HTTPS no ambiente publicado; Express → Atlas. Camada intermediária Next é justificada para manter credenciais fora do JavaScript do navegador e evitar cookies entre sites quando hospedagens forem diferentes. Ela faz transporte e gestão do cookie, não regras de OS nem acesso direto ao MongoDB.

Proposta de sessão opaca emitida/validada/revogada pelo Express, token aleatório com hash persistido e expiração. Next guarda apenas credencial em cookie HttpOnly, Secure em HTTPS, SameSite=Lax, Path=/, sem Domain amplo. Não introduzir segunda autenticação independente no Next. Primeira etapa pode transportar JWT existente no cookie como transição explicitamente limitada, mas logout local não equivale a revogação; substituir por sessão revogável antes da liberação.

- POST de login: Next encaminha ao Express; recebe credencial no canal servidor, grava cookie e devolve apenas perfil público.
- Dados server-side usam o mesmo cliente HTTP Express, sem passagem pela própria rota proxy.
- Mutações do navegador passam por rota de transporte com allowlist de métodos/caminhos, limite de corpo e timeout. Nunca proxy aberto para URL fornecida pelo usuário.
- Express revalida sessão/usuário/perfil em cada ação. Checagens de layout são UX, não autorização suficiente.
- Logout revoga sessão no Express antes de declarar sucesso e remove cookie; falha remota deve ser visível, sem afirmar revogação.
- Validar Origin em mutações e proteção CSRF apropriada à topologia, incluindo login; SameSite sozinho não encerra a análise.
- Não expor JWT_SECRET, URI de banco ou cookie em props, logs ou bundles.
- CORS do Express restrito aos consumidores realmente necessários; não usá-lo como autenticação.

Essa proposta precisa de revisão arquitetural na etapa 02; não está implementada. Não duplicar regras em Server Actions/Route Handlers. Sessões existentes não são transportadas por leitura insegura automática; aceitar novo login na transição.

As orientações de autorização próxima aos dados e uso seguro de cookies estão na [documentação Next](https://nextjs.org/docs/app/guides/authentication). O uso de API HTTP existente e cuidado com DTOs segue a [documentação de segurança de dados](https://nextjs.org/docs/app/guides/data-security).

## Cache e estados de interface

Respostas autenticadas: Cache-Control private, no-store; fetch server-side no-store explícito. Não usar cache compartilhado persistente para ordens/perfil. Não confiar no comportamento padrão de uma versão de Next. Não manter token em estado global do módulo servidor.

Após mutação bem-sucedida, atualizar detalhe e refazer lista/contagens com filtros vigentes. Não exibir sucesso antes do HTTP. Em 412 preservar rascunho e oferecer recarga/comparação; nunca sobrescrever silenciosamente. Em 401 limpar sessão e todos os estados de ordens/funcionários, cancelando requisições anteriores. Em 403 informar permissão; em 503 manter formulário e permitir nova tentativa. Troca de conta deve invalidar requisições, router state e caches do cliente mesmo com acesso compartilhado.

Loading, vazio, erro, sucesso e recuperação são estados separados. Desabilitar envio repetido e manter chave idempotente da tentativa. Marca opcional e Testar explícito, sem placeholders persistidos como informação real.

## Ambiente

Atual: VITE_API_URL no cliente; MONGODB_URI, JWT_SECRET, JWT_EXPIRE, PORT e NODE_ENV no backend; ADMIN_USERNAME/ADMIN_NAME/ADMIN_PASSWORD somente bootstrap manual.

Proposta Next: API_INTERNAL_URL exclusivamente servidor; APP_ORIGIN para validação de origem; nenhuma URI de banco. Não há necessidade de NEXT_PUBLIC_API_URL na topologia de mesma origem. Express: MONGODB_URI, SESSION_TTL_SECONDS (se sessão opaca aprovada), ALLOWED_ORIGINS e configuração de proxy adequada ao provedor. Não escolher duração operacional final sem confirmação; 1h é o padrão JWT atual, não decisão nova.

Dev/test/prod separados por banco e credenciais. Não usar banco real em testes. Não escrever valores de segredo na documentação.

## Compatibilidade e corte

1. Etapa 02: Next login/lista usa contrato legado via adaptador isolado. GET /api/orders ainda retorna array e não oferece paginação; adaptação não resolve desempenho por si.
2. Etapa 03: API v2 e transformação de dados testadas com fixtures. Mapear legado para um equipamento; preservar _id da OS, numero e referências.
3. Etapa 04: Next conclui jornadas v2; nenhuma tela anuncia múltiplos equipamentos antes dessa API.
4. Não servir OS v2 ao cliente v1 achatando para primeiro item. Durante corte, impedir escritores v1 com resposta explícita de atualização necessária; não deixar PUT legado apagar/ignorar novos dados.
5. Apenas liberar clientes v2 após validação dos dados. Em ambiente real, preferir janela de escrita suspensa planejada e aprovada, com backup verificável, em vez de escrita dupla improvisada.
6. Preservar rollback de aplicação e dados separadamente. Código v1 não representa múltiplos equipamentos: reversão exige versão compatível ou manutenção e reconciliação; nunca achatar dados para “voltar”.
7. Não remover contratos v1 antes de inventariar consumidores e encerrar a janela de compatibilidade.

## Inventário de dados e preservação

Não houve acesso ao banco da empresa. Quantidade de OS/usuários, índices efetivos, duplicidades, backups e valores ausentes são desconhecidos. Arquivos de modelo não demonstram estado real do banco.

Inventário autorizado futuro: contagens agregadas por schema/status, distribuição de equipamentos, números inválidos/duplicados, datas ausentes, usuários por perfil/atividade, referências órfãs e índices existentes. Relatório sem dados pessoais.

Transformação futura idempotente por schemaVersion: OS legada → equipamento com ID estável persistido; copiar campos reais, sem adivinhar e-mail/modelo; preservar createdAt/updatedAt históricos quando possível; marcar metadados de migração separadamente. Entregue legado recebe indicação de entrega histórica com horário desconhecido. Documento inconsistente vai para reconciliação, nunca descarte silencioso. Backup/ensaio devem ocorrer em destino separado autorizado.

No corte: comparar contagens, IDs, números, campos e exceções; não basta contar documentos. Manter contador acima do maior número reconciliado. Testar restauração e proteger gravações posteriores ao snapshot. Proposta de backup depende do plano Atlas; existência de backup não foi verificada. Sem TTL de ordens; retenção de backups não equivale a retenção ativa e exige política própria.
