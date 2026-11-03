# WhatsApp oficial — primeira jornada local

03/11/2026, branch `feat/whatsapp-oficial-contratos`. Arquitetura, contrato e direção visual aprovados pelo usuário antes desta fatia. **Checkpoint funcional C aguardando revisão.** Nenhuma conta Meta, mensagem real, Atlas, Netlify ou Render foi alterado.

## Entrega executada

- Nova OS tem opção de concordância desmarcada. O Next transporta a escolha ao Express, que valida booleano e origem presencial; payload antigo continua sem consentimento.
- Na criação com concordância, Cliente, OS e intenção `NotificationOutbox` entram na mesma transação. Índice único `(orderId, kind)` protege o registro lógico. Sem o índice, a criação com consentimento falha fechado com 503 antes de gravar dados.
- O hash de idempotência usa versão 4 para novas OS. Replay de versões 1–3 preserva seu cálculo histórico. Repetir a mesma chave com outra escolha recebe conflito.
- Um adaptador para a Cloud API oficial da Meta monta modelo `pt_BR` com nome, OS e data de entrada. Sem configuração, não chama a rede. O dispatcher reivindica uma intenção antes da chamada; resposta perdida fica incerta e não é repetida automaticamente.
- A interface ainda não mostra o estado de envio e o backend ainda não aciona o dispatcher automaticamente; isso é expansão posterior ao checkpoint C. Os campos de configuração em `backend/.env.example` são vazios e não incluem segredos.

## Evidência local

`npm run check`: tipagem, lint, 87 testes HTTP/MongoDB descartável e build aprovados antes de acrescentar o caso de índice ausente e o teste de navegador da opção. Após esses acréscimos, `node --test backend/tests/whatsapp-opening.test.js` passou 4/4; `npm run typecheck` e `npm run lint` passaram. `npm run test:e2e` passou 33/33 antes do ajuste final; `npx playwright test tests/create-order.spec.ts` passou 3/3 depois, incluindo checkbox e persistência no Mongo descartável. O provedor é uma função fake; **nenhuma mensagem foi enviada à Meta**.

Captura móvel com dados sintéticos: `test-results/whatsapp-consent-first-slice.png` (arquivo gerado, ignorado pelo Git). A opção começa desmarcada e o teste a marca antes de salvar.

## Limites para a próxima expansão

Implementar processamento automático/retomada de pendências, webhook autenticado e estados de entrega; leitura mínima do estado no detalhe da OS; saúde agregada na Dashboard; revogação de consentimento; política de falhas e retenção. Não chamar “aceita pela plataforma” de “entregue”. O Render Free pode suspender o processo. O caso de resposta incerta requer reconciliação operacional, não retry cego. Excluir uma OS antes do envio impede despacho pelo adaptador, mas a política de retenção do registro ainda precisa de contrato final.
