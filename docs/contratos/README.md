# Etapa 01 — Regras, evidências e contratos

23/10/2026. Análise/documentação; nenhuma migração implementada. Base inspecionada: `557f3b5`, branch de origem `docs/prompts-conclusao`; trabalho em `docs/contratos-etapa-01`. Primeiro ciclo de código: `1f71959`. Árvore inicialmente limpa; nenhum AGENTS.md encontrado no repositório ou nos diretórios ancestrais consultados.

Skills utilizadas: Dev Back Master (referência CONTRACTS) e Dev Front Master (LOCAL_SETUP). Este documento consolida decisões de negócio confirmadas e **propõe contratos técnicos ainda não implementados**. Não registra aprovação de arquitetura, design ou implantação.

- [Contrato proposto da API e dados](API-V2.md)
- [Arquitetura e compatibilidade](ARQUITETURA-E-TRANSICAO.md)
- [Matriz de testes, validação e pendências](VALIDACAO.md)
- [Contrato histórico do primeiro ciclo](../dev-back/CONTRATOS-CICLO-1.md)

## Estado encontrado

| Evidência | Conclusão | Classificação |
| --- | --- | --- |
| [NovaOrdem](../../src/pages/NovaOrdem.tsx), handleSubmit, equipamentos[0] | Só o primeiro equipamento é enviado, apesar do formulário múltiplo | Confirmada por inspeção |
| Mesmo arquivo, input email sem estado/payload; [Order](../../backend/models/Order.js) | E-mail não persiste; marca e defeito são obrigatórios; apenas um equipamento | Confirmada por inspeção |
| [orderController](../../backend/controllers/orderController.js), updateOrder | Número editável e opcionais com valor vazio não são limpos devido a fallback com OR | Confirmada por inspeção |
| Order, pre-save | Número depende da última OS, sem contador atômico; corrida e reutilização são riscos | Mecanismo confirmado por inspeção; ocorrência real não verificada |
| Order e updateOrderStatus | Quatro estados; nenhuma retirada individual, data de retirada ou transição validada além do enum | Confirmada por inspeção |
| [routes/orders](../../backend/routes/orders.js) | Todas as OS exigem sessão; só exclusão exige admin; não há filtro createdBy | Confirmada por inspeção |
| [auth](../../backend/middleware/auth.js) e [routes/auth](../../backend/routes/auth.js) | Usuário consultado por requisição, cadastro admin, JWT HS256 | Confirmada por inspeção; cenários executados descritos em VALIDACAO |
| [AuthContext](../../src/contexts/AuthContext.tsx), [api](../../src/services/api.ts), [OrderContext](../../src/contexts/OrderContext.tsx) | localStorage; limpeza por 401 não sincroniza contextos; consulta inicial não depende da sessão | Confirmada por inspeção |
| OrderContext.getOrder e [EditarOrdem](../../src/pages/EditarOrdem.tsx) | Detalhe/edição depende da lista carregada | Confirmada por inspeção |
| [Ordens](../../src/pages/Ordens.tsx), handleStatusChange | Não aguarda atualização de status | Confirmada por inspeção |
| getOrders e Ordens | API retorna tudo; busca/filtros no cliente | Confirmada por inspeção |
| [User](../../backend/models/User.js), routes/auth, [App](../../src/App.tsx) | Não há API de listar/editar/desativar funcionários, recuperação nem tela de gestão | Confirmada por inspeção |
| Atlas, dados da empresa, backups, volume e uso de credenciais antigas | Não houve conexão a banco real nem inventário remoto | Não verificável com os acessos utilizados |

Não se infere intenção do autor nem prontidão operacional a partir do build.

## Regras confirmadas pelo usuário

1. Todos os funcionários acessam todas as ordens, sem propriedade exclusiva por técnico.
2. Uma OS contém um ou mais equipamentos e permite retiradas parciais.
3. Cliente precisa de nome e telefone; e-mail opcional.
4. Equipamento precisa de identificação/nome. Marca/modelo e série opcionais.
5. Relato de defeito ou indicação explícita Testar quando não houver relato.
6. Registrar instante por retirada; OS Entregue somente quando todos retirados.
7. Guardar OS independentemente da idade; sem TTL. Exclusão administrativa definitiva na base ativa.
8. Tela Funcionários; nomes técnicos User, admin, tecnico e atendente podem permanecer.
9. Garantia, mensagens automáticas, WhatsApp, clientes completos, relatórios avançados e redesign fora do ciclo.

## Permissões

| Operação | Sem sessão válida | atendente | tecnico | admin | Situação |
| --- | --- | --- | --- | --- | --- |
| Login | Credenciais válidas | Sim | Sim | Sim | Atual |
| Perfil próprio | 401 | Sim | Sim | Sim | Atual |
| Consultar/criar/editar OS e andamento | 401 | Sim | Sim | Sim | Atual e preservada |
| Retirar equipamento | 401 | Sim | Sim | Sim | Proposta coerente com operação compartilhada |
| Excluir OS | 401 | 403 | 403 | Sim | Atual e preservada |
| Cadastrar funcionário | 401 | 403 | 403 | Sim | Atual |
| Listar/editar funcionários e perfil | 401 | 403 | 403 | Sim | Proposta para nova gestão |
| Desativar/redefinir senha | 401 | 403 | 403 | Proposto | Decisão operacional pendente |
| Corrigir retirada | 401 | A definir | A definir | Proposto | Pendente |

Sessão válida não substitui autorização no Express. createdBy identifica criação; não restringe acesso. Técnico atribuído permanece texto legado até haver regra de vínculo a funcionário; não converter nomes em IDs por adivinhação.

## Decisões abertas

Perguntas enviadas durante a análise:
- Retirada antes de Pronto: permitir com motivo ou bloquear?
- Correção de retirada: somente admin ou qualquer funcionário, sempre com motivo?
- Desligamento por desativação e recuperação por admin sem envio automático?

A ausência de resposta não aprova opções. Essas exceções podem ficar bloqueadas no primeiro fluxo de implementação enquanto os fluxos normais avançam. Outros acessos necessários: origem/volume dos dados, backup existente, responsável operacional e provedor/domínios.

As propostas técnicas de limites, formato v2, agregação de andamento e sessão estão identificadas nos documentos seguintes; não são novas regras declaradas como aprovadas.
