# 07 — Validar o sistema de ponta a ponta

Copie o bloco inteiro para a tarefa do projeto Eletro Paulínia. Execute uma etapa por vez, conferindo seus pré-requisitos.

```markdown
# Objetivo

Demonstrar que os fluxos operacionais e os controles funcionam juntos, com evidências reproduzíveis, e preparar a homologação com a empresa.

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

Use Dev Front Master e Dev Back Master, com QA e desempenho apenas no escopo necessário.

Pré-requisitos: Etapas 02–06 concluídas no ambiente de homologação disponível, ou pendências declaradas que limitem os resultados.

# Escopo e requisitos

- Construir matriz requisito → teste → resultado, mantendo as regressões do primeiro ciclo.
- Testar HTTP/API/MongoDB real isolado e navegador integrado; identificar qualquer mock e sua limitação.
- Cobrir múltiplos equipamentos, marca ausente, cliente sem e-mail, indicação Testar, retiradas parciais, repetidas e finais.
- Cobrir cadastro e permissões de funcionários, expiração, logout, acesso direto à edição, recarga, falhas de rede e conflitos.
- Conferir numeração concorrente, paginação, filtros, estatísticas, preservação de ordens antigas e exclusão autorizada.
- Verificar teclado, foco, erros acessíveis e mobile/desktop; registrar evidências.
- Medir carregamento, consultas, volume de resposta e latência usando dados representativos, com ambiente/método informados.
- Antes de teste de carga, propor alvo, volume, duração, limites de interrupção, dados sintéticos e métricas. Executar somente no alvo autorizado, nunca produção por inferência.
- Executar build/tipos/lint/testes após instalação limpa e conferir CI. Para validar CI remoto, requer publicação autorizada; caso contrário, registrar que só houve execução local.
- Preparar roteiro de homologação do trabalho diário e colher resultados reais da empresa. Não inventar aceite humano.

# Fluxos e estados

Funcionário faz login, cria OS com três equipamentos, outro consulta/edita, cliente retira um, sistema reinicia/recarrega, restantes continuam pendentes, última retirada conclui entrega. Repetir com condições de erro e verificar que nenhuma informação se perde.

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

- Cenários críticos passam e falhas encontradas são reproduzidas, corrigidas dentro do escopo e retestadas.
- Métricas são observadas, não estimadas como resultado.
- Não há falha crítica aberta escondida por retry ou enfraquecimento de testes.
- Aprovação operacional da empresa é registrada somente quando fornecida.
- Relatório distingue validação local, CI remoto, staging e produção.

# Registro contínuo de pendências

Leia e mantenha docs/PENDENCIAS.md como registro central para revisão após os oito prompts. Registre toda descoberta não resolvida com ID, etapa de origem, evidência, impacto/prioridade, dependências, próxima ação e critério de conclusão. Atualize itens existentes sem duplicar; preserve histórico. Só marque resolvido com evidência de implementação/validação, incluindo commit e teste quando aplicáveis. Separe decisões pendentes, limitações de acesso e melhorias adiadas. Não adie bloqueios do fluxo atual ou de produção para a revisão final. Ao encerrar, informe os IDs abertos, alterados e resolvidos. Nunca registre segredos ou dados pessoais.

# Entrega esperada

Entregar suíte, matriz de resultados, evidências de navegador, medições e relatório de prontidão com bloqueios. Não avançar automaticamente para publicação.

Informe branch, commits, arquivos afetados, comandos/resultados, limitações e pendências. Registre continuidade para a próxima etapa sem afirmar aprovações não dadas.

# Referências e pendências

- Histórico do projeto: docs/diagnostico/RETOMADA.md e docs/dev-back/CICLO-1.md.
- Regras confirmadas e ordem do pacote: docs/prompts/README.md.
- Consulte documentação oficial compatível com as versões encontradas. Separe fatos, hipóteses e propostas.

Referências: https://nodejs.org/api/test.html e documentação oficial da ferramenta de navegador efetivamente disponível. Usar dados sintéticos; não solicitar produção apenas para testar.
```
