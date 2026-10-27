# Decisões — Eletro Paulínia

## Primeira jornada de Clientes — aprovação e implementação local

O usuário aprovou os contratos e a arquitetura apresentados com "Aprovo pode fazer". Implementada a fatia telefone → consulta → cliente/OS transacionais → detalhe/recarga. A/B e arquitetura/design estão aprovados para este pacote; o checkpoint C funcional aguarda demonstração e resposta. A aprovação não autoriza publicação nem acesso ao banco real. Detalhes e limites em [primeira jornada](../qa/CLIENTES-PRIMEIRA-JORNADA.md). Os blocos seguintes preservam o histórico anterior.

## Atualização vigente — Clientes, laudos e técnicos, 27/10/2026

Novo pacote solicitado pelo usuário: cliente separado de User, telefone primeiro com máscara/consulta, criação automática junto com OS, vínculo estável, área Clientes e edição de cadastro somente admin. Laudo por equipamento com serviços/valores individuais somados; técnico opcional selecionado entre técnico/admin ativo. Dados históricos da OS preservados. Endereço/CPF/CNPJ e comunicação automática continuam fora.

Modo semi-auto conforme prompt e skills. As decisões de produto estão respondidas; [contratos concretos](../contratos/CLIENTES-LAUDOS-TECNICOS.md) e [arquitetura/design descritivo](CLIENTES-LAUDOS-TECNICOS.md) foram preparados para revisão conjunta. A aprovação do planejamento anterior não é registrada como aprovação desses detalhes nem da primeira jornada ainda inexistente. Próximo passo: revisão A/B e arquitetura/design, seguida da primeira fatia telefone→cliente→OS→recarga e checkpoint funcional C antes da expansão.

Branch `feat/clientes-laudos-tecnicos`, baseada em `b2515e6`, preservando a branch hospedada. Somente documentação nesta preparação. `npm run check` passou com 57 testes HTTP/Mongo, tipos/lint/build; `npm run test:e2e` passou 20 cenários Chromium. [Evidências e limites](../qa/CLIENTES-LAUDOS-TECNICOS-BASE.md). Testes da base não validam Clientes/laudos/técnicos novos.

O usuário determinou que Netlify e Render serão atualizados depois dos testes e autorização posterior. Nenhum push, deploy, acesso/transformação de Atlas, alteração de credenciais ou descarte de dados foi realizado nesta preparação. A antiga autorização de banco de teste do zero não foi reaproveitada.

Os registros abaixo permanecem históricos; não anulam estas novas decisões.

22/10/2026 — modo análise, sem implementação. Skills Dev Front Master e Dev Back Master utilizadas, com referências de arquitetura, segurança, desempenho e investigação de falhas.

Decisões explícitas do usuário: somente eletropaulinia-web; sistema para uso real; Next.js/TypeScript no frontend, Node.js/Express separado e MongoDB Atlas. Autorizados diagnóstico, plano e documentação em branch com commits. Sem push, merge, deploy ou migração nesta etapa.

Diagnóstico e proposta: [RETOMADA](../diagnostico/RETOMADA.md). Verificações: [VALIDACAO](../diagnostico/VALIDACAO.md). Branch: docs/diagnostico-retomada-eletropaulinia, baseada em 959d360.

Checkpoints de arquitetura detalhada, design e implementação não foram aprovados. Não é necessário pedir aprovação para concluir esta análise. Próxima etapa proposta: baseline reproduzível, contratos/permissões e bloqueios da API; depois fatia Next login→lista→criação. Design atual é referência existente, sem redesign aprovado. WhatsApp permanece fora da migração até decisão específica.

## Primeiro ciclo autorizado e executado

Após o diagnóstico, o usuário autorizou o primeiro ciclo (“Ok pode fazer então”). Branch `fix/primeiro-ciclo-api`, derivada de b53b52c. Autorização aplicada ao baseline, contratos e bloqueios de autenticação, com ajustes de tipagem/lint e espera da edição. Sem redesign, migração Next/Atlas ou publicação. A pergunta sobre permissões foi enviada; a regra atual de acesso compartilhado às ordens foi preservada provisoriamente, sem marcar silêncio como aprovação de negócio.

Resultados: [entrega do ciclo 1](../dev-back/CICLO-1.md) e [contratos](../dev-back/CONTRATOS-CICLO-1.md). Setup limpo e check completo passaram; 13 testes HTTP com MongoDB descartável. Dois avisos antigos de Fast Refresh permanecem. Próxima etapa proposta: fatia Next com login/lista/criação e decisões pendentes de produto. O diagnóstico anterior permanece como registro da base original.

## Regras confirmadas e pacote de prompts — 23/10/2026

Após o primeiro ciclo, o usuário confirmou acesso de todos os funcionários a todas as ordens, vários equipamentos por OS e retiradas parciais. Nome e telefone do cliente são obrigatórios; e-mail é opcional. Cada equipamento precisa de nome/identificação; marca/modelo e série são opcionais. Registrar o defeito relatado ou indicar **Testar** quando não houver relato.

Registrar data e hora por equipamento retirado. O agregado da OS só fica Entregue após a retirada de todos. Manter ordens de qualquer data; exclusão explícita remove a OS da base ativa. Preservar as restrições administrativas atuais para cadastro de funcionários e exclusão. A tela de gestão passa a ser denominada Funcionários; isso não exige renomear o model User.

Garantia e envio automático ficam para uma etapa futura. Melhorias opcionais ficam fora do pacote atual. Vercel é candidata para o frontend; backend ainda sem provedor definido. Não há autorização de publicação ou de alteração de banco real.

Foram solicitados prompts para as oito etapas restantes, preparados em [docs/prompts](../prompts/README.md). Contratos vêm primeiro; a base Next.js é a primeira implementação recomendada, seguida do backend de múltiplos equipamentos e da conclusão dos fluxos. A preparação desses prompts não executa as etapas nem registra uma aprovação estrutural nova. Decisões já respondidas não devem ser perguntadas novamente.

## Etapa 01 — contratos consolidados, 23/10/2026

Modo análise/documentação, sem implementação. Base 557f3b5; branch docs/contratos-etapa-01. [Pacote de contratos](../contratos/README.md) separa regras confirmadas, evidência atual e propostas v2. Inclui retirada por equipamento, contrato de erros/concorrência, funcionários, sessão e transição Next/Express. Nenhum checkpoint de implementação é marcado como aprovado.

Revalidação atual: npm run check exit 0; 13 testes HTTP/MongoDB isolado passaram, tipagem/build passaram e dois avisos antigos de Fast Refresh permanecem. Não houve acesso a dados reais, Atlas, navegador, CI remoto ou restore. Perguntas sobre retirada antecipada, correção de retirada e desligamento/recuperação foram enviadas; sem resposta registrada até a consolidação, permanecem pendentes. A próxima etapa é a base Next login/lista, após revisão das propostas arquiteturais pertinentes; múltiplos equipamentos dependem das etapas 03–04.

## Etapa 02 iniciada — checkpoint pendente

23/10/2026, branch feat/base-nextjs, base 4786525. Modo semi-auto conforme skills e prompt. Arquitetura concreta em [ETAPA-02-ARQUITETURA.md](ETAPA-02-ARQUITETURA.md): Next App Router com React 19, Express separado, JWT existente em cookie HttpOnly e revogação por hash persistido no backend. Proposta restrita a login/listagem; sem mudança no modelo de ordens. Preservar aparência atual. Checkpoint de arquitetura/contrato de sessão aguarda resposta explícita; implementação não iniciada. P04/P05 em planejamento, P25 aberto. Nenhuma nova aprovação visual/funcional registrada.

## Etapa 02 — aprovação e primeiro fluxo entregue

O usuário respondeu explicitamente “Sim está aprovado” à arquitetura/sessão e depois “Pode continuar”. Implementado somente o fluxo do Prompt 02, preservando a identidade visual existente. Branch feat/base-nextjs. Express mantém JWT com jti e revogação por hash; Next usa cookie HttpOnly e transportes fixos. Arquivo legacy preserva integralmente o frontend anterior. Não há aprovação inferida de redesign nem expansão para todos os fluxos.

Instalação limpa, check (16 HTTP, tipos, lint, build) e seis E2E locais passaram. A proposta de arquitetura foi ajustada de src/features para web/ para separar claramente os módulos ativos do frontend arquivado. Revisão funcional do usuário ainda não registrada; primeira jornada está entregue para revisão. Não houve implantação ou migração real. [Relatório](ETAPA-02-ENTREGA.md); [pendências atualizadas](../PENDENCIAS.md).

## Etapa 03 — continuidade aprovada

Após aprovar o contrato e agregado (“Pode aprovar”), o usuário aprovou a demonstração do primeiro fluxo (“Pode aprovar então”). Checkpoints A/B/C da etapa 03 registrados; continuação restrita ao Prompt 03. Next passou à listagem v2 com busca/paginação/filtros no servidor e todos os equipamentos visíveis. Nenhum formulário da etapa 04, redesign, deploy ou dado real. [Entrega e limites](../dev-back/ETAPA-03-ENTREGA.md). Exceções de retirada/composição permanecem indisponíveis, sem aprovação inferida.

## Etapa 04 — proposta para checkpoints, 23/10/2026

O Prompt 04 autorizou a etapa e exigiu respeito aos checkpoints das skills. Branch `feat/fluxos-next-funcionarios`, base `4157aae`. A [arquitetura das telas](ETAPA-04-ARQUITETURA.md) e o [contrato de funcionários](../dev-back/ETAPA-04-FUNCIONARIOS-CONTRATO.md) foram preparados para revisão. Checkpoints de arquitetura/contrato, design e primeiro fluxo funcional **ainda não foram aprovados nesta etapa**; nenhuma implementação principal foi iniciada. A pergunta operacional de P03 foi encaminhada sem presumir resposta. Baseline `npm run check` passou: 36 testes HTTP/Mongo, tipagem, lint e build; aviso Browserslist antigo permanece. Não houve banco real nem publicação.

## Etapa 04 — aprovações e decisão operacional, 24/10/2026

O usuário respondeu “Sim pode aprovar” à arquitetura/contrato preparados; checkpoints de arquitetura frontend e A/B backend aprovados para a primeira fatia. Implementação da criação e consulta por URL foi iniciada, sem ampliar ainda para todas as telas. Em resposta posterior, confirmou desativação sem apagar histórico, revogação de sessões e redefinição presencial de senha por admin, sem envio automático. Essa regra pertence à futura gestão de Funcionários, não foi implementada nesta primeira fatia. Checkpoint de design/revisão funcional da fatia ainda aguarda demonstração e resposta; nenhuma aprovação para expansão foi presumida.

Primeira fatia implementada em `cba10f7`: [criação e detalhe reais](ETAPA-04-PRIMEIRO-FLUXO.md). `npm run check` passou (36 testes HTTP/Mongo, tipos, lint e build); oito E2E passaram e, após ampliar a verificação de origem/sessão/responsividade, dois testes direcionados passaram. A criação tem teste real por atendente e Mongo descartável. Edição, retirada, exclusão e Funcionários não foram iniciados. Aguarda revisão funcional/visual do usuário antes da expansão, conforme checkpoints da Dev Front Master e Dev Back Master.

## Etapa 04 — continuação aprovada e entrega local

O usuário respondeu “Pode aprovar” à primeira fatia. Checkpoint funcional aprovado para ampliar somente o Prompt 04. [Entrega](ETAPA-04-ENTREGA.md): edição, andamento, retirada, exclusão e Funcionários integrados, mantendo a identidade existente. A decisão de desativação/revogação/reset presencial foi aplicada; P01/P02/P11 não foram presumidas. `npm run check` passou com 42 testes HTTP/Mongo, tipagem, lint e build. A suíte completa passou 15 E2E, incluindo 503 com rascunho preservado e legado somente leitura. Capturas 360/1280 px revisadas. Nenhuma aprovação de Atlas, deploy ou operação real foi inferida.
