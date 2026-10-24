# Etapa 06 — segurança e operação local

Data: 24/10/2026. Branch `feat/seguranca-operacional-api`, derivada de `fix/seguranca-api-dependencias`. Código e testes: `6c0193b`; lockfiles: `e4d8a4d`. Escopo: código e MongoDB descartável. Sem Atlas, hospedagem, dados reais, push ou deploy.

## Achados e medidas

| ID | Evidência e precondição | Impacto e medida | Validação/estado |
| --- | --- | --- | --- |
| S01 | Confirmado por inspeção: `/api/auth/login` antes consultava usuário e conferia senha sem limitar tentativas. A API é o alvo direto e também recebe login encaminhado pelo Next. | Tentativas repetidas consomem CPU e permitem tentativa de adivinhação. `AuthAttempt` conta por endereço de conexão (até 100 tentativas/15 min) e por endereço+usuário (cinco falhas/15 min), com `_id` hash e TTL em Mongo. Express retorna 429/`Retry-After`; Next preserva essa resposta. Contadores sobrevivem a reinício da API e são compartilhados por instâncias com o mesmo banco. | Testes HTTP de falhas, concorrência, outra conta e liberação após remover a fixture. Teste de navegador para transporte 429. **Não validado em Atlas**. |
| S02 | Confirmado por inspeção: CORS era aberto antes da correção anterior. | API agora rejeita `Origin` não listado e não envia `Access-Control-Allow-Origin` nessa resposta. A comunicação Next→Express continua servidor a servidor. | HTTP positivo/negativo e preflight. Domínio real ainda não existe. |
| S03 | Confirmado por inspeção: não havia endpoints que distinguissem processo vivo de banco pronto. | `/health/live` responde sem tocar banco; `/health/ready` exige conexão e ping, com 503 genérico em falha. A API expõe `X-Request-ID`, remove `X-Powered-By` e registra em produção só método, template de rota, status e duração, sem URL completa, corpo, IP ou token. | HTTP com ping real no Mongo descartável e falha sintética; configuração do monitor ainda não verificada. |
| S04 | Auditoria local: oito alertas de dependências de produção do backend na fase anterior. Auditoria completa desta fase: dez alertas no frontend e três no backend, todos na árvore de ferramentas de desenvolvimento. | Produção: lockfile atualizado em `f0346a5`; `npm audit --omit=dev` retorna zero alertas conhecidos para frontend e backend. Ferramentas: `npm audit fix --package-lock-only` atualizou somente versões compatíveis; restam três alertas moderados ligados a `postcss-selector-parser` via Tailwind 3. CI agora audita os dois pacotes de produção. | A dependência restante é usada no processamento local de CSS, sem entrada de seletor fornecida pelo usuário no fluxo atual. Não é falha explorável confirmada na API publicada; a nova árvore foi reinstalada e validada. Não forçar Tailwind 4 sem migração própria. Auditoria do lockfile não prova ausência de falhas. |

Os controles anteriores permanecem: registro de funcionário só por admin, exclusão de OS só por admin, conta desativada perde sessão, logout revoga token, alteração de perfil é observada no servidor, cookie HttpOnly/CSRF no Next, limites de corpo e DTOs validados. Evidências: `backend/tests/auth.test.js`, `backend/tests/employees.test.js`, `backend/tests/orders-v2.test.js`, `tests/session.spec.ts` e contratos v2. Não houve pentest externo nem medição de carga de produção.

Após instalação limpa com os lockfiles atualizados, `npm run check` passou tipagem, lint, 57 testes HTTP/Mongo descartável e build; `npm run test:e2e` passou 17 cenários Chromium. O teste de backend cobre bloqueio após falhas, concorrência e outra conta; o navegador cobre 429 encaminhado pelo Next. A compilação atual não emitiu o aviso antigo de Browserslist. A CI remota não foi executada, pois não houve push.

## Topologia e limites

- O endereço usado no limite é `req.socket.remoteAddress`; a API não confia em `X-Forwarded-For`. Se o Next for o único cliente, todas as pessoas compartilham o limite de 100 tentativas visto do endereço do Next. Testar essa hipótese com a topologia escolhida antes de operar e ajustar o controle de forma segura, sem confiar em cabeçalhos não autenticados.
- A validação de 429 usa Mongo descartável. A coleção `authattempts` e seu TTL precisam de permissão e índice no Atlas. O `server.js` espera o índice ficar pronto antes de abrir a porta. Falha do banco impede o login com 503, sem expor o erro bruto.
- Em produção, o navegador deve falar com Next por HTTPS; Next fala com Express por conexão protegida/privada definida na hospedagem. Com acesso somente via Next, `CORS_ORIGINS` pode ficar vazio. Se houver cliente web direto da API, listar a origem exata. CORS não substitui autenticação.
- O serviço escolhido deve consultar `/health/ready` para tráfego e `/health/live` para processo, coletar status 429/5xx e latência sem registrar senha, token ou dados de clientes. Configurar alertas concretos quando houver provedor.

## Incidente e rotação preparados

1. Em suspeita de vazamento, suspender acesso afetado na hospedagem e preservar logs sem dados de clientes em canal seguro. Identificar o escopo antes de alterar banco.
2. Se `JWT_SECRET` vazar, gerar novo segredo fora do Git e trocar apenas no ambiente autorizado da API; tokens anteriores se tornam inválidos. Comunicar aos funcionários por canal operacional da empresa, se necessário, com autorização apropriada.
3. Se uma conta vazar, admin redefine senha presencialmente e revoga sessões pela alteração de versão já implementada. Para último admin sem acesso, usar recuperação operacional supervisionada, sem apagar histórico.
4. Se a URI do banco vazar, revogar usuário do Atlas, criar credencial de menor privilégio, atualizar hospedagem e verificar acessos. Não colocar URI em issue, log ou chat. Definir backup/restauração antes de produção.
5. Confirmar quais valores históricos do Git chegaram a ser usados; se sim, rotacioná-los no ambiente correspondente. Não reproduzir valores históricos nesta documentação.

## Pendências para corte

P18 segue aberta até validar TLS, rede, limites, logs e monitoramento na hospedagem real; sem provedor escolhido não há evidência de topologia. P15/P16/P17/P24 exigem Atlas novo, banco confirmado vazio e backup/restauração. P21 exige CI remoto e testes representativos; P23 é aceite humano. A URI permanece em branco no exemplo. Nenhum script desta etapa deve acessar produção automaticamente.
