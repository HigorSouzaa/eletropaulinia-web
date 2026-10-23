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
