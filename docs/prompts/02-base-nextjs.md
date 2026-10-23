# 02 — Migrar a base para Next.js

Copie o bloco inteiro para a tarefa do projeto Eletro Paulínia. Execute uma etapa por vez, conferindo seus pré-requisitos.

```markdown
# Objetivo

Iniciar a primeira etapa de implementação pela base Next.js/TypeScript, mantendo a API Express e preparando o frontend para concluir os fluxos.

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

Use Dev Front Master; use Dev Back Master para alinhar sessão, contratos e integração.

Pré-requisitos: Etapa 01 consolidada; decisões necessárias à arquitetura e sessão resolvidas.

# Escopo e requisitos

- Conferir versões suportadas de Next.js/React/Node na documentação oficial e compatibilidade com o projeto. Registrar a escolha e fixar lockfiles.
- Apresentar arquitetura concreta de pastas, rotas, componentes cliente/servidor, sessão e deploy antes de construir as telas principais, conforme os checkpoints aplicáveis.
- Criar App Router, layouts, navegação e tratamento de página inexistente, preservando a identidade visual atual.
- Migrar login, layout e listagem como primeiro fluxo real; manter a API Express responsável por autenticação, autorização e negócio.
- Definir e implementar uma sessão coerente entre Next e Express, com expiração, logout, troca de usuário e validação no servidor. Se usar cookies, tratar HttpOnly/Secure/SameSite, CSRF e origens desde esta etapa. Não exigir cookie Secure em desenvolvimento HTTP.
- Evitar leitura de localStorage durante renderização no servidor e cache público de dados autenticados.
- Manter as rotas restantes acessíveis por uma transição explícita ou identificá-las como pendentes; não fingir paridade completa.
- Migrar scripts, tipos, lint e configuração de CI à medida que a estrutura mudar. Remover Vite/React Router apenas após verificar os consumidores e a transição.
- Não apresentar formulário de vários equipamentos como funcional enquanto o contrato correspondente não estiver implementado na etapa 03.

# Fluxos e estados

Login válido → listagem real; login inválido; rede indisponível; sessão expirada; logout; entrada com outra conta; recarga e acesso direto à URL. Invalidar dados da sessão anterior e atualizar a UI após 401.

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

- Login/listagem funcionam no Next com a API real e dados sintéticos.
- Usuário sem sessão não acessa dados protegidos pela API.
- Troca de sessão não reapresenta dados/cache da conta anterior.
- Build, tipagem, lint e testes pertinentes passam; avisos remanescentes são documentados.
- Navegação e layout funcionam em desktop e largura móvel representativa.
- Rotas ainda não migradas têm situação explícita e plano de conclusão.

# Entrega esperada

Entregar a base Next, testes da primeira jornada, instruções locais e registro de compatibilidade. Demonstrar esse fluxo antes de ampliar para todas as telas. Não migrar dados reais nem publicar.

Informe branch, commits, arquivos afetados, comandos/resultados, limitações e pendências. Registre continuidade para a próxima etapa sem afirmar aprovações não dadas.

# Referências e pendências

- Histórico do projeto: docs/diagnostico/RETOMADA.md e docs/dev-back/CICLO-1.md.
- Regras confirmadas e ordem do pacote: docs/prompts/README.md.
- Consulte documentação oficial compatível com as versões encontradas. Separe fatos, hipóteses e propostas.

Referências: https://nextjs.org/docs/app/getting-started/server-and-client-components , https://nextjs.org/docs/app/guides/authentication e https://nextjs.org/docs/app/getting-started/fetching-data .
```
