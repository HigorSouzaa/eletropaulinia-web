# Pendências para revisão ao final dos prompts

## Etapa 08 — proposta de publicação em 25/10/2026

[Comparação atual, configuração e runbook](operacao/ETAPA-08-PUBLICACAO.md). P22 **atualizada, ainda aberta**: candidata Vercel Pro + Render pago + Atlas Flex, com base indicativa de US$ 60–82/mês antes de extras, sem escolha de conta/projeto, contratação ou deploy. As opções gratuitas pesquisadas têm restrições incompatíveis ou não recomendadas pelos provedores para a operação empresarial; não foram adotadas. P18 **atualizada, aberta**: a topologia proposta faz vários usuários compartilharem o IP visto pela API no limite geral de login; validar e ajustar no destino antes da liberação. P15/P16/P17/P24 seguem abertas para Atlas vazio, preparação, backup/restauração e política de retenção. P21 segue aberta para CI remoto/carga representativa; P14 para auditoria de acessibilidade/dispositivos reais; P23 para aceite humano. Nenhum ID foi resolvido por pesquisa ou documentação. `MONGODB_URI` permanece em branco e não houve alteração de banco, push, publicação ou contratação.

## Etapa 07 — validação local em 24/10/2026

[Matriz, medições e roteiro de homologação](qa/ETAPA-07-HOMOLOGACAO.md). `npm run check` passou 57 testes HTTP/Mongo, tipagem, lint e build; `npm run test:e2e` passou 18 cenários Chromium, incluindo continuidade da mesma OS por dois funcionários após retirada parcial e recarga. O teste de consulta mede 50 OS sintéticas/10 chamadas, JSON de resposta e plano de índice; não representa carga ou volume da empresa. Interceptações de erro/vazio estão identificadas no relatório. **P14** foi ampliada localmente, mas segue aberta para auditoria completa de acessibilidade/dispositivos reais. **P21** segue aberta para CI remoto, volume/carga representativos e validação no ambiente de hospedagem. **P23** segue aberta até aceite humano real. **P15/P16/P17/P18/P24** continuam bloqueios do corte conforme seus critérios; Atlas ainda não existe. Nenhum ID foi resolvido apenas pelos testes locais; não houve push, deploy ou alteração de banco real.

## Etapa 06 — segurança local em 24/10/2026

[Achados, testes e limites](dev-back/ETAPA-06-SEGURANCA.md). P18 segue **aberta para publicação**, mas o login agora tem limite persistido no MongoDB por endereço e endereço/usuário (`6c0193b`), 429 com `Retry-After` atravessa Express→Next, e readiness testa o banco sem revelar erros internos. Após reinstalação limpa, `npm run check` passou 57 testes HTTP/Mongo, tipagem, lint e build; `npm run test:e2e` passou 17 cenários Chromium. A auditoria de produção retornou zero alertas conhecidos nos dois pacotes e a completa do backend também zero. Lockfiles de desenvolvimento receberam atualizações compatíveis (`e4d8a4d`); restam três alertas moderados via Tailwind 3 na auditoria completa da raiz. Não forçar Tailwind 4 sem migração/testes próprios. P20 **resolvida localmente** com `e4d8a4d`: dados Browserslist atualizados e build sem aviso. P15/P16/P17/P24 seguem dependentes do Atlas, P21 de CI remoto/ambiente representativo e P23 de aceite humano.

## Segurança da API — avanço local em 24/10/2026

P18 permanece **aberta para publicação**. A auditoria antes da correção encontrou oito alertas de produção no lockfile do backend (um crítico, seis altos, um moderado). A atualização compatível do lockfile (`f0346a5`) levou `npm audit --omit=dev` a zero alertas conhecidos; `npm run check` passou 53 testes HTTP/Mongo, tipagem, lint e build, e o teste HTTP completo após o controle de origem passou 54 cenários. A API agora rejeita requisições com `Origin` fora de `CORS_ORIGINS`; em desenvolvimento permite localhost/127.0.0.1:3000. A chamada servidor Next → Express não envia `Origin`. Faltam hospedagem/proxy definidos e testes de proteção de tentativas de login, TLS, logs, configuração de origem real e operação com instância(s) do destino. Zero alertas conhecidos não equivale a ausência de vulnerabilidades.

## Exceções operacionais implementadas localmente — 24/10/2026

[Entrega e limites](dev-back/EXCECOES-RETIRADA-ENTREGA.md). P01, P02 e P11 estão **resolvidas no fluxo v2 local**, com testes HTTP/Mongo e navegador; a regra decidida não equivale a publicação. P01: retirada em qualquer andamento, sem falsear Pronto. P02: correção por qualquer funcionário com motivo, `If-Match`, registro anterior preservado; sem sessão negado. P11: inclusão após retirada e remoção somente de item sem histórico, preservando retirados. `npm run check` passou 53 testes HTTP/Mongo, tipagem, lint e build; `npm run test:e2e` passou 16 cenários Chromium. P15/P16/P17/P18/P21/P23 ainda bloqueiam a entrada real; P20 permanece aviso de ferramentas. Nenhum dado real foi alterado.

## Decisão de banco novo — 24/10/2026

O usuário informou que as ordens anteriores eram somente testes e autorizou começar a operação em um banco novo e vazio. Não há cluster Atlas nem URI configurados; o exemplo `MONGODB_URI` foi deixado em branco. [Roteiro e comando guardado](dev-back/ETAPA-05-BASE-ZERO.md). O comando de preparo recusa banco não vazio e foi testado apenas em MongoDB descartável. `npm run check` passou com 51 testes HTTP/Mongo, tipagem, lint e build. P15/P24 não precisam mais transportar as OS de teste para o corte **se o destino novo for confirmado vazio**; continuam abertos até verificar banco, índices, contador e aplicação no Atlas. P16/P17 continuam abertos para backup/restauração e política de retenção do novo sistema. Nenhum dado antigo foi apagado nesta etapa.

## Primeira fatia da etapa 05 — 24/10/2026

Checkpoints A/B aprovados pelo usuário. [Ensaio local e limites](dev-back/ETAPA-05-PRIMEIRA-FATIA.md), implementação `dc876ba`. Inventário agregado e conversão de lote restritos a `stage05_fixture_only` foram testados com dados sintéticos: preservação de ID/número/origem, bloqueio de anomalias, repetição sem escrita, interrupção/retomada e recusa de outro banco. `npm run check` passou com 47 testes HTTP/Mongo, tipagem, lint e build; o CLI confirmou duas conversões e zero escritas na repetição. **P15/P16/P17/P24 permanecem abertas para corte**: não houve inventário real, backup/restore, índice/contador no destino nem teste de reversão após escrita nova. P01/P02/P11 seguem sem implementação e P18 bloqueia publicação. Próxima ação: revisão do checkpoint C; só depois ampliar scripts/ensaios locais, sem acesso remoto implícito.

## Preparação da etapa 05 — 24/10/2026

Branch `feat/preparo-atlas-dados`, base `51b854a`. [Plano A/B para revisão](dev-back/ETAPA-05-PLANO.md). Releitura do código confirmou que a transformação atual é pura e que o preparador de índices/contador só roda no banco de teste `orders_v2_test`. `npm run check` revalidou tipagem, lint, 42 testes HTTP/Mongo descartável e build. Nenhum banco real ou Atlas foi acessado; nenhum aplicador foi implementado nesta preparação. P15/P16/P17/P24 continuam abertos, P0 para corte onde já indicado. Próximo passo: revisão da arquitetura/contrato; depois uma primeira fatia em Mongo descartável, conforme checkpoints da Dev Back Master. A documentação atual do Atlas registra uma prévia privada de backup diário pago em Free; disponibilidade, custo e adequação à empresa ainda não foram verificados.

## Decisões operacionais recebidas — 24/10/2026

O usuário confirmou: (1) permitir retirada de equipamento antes de Pronto, inclusive antes da aprovação do serviço; (2) permitir que qualquer funcionário corrija uma retirada registrada por engano; (3) permitir alterar a composição da OS depois da primeira retirada. Esta é decisão de negócio, **não evidência de implementação**. A etapa 04 ainda bloqueia esses três caminhos. Preservar o evento anterior e o histórico dos itens entregues na solução técnica.

| ID | Estado e impacto | Dependência, próxima ação e critério observável |
| --- | --- | --- |
| P01 | Regra decidida; implementação pendente, P1. API/UI só permitem retirada de item Pronto. | Criar contrato e fluxo de retirada antecipada em branch própria, sem contornar autorização/concorrência; testar retirada em outros andamentos, inclusive antes de aprovação, recarga e status agregado. |
| P02 | Permissão decidida; implementação pendente, P1. Não há correção de retirada. | Definir contrato auditável que preserve evento original, autor da correção e estado atual; implementar para todos os funcionários, testar concorrência, repetição, recarga e negação sem sessão. |
| P11 | Composição após retirada aprovada; implementação pendente, P1. API/UI bloqueiam alteração após primeira retirada. | Especificar limites que preservem equipamento já entregue e seu histórico; implementar inclusão, alteração e remoção permitidas com If-Match e testes de agregado, concorrência e recarga. |

Essas exceções devem ser implementadas e validadas antes da homologação operacional e do corte. O Prompt 05 continua focado em dados/Atlas; não o usar como autorização implícita para alterar os fluxos. Detalhes técnicos de auditoria/correção e alterações de item entregue continuam para contrato e revisão de implementação, sem reabrir as três decisões acima.

## Preparação da etapa 04 — 23/10/2026

Branch `feat/fluxos-next-funcionarios`, base `4157aae`. Propostas para revisão em [arquitetura frontend](dev-front/ETAPA-04-ARQUITETURA.md) e [contrato de Funcionários](dev-back/ETAPA-04-FUNCIONARIOS-CONTRATO.md). Nenhuma pendência foi resolvida apenas por documentação. `npm run check` revalidou tipagem, lint, build e 36 testes HTTP/Mongo descartável; não cobre as futuras telas/endpoints. O aviso Browserslist permanece em P20.

| IDs | Estado nesta preparação | Evidência, impacto e próximo critério |
| --- | --- | --- |
| P03 | Aberta, P1 | Decisão recebida em 24/10: desativar sem apagar histórico, revogar sessões e redefinir senha presencialmente por admin, sem envio automático. Implementar endpoints, proteção do último admin ativo e testes de revogação antes de resolver. |
| P06/P07/P13 | Em andamento, P0/P1 | API v2 existe, mas criação/detalhe/edição/retirada/exclusão não têm telas Next. Implementar fatia real, recarga, conflitos e erros; validar HTTP+browser. |
| P11 | Aberta, P1 | Composição após retirada indefinida; manter indisponível e obter decisão antes de habilitar. |
| P12 | Aberta, P1 | `/auth/register` admin existe; listagem/edição e garantia concorrente do último admin faltam. Contrato proposto requer transação e teste de dois rebaixamentos. |
| P14/P21 | Em andamento, P1 | Novas telas exigem teclado/foco/360, 768, 1280 px e jornadas reais; interceptações devem ser rotuladas. |
| P01/P02 | Abertas, P1 | Retirada antecipada e correção continuam indisponíveis, aguardando regra da empresa e testes negativos. |
| P15/P16/P18/P24 | Abertas, P0 para corte | Dados/backup reais, segurança operacional e reversão não foram validados por esta preparação; etapas 05/06. |

Critérios, dependências e histórico completos dos IDs permanecem nas tabelas abaixo. Próxima ação desta etapa: revisão dos checkpoints das skills; depois implementar um fluxo vertical e demonstrá-lo antes de ampliar. Sem migração real, push, merge ou deploy.

## Primeira fatia da etapa 04 — 24/10/2026

Implementação `cba10f7`, [relatório e limites](dev-front/ETAPA-04-PRIMEIRO-FLUXO.md). Checkpoints de arquitetura/contrato aprovados pelo usuário; revisão visual/funcional ainda pendente. Nenhum ID abaixo foi encerrado pelo primeiro fluxo.

| IDs | Estado e evidência atual | Próxima ação/critério restante |
| --- | --- | --- |
| P06 | Em andamento: formulário Next cria três itens, marca/e-mail opcionais e Testar; recarga real por ID preserva | Edição, limpeza de opcionais, estados de erro completos e critérios T04–T07 |
| P13 | Em andamento: deep link de detalhe funciona; lista aponta para OS | Edição por URL, modais/retirada, conflitos 412 e falhas sem perder rascunho |
| P14 | Em andamento: criação sem overflow nos testes a 360/768/1280 px | Teclado/foco e todas as telas da etapa; auditoria completa |
| P21 | Em andamento: oito E2E completos após código; dois testes direcionados após ampliar negativos/responsividade | Concluir jornadas restantes, CI remoto e medições representativas |
| P03 | Aberta, decisão de negócio recebida | Desativar sem apagar histórico, revogar sessões e redefinir senha presencialmente por admin; implementar/testar na gestão de Funcionários |
| P07/P12 | Abertas para UI/gestão: API de retirada existe; Funcionários carece de endpoints/tela | Implementar após revisão funcional, com negativos e concorrência |

P01/P02/P11 continuam decisões pendentes. P15/P16/P18/P24 continuam bloqueios de corte/publicação. A regressão E2E usa exclusivamente Mongo descartável e dados sintéticos.

## Fechamento da etapa 04 — 24/10/2026

[Entrega e validações](dev-front/ETAPA-04-ENTREGA.md). A revisão da primeira fatia foi aprovada pelo usuário antes da ampliação. `npm run check` passou com 42 testes HTTP/Mongo descartável, tipagem, lint e build; `npm run test:e2e` passou 15 cenários. Após os últimos ajustes de exibição/foco, a suíte de jornadas afetadas também passou. Nenhum banco real foi migrado, nenhum serviço foi publicado.

| ID | Estado atual | Evidência/impacto | Dependência, próxima ação e critério |
| --- | --- | --- | --- |
| P03 | **Resolvida no escopo definido** | Decisão do usuário, `ea4ee89`/`80580fd`; desativação preserva usuário, invalida sessão; reset presencial sem envio; HTTP concorrência/reset e E2E | Etapa 05 deve verificar dados/perfis reais antes do corte; não reabrir regra sem nova decisão |
| P06 | **Resolvida no fluxo v2 local** | `cba10f7`/`5281826`; criação, edição, opcionais e múltiplos itens persistem após recarga; HTTP+E2E | Reconciliação de legados reais continua P15/P24; fechamento não implica migração |
| P07 | **Resolvida no fluxo normal local** | `5281826`; 1/3 e 3/3, instante/ator persistidos na API, status agregado correto após recarga; HTTP+E2E | Exceções P01/P02 permanecem separadas e indisponíveis |
| P12 | **Resolvida no fluxo local** | `ea4ee89`/`9b6981e`/`80580fd`; admin cadastra/lista/edita/desativa/reset, não admin negado, último admin preservado em transações concorrentes; HTTP+E2E | Mongo replica set exigido para mutações administrativas; validar ambiente real na etapa 05 |
| P13 | **Resolvida no fluxo local** | `5281826`; detalhe/edição por URL, confirmação aguardada, conflito mantém rascunho; E2E | Homologação humana e falhas operacionais seguem P23/P21 |
| P14 | Em andamento, P1 | Testes 360/768/1280 px sem rolagem horizontal, capturas inspecionadas, foco/Escape dos diálogos | Auditoria ampliada de acessibilidade e dispositivos na etapa 07; encerrar com matriz T24 completa |
| P21 | Em andamento, P1 | 42 HTTP/Mongo e 15 E2E locais; interceptações declaradas | CI remoto, outros navegadores e carga/dados representativos na etapa 07; encerrar com resultados por ambiente |
| P01/P02/P11 | Abertas, P1 | Exceções ainda sem decisão explícita; botões/rotas de correção ausentes e composição bloqueada após retirada | Obter regras da empresa e testar cenários antes de habilitar |
| P15/P16/P18/P24 | Abertas, P0 para corte | Sem inventário/backup/restore real, triagem de segurança ou ensaio de reversão | Etapas 05/06; não publicar até critérios originais observados |
| P20/P23 | Abertas | Browserslist antigo; homologação operacional da empresa ausente | Atualizar dados de compatibilidade com justificativa; obter aceite humano real |

Melhorias adiadas por decisão do usuário permanecem fora do pacote: garantia e envio automático, WhatsApp, módulo completo de clientes, relatórios avançados e redesign amplo. Limitações de acesso: nenhum dado real, Atlas, backup, CI remoto ou ambiente de hospedagem foi inspecionado nesta etapa.

Registro central solicitado pelo usuário. Atualizar durante as etapas 02–08 e revisar após a etapa 08. Criado em 23/10/2026 a partir da etapa 01 (8be92b1). Documentação não comprova implementação.

## Como manter

Registrar toda descoberta não resolvida: ID, etapa de origem, evidência, impacto/prioridade, dependência, próxima ação e critério observável. Estados: aberta, em andamento, bloqueada, resolvida ou adiada por decisão explícita. Ao resolver, manter a linha e acrescentar commit/teste/data. Não excluir histórico nem marcar concluído por apenas documentar. Evitar duplicações, segredos e dados pessoais.

Pendências previstas para os próximos prompts também permanecem aqui até validação. Não adiar bloqueios do fluxo atual ou de produção apenas porque haverá revisão final. Perguntar somente decisões necessárias ao trabalho em curso.

## Registro inicial

Todas as linhas abaixo estão **abertas**, salvo quando indicado. P0 bloqueia uso real; P1 necessário para conclusão; P2 melhoria/otimização. Referências detalhadas e matriz T01–T24: [validação da etapa 01](contratos/VALIDACAO.md). Propostas: [API](contratos/API-V2.md) e [arquitetura](contratos/ARQUITETURA-E-TRANSICAO.md).

| ID | Origem → etapa responsável | Pendência e evidência | Impacto/prioridade | Dependência e próxima ação | Critério de encerramento |
| --- | --- | --- | --- | --- | --- |
| P01 | 01 → 03/04 | Retirada antes de Pronto não definida | P1, exceção operacional | Resposta do usuário; definir bloqueio ou motivo obrigatório | Regra registrada e T11 validado |
| P02 | 01 → 03/04 | Quem corrige retirada e como preservar evento anterior | P1 | Resposta do usuário e contrato de correção | Permissões, motivo e teste negativo |
| P03 | 01 → 04/06 | Desligamento/recuperação de acesso não definidos | P1 | Decidir desativação e redefinição administrativa | T19 e revogação verificadas |
| P04 | 01 → 02 | Sessão, transporte e cache são proposta; contextos legados desconectados | P0 | Revisar arquitetura e implementar fluxo inicial | T01/T16, sem estados antigos após troca de conta |
| P05 | 01 → 02 | Base permanece Vite/React Router | P1 | Versões compatíveis e arquitetura | Next login/lista reais, build/tipos/testes |
| P06 | 01 → 03 | Só primeiro equipamento enviado; e-mail não salvo; marca obrigatória | P0 | API v2 e formulários etapa 04 | T04–T07, nenhum campo aceito perdido |
| P07 | 01 → 03/04 | Ausência de retirada individual e horário | P0 | Contrato normal e exceções P01/P02 | T08–T11 e recarga preservada |
| P08 | 01 → 03 | Número por última OS e atualizações sem versão | P0 | Contador, índices e reconciliação | T12/T13 concorrentes; número imutável |
| P09 | 01 → 03 | Opcionais não limpam; erros de OS expõem error.message | P0 | Validação e envelope v2 | T14/T22 e erros sem detalhes internos |
| P10 | 01 → 03 | Lista sem paginação/filtros no servidor | P1 | Contrato e dados representativos | T15, limites e contagens corretos |
| P11 | 01 → 03 | Agregação de andamento, limites e composição após retirada são propostas | P1 | Revisar proposta antes da implementação correspondente | Decisões explícitas e cenários de teste |
| P12 | 01 → 04 | Gestão de funcionários ausente; último admin precisa proteção | P1 | API e P03 | T18/T19, inclusive concorrência |
| P13 | 01 → 04 | Deep link depende da lista; modal não aguarda status | P1 | Next e API | T17, estados de falha/sucesso corretos |
| P14 | 01 → 04/07 | Acessibilidade/responsividade não validadas em navegador | P1 | Telas funcionais | T24 com evidências desktop/mobile/teclado |
| P15 | 01 → 05 | Banco real, volume, dados ausentes e índices desconhecidos | P0 para corte | Acesso autorizado e inventário agregado | Plano preserva IDs/números e T20 |
| P16 | 01 → 05 | Backup/restore e reversão não comprovados | P0 para corte | Destino isolado autorizado e plano Atlas | T23, reconciliação de escritas pós-corte |
| P17 | 01 → 05/06 | Política de exclusão em backups e retenção não definida | P1 | Responsável da empresa/plano do provedor | Política documentada, sem TTL de OS |
| P18 | 01 → 06 | CORS aberto, abuso e dependências não retriados | P0 antes de publicação | Ambiente e avaliação de alcance | Controles testados e riscos aplicáveis tratados |
| P19 | Ciclo 1 → 06 | Uso/rotação de credenciais históricas não verificável | P0 se usadas | Inventário autorizado; nunca imprimir valores | Uso apurado e procedimento executado somente se autorizado |
| P20 | 01 → 02/07 | Dois avisos Fast Refresh e bases de browsers antigas | P2 | Verificar se migração remove causa; atualizar somente com justificativa | Avisos resolvidos ou limitação registrada com evidência |
| P21 | 01 → 07 | Sem E2E, medições representativas ou CI remoto atual | P1 | Fluxos completos; publicação autorizada para CI remoto | Matriz T01–T24 e resultados reais por ambiente |
| P22 | 01 → 08 | Backend/domínios/custos e condições comerciais indefinidos | P1 | Pesquisa atual e escolha do usuário | Plano de hospedagem e corte revisado |
| P23 | 01 → 07/08 | Aceite operacional da empresa não realizado | P1 | Homologação e responsável | Aceite humano real registrado |
| P24 | 01 → 03/05 | Compatibilidade v1/v2 e rollback sem perda ainda não testados | P0 para corte | Transformação e bloqueio de escritores legados | Ensaio sem achatamento nem perda de equipamentos |

## Fora do pacote atual

Garantia e envio automático; WhatsApp; módulo completo de clientes; relatórios avançados; redesign amplo. **Adiadas por decisão do usuário**, não esquecidas e não automaticamente autorizadas após o prompt 08.

## Histórico

- 23/10/2026: registro criado; nenhuma pendência considerada resolvida pela criação deste arquivo.
- Etapa 01: npm run check passou (13 testes legados, tipagem/build; dois avisos). Não equivale a validar os fluxos novos.

## Atualização da etapa 02 — checkpoint de arquitetura

23/10/2026: P04 e P05 em andamento apenas no planejamento; não resolvidos. Proposta concreta em [ETAPA-02-ARQUITETURA.md](dev-front/ETAPA-02-ARQUITETURA.md). P20/P21 permanecem abertos, sem nova execução de testes/build ou navegador nesta preparação.

P25 — origem 02, prioridade P1, estado aberto: lucide-react 0.344 não declara peer React 19, necessário para a combinação candidata Next 16.4.2/React 19.3.1. Evidência: npm view. Candidata consultada lucide-react 1.61.0 aceita React 19. Próxima ação: atualização pontual com revisão dos exports e lockfile após checkpoint. Encerrar com resolução sem flags de conflito, build e verificação visual dos ícones. Nenhum pacote foi instalado nesta preparação.

## Fechamento da etapa 02 — 23/10/2026

As atualizações abaixo substituem o estado inicial dos IDs, preservado acima como histórico.

| ID | Estado atual | Evidência/limite | Próximo passo |
| --- | --- | --- | --- |
| P04 | Resolvida no fluxo da etapa 02 | Cookie HttpOnly, Express revalida/revoga, 16 testes HTTP e 6 E2E; 50c9bd2 e commit Next desta branch | Revalidar nas próximas mutações; gestão de desligamento continua P03 |
| P05 | Resolvida no escopo login/lista | Next App Router, instalação limpa/check/E2E aprovados; legacy preservado | Fluxos completos seguem P06/P07/P13, sem alegar paridade |
| P25 | Resolvida | Lucide 1.61.0/React 19.3.1; npm ls, instalação limpa, build e capturas com ícones | Sem ação restante nesta etapa |
| P20 | Em andamento | Avisos Fast Refresh não pertencem mais ao frontend ativo; Browserslist antigo permanece | Atualizar dados de compatibilidade com justificativa; ferramentas de lint Next não usam plugin Vite |
| P21 | Em andamento | Seis E2E locais em Chromium com API/MongoDB real; partes de erro/vazio usam interceptação explícita | CI remoto, outros navegadores, fluxos v2 e medições representativas ainda pendentes |
| P14 | Em andamento | Desktop 1280x720/mobile 360x800 inspecionados, sem overflow da página no mobile | Auditoria completa de teclado/acessibilidade e telas novas na etapa 04/07 |
| P18 | Aberta, bloqueia publicação | Raiz produção: 0 alertas; dev: 10. Backend produção: 8, incluindo proxy-addr crítico; alcance não demonstrado | Triar/corrigir antes de uso real, além de CORS/rate limit já registrados |

Nenhuma pendência de produto foi silenciosamente aprovada. P01/P02/P03/P11 aguardam decisões na etapa correspondente. Sem Atlas, dados reais, push, merge ou deploy. Evidências e limites: [entrega da etapa 02](dev-front/ETAPA-02-ENTREGA.md).

## Preparação da etapa 03 — 23/10/2026

Base 37c0ab0, branch feat/backend-ordens-v2. [Plano concreto para revisão](dev-back/ETAPA-03-PLANO.md). Checkpoints A/B aguardam aprovação; nenhuma funcionalidade v2 implementada nesta preparação. Nenhum ID encerrado por documentação.

| IDs | Estado e evidência | Dependência/próxima ação | Critério mantido |
| --- | --- | --- | --- |
| P01/P02 | Abertas; nenhuma resposta posterior localizada | Exceções de retirada antecipada/correção permanecem indisponíveis até decisão | Regra explícita, histórico e testes negativos |
| P06/P07 | Em planejamento; modelo Order ainda singular e sem retirada | Revisão do plano, implementação e testes HTTP/Mongo isolado | Todos os itens/campos preservados; retirada individual persistida |
| P08 | Em planejamento; hook ainda consulta última OS; controller sem versão | Contador inicializado após reconciliação, índice único, If-Match e idempotência | Concorrência e falhas comprovadas sem duplicata/perda |
| P09 | Em planejamento; fallback OR e erro bruto ainda existem | Validação estrita e handler v2 | Limpar opcionais, rejeitar campos indevidos, erros sem detalhes internos |
| P10 | Em planejamento; lista atual integral | Consulta paginada v2 e adaptação mínima Next | Página/filtros/contagens corretos e regressão real |
| P11 | Aberta; agregado/composição são propostas | Revisar exemplo misto no plano; bloquear alteração de composição após primeira retirada enquanto indefinida | Decisões registradas e cenários testados |
| P24 | Em planejamento; Next ainda consome array v1 | DTO v2, leitura legada explícita, interrupção de escritores v1 e fixtures idempotentes | Legado visível, sem achatamento/perda; rollback compatível documentado |

Prioridades e impactos continuam os do registro inicial. P15/P16 dependem de inventário/backup autorizado; não há acesso ao banco real. P18 continua aberta e bloqueia publicação; alertas não foram corrigidos nem reavaliados nesta preparação. P04/P05 permanecem resolvidas somente no escopo anterior, revalidado localmente; isso não valida mutações v2 futuras.

## Primeira fatia da etapa 03 — aprovação e implementação

Usuário respondeu “Pode aprovar” ao checkpoint A/B após 6f949fa. [Entrega parcial](dev-back/ETAPA-03-PRIMEIRO-FLUXO.md). Estados abaixo atualizam o histórico, sem encerrar a etapa 03.

| ID | Estado/evidência atual | Próxima ação e critério restante |
| --- | --- | --- |
| P06 | Em andamento: POST/GET v2 persistem três itens, Testar e opcionais; teste HTTP/Mongo | Edição, compatibilidade e formulários da etapa 04 antes de fechar todo o fluxo |
| P07 | Aberta: retiradas ainda não implementadas | Após checkpoint C, retirada com horário/ator e agregado aprovados; T08–T11 |
| P08 | Em andamento: contador, índices, 16 criações simultâneas e oito tentativas idempotentes testadas | Implementar If-Match nas edições, reconciliação/aplicação real somente autorizada; testar perda de atualização |
| P09 | Em andamento: validação estrita e erros na criação/consulta v2 | PATCH para limpar opcionais e finalizar tratamento de legado; T14/T22 |
| P10 | Aberta: ainda não há listagem v2 | Paginação, filtros/summary e Next compatível na ampliação após C |
| P11 | Parcialmente decidida: agregado misto aprovado pelo usuário; limites técnicos aprovados no contrato | Composição após primeira retirada continua indefinida e indisponível; implementar agregado e testar |
| P24 | Em andamento: escritores v1 bloqueados; leitura v1 recusa conjunto com v2 sem achatamento | Prioridade P0 para liberar: Next ainda só lista legado; v2 causa erro explícito. Implementar lista v2/adaptador antes de uso real. Transformação/rollback continuam pendentes |

P01/P02 permanecem sem aprovação operacional. Nenhum ID encerrado nesta fatia; nenhum ID novo necessário. P18 ainda bloqueia publicação. Documentação e testes não equivalem a inventário ou migração do banco real.

## Conclusão técnica do Prompt 03 — 23/10/2026

O usuário aprovou o checkpoint C (“Pode aprovar então”). [Entrega, testes e limitações](dev-back/ETAPA-03-ENTREGA.md). Este bloco substitui os estados anteriores sem apagar o histórico. Evidências: backend/tests/orders-v2.test.js (20 testes), backend/tests/auth.test.js (16), tests/session.spec.ts (7 E2E), script de fixtures e diffs revisados.

Commit de implementação/evidência para os estados deste bloco: `f063d7e`. Build, tipagem, lint e testes locais passaram; resolução técnica não equivale a produção autorizada.

| ID | Estado atual e evidência | Dependência/próxima ação | Critério restante |
| --- | --- | --- | --- |
| P06 | API concluída; pendência em andamento até UI. Criação/edição/GET preservam todos os itens e opcionais | Etapa 04: formulários | Validar criação/edição pelo navegador sem perda |
| P07 | Fluxo normal da API concluído; em andamento para UI/exceções. Retirada parcial/completa e repetição testadas | Etapa 04 e P01/P02 | Jornada visual e decisões excepcionais validadas |
| P08 | Resolvida no escopo técnico da API. Contador/índices/idempotência e conflitos de edição/retirada testados | Preparação real permanece P15/P16/P24, sem promessa sobre números anteriormente excluídos | Revalidar após inventário e corte autorizado; não é liberação operacional |
| P09 | Resolvida na API. Campos null/vazio limpos, desconhecidos rejeitados, erros v2 genéricos e escritores v1 removidos | Etapa 04 deve apresentar conflitos/validações ao usuário | Regressões existentes devem permanecer |
| P10 | Resolvida. Paginação/filtros/summary no servidor e Next adaptado, 27 OS no E2E | Volume real e otimizações continuam P21 | Revalidar representatividade após inventário, sem confundir busca substring com índice |
| P11 | Parcialmente resolvida: agregado aprovado e testado; limites técnicos documentados | Decidir composição após primeira retirada; atualmente bloqueada | Decisão explícita e teste correspondente para liberar exceção |
| P24 | Compatibilidade técnica concluída; em andamento para corte. Next lista v2 e legado; v1 não escreve/achata; transformação idempotente testada | Etapa 05: aplicar somente após inventário, backup e janela autorizada | Reconciliação real e reversão comprovada, sem perda pós-corte |
| P14 | Em andamento. Lista mobile ajustada e capturas desktop/mobile inspecionadas | Etapas 04/07 | Auditoria de acessibilidade completa e novas telas |
| P21 | Em andamento. 36 HTTP/Mongo e 7 E2E; medição local limitada com 50 OS | CI remoto, volume representativo e restante dos fluxos | Homologação e medições operacionais adequadas |

P01/P02 continuam abertas: retirada antecipada e correção indisponíveis. P15/P16 continuam bloqueios para o corte, incluindo índice parcial atualizado e inicialização de contador a partir de máximo reconciliado. P18 continua bloqueio de publicação; alertas não corrigidos nesta etapa. P20 continua aberto para Browserslist. Prioridades/impactos originais mantidos; sem IDs duplicados ou novos necessários.

Nenhum banco real foi acessado ou migrado, sem push/merge/deploy. Próxima etapa recomendada: Prompt 04, sem execução automática. Regra de desligamento/recuperação de funcionários (P03) ainda depende da empresa.
