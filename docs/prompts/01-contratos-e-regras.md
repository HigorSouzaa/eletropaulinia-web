# 01 — Consolidar regras e contratos

Copie o bloco inteiro para a tarefa do projeto Eletro Paulínia. Execute uma etapa por vez, conferindo seus pré-requisitos.

```markdown
# Objetivo

Consolidar as decisões já tomadas em contratos verificáveis para o frontend, a API e os dados. Preparar as demais etapas; não implementar a migração nem alterar dados.

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

Use Dev Back Master e Dev Front Master para análise e alinhamento de contratos.

Pré-requisitos: Sem etapa anterior deste pacote. Revalidar a entrega do primeiro ciclo.

# Escopo e requisitos

- Mapear as regras confirmadas contra schemas, endpoints, telas e testes atuais.
- Documentar a matriz de permissões existente sem introduzir isolamento por técnico.
- Definir o contrato de uma OS com equipamentos identificados individualmente, cliente, relato/"Testar", marca opcional e retiradas individuais.
- Definir uma representação coerente da entrega parcial e do status agregado. Preservar os estados existentes quando atendam ao fluxo; não inventar estágios comerciais.
- Especificar endpoints, payloads de sucesso/erro, limites, campos editáveis, ausência/null, conflitos e política de cache por sessão.
- Definir o mínimo da gestão de funcionários: cadastrar, listar, ajustar dados/perfil e tratar desligamento/recuperação de acesso conforme decisão operacional. Propor alternativas quando faltar regra, sem transformar proposta em aprovação.
- Levantar dados existentes e campos ausentes. Não supor banco vazio.
- Descrever a transição Vite → Next com Express mantido e a sequência de compatibilidade entre clientes/API.
- Perguntar apenas exceções ainda relevantes: retirada antes de Pronto, correção de retirada lançada por engano e recuperação de acesso, se forem necessárias ao fluxo. Não perguntar novamente sobre retiradas parciais, marca ou acesso compartilhado.

# Fluxos e estados

Exemplificar uma OS com três equipamentos: cadastro; atualização; retirada de um; permanência de dois; retirada dos demais; status final Entregue. Incluir cliente sem e-mail, equipamento sem marca, equipamento para Testar e tentativa de exclusão por não administrador.
Distinguir hora técnica armazenada e apresentação local; propor armazenamento de instantes em UTC e apresentação America/Sao_Paulo, sem inventar horário para dados antigos.

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

- Todas as regras confirmadas estão representadas sem contradição.
- Há exemplos sintéticos dos contratos e matriz regra → cenário de teste.
- Pendências, propostas e decisões confirmadas aparecem separadamente.
- Critérios da futura migração de dados preservam OS existentes e suas referências.
- Existe plano de arquitetura concreto para revisão antes de construção estrutural.

# Entrega esperada

Salvar contratos e decisões no projeto, com mapa de compatibilidade e checklist das próximas etapas. Apresentar as pendências que realmente precisam de resposta; nenhuma implementação neste prompt.

Informe branch, commits, arquivos afetados, comandos/resultados, limitações e pendências. Registre continuidade para a próxima etapa sem afirmar aprovações não dadas.

# Referências e pendências

- Histórico do projeto: docs/diagnostico/RETOMADA.md e docs/dev-back/CICLO-1.md.
- Regras confirmadas e ordem do pacote: docs/prompts/README.md.
- Consulte documentação oficial compatível com as versões encontradas. Separe fatos, hipóteses e propostas.

Referências: https://www.mongodb.com/docs/manual/core/write-operations-atomicity/ e https://nextjs.org/docs/app/guides/authentication .
```
