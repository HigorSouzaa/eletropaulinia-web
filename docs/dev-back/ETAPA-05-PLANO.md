# Etapa 05 — plano de arquitetura e contrato de dados para revisão

24/10/2026. Branch `feat/preparo-atlas-dados`, base `51b854a`. **Checkpoint A/B da Dev Back Master: proposta, sem aplicador implementado nem banco real acessado.** A etapa 04 foi validada localmente; isso não demonstra os dados ou recursos do destino.

Baseline revalidado nesta preparação: `npm run check` concluiu com tipagem, lint, 42 testes HTTP/Mongo descartável e build aprovados. Nenhum teste novo de migração foi executado, pois os contratos de aplicador/ensaio abaixo ainda aguardam revisão.

## Evidência e limites

- `backend/models/Order.js` descreve OS legada singular; `OrderV2.js` usa a coleção `orders`, vários equipamentos embutidos, índice único `numero`, índice parcial `createdBy + creationKey` e índice de `dataEntrada + _id`. A presença desses índices no banco real não foi verificada.
- `backend/services/legacyOrders.js` transforma um documento em memória, mantém `_id`/número/origem e rejeita campos inválidos. Ainda não percorre, atualiza, retoma nem reconcilia uma coleção.
- `backend/tests/numbering-fixture.js` prepara índice/contador **somente** no banco `orders_v2_test`. O POST v2 falha fechado se não encontrar índices e contador; o contador não prova números já excluídos historicamente.
- `backend/services/ordersV2.js` bloqueia escritor v1 e usa versão para mutações. Retirada antecipada, correção e composição após retirada ainda estão bloqueadas, apesar das decisões novas do usuário (P01/P02/P11).
- `backend/models/User.js` contém perfil, atividade, versão de sessão e hash não selecionado por padrão. Operações administrativas exigem transação sobre guarda compartilhada; o ensaio precisa de replica set.
- Nenhuma URI, coleção, índice, volume, backup, usuário de banco, tier Atlas ou responsável real foi inspecionado nesta etapa.

## Arquitetura proposta para a preparação

1. **Inventário somente leitura**, executado apenas em origem identificada e autorizada: relatório agregado de coleções/contagens, schemaVersion, status, usuários por perfil/atividade, número máximo/duplicidades numéricas, campos/datas ausentes, referências órfãs e índices. Sem nomes, contatos, hashes ou documentos completos. Relatório de anomalias usa ID opaco interno ou contagem, sem divulgar valores pessoais.
2. **Backup da origem e restauração em destino isolado** antes de qualquer alteração. Confirmar versão/FCV, armazenamento seguro, prazo de retenção e possibilidade de teste. No Atlas Free, não presumir snapshot incluído: a documentação anuncia prévia privada de backup diário pago, que pode não aparecer na conta; alternativa é `mongodump`/`mongorestore` com janela sem escrita para consistência. Free/Flex restringem opções de oplog dessas ferramentas.
3. **Aplicador por lotes no ensaio**, limitado explicitamente a banco descartável na primeira fatia. Dry-run classifica legado, v2, inválido e conflito. Aplicação preserva `_id`, número, referências, datas conhecidas e `migration.original`; documento com anomalia permanece intacto e entra em reconciliação. Repetir a execução não cria novos IDs. Falha no meio pode ser retomada.
4. **Índices e contador**, somente após números inválidos/duplicados reconciliados e confirmação dos índices existentes. Não usar `syncIndexes`/drop automático. Contador inicializado acima do maior número observado e nunca reduzido.
5. **Comparação e ensaio de retorno**: comparar identidade, número, campos conhecidos e itens, além de contagens; simular novas OS após snapshot e demonstrar como preservá-las. Retorno da aplicação exige versão compatível com v2 ou suspensão de escrita. Snapshot antigo não substitui dados novos.
6. **Corte futuro**: plano de janela com bloqueio de escritores, backup final, ensaio aprovado, execução específica autorizada, verificação e go/no-go. Nada disso está autorizado por este plano.

## Contrato proposto dos artefatos

- `inventory`: JSON sem dados pessoais com `schemaVersion` do relatório, timestamp UTC, ambiente por rótulo não sensível, contagens, anomalias por categoria, índices por nome/chave/propriedade, máximo numérico e estado do contador. Não incluir URI, host, usuário, valores de cliente ou `migration.original`.
- `dry-run`: contagens de `ready`, `alreadyV2`, `blocked` e razões por caminho técnico; não alterar dados.
- `apply` de ensaio: exigir nome exato de banco descartável e marcador explícito do runner; recusar produção e URI arbitrária. Processar lote limitado em ordem estável por `_id`, com `replaceOne` condicionado à forma legada ainda existente. Após cada lote, registrar apenas contagens/checkpoint seguro. Falha ou mudança concorrente não sobrescreve o vencedor.
- `verify`: comparar inventários antes/depois e exigir zero perda de IDs/números/itens conhecidos; anomalias não reconciliadas bloqueiam prontidão. Os dados originais sensíveis não entram no relatório.
- Índices/contador: preparação em comando separado, guardada por inventário sem anomalias e executada só em ensaio autorizado. O aplicador não cria ou remove índices implicitamente.

## Matriz mínima de testes

| Cenário | Resultado esperado |
| --- | --- |
| Legado íntegro, Entregue sem horário | Mesmo ID/número, retirada histórica com instante `null`, origem preservada |
| Legado inconsistente e números numéricos duplicados | Bloqueio explícito; nenhum documento alterado silenciosamente |
| Execução repetida e falha no lote | Mesmos documentos/IDs; retomada sem duplicação |
| Escrita concorrente no mesmo legado | Condição de versão/forma impede sobrescrita |
| Índice/contador incompletos | POST v2 segue falhando fechado |
| Backup/restauração e novas OS após snapshot | Retorno não apaga novas OS; comparação detecta qualquer perda |
| Último admin ativo | Transação em replica set descartável mantém pelo menos um |

## Atlas e operação a confirmar

Separar credenciais/bancos de desenvolvimento, homologação e produção; API com privilégio mínimo para dados de negócio, operador de migração temporário e backup com acesso separado. TLS e allowlist de IPs estreita; não abrir `0.0.0.0/0` por conveniência. `MONGODB_URI` fica só no backend; `JWT_SECRET`, `API_INTERNAL_URL` e `APP_ORIGIN` mantêm seus papéis atuais. Conferir pool/timeout e limite de conexões após escolher tier e quantidade de instâncias; não fixar número sem topologia.

Free tem limites de armazenamento/conexões e prévia privada de backup pago. Flex oferece snapshots diários, mas não point-in-time contínuo. M10+ oferece backup em nuvem configurável. Preços/recursos devem ser verificados na conta e região antes de decidir. Qualquer tier escolhido deve passar o teste real das transações administrativas e das consultas representativas.

Faltam: responsável pela origem e Atlas, permissão de inventário/backup em momento futuro, volume, tier/região, estratégia de retenção de backups, janela de manutenção e lista de consumidores v1. P15/P16/P17/P24 continuam abertos. P18 e P01/P02/P11 também bloqueiam entrada em operação, fora do código principal desta etapa.

## Referências oficiais consultadas

- [Backup e restauração no Atlas](https://www.mongodb.com/docs/atlas/backup-restore-cluster/)
- [Prévia privada de backup para Free](https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/)
- [Limites de Free](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/) e [Flex](https://www.mongodb.com/docs/atlas/reference/flex-limitations/)
- [mongodump](https://www.mongodb.com/docs/database-tools/mongodump/) e [mongorestore](https://www.mongodb.com/docs/database-tools/mongorestore/)
- [Segurança de rede do Atlas](https://www.mongodb.com/docs/atlas/architecture/current/network-security/)
