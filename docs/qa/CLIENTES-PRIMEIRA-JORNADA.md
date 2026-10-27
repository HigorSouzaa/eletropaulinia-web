# Clientes — primeira jornada comprovada localmente

Data: 27/10/2026. Branch: feat/clientes-laudos-tecnicos. Implementação: dde449f. Contratos: f29312f. O usuário aprovou contratos e arquitetura com “Aprovo pode fazer”. Checkpoint C funcional aguarda demonstração e resposta; o pacote completo ainda não está concluído.

## Entrega

- Telefone antes do nome, máscara brasileira compartilhada com Express, fixo/celular com DDD e colagem com +55. Entradas inválidas não são corrigidas silenciosamente.
- POST /api/v2/clients/lookup autenticado, sem cache e sem escrita. Next transporta somente o endpoint explícito com proteção de origem e sessão existente.
- Consulta após 350 ms, cancelamento e descarte de respostas atrasadas. Cadastro existente preenche nome/e-mail somente leitura; cliente novo só nasce ao salvar a OS. Falha de consulta permite retry e bloqueia salvamento.
- Client separado de User, telefone único e clienteId estável. OS conserva snapshot histórico. Cliente, contador e OS são gravados na mesma transação, com idempotência versionada.
- Colisão divergente pede revisão; não sobrescreve cadastro. Referência depende da versão consultada. Coordenação interna não altera versão pública/updatedAt.
- Snapshot não pode ser modificado pelo PATCH genérico. Dados operacionais de OS anteriores, inclusive com telefone incompleto, continuam editáveis. Técnico textual permanece até a próxima parte.
- Listagem e detalhe formatam telefone. Encerrar/trocar sessão remove campos e cancela requisições.

Arquivos principais: backend/models/Client.js, backend/services/clients.js, backend/services/orderCreation.js, backend/routes/clients.js, shared/phone.js, web/components/ClientLookup.tsx e web/NewOrder.tsx. Adaptações e testes estão no mesmo commit.

## Validação

Windows local; Node 24.21.0, Next 16.4.2, React 19.3.1, Express 4.22.3, Mongoose 8.24.7 e MongoDB 8.0.17 descartável em replica set. Dados sintéticos; nenhum teste usa Atlas.

| Comando | Resultado |
| --- | --- |
| npm run check | exit 0; tipagem, lint, 66 testes de backend/HTTP/Mongo e build |
| npm run test:e2e | exit 0; 25 cenários Chromium, sem retries, 2,3 minutos na execução final |
| npm run lint e npm run typecheck após ajustes dos testes | exit 0 |
| git diff --cached --check antes do commit | sem erros |

Nove testes novos em backend/tests/clients.test.js cobrem normalização, autorização, índices ausentes, lookup, vínculo, concorrência, colisões, idempotência e rollback. A falha de inserção após criar cliente é injetada apenas no teste e comprova reversão de cliente/contador/OS. Replay histórico conserva o algoritmo anterior mesmo com telefone antigo inválido.

Cinco cenários novos em tests/clients.spec.ts usam API e banco reais: duas OS com o mesmo clienteId, recarga, máscara/teclado, resposta atrasada, lookup indisponível, resposta perdida após commit e troca de sessão. Atraso, 503 de lookup e perda da resposta são simulações de transporte identificadas; gravação e replay são reais. Os vinte cenários anteriores cobrem regressões de sessão, OS, retiradas/correções/exclusão e funcionários.

A primeira execução de navegador encontrou dois erros nas asserções novas: dígitos esperados após Backspace e seletor ambíguo de alerta. Corrigidos; a repetição integral passou. O wrapper connection.transaction do Mongoose mascarava duplicidade ao restaurar subdocumentos strict; foi substituído por session.withTransaction com instâncias novas por retry. Conflitos e rollback passam. Bootstrap descartável foi adaptado para clients.

Avisos remanescentes: NO_COLOR/FORCE_COLOR do runner e normalização LF/CRLF do Git. Sem erro de lint/tipagem/build; nenhuma dependência foi instalada/atualizada.

## Demonstração e reprodução

Na raiz, executar npm run check e npm run test:e2e. O runner inicia Express, Next e replica set descartável em loopback com fixtures sintéticas. Não usa URI remota. Para repetir apenas a demonstração após build: npm run test:e2e -- tests/clients.spec.ts -g "telefone primeiro".

O cenário cria uma OS, recarrega, consulta o mesmo telefone em outra formatação e cria outra OS com o mesmo clienteId. Capturas ignoradas pelo Git: test-results/clientes-telefone-360.png, clientes-telefone-768.png e clientes-telefone-1280.png. Inspeção visual nas três larguras e verificação de overflow; teclado exercitado no Chromium. Data nativa segue o locale do navegador de teste.

Execução manual requer replica set local isolado e variáveis apontando para ele. O bootstrap de base vazia recusa dados existentes e não é ferramenta de atualização. O runner prepara os índices explicitamente; o runtime não instala o índice novo automaticamente.

## Limitações e continuidade

P26 parcial: faltam lista/detalhe de Clientes, histórico paginado por ID e edição administrativa com ETag. P27 laudos/serviços e P28 seletor de técnico continuam planejadas. P29 parcial: leitura anterior/snapshot/replay cobertos; inventário, aplicador idempotente e reconciliação ainda pendentes. Nenhuma OS antiga foi vinculada automaticamente.

Antes da publicação: preparar procedimento incremental para banco existente, sem reset; revisar índices/transações, versões antigas de frontend e reconciliação somente com autorização. API nova precede frontend novo; rollback exige código que preserve referências e campos novos. Não restaurar snapshot antigo sobre gravações posteriores.

Não verificados: Safari/iPhone real, leitor de tela, CI remoto, volume/carga representativos, banco remoto e implantação. Nenhuma alegação de segurança/desempenho integral. Sem push, merge, deploy ou alteração no Atlas.
