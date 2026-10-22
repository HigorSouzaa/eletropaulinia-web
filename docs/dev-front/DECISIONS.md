# Decisões — Eletro Paulínia

22/10/2026 — modo análise, sem implementação. Skills Dev Front Master e Dev Back Master utilizadas, com referências de arquitetura, segurança, desempenho e investigação de falhas.

Decisões explícitas do usuário: somente eletropaulinia-web; sistema para uso real; Next.js/TypeScript no frontend, Node.js/Express separado e MongoDB Atlas. Autorizados diagnóstico, plano e documentação em branch com commits. Sem push, merge, deploy ou migração nesta etapa.

Diagnóstico e proposta: [RETOMADA](../diagnostico/RETOMADA.md). Verificações: [VALIDACAO](../diagnostico/VALIDACAO.md). Branch: docs/diagnostico-retomada-eletropaulinia, baseada em 959d360.

Checkpoints de arquitetura detalhada, design e implementação não foram aprovados. Não é necessário pedir aprovação para concluir esta análise. Próxima etapa proposta: baseline reproduzível, contratos/permissões e bloqueios da API; depois fatia Next login→lista→criação. Design atual é referência existente, sem redesign aprovado. WhatsApp permanece fora da migração até decisão específica.

## Primeiro ciclo autorizado e executado

Após o diagnóstico, o usuário autorizou o primeiro ciclo (“Ok pode fazer então”). Branch `fix/primeiro-ciclo-api`, derivada de b53b52c. Autorização aplicada ao baseline, contratos e bloqueios de autenticação, com ajustes de tipagem/lint e espera da edição. Sem redesign, migração Next/Atlas ou publicação. A pergunta sobre permissões foi enviada; a regra atual de acesso compartilhado às ordens foi preservada provisoriamente, sem marcar silêncio como aprovação de negócio.

Resultados: [entrega do ciclo 1](../dev-back/CICLO-1.md) e [contratos](../dev-back/CONTRATOS-CICLO-1.md). Setup limpo e check completo passaram; 13 testes HTTP com MongoDB descartável. Dois avisos antigos de Fast Refresh permanecem. Próxima etapa proposta: fatia Next com login/lista/criação e decisões pendentes de produto. O diagnóstico anterior permanece como registro da base original.
