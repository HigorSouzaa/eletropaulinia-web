# 08 — Preparar publicação e entrada em operação

Copie o bloco inteiro para a tarefa do projeto Eletro Paulínia. Execute uma etapa por vez, conferindo seus pré-requisitos.

```markdown
# Objetivo

Preparar uma proposta concreta de hospedagem, configuração, corte e reversão. Publicar somente após autorização específica sobre a proposta final.

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

Use Dev Back Master e Dev Front Master; use ferramentas/skills do provedor somente após confirmar o serviço escolhido.

Pré-requisitos: Homologação e riscos da etapa 07 conhecidos; dados/backup da etapa 05 e segurança da etapa 06 revisados. Vercel é candidata; backend ainda não tem provedor definido.

# Escopo e requisitos

- Pesquisar documentação e preços atuais para Vercel e opções de backend Node/Express preferencialmente gratuitas. Não tratar plano gratuito como garantia de adequação ao uso empresarial.
- Comparar suspensão por inatividade, partida lenta, memória, CPU, conexões, limites de rede, disponibilidade, suporte ao runtime e condições de uso comercial.
- Considerar Atlas e recursos de backup no custo e na disponibilidade totais. Se nenhuma opção gratuita atender, explicar o impedimento e apresentar alternativas sem contratar.
- Definir domínios/origens e estratégia de integração Next/Express/sessão. Preferir topologia compatível com o contrato, sem reescrever autenticação silenciosamente.
- Preparar build/start, runtime, variáveis por nome, segredos via mecanismo seguro, HTTPS, health checks e monitoramento.
- Preparar staging e checklist de smoke; produção deve usar dados e contas autorizados, sem fixtures sintéticas públicas.
- Apresentar custo, limitações, conta/projeto/destino exatos, operações de migração e plano de rollback antes da aprovação final.
- Preparar janela operacional, comunicação a ser aprovada, responsáveis e reconciliação de gravações. Não enviar mensagens a terceiros por conta própria.
- Após autorização específica, executar somente o plano aprovado e verificar os fluxos, saúde e backups disponíveis. Se não houver autorização, entregar o pacote pronto para revisão.

# Fluxos e estados

Comparação → escolha do provedor → configuração revisável → staging autorizado → autorização de produção → corte → smoke operacional → acompanhamento inicial e decisão de manter/reverter. Não usar comandos de deploy apenas para descobrir configurações.

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

- Hospedagem e custos/limites estão confirmados por fontes atuais.
- Não existem bloqueios críticos de dados/segurança/homologação omitidos.
- Plano identifica backup, reversão e gravações posteriores ao corte.
- Segredos não aparecem no Git, prompt, relatório ou bundle.
- Publicação só é declarada após confirmação real; se não executada, indicar precisamente o que está pronto e o que depende de decisão.
- Nenhuma contratação, push, merge, deploy ou alteração remota foi inferida como autorizada pela geração deste prompt.

# Entrega esperada

Entregar proposta comparativa, configuração versionada, runbook, checklist e pedido final de autorização com ações concretas. Se autorizado e executado, registrar URLs, versões, validações e resultado do corte.

Informe branch, commits, arquivos afetados, comandos/resultados, limitações e pendências. Registre continuidade para a próxima etapa sem afirmar aprovações não dadas.

# Referências e pendências

- Histórico do projeto: docs/diagnostico/RETOMADA.md e docs/dev-back/CICLO-1.md.
- Regras confirmadas e ordem do pacote: docs/prompts/README.md.
- Consulte documentação oficial compatível com as versões encontradas. Separe fatos, hipóteses e propostas.

Pesquisar na execução: documentação oficial e tabelas de preços de Vercel, MongoDB Atlas e candidatos ao backend. Não fixar no prompt um provedor gratuito com base em informações antigas.
```
