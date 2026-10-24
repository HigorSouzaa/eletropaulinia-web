# Etapa 04 — fluxos de ordens e Funcionários

24/10/2026. Branch `feat/fluxos-next-funcionarios`, derivada da entrega da etapa 03. Revisão da arquitetura/contrato e do primeiro fluxo aprovada explicitamente pelo usuário; trabalho posterior limitado ao Prompt 04. Implementação em `ea4ee89` (API de funcionários), `9b6981e` (erros de entrada), `5281826` (ordens no Next) e `80580fd` (Funcionários no Next), após a primeira fatia `cba10f7`. Nenhum push, merge, deploy ou acesso a banco real.

## Entrega funcional

- Next cria OS com vários equipamentos, cliente sem e-mail, marca/modelo/série opcionais e escolha explícita entre relato e Testar. A chave de idempotência permanece na repetição da mesma tentativa. Detalhe e edição funcionam por URL própria e recarga, sem depender da lista em memória.
- Edição salva dados da OS e cada equipamento em operações explícitas. Campos opcionais podem ser limpos; composição pode ser alterada antes da primeira retirada. Todas as mutações usam `ETag`/`If-Match`; em 412 o rascunho é preservado, a versão atual é mostrada para comparação e não há reenvio automático. Legado continua somente leitura.
- O detalhe permite mudar o andamento individual, registrar retirada apenas para item Pronto e consultar horário no fuso `America/Sao_Paulo`. Exibe contagem parcial separada do agregado. A OS só fica Entregue depois da última retirada. Exclusão é exibida apenas a admin, exige digitar o número da OS e é revalidada no Express.
- A tela Funcionários lista, cadastra, edita nome/perfil, desativa/reativa e redefine senha presencialmente. Cadastro não troca a sessão do admin. Desativação mantém o histórico; desativação e reset invalidam todas as sessões anteriores via `sessionVersion`. Login e chamadas protegidas rejeitam conta inativa. Não há envio automático.
- Express mantém autorização. Alterações de perfil e acesso escrevem um documento comum em transação e verificam a contagem de administradores ativos, impedindo duas operações simultâneas de remover o último. Falha de transação não cai para escrita insegura. Mongo local standalone não suporta esse fluxo; Atlas/replica set é requisito para essas alterações.
- Route Handlers Next usam destinos e métodos fixos, limites de corpo, validação de origem em mutações, cookie HttpOnly e `private, no-store`. Respostas iniciadas antes de mudança de sessão são ignoradas nos fluxos autenticados. Não há regra de negócio nem acesso ao MongoDB no Next.

## Validações locais

Windows, Node 24, Next 16.4.2, Express 4, Mongoose 8; MongoDB 8.0.17 **descartável**. `npm run check` passou: tipagem, lint sem novos avisos, 42 testes HTTP/Mongo e build. Os seis testes novos de Funcionários usam replica set descartável, incluindo concorrência, 401/403, último admin, senha e entradas malformadas. `npm run test:e2e` passou 15 cenários em Chromium com Express/Mongo reais isolados; regressões de login/lista incluídas. Os dois últimos cenários verificam rascunho preservado em 503 na edição e leitura legada sem ações de escrita. Os três cenários afetados por exibição/foco também passaram após os ajustes finais.

O navegador comprovou criação/retry, recarga, edição/limpeza, conflito 412, retirada 1/3 e 3/3, exclusão/admin, cadastro de funcionário, sessão anterior revogada, reset e negação ao não admin. Erro/vazio e indisponibilidade do servidor permanecem cobertos pelos cenários da etapa 02; a falha transitória de criação nesta etapa usa interceptação declarada. Não confundir a interceptação com integração real. Capturas de edição, detalhe e Funcionários em 360 px e Funcionários em 1280 px foram inspecionadas; testes verificaram ausência de rolagem horizontal em 360/768/1280 px. Diálogos de retirada/exclusão foram validados com Escape, foco inicial e retorno de foco. Ainda não é auditoria completa de acessibilidade, nem teste de carga/CI remoto.

## Limites e continuidade

- P01 retirada antes de Pronto, P02 correção de retirada e P11 composição após primeira retirada permanecem indisponíveis até regra explícita. Garantia, mensagens, WhatsApp, relatórios avançados e redesign amplo ficam adiados.
- Dados reais, índices/contador no destino, backup/restore, reversão e volume não foram inventariados. A etapa 05 deve preparar e ensaiar reconciliação/rollback antes de qualquer corte; este código não autoriza migração Atlas.
- P18 continua bloqueio de publicação: CORS/abuso e alertas relevantes de dependências não foram encerrados nesta etapa. P14/P21 exigem auditoria ampliada, CI remoto e medição representativa. P23 exige homologação da empresa.
- O aviso de dados Browserslist antigos permanece em P20. Avisos NO_COLOR/FORCE_COLOR são do runner. Não houve métricas de produção nem afirmação de prontidão operacional.
