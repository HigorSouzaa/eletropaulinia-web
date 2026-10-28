# Retorno — contrato aprovado

## Aprovação e atualização de 28/10/2026

Usuário confirmou: 90 dias desde a retirada daquele equipamento; retorno não reinicia prazo; somente administrador pode atualizar a data final com motivo e histórico. Esta autorização é local, sem publicação. A implementação usa tipoAtendimento, origem por equipamento, snapshot de referência e garantiaFim/garantiaAjustes. Campos de origem são definidos na criação; ajustes de garantia usam PATCH /api/v2/orders/:id/equipamentos/:eid/garantia, admin + If-Match, corpo {fim, motivo}. Fim é data civil válida não anterior ao início conhecido ou à entrada, quando não há referência; motivo 1–500. Sem início verificável, somente a data final explicitamente escolhida pelo admin é registrada; não se inventa retirada nem duração de 90 dias. A interface identifica prazo manual, que também pode ser herdado pelo retorno subsequente. Cada ajuste registra fimAnterior, fimNovo, motivo, por e em. Não há renovação automática.

## Decisões recebidas

O usuário aprovou a expansão após a primeira jornada de Clientes. Acrescentou retorno com vínculo opcional e busca de OS anteriores pelo telefone, incluindo atendimentos fora dos 90 dias. Não há autorização de publicação. Os detalhes iniciais abaixo foram apresentados e aprovados; a atualização acima inclui a decisão administrativa posterior.

## Evidência e proposta

OrderV2 já registra retirada e correções por equipamento. Não há tipo de atendimento, vínculo de retorno, comprovação de serviço executado ou regra de garantia implementada. Uma retirada também pode acontecer sem conserto; portanto ela não comprova cobertura.

- Nova OS recebe tipoAtendimento normal ou retorno; ausência em documentos anteriores significa normal apenas na apresentação, sem regravação em massa. Retorno é tipo, não novo status de andamento.
- Telefone resolve o cliente. Na escolha Retorno, mostrar busca paginada das OS vinculadas ao cliente, com número, equipamento e retirada. Permitir continuar sem vínculo.
- Cada equipamento pode referenciar ordemId/equipamentoId anterior, permitindo origens diferentes na mesma OS. Sem referência, continua sendo retorno sem histórico verificável.
- Selecionar origem copia somente identificação útil do equipamento. Não copiar andamento, retirada, laudo ou orçamento como dados novos. Pedir relato atual ou Testar.
- Express valida origem existente, equipamento correspondente e clienteId igual ao cliente selecionado. Documentos antigos sem clienteId não são unidos automaticamente pelo telefone: reconciliação explícita permanece necessária. Permitir retorno sem vínculo enquanto isso.
- Referência de origem e snapshot mínimo (número da OS, identificação do equipamento e retirada conhecida) são definidos na criação e preservados. Não permitir alteração genérica de origem; correção posterior requer operação auditada própria, fora desta primeira implementação.
- Não bloquear criação sem origem, sem retirada conhecida ou fora do prazo. Não atribuir gratuitamente cobertura, desconto ou preço zero.

## Referência de 90 dias — proposta operacional

Usar a data local da retirada válida do equipamento anterior como referência sugerida, nunca a entrada da OS nem a retirada de outro item. Comparar com dataEntrada da nova OS em America/Sao_Paulo: dia da retirada é dia zero, até diferença de 90 dias inclusive. Comparação por dias de calendário, não por blocos de 24 horas. Instantes continuam armazenados em UTC.

Mostrar por equipamento: “Dentro da referência de 90 dias”, “Fora da referência de 90 dias” ou “Prazo não verificável”. Exibir datas de referência e chegada. Sem origem/retirada, entrega legada sem horário ou entrada anterior à retirada: não verificável, sem inventar data. A equipe avalia cobertura; isto não implementa decisão jurídica nem garantia comercial automática.

Retirada de um retorno não renova automaticamente o prazo: em retornos sucessivos, preservar a origem inicial de referência. Sem origem inicial verificável, não calcular. Serviço novo com nova garantia exige regra futura específica.

Correção da retirada de origem não pode alterar silenciosamente avaliação já registrada. Guardar versão/retirada de referência; ao consultar detectar alteração e sinalizar revisão. Exclusão administrativa da origem mantém a nova OS e snapshot mínimo, marca origem indisponível, sem exclusão em cascata. Não congelar nome/telefone extra no vínculo.

## API, interface e testes a detalhar na expansão

- GET /api/v2/orders com clienteId e paginação para o histórico real; filtros validados e índice composto justificado. API autenticada e sem cache público, acesso compartilhado existente.
- POST de OS aceita tipoAtendimento e origem opcional por equipamento; servidor calcula referência, ignora/rejeita totais ou validade enviados pelo navegador. Atualizar versão do hash de idempotência sem quebrar replay anterior.
- Revalidar origem na transação de criação, incluindo versão consultada. Se alterada, retornar conflito de revisão, preservar rascunho. Nenhuma referência órfã criada silenciosamente.
- UI preserva identidade atual: seletor Normal/Retorno, painel opcional “Vincular atendimento anterior”, cartões por equipamento e aviso textual de prazo; não depender só de cor.
- Testar sem vínculo; mesmo cliente; cliente diferente negado; origem inválida; múltiplas retiradas; dias 89/90/91; virada de mês/ano; data ausente; retirada corrigida; origem excluída; retorno sucessivo; concorrência; idempotência; alteração de telefone; recarga e rascunho em conflito. Mongo descartável e navegador, sem acesso remoto.

## Sequência

Concluir área Clientes/histórico já aprovada → integrar retorno e referência após revisão deste complemento → laudos e técnicos → regressões e documentação. Garantia automática, certificado, pagamentos e mensagens continuam fora. P30 registra este novo trabalho; P26–P29 não são concluídas por este plano.
