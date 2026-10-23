# Etapa 02 — proposta concreta para checkpoint de arquitetura

23/10/2026. Base 4786525; branch feat/base-nextjs. Status: preparada para revisão, ainda não implementada. Nenhuma dependência instalada, nenhuma API/banco alterado. Skills Dev Front Master, Dev Back Master e complemento Dev Front Architecture.

## Escopo e evidências

Primeiro fluxo: /login → /ordens → sair/trocar conta. API atual /api/auth/login emite JWT HS256; /api/auth/me valida usuário existente e perfil; /api/orders retorna array legado. O frontend atual usa localStorage. Login apresenta label E-mail embora o backend autentique username; Lembrar-me e Esqueceu a senha não têm fluxo implementado. Não transportar esses controles como funcionalidades prontas.

Versões candidatas verificadas por npm view: Next 16.4.2 (Node >=20.9; React 19 aceito), React/React DOM 19.3.1. Preservar Node 24.21.0, npm 11.19 e Tailwind 3. Versão atual declarada lucide-react 0.344 tem peers até React 18; atualizar pontualmente para release com peer React 19, revisar exports usados e fixar lockfile. Não usar force/legacy-peer-deps para esconder conflito.

## Organização a construir após aprovação

```text
app/layout.tsx
app/page.tsx                       # redireciona para /ordens
app/login/page.tsx
app/(interno)/layout.tsx
app/(interno)/ordens/page.tsx
app/(interno)/loading.tsx
app/not-found.tsx
app/api/session/login/route.ts
app/api/session/logout/route.ts
app/api/session/me/route.ts
app/api/orders/route.ts             # somente GET, caminho Express fixo
src/features/auth/LoginForm.tsx
src/features/orders/OrderList.tsx
src/components/                     # layout/badges reaproveitados
src/lib/server/express-client.ts
src/lib/server/session.ts
src/lib/client/api.ts
src/types/legacy-order.ts
backend/models/RevokedToken.js       # proposta de revogação
backend/routes/auth.js              # POST logout
```

Next na raiz e backend/ independente. Server Components para estrutura/validação inicial; componentes cliente somente formulário, filtros e interações. Express permanece autoridade. Nenhum Next Route Handler cria/edita OS ou consulta MongoDB.

## Sessão proposta para esta etapa

Reutilizar JWT existente, emitido pelo Express; guardar em cookie HttpOnly do Next, sem localStorage. Não adotar sessão opaca agora: era alternativa proposta da etapa 01, não regra aprovada. Evitar substituir toda autenticação para implementar login/listagem.

Para cumprir logout real, adicionar no Express coleção de hashes SHA-256 dos tokens revogados com expiresAt. protect consulta revogação e usuário antes de autorizar. Guardar somente hash; nunca token bruto. Novo login deve receber identificador jti aleatório para evitar tokens idênticos em logins no mesmo segundo. Tokens legados válidos podem continuar sendo verificados; expiração continua no JWT.

POST /api/auth/logout: revogar token atual até expirar, 204; repetição não altera efeito. Banco indisponível → 503 e UI não anuncia revogação concluída. Token expirado já não permite acesso. TTL apenas em revogações expiradas, nunca em ordens; autorização valida expiração mesmo antes de limpeza TTL. Requisições já autorizadas antes do logout podem terminar; novas requisições são negadas. Testar concorrência logout/relogin sem revogar sessão nova.

Next usa cookie com Path=/, HttpOnly, SameSite=Lax e Secure em HTTPS; sem Domain amplo. Expiração do cookie não pode ultrapassar JWT. APP_ORIGIN define origem permitida; POST login/logout valida origem e Content-Type e aplica proteção contra CSRF, sem confiar apenas em SameSite. Rota de transporte estritamente limitada, com timeout e tamanho de corpo limitado.

API_INTERNAL_URL somente servidor. Sem JWT_SECRET ou URI Mongo no Next. Express continua verificando JWT, revogação e perfil; nome/perfil não são confiados ao cliente. CORS não substitui autenticação. Políticas completas de rate limit e implantação permanecem no P18, sem afirmar prontidão de produção.

## Cache, falhas e troca de conta

Consultas autenticadas no-store; respostas private/no-store. Estado por sessão, sem cache global. 401 remove cookie por rota de sessão e limpa contextos/lista; 503 mostra indisponibilidade e permite retry. Logout/login completam navegação com invalidação dos dados anteriores. Respostas antigas devem ser canceladas/ignoradas; testar duas abas e retorno pelo histórico do navegador. Não inserir token no BroadcastChannel ou em qualquer evento de sincronização.

## Aparência e rotas restantes

Preservar laranja/cinza/branco, marca textual, formulário à esquerda e imagem existente em desktop, menu lateral e listagem. Mobile: menu recolhível, conteúdo utilizável sem overflow da página, tabela com rolagem quando necessária. Labels, foco visível e mensagens acessíveis. Login deve dizer Usuário, coerente com a API; controles sem implementação ficam ausentes.

Após aprovação arquitetural, apresentar primeiro login real para checkpoint visual antes de ampliar a listagem. A identidade existente já é a referência, sem novo redesign.

Criação/edição/múltiplos equipamentos/retiradas não são implementados nesta etapa. Preservar código legado separado e identificável durante transição; URLs ainda não migradas mostram estado explícito de indisponibilidade temporária, sem formulários que descartem itens. Não ligar automaticamente ao Vite autenticado por localStorage. Documentar retirada dos scripts Vite somente quando todos os consumidores ativos estiverem conferidos. Nenhum corte em produção.

## Verificação planejada

1. Preservar 13 regressões atuais; incluir logout/revogação, expiração, falha de banco e logins distintos.
2. Testar transporte Next → Express → MongoDB isolado, cookies e origens; nenhuma dependência de Atlas real.
3. Navegador: login válido/inválido, lista real/vazia, API indisponível/retry, 401, logout, outra conta, recarga, URL direta, duas abas/histórico.
4. Verificar desktop e mobile/teclado; nenhum mock apresentado como integração.
5. Tipagem/lint/testes/build, instalação reprodutível e CI atualizado sem publicação.
6. Atualizar P04/P05/P20/P21; não encerrá-los por este plano.

## Fontes

Consultadas em 23/10/2026. Versões candidatas são metadados consultados, não instalação validada.

- [Instalação Next](https://nextjs.org/docs/app/getting-started/installation)
- [Autenticação](https://nextjs.org/docs/app/guides/authentication)
- [Componentes servidor/cliente](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Busca de dados](https://nextjs.org/docs/app/getting-started/fetching-data)
- npm view next version engines peerDependencies --json
- npm view react version --json
- npm view react-dom@19.3.1 peerDependencies --json
- npm view lucide-react@0.344.0 peerDependencies --json

## Checkpoint pendente

Revisar arquitetura e contrato de sessão acima antes de implementação principal. O pedido do Prompt 02 autoriza o escopo, mas exige respeitar os checkpoints das skills; não se registra aprovação inexistente. A revisão não reabre regras de negócio já confirmadas. Após aprovação, seguir somente o primeiro fluxo.
