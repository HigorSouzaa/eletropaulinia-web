# Decisões — Eletro Paulínia

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
