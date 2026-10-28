# Clientes, laudos, técnicos e retornos — transição

Este roteiro prepara uma publicação futura. Não autoriza executar comandos no Atlas, instalar índices remotos ou publicar. O pacote foi construído e testado localmente em replica set descartável.

## Compatibilidade

Campos aditivos: Client separado de User; clienteId/tecnicoId/tipoAtendimento na OS; avaliacao/retorno/garantiaFim/garantiaAjustes por equipamento. Ausência de campos antigos continua legível, sem inventar laudos, preços ou datas. Nome do técnico textual permanece como histórico. Serviços mantêm IDs próprios quando editados. Retirada e histórico existentes não são regravados por atualização do cadastro mestre.

Criação antiga inline funciona com telefone brasileiro válido. Escritor antigo que tenta alterar snapshot ou técnico textual recebe conflito explícito; deve atualizar a tela. Não religar API v1. Hashes antigos de idempotência usam as normalizações anteriores; novas criações usam versão 3. Backend antigo não pode assumir escrita sobre estes documentos porque pode perder campos ou desconhecer suas invariantes.

## Ordem futura de execução

1. Identificar destino, responsáveis e consumidores. Autorizar inventário e backup separadamente; verificar restauração isolada e congelar escrita no preparo quando necessário.
2. Inventariar contagens, telefones inválidos/ausentes e snapshots divergentes, referências e técnicos textuais. Nenhum relatório versionado deve conter dados pessoais. Telefone igual é candidato, não prova suficiente para unir registros históricos.
3. Preparar coleção clients e índice único completo de telefone somente depois de verificar ausência de duplicatas. Instalar índice orders {clienteId:1,dataEntrada:-1,_id:-1}; conservar índices de número e idempotência e o contador atual. Nunca executar bootstrap de base vazia contra banco com dados, reiniciar contador ou usar syncIndexes para remover índices.
4. Validar transações e permissões no destino autorizado. Publicar API compatível, depois frontend. Reciclar abas antigas; verificar mensagens de conflito e impedir versões antigas de escrever campos incompatíveis.
5. Vincular OS anteriores somente com mapeamento explícito revisado, preservando snapshot, número, equipamentos e retiradas. Referências a técnicos sem correspondência inequívoca permanecem textuais. IDs já vinculados a outro cliente são conflito; nunca sobrescrever.
6. Verificar login, consulta, criação, histórico por ID, laudo, atribuição, retorno e ajuste administrativo com dados de ensaio autorizados. Só depois liberar escrita normal conforme aceite operacional.

## Ensaio local disponível

backend/services/clientReconciliation.js contém inventário agregado, dry-run e aplicação por lote de mapeamentos explícitos. É deliberadamente limitado a clients_slice_test em loopback; não recebe URI e não lê dotenv. O teste backend/tests/clients.test.js prepara Mongo descartável, verifica ausência de gravação no dry-run, aplicação, repetição e preservação. Cada documento usa versão esperada; lotes podem ser retomados pelos mesmos IDs. Não é executor remoto.

O inventário retorna apenas contagens, incluindo grupos com mesmo telefone e nomes/e-mails divergentes. Seu mapa interno não é serializado. O aplicador não cria cadastros por semelhança nem altera snapshots. O mapeamento operacional de dados reais e sua execução permanecem dependentes de inventário e autorização futura.

## Reversão

Rollback de aplicação exige build que preserve todos os campos e bloqueios atuais. Na ausência desse build, suspender escrita; não restaurar o backend antigo para editar equipamentos novos. Nunca apagar Client referenciado ou achatar uma OS para retirar campos novos. Rollback de banco exige reconciliar gravações posteriores ao backup; snapshot antigo não pode substituir ordens novas sem essa reconciliação.

## Limitações de desempenho

Histórico por cliente possui índice composto e paginação no servidor. Busca por substring de nome/telefone pode examinar documentos; não é anunciada como busca indexada eficiente. Consultas têm limite de página e maxTimeMS. Volume representativo e medições remotas continuam pendentes. Detalhe de retorno busca as origens em lote, sem uma consulta por equipamento. Técnicos também são paginados.
