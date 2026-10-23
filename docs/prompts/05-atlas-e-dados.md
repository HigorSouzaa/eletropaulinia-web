# 05 — Preparar Atlas e preservação dos dados

Copie o bloco inteiro para a tarefa do projeto Eletro Paulínia. Execute uma etapa por vez, conferindo seus pré-requisitos.

```markdown
# Objetivo

Preparar a configuração e o plano de migração para MongoDB Atlas, com ensaio seguro, preservação de dados e reversão verificável.

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

Use Dev Back Master; envolva Dev Front Master apenas para configurações de integração afetadas.

Pré-requisitos: Contrato e transformação da etapa 03 estabilizados. Identificar ambiente de origem, responsável e acessos autorizados; nunca pressupor banco vazio.

# Escopo e requisitos

- Inventariar origem, volume, coleções, referências, índices, números duplicados/malformados e ordens já entregues.
- Propor separação de desenvolvimento, homologação e produção, usuários de banco, menor privilégio, TLS e regras de rede restritas.
- Avaliar plano do Atlas e disponibilidade/custo dos recursos de backup/restauração; apresentar opções sem contratar ou provisionar serviço pago.
- Preparar exemplos de ambiente sem segredos e documentação de conexão/pool/limites por instância.
- Planejar transformação de ordens antigas em múltiplos equipamentos, preservando _id da OS e referências. Não inventar marca, defeito ou horário histórico de retirada.
- Distinguir ausência de informação antiga de requisitos para novos cadastros; documentar exceções e reconciliação.
- Preparar scripts idempotentes, validação de contagens/campos, backup, ensaio de restauração em destino separado e rollback.
- Avaliar janela de corte, congelamento de escrita ou captura/reconciliação das alterações feitas durante a transição.
- Não remover ordens por idade. A política de backups deve distinguir exclusão da base ativa de cópias históricas; não prometer apagamento instantâneo dos backups.

# Fluxos e estados

Inventário → backup → ensaio em destino isolado → transformação → comparação → restore ensaiado → proposta concreta de corte. Se faltar acesso, entregar scripts/plano e apontar exatamente o que não foi executado.

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

- Plano identifica origem/destino, permissões, responsáveis e impactos.
- Scripts são verificados com fixtures e preservam relações/IDs relevantes.
- Há estratégia para ordens entregues sem horário conhecido e números legados inconsistentes.
- Evidências de backup/restauração só são declaradas se realmente executadas em ambiente autorizado.
- Rollback contempla gravações após o corte; restaurar snapshot antigo sem reconciliação não é considerado seguro.
- Nenhum dado/segredo real aparece em relatório ou Git.

# Entrega esperada

Entregar configuração proposta, scripts, runbook de migração/restauração, resultados do ensaio autorizado e pendências. Antes de qualquer execução remota, apresentar destino e operações concretas e obter autorização específica.

Informe branch, commits, arquivos afetados, comandos/resultados, limitações e pendências. Registre continuidade para a próxima etapa sem afirmar aprovações não dadas.

# Referências e pendências

- Histórico do projeto: docs/diagnostico/RETOMADA.md e docs/dev-back/CICLO-1.md.
- Regras confirmadas e ordem do pacote: docs/prompts/README.md.
- Consulte documentação oficial compatível com as versões encontradas. Separe fatos, hipóteses e propostas.

Referências: https://www.mongodb.com/docs/atlas/backup-restore-cluster/ e https://www.mongodb.com/docs/atlas/security/ .
```
