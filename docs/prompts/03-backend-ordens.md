# 03 — Concluir o backend de ordens

Copie o bloco inteiro para a tarefa do projeto Eletro Paulínia. Execute uma etapa por vez, conferindo seus pré-requisitos.

```markdown
# Objetivo

Implementar o contrato de ordens com múltiplos equipamentos, retiradas parciais e integridade sob concorrência, preparando a conclusão das telas Next.

# Contexto

Repositório exclusivo: https://github.com/HigorSouzaa/eletropaulinia-web
Cópia local: C:/Users/higor/Documents/ChatGPT/eletropaulinia-web

A base do primeiro ciclo é 1f71959, na branch fix/primeiro-ciclo-api. Esse SHA é referência histórica, não instrução para reset ou checkout. Confirme o estado atual e as entregas anteriores antes de atuar. A última validação registrada tinha 13 testes HTTP/MongoDB aprovados, build e tipagem passando e dois avisos de Fast Refresh. Não declare que esses resultados continuam válidos sem verificar.

Destino definido: Next.js com TypeScript, API Node.js/Express separada e MongoDB Atlas. Vercel é candidata para frontend, não decisão irrevogável; hospedagem do backend será pesquisada, preferencialmente gratuita.

Regras confirmadas em 23/10/2026:
- Todos os funcionários acessam todas as ordens. Preservar a restrição administrativa existente para cadastro de funcionários e exclusão de ordens.
- Uma ordem pode ter vários equipamentos e retiradas parciais, frequentes na operação.
- Cliente: nome e telefone obrigatórios; e-mail opcional.
- Equipamento: identificação/nome obrigatório; marca/modelo e número de série opcionais. Registrar defeito relatado; quando não houver relato, usar a indicação explícita "Testar", sem inventar um defeito.
- Registrar data e hora da retirada de cada equipamento. A ordem inteira só fica Entregue quando todos forem retirados.
- Ordens permanecem guardadas independentemente da data. Exclusão explícita é definitiva na base ativa, incluindo seus equipamentos; não é arquivamento automático.
- Tela de gestão chamada "Funcionários". Isso não exige renomear o model User, coleções ou perfis técnicos.
- Garantia e envio automático são futuros. WhatsApp, módulo completo de clientes, relatórios avançados e redesign amplo ficam fora deste pacote.

Leia AGENTS.md, se existir, README.md, docs/dev-back/CICLO-1.md, docs/dev-back/CONTRATOS-CICLO-1.md e docs/dev-front/DECISIONS.md. Use os caminhos equivalentes se etapas anteriores reorganizaram a árvore. Decisões mais recentes do usuário prevalecem sobre os documentos históricos.

Use Dev Back Master, com QA e segurança pertinentes; alinhe as mudanças de contrato à Dev Front Master.

Pré-requisitos: Contrato da etapa 01 consolidado e compatibilidade com o frontend da etapa 02 identificada. Não depende de Atlas real para testes.

# Escopo e requisitos

- Adaptar modelos e validações para equipamentos individualmente identificados dentro da OS; preservar IDs das ordens e referências legadas.
- Exigir nome/identificação do equipamento; permitir marca/modelo e série ausentes. Aceitar defeito relatado ou indicação "Testar". Nome/telefone do cliente obrigatórios; e-mail opcional.
- Implementar geração atômica de números únicos; inicializar o contador com base nos números existentes válidos, não na última ordem criada nem na quantidade de documentos. Não prometer sequência sem lacunas.
- Impedir alteração indevida do número da OS e tratar índices, duplicidades e dados legados inconsistentes.
- Registrar retiradas com horário definido no servidor, identificar o equipamento e atualizar o agregado sem marcar outros equipamentos como entregues. Repetição da mesma retirada não deve alterar o primeiro horário nem duplicar efeito.
- Evitar perda de atualização entre dois funcionários; usar mecanismo de conflito/versão ou outra estratégia justificada pelo modelo.
- Implementar paginação, filtros, ordenação estável e estatísticas coerentes. Limitar consultas e escolher índices com evidência.
- Validar entradas, distinguir campos omitidos/null/vazios e permitir limpeza dos opcionais conforme contrato.
- Padronizar erros de ID inválido, ausência, validação, conflito e acesso negado.
- Excluir definitivamente OS e equipamentos relacionados apenas por admin, sem apagar registros independentes de outras ordens. Não criar TTL ou expiração por idade.
- Preparar transformação legada testável e idempotente; executar somente em fixtures/banco descartável nesta etapa.

# Fluxos e estados

Criar OS com dois equipamentos, um sem marca e outro para Testar; consultar/editar; retirar somente um; listar como parcialmente entregue; repetir a mesma retirada; retirar o último; excluir com admin. Testar acessos negados, edições concorrentes e número único em criações simultâneas.

# Restrições técnicas e protocolo Git

- Inspecione git status, branch e histórico; preserve trabalho existente.
- Crie branch descritiva a partir da base que contém os pré-requisitos desta etapa; não parta automaticamente de main, que pode não conter as correções. Para leitura pura, não crie commits vazios.
- Faça commits pequenos em Conventional Commits. Revise os diffs, rode verificações pertinentes e inclua somente arquivos da tarefa.
- Nunca versione segredos, dados de clientes ou artefatos gerados. Não imprima tokens, senhas, URIs autenticadas ou corpos com dados pessoais.
- Não faça push, merge, deploy, contratação, migração remota, exclusão de dados reais ou envio de mensagens sem autorização específica. Preparar configurações/scripts não autoriza executá-los em produção.
- Não reinstale ou atualize indiscriminadamente dependências; justifique alterações pelo escopo.
- Aplique as skills indicadas e respeite checkpoints aplicáveis. Não reabra decisões já respondidas; pergunte somente ambiguidades que impeçam a etapa e avance no trabalho independente.
- Ao encontrar uma dependência não concluída, explique a evidência e o bloqueio; não simule conclusão nem expanda automaticamente para todas as etapas.

# Critérios de aceite e validação

- Nenhum equipamento/campo aceito é descartado silenciosamente.
- Datas e horas de retirada persistem após nova leitura.
- Ordem só é Entregue quando todos os equipamentos foram retirados.
- Testes concorrentes demonstram ausência de números duplicados e conflitos tratados.
- Itens antigos sem horário conhecido não recebem data fictícia.
- Testes usam HTTP e MongoDB descartável; 13 regressões originais continuam cobertas, adaptadas aos contratos aprovados.
- Contratos alterados têm estratégia explícita de atualização do cliente.

# Registro contínuo de pendências

Leia e mantenha docs/PENDENCIAS.md como registro central para revisão após os oito prompts. Registre toda descoberta não resolvida com ID, etapa de origem, evidência, impacto/prioridade, dependências, próxima ação e critério de conclusão. Atualize itens existentes sem duplicar; preserve histórico. Só marque resolvido com evidência de implementação/validação, incluindo commit e teste quando aplicáveis. Separe decisões pendentes, limitações de acesso e melhorias adiadas. Não adie bloqueios do fluxo atual ou de produção para a revisão final. Ao encerrar, informe os IDs abertos, alterados e resolvidos. Nunca registre segredos ou dados pessoais.

# Entrega esperada

Entregar código, contratos atualizados, testes, scripts de transformação para revisão e documentação dos índices. Informar medições reais e limitações. Não executar migração remota.

Informe branch, commits, arquivos afetados, comandos/resultados, limitações e pendências. Registre continuidade para a próxima etapa sem afirmar aprovações não dadas.

# Referências e pendências

- Histórico do projeto: docs/diagnostico/RETOMADA.md e docs/dev-back/CICLO-1.md.
- Regras confirmadas e ordem do pacote: docs/prompts/README.md.
- Consulte documentação oficial compatível com as versões encontradas. Separe fatos, hipóteses e propostas.

Referência: https://www.mongodb.com/docs/manual/core/write-operations-atomicity/ . Incremento atômico de contador não torna automaticamente atômicas alterações em vários documentos; justificar transações quando necessárias.
```
