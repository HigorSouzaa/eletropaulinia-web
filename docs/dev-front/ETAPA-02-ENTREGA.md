# Etapa 02 — base Next e primeiro fluxo

Branch feat/base-nextjs, base 4786525. Arquitetura e sessão aprovadas explicitamente pelo usuário em 23/10/2026. Primeiro fluxo implementado: login, listagem compartilhada, busca sobre dados carregados, recarga, logout e troca de conta. Não houve expansão para etapas 03–08.

## Estrutura entregue

Next 16.4.2, React/React DOM 19.3.1, TypeScript, Node 24.21.0. Lucide 1.61.0 aceita React 19. Tailwind existente preservado. App Router na raiz; Express separado em backend/. Rotas /login e /ordens; /nova-ordem e /editar-ordem/:id exibem indisponibilidade temporária, sem formulário que descarte equipamentos. Código Vite preservado em legacy/ e fora do build.

Layout servidor separa estrutura de formulários/filtros cliente. Páginas protegidas não renderizam dados de cliente no HTML inicial; presença do cookie permite montar a estrutura e Express revalida em cada consulta. A camada Next tem somente transportes fixos de login/logout/me/orders, não proxy genérico nem conexão ao banco.

Autenticação: Express emite JWT com jti aleatório; Next grava cookie HttpOnly, SameSite=Lax e Secure em HTTPS. Logout grava hash SHA-256 de token revogado no Express; novas requisições são negadas. TTL somente dos registros de revogação expirados, sem TTL nas ordens. JWT_SECRET nunca vai ao Next. Login não retorna token ao JavaScript do navegador.

Origin explícito e JSON obrigatórios nos POST da camada Next; corpo de login limitado a 4 KiB durante leitura. Respostas autenticadas private/no-store e consultas no-store. Falha remota de logout não anuncia sucesso. Requisições já autorizadas antes do logout podem terminar; não há promessa de cancelar escritas anteriores.

Troca de sessão notifica abas por BroadcastChannel sem credenciais. Visibilidade/histórico revalidam; requests antigas são canceladas e estados apagados. 401 limpa cookie no transporte; 503 preserva possibilidade de retry sem confundir sessão inválida. Estado React não autoriza operações no servidor.

## Compatibilidade

API /api/orders continua legado de equipamento único e lista completa. Busca local não é paginação de servidor. Ainda não há contrato v2 em execução, retirada parcial ou tela Funcionários. Express mantém operações legadas para compatibilidade; não devem ser usadas como se aceitassem múltiplos equipamentos.

Instalação exige atualizar variáveis locais do Next pelos nomes em .env.example; não sobrescrevemos .env existente. Frontend usa porta 3000, API 5000. Login usa username; removidos da nova UI controles Lembrar-me e Esqueceu a senha que não tinham operação implementada.

## Verificações e limites

- 16 testes HTTP/MongoDB isolado passaram: 13 regressões e três cenários de revogação/identidade/expiração obrigatória.
- Seis testes Playwright passaram em Chromium: jornada real, CSRF/cache, erro/vazio, 401/abas, mobile/pendências e indisponibilidade real da API.
- Login/lista/logout exercitam Next → Express → MongoDB descartável real. No cenário de vazio e em parte dos erros/401 há interceptação de transporte explicitamente identificada no teste; esses não comprovam condição real de banco vazio ou expiração no navegador.
- Cenário de indisponibilidade desliga/reabre somente o servidor de teste. Controle local 5102 existe exclusivamente no runner de testes e não no app Express de produção.
- Capturas sintéticas em test-results/ (ignoradas pelo Git). Desktop 1280x720 e mobile 360x800; não é auditoria completa de acessibilidade.
- Primeira rodada Playwright teve três falhas por seletor ambíguo entre alerta da UI e anunciador do Next; seletor limitado ao main, sem relaxar resultado esperado. Nova execução passou sem retries.
- CI preparado com instalação Chromium e E2E após check; execução remota não realizada.
- Nenhum Atlas, banco real, deploy, push, merge ou mensagem externa.

Validação final após npm run setup (exit 0): npm run check exit 0, tipagem e lint sem erros/avisos, 16 testes HTTP passaram (12,90 s) e build Next passou. npm run test:e2e exit 0: seis testes passaram em 24,2 s, sem retries. Build ainda avisa sobre Browserslist antigo; o runner informa NO_COLOR/FORCE_COLOR, sem falha. Não declarar prontidão de produção: P18, dados/restore, fluxos v2 e homologação permanecem abertos.

## Dependências e segurança

Removidas dependências ativas de Vite/React Router/Axios; frontend anterior permanece arquivado. concurrently passou para devDependency e foi atualizado pontualmente de 9.2.1 para 9.2.5 para retirar shell-quote vulnerável. source-map-js atualizado para 1.2.2. Sem audit fix --force.

Auditoria de produção da raiz não equivale à auditoria do backend independente. Alertas de ferramentas de desenvolvimento e dependências do backend continuam na triagem P18; não tratar ausência de alertas como garantia de segurança. API legada ainda tem CORS amplo e falta de rate limit; não foi declarada pronta para publicação.

## Próximo passo

Etapa 03: implementar contrato de múltiplos equipamentos/numeração/concorrência e retiradas, após resolver somente decisões que bloqueiem cada operação. Atualizar [PENDENCIAS](../PENDENCIAS.md). Primeiro fluxo desta etapa entregue para revisão, sem autorização automática de ampliar escopo.

Auditorias em 23/10/2026: raiz --omit=dev com zero alertas; raiz completa com 10 (3 moderados, 7 altos), todos fora do conjunto de produção da raiz. Backend --omit=dev com oito (2 moderados, 5 altos, 1 crítico), incluindo proxy-addr crítico e Express/Mongoose/jws/lodash/path-to-regexp altos. São alertas de versões resolvidas; exploração no cenário da empresa não foi demonstrada. P18 permanece bloqueio de publicação até triagem/correção e regressões. Não foi aplicado update indiscriminado no backend como parte da migração visual.

Commits de implementação: 50c9bd2 (revogação Express) e de72e6d (Next e integração E2E). O frontend legado foi movido com similaridade Git de 100%; não houve perda de seus arquivos.
