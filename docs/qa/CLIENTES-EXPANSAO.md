# Entrega local — Clientes, laudos, técnicos e retornos

Data: 28/10/2026. Branch: feat/clientes-laudos-tecnicos. API: 7a681c5. Telas e compatibilidade: 726d6e1. Primeira jornada: dde449f. Skills Dev Back Master e Dev Front Master aplicadas com revisão de contratos, segurança e QA; checkpoints aprovados no diálogo. Nenhum push, merge, deploy ou alteração do Atlas nesta atualização.

## Entregue

- Client separado de User, telefone normalizado único, consulta com máscara, criação transacional com OS e idempotência. Snapshot histórico preservado.
- Lista/detalhe de Clientes e histórico paginado por clienteId; todos consultam, somente admin edita com ETag/If-Match. Troca de sessão invalida dados e respostas anteriores.
- Avaliação por equipamento: laudo, serviços identificados, centavos inteiros, total calculado na API, autoria e instante. Ausência de orçamento difere de zero.
- Seleção paginada de técnicos/admins ativos, opcional. Validação transacional na atribuição; responsáveis inativos/textuais antigos permanecem no histórico até alteração explícita.
- Retorno como nova OS, vínculo opcional por equipamento ao histórico do cliente. Origem versionada e preservada; exclusão/correção gera aviso para revisão, sem apagar o retorno.
- Referência de 90 dias corridos desde a retirada individual, calculada em calendário America/Sao_Paulo. Retorno não reinicia o prazo. Sem vínculo/data conhecida não se inventa retirada.
- Somente admin altera a data final, com motivo, versão e histórico de prazo anterior/novo. Não altera retirada real. Data manual sem início conhecido é identificada como tal, sem presumir uma duração de 90 dias.
- Reconciliação explícita com inventário agregado/dry-run/retomada, restrita a banco descartável. Não une clientes históricos automaticamente.

## Validação observada

Windows local, Node 24, Next/Express reais e MongoDB descartável em replica set; dados sintéticos. Sem acesso ao banco remoto. Comandos executados na raiz, salvo indicação:

| Comando | Resultado e alcance |
| --- | --- |
| npm run check | Exit 0: 73 testes HTTP/MongoDB, tipagem, lint e build; executado antes do ajuste final de limpeza explícita de técnico textual |
| node --test tests/clients.test.js (backend/) | Exit 0: 16 testes após esse ajuste, incluindo preservação/limpeza do técnico histórico |
| npm run lint | Exit 0 após ajuste final |
| npm run build | Exit 0 após ajuste final, compilação e TypeScript |
| npm run test:e2e | Exit 0: 28 testes Chromium, 1 worker, aproximadamente 1,3 min na execução final |
| git diff --cached --check | Sem erros antes dos commits |

Testes de API cobrem concorrência/idempotência, rollback cliente/OS, permissões negativas, ETag, dinheiro inválido, elegibilidade de técnicos, dias 89/90/91, retorno sucessivo sem renovação, origem corrigida/excluída, ajustes administrativos e reconciliação repetida. Testes de navegador exercitam API e Mongo reais, recarga/deep links, Clientes, serviços, retorno e garantia, além das regressões de sessão, funcionários, retirada parcial/correção e exclusão.

Cenários de resposta atrasada, erro de lookup, resposta perdida e alguns erros 503 usam interceptação de rede identificada nos testes; não são medição de indisponibilidade real. A suíte também encerra a API no cenário específico de indisponibilidade real. Capturas locais ignoradas pelo Git: test-results/clientes-telefone-360.png, -768.png, -1280.png, clientes-cadastro-360.png e retorno-360.png. Revisão visual local sem overflow observado nessas capturas. Avisos de ambiente NO_COLOR/FORCE_COLOR não impediram a execução.

## Limites e continuidade

Não validados: Safari/iPhone real, leitor de tela, CI remoto, carga/volume representativo, índices/transações deste pacote no Atlas e publicação. Nenhuma métrica local comprova desempenho de produção. P14/P21 continuam abertas para esses limites, P29/P24 para inventário e transição real, P22 para atualização publicada. Bloqueios operacionais e de segurança anteriores permanecem em PENDENCIAS.md.

Próximo passo remoto depende de autorização específica: seguir [roteiro de transição](../operacao/CLIENTES-TRANSICAO.md), inventariar/ensaiar backup, preparar índices sem resetar contador, atualizar API antes do frontend e validar a jornada no destino. Rollback precisa de versão compatível com os novos campos; não restaurar escritor antigo nem snapshot que apague ordens posteriores.

Arquivos principais: backend/models/Client.js, OrderV2.js e User.js; backend/routes/clients.js, technicians.js e ordersV2.js; backend/services/orderCreation.js, orderExtras.js, ordersV2.js, orderQueries.js e clientReconciliation.js; web/Clients.tsx, NewOrder.tsx, EditOrder.tsx, OrderDetail.tsx, Orders.tsx e componentes EvaluationFields/ReturnPicker/TechnicianSelect/WarrantyEditor; rotas Next correspondentes; backend/tests/clients.test.js e tests/clients.spec.ts.
