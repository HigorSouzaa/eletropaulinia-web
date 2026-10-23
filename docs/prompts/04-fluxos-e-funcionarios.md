# 04 — Concluir telas, retiradas e Funcionários

Copie o bloco inteiro para a tarefa do projeto Eletro Paulínia. Execute uma etapa por vez, conferindo seus pré-requisitos.

```markdown
# Objetivo

Concluir os fluxos operacionais no Next.js, incluindo múltiplos equipamentos, entregas parciais e gestão de funcionários, com integração real à API.

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

Use Dev Front Master; Dev Back Master para endpoints da gestão de funcionários e ajustes de contrato necessários.

Pré-requisitos: Etapas 01–03 disponíveis. Não trabalhar sobre contratos apenas imaginados ou mocks sem identificá-los.

# Escopo e requisitos

- Concluir criação, listagem, filtros, detalhamento, edição, status e exclusão conforme permissões.
- Permitir adicionar/remover equipamentos no formulário sem descartar itens; apresentar requisitos reais de cada campo.
- Oferecer relato de defeito ou opção "Testar"; não obrigar marca/modelo. E-mail opcional.
- Mostrar retirada por equipamento, data/hora e itens ainda na empresa. Atualizar a OS inteira somente após retirada de todos.
- Aguardar confirmação da API; impedir envio duplicado; preservar o formulário em erro e tratar conflitos de edição.
- Buscar detalhe/edição por ID para funcionar em acesso direto e recarga, sem depender da listagem em memória.
- Mostrar estados de carregamento, vazio, erro, sucesso e nova tentativa.
- Criar tela "Funcionários" e endpoints mínimos acordados para cadastro/listagem/edição de perfil e ciclo de acesso. Restringir gestão à administração e impedir exposição de senhas/tokens.
- Tratar perda do último acesso administrativo conforme contrato; não inventar recuperação por e-mail ou envio automático.
- Resolver links sem função. Remover/ocultar Clientes/Relatórios enquanto os módulos opcionais estiverem fora do escopo.
- Corrigir responsividade, labels, nomes acessíveis, foco/Escape dos modais e retorno de foco. Preservar identidade visual, sem redesign amplo.

# Fluxos e estados

OS com três equipamentos; retirar um e recarregar; os outros permanecem pendentes. Retirar o restante e confirmar status final. Cadastrar funcionário como admin, entrar com ele e verificar acesso compartilhado às ordens; negar gestão/exclusão ao perfil não autorizado. Simular erro de API e sessão expirada.

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

- Jornada completa funciona no navegador com API e banco de teste reais.
- Nenhum campo ou equipamento aceito se perde após salvar/recarregar.
- As telas não anunciam sucesso antes da resposta da API.
- Deep links, recarga e troca de usuário funcionam.
- Formulários e modais são operáveis por teclado; verificar larguras 360, 768 e 1280 px.
- Exclusão tem confirmação clara com identificação da OS, chama autorização real no servidor e não afeta outras ordens.
- Testes negativos de gestão de funcionários passam.

# Registro contínuo de pendências

Leia e mantenha docs/PENDENCIAS.md como registro central para revisão após os oito prompts. Registre toda descoberta não resolvida com ID, etapa de origem, evidência, impacto/prioridade, dependências, próxima ação e critério de conclusão. Atualize itens existentes sem duplicar; preserve histórico. Só marque resolvido com evidência de implementação/validação, incluindo commit e teste quando aplicáveis. Separe decisões pendentes, limitações de acesso e melhorias adiadas. Não adie bloqueios do fluxo atual ou de produção para a revisão final. Ao encerrar, informe os IDs abertos, alterados e resolvidos. Nunca registre segredos ou dados pessoais.

# Entrega esperada

Entregar telas e APIs necessárias, testes de jornada e evidências visuais/funcionais. Registrar pendências reais e manter garantia/envios e módulos opcionais fora do escopo.

Informe branch, commits, arquivos afetados, comandos/resultados, limitações e pendências. Registre continuidade para a próxima etapa sem afirmar aprovações não dadas.

# Referências e pendências

- Histórico do projeto: docs/diagnostico/RETOMADA.md e docs/dev-back/CICLO-1.md.
- Regras confirmadas e ordem do pacote: docs/prompts/README.md.
- Consulte documentação oficial compatível com as versões encontradas. Separe fatos, hipóteses e propostas.

Garantia e envio futuro não são autorização para criar notificações, documentos ou integrações agora. A alteração do rótulo para Funcionários não exige migração de nomes internos.
```
