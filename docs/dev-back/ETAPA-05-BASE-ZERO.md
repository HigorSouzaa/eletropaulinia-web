# Etapa 05 — entrada em operação com banco novo

Decisão do usuário em 24/10/2026: o sistema anterior foi usado somente para testes; a operação pode começar em um banco novo, vazio, sem transportar as ordens de teste. **Esta decisão não autoriza apagar um banco existente por engano.** Não há projeto/cluster Atlas configurado e `MONGODB_URI` permanece em branco no exemplo. Nenhuma conexão remota foi feita.

## Preparação local entregue

`backend/services/prepareFreshDatabase.js` verifica todas as coleções do banco selecionado. Recusa qualquer coleção desconhecida e qualquer dado de OS, usuário, sessão ou contador avançado. Em banco vazio, cria os índices declarados de OS, Usuários e revogação de tokens, depois inicializa o contador de ordens em zero. Uma nova execução ainda sem dados é segura; após a primeira OS, falha sem alterar o contador. Não usa `drop`, `delete` ou `syncIndexes`.

`backend/scripts/prepare-fresh-database.js` exige `MONGODB_URI` no ambiente, `--database NOME` e `--confirm-empty`. Confere que o nome do banco conectado coincide com o nome digitado. Falhas não imprimem URI nem credenciais. O script está **preparado, não executado contra Atlas**.

Teste local com MongoDB descartável: nove cenários específicos passaram, incluindo recusa de banco não vazio, coleção inesperada, criação da primeira OS v2 como `OS-0001`, preservação de legado, interrupção/retomada e repetição. `npm run check` passou com 51 testes HTTP/Mongo, tipagem, lint e build. Esta evidência não prova permissões, índices ou transações no futuro cluster Atlas.

## Sequência quando o Atlas existir

1. Escolher projeto, cluster, região e plano após conferir limites/custos atuais. Para operações administrativas de Funcionários, validar transações em replica set no tier escolhido. Criar banco **novo com nome exclusivo** para este sistema; não apontar para banco antigo.
2. Criar usuário de banco com permissões necessárias ao bootstrap e configurar rede/TLS. Guardar credenciais fora do Git. Preencher `backend/.env` localmente com `MONGODB_URI` e `JWT_SECRET`; nunca colar valores em chat, relatório ou commit.
3. Conferir explicitamente o nome do banco. Com API parada e banco vazio, executar da pasta `backend`: `node scripts/prepare-fresh-database.js --database NOME --confirm-empty`. O comando recusa qualquer dado já existente. Não tentar contornar essa recusa removendo registros sem nova inspeção.
4. Conferir índices, contador zero, login inicial administrativo e primeira OS sintética **em homologação separada**. Para produção, usar nome/banco/credenciais distintos e janela de liberação.
5. Configurar e testar backup/restauração em **destino isolado** antes da primeira OS real. A prévia privada de backup pago para Free pode não aparecer na conta; se usar backup manual, instalar ferramentas oficiais e verificar consistência/restauração. Definir responsável, frequência, retenção, armazenamento seguro e tratamento das OS excluídas em cópias históricas.
6. Só iniciar operação após P01/P02/P11, P18, P21/P23 e demais bloqueios aplicáveis estarem validados. O script de banco vazio não equivale a deploy.

## Mudança nas pendências

P15 e P24 deixam de exigir transformação das OS de teste **para o corte em banco novo**, conforme decisão explícita. Permanecem requisitos de verificar destino vazio, índices/contador, identidade do banco e compatibilidade da aplicação. P16/P17 continuam abertos para política e ensaio real de backup/restauração. Se a empresa decidir manter algum dado antigo, a transformação volta a ser necessária; as rotinas de fixtures seguem preservadas.

Referências: [backup/restauração Atlas](https://www.mongodb.com/docs/atlas/backup-restore-cluster/), [backup Free em prévia privada](https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/), [limites Free](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/) e [segurança de rede](https://www.mongodb.com/docs/atlas/architecture/current/network-security/).
