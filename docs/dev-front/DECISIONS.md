# Decisões — Eletro Paulínia

22/10/2026 — modo análise, sem implementação. Skills Dev Front Master e Dev Back Master utilizadas, com referências de arquitetura, segurança, desempenho e investigação de falhas.

Decisões explícitas do usuário: somente eletropaulinia-web; sistema para uso real; Next.js/TypeScript no frontend, Node.js/Express separado e MongoDB Atlas. Autorizados diagnóstico, plano e documentação em branch com commits. Sem push, merge, deploy ou migração nesta etapa.

Diagnóstico e proposta: [RETOMADA](../diagnostico/RETOMADA.md). Verificações: [VALIDACAO](../diagnostico/VALIDACAO.md). Branch: docs/diagnostico-retomada-eletropaulinia, baseada em 959d360.

Checkpoints de arquitetura detalhada, design e implementação não foram aprovados. Não é necessário pedir aprovação para concluir esta análise. Próxima etapa proposta: baseline reproduzível, contratos/permissões e bloqueios da API; depois fatia Next login→lista→criação. Design atual é referência existente, sem redesign aprovado. WhatsApp permanece fora da migração até decisão específica.
