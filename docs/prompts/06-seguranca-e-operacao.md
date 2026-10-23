# 06 — Fechar segurança e prontidão operacional

Copie o bloco inteiro para a tarefa do projeto Eletro Paulínia. Execute uma etapa por vez, conferindo seus pré-requisitos.

```markdown
# Objetivo

Revisar e corrigir os riscos remanescentes de aplicação, sessão, dependências e operação, sem refazer controles já concluídos.

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

Use Dev Back Master e Dev Front Master, com segurança e QA proporcionais às superfícies encontradas.

Pré-requisitos: Fluxos e sessão das etapas 02–04 disponíveis; contexto de infraestrutura da etapa 05 conhecido. Segurança básica deve existir desde as etapas anteriores, não esperar esta auditoria.

# Escopo e requisitos

- Revalidar cadastro administrativo, usuários removidos/desativados, alterações de perfil, autorização por ação e ausência de credenciais padrão.
- Concluir expiração, logout/revogação e recuperação de acesso conforme contrato. Se persistir Bearer/localStorage temporariamente, documentar risco e plano, sem chamá-lo equivalente a cookie HttpOnly.
- Verificar cookies, CSRF, origens, cache e troca de usuários conforme a estratégia efetivamente implementada.
- Restringir CORS, limitar abuso de login e tamanho/custo das requisições; considerar topologia real antes de confiar em cabeçalhos de proxy.
- Validar todos os endpoints e respostas sem detalhes internos, inclusive CRUD de funcionários e retiradas parciais.
- Revisar dependências por versão resolvida, alcance e ambiente. Corrigir vulnerabilidades aplicáveis com atualização compatível e testes, sem audit fix --force indiscriminado.
- Revisar bundle/configuração para evitar segredos públicos; redigir logs, erros e telemetria.
- Implementar saúde/readiness, encerramento gracioso e diagnóstico de falhas de banco. Definir monitoramento proporcional à hospedagem.
- Verificar necessidade de rotação dos valores históricos, preparando procedimento; não alterar credenciais reais por conta própria.
- Documentar achados com evidência, precondições, impacto e teste de regressão.

# Fluxos e estados

Tentativas sem sessão, perfil indevido, sessão expirada, conta desativada, logout e reutilização de token; payloads malformados; falha de banco; origem indevida; duas contas no mesmo navegador. Testar somente ambiente local/staging autorizado.

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

- Controles aplicáveis passam em testes positivos e negativos.
- Nenhuma vulnerabilidade crítica alcançável conhecida fica sem tratamento antes da liberação.
- Alertas de ferramentas são triados; ausência de alertas não é apresentada como garantia de segurança.
- Saúde distingue processo vivo de serviço pronto e falhas não expõem credenciais.
- Há plano de incidentes/rotação e riscos remanescentes explicitados.
- Não houve pentest, carga ou ações destrutivas em produção.

# Registro contínuo de pendências

Leia e mantenha docs/PENDENCIAS.md como registro central para revisão após os oito prompts. Registre toda descoberta não resolvida com ID, etapa de origem, evidência, impacto/prioridade, dependências, próxima ação e critério de conclusão. Atualize itens existentes sem duplicar; preserve histórico. Só marque resolvido com evidência de implementação/validação, incluindo commit e teste quando aplicáveis. Separe decisões pendentes, limitações de acesso e melhorias adiadas. Não adie bloqueios do fluxo atual ou de produção para a revisão final. Ao encerrar, informe os IDs abertos, alterados e resolvidos. Nunca registre segredos ou dados pessoais.

# Entrega esperada

Entregar correções, testes, relatório priorizado e instruções operacionais. Separar confirmado, hipótese e não verificado; indicar bloqueios de publicação.

Informe branch, commits, arquivos afetados, comandos/resultados, limitações e pendências. Registre continuidade para a próxima etapa sem afirmar aprovações não dadas.

# Referências e pendências

- Histórico do projeto: docs/diagnostico/RETOMADA.md e docs/dev-back/CICLO-1.md.
- Regras confirmadas e ordem do pacote: docs/prompts/README.md.
- Consulte documentação oficial compatível com as versões encontradas. Separe fatos, hipóteses e propostas.

Referências: https://expressjs.com/en/advanced/best-practice-security/ , https://nextjs.org/docs/app/guides/authentication e https://nextjs.org/docs/app/guides/data-security .
```
