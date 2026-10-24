# Etapa 05 — primeira fatia local

24/10/2026. Checkpoints A/B do [plano](ETAPA-05-PLANO.md) aprovados pelo usuário. Implementação `dc876ba`. Esta fatia é **somente ensaio com MongoDB descartável**; não há conexão com a origem da empresa, Atlas ou arquivo `.env`.

## Entrega

- `backend/services/stage05FixtureMigration.js` gera inventário agregado, sem nomes/contatos/documentos em sua resposta. Classifica legado pronto, bloqueado e v2, detecta número inválido ou duplicado numericamente e informa maior sequência. O serviço exige a conexão ativa do banco de teste com nome exato `stage05_fixture_only`.
- A transformação usa `transformLegacy` existente e valida o modelo v2 antes da escrita. Substitui somente o documento original ainda correspondente ao que foi lido. Registro inconsistente permanece intacto; número inválido/duplicado bloqueia todas as escritas. O lote limita a quantidade de conversões; uma nova execução ignora documentos já v2.
- `backend/scripts/stage05-fixture-rehearsal.js --fixtures-only` inicia seu próprio MongoDB em memória no loopback, cria duas OS sintéticas, converte em dois lotes e repete a execução. Não aceita URI, arquivo ou modo de aplicar em produção.
- `backend/tests/stage05-fixture.test.js` cobre preservação, idempotência, interrupção/retomada, anomalia, número conflitante e recusa de conexão fora do banco descartável.

## Evidência e limites

O ensaio CLI retornou 2 legadas prontas, 2 transformadas e 0 escritas na repetição. A suíte específica passou 5 testes. `npm run check` passou: tipagem, lint, 47 testes HTTP/Mongo descartável e build. A falha inicial de uma asserção foi investigada: o contrato de validação usa caminho `equipamentos.0.solicitacao`, não a notação com colchetes; a asserção foi corrigida e a suíte reexecutada com sucesso.

Esta fatia **não** é migrador operacional: varre toda a coleção a cada lote, não tem checkpoint persistente, não cria índice/contador, não faz backup/restore e não compara uma origem com destino separado. A condição de substituição evita sobrescrever um documento modificado após a leitura no ensaio; concorrência/corte real exigem congelamento de escritores e validação específica. O banco real, volume, tier, índices efetivos, backups, usuários e políticas de retenção seguem desconhecidos.

P15/P16/P17/P24 continuam abertos para corte. P01/P02/P11 são regras decididas sem implementação. P18 continua bloqueio de publicação. Antes de ampliar para aplicador operacional, restauração ensaiada ou preparação de índices, apresentar resultados desta fatia ao usuário conforme checkpoint C da Dev Back Master.
