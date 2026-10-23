# Prompts para conclusão do Eletro Paulínia

Pacote preparado em 23/10/2026 com Prompt Dev, Dev Front Master e Dev Back Master. O objetivo deste pacote é orientar a execução por etapas; a criação destes documentos não executa a migração.

## Como usar

Registro central: [PENDENCIAS.md](../PENDENCIAS.md). Atualizar durante cada prompt e revisar ao final dos oito, preservando evidências e histórico. Bloqueios do fluxo atual não devem ser adiados para a revisão final.

Abra o arquivo da etapa e copie seu bloco completo para a tarefa deste repositório. Execute uma etapa por vez, confira sua entrega e avance quando os pré-requisitos estiverem atendidos. Cada prompt inclui contexto, escopo, protocolo Git, critérios de aceite e entrega.

A etapa 01 consolida os contratos. A etapa 02 é a primeira implementação: base Next.js com autenticação e listagem. A criação e edição completas com vários equipamentos dependem do backend da etapa 03 e são concluídas na etapa 04. Segurança e testes acompanham cada etapa; 06 e 07 fazem a revisão final, não inauguram esses cuidados.

| Etapa | Prompt | Entrega principal | Dependências |
| --- | --- | --- | --- |
| 01 | [Contratos e regras](01-contratos-e-regras.md) | Contratos de OS, equipamentos, retirada parcial e permissões | Primeiro ciclo existente |
| 02 | [Base Next.js](02-base-nextjs.md) | App Router/TypeScript, sessão, login e listagem integrados ao Express | 01 |
| 03 | [Backend de ordens](03-backend-ordens.md) | Múltiplos equipamentos, número seguro, retiradas individuais, paginação e concorrência | 01; compatibilidade com 02 |
| 04 | [Fluxos e funcionários](04-fluxos-e-funcionarios.md) | Telas completas de OS e gestão de funcionários | 02 e 03 |
| 05 | [Atlas e preservação dos dados](05-atlas-e-dados.md) | Plano e scripts testados para migração, restauração e reversão | Modelo de 03 |
| 06 | [Segurança e operação](06-seguranca-e-operacao.md) | Revisão de autorização, sessões, dependências, erros, logs e falhas | 02–05 |
| 07 | [Testes e homologação](07-testes-e-homologacao.md) | Evidências integradas dos fluxos e roteiro de aceite da empresa | 02–06 |
| 08 | [Publicação e entrada em operação](08-publicacao-e-entrada-em-operacao.md) | Hospedagem avaliada, configuração e plano de publicação para aprovação | 05–07 |

## Regras já respondidas

- Todos os funcionários podem acessar todas as ordens.
- Uma ordem admite vários equipamentos e retirada de um equipamento por vez.
- Nome e telefone do cliente são obrigatórios; e-mail é opcional.
- Cada equipamento precisa de nome/identificação. Marca, modelo e número de série são opcionais.
- Registrar o defeito relatado. Sem relato, usar a indicação **Testar**.
- Registrar data e hora por equipamento retirado. A ordem só fica **Entregue** quando todos forem retirados.
- Guardar ordens de qualquer data, sem expiração automática. Exclusão explícita remove a OS da base ativa; cópias de backup seguem uma política própria, que precisa ser documentada.
- Chamar a tela de gestão de **Funcionários**; não é necessário renomear entidades técnicas.
- Manter, por enquanto, as restrições administrativas existentes para cadastro de funcionários e exclusão de ordens.
- Garantia, envio automático e melhorias opcionais ficam para depois.

## Pendências específicas

Resolver na etapa correspondente, sem reabrir as regras acima:

- Permitir retirada antes de Pronto e corrigir uma retirada registrada por engano.
- Desligamento de funcionários e recuperação de acesso.
- Inventário real de dados, acessos aos ambientes, volume e requisitos operacionais.
- Hospedagem do backend. Vercel é candidata ao frontend; gratuidade, limites e adequação para uso comercial precisam ser conferidos na decisão.
- Política de backup, restauração, responsabilidades e tratamento de exclusões em backups.

## Referência e limites

Base histórica: primeiro ciclo concluído em `1f71959`, com os commits anteriores `379f9fb` e `2e4f9c6`. Essa referência não instrui reset nem descarte do trabalho posterior.

- [Diagnóstico original](../diagnostico/RETOMADA.md)
- [Entrega do primeiro ciclo](../dev-back/CICLO-1.md)
- [Contratos históricos](../dev-back/CONTRATOS-CICLO-1.md)
- [Decisões e continuidade](../dev-front/DECISIONS.md)

As decisões mais recentes prevalecem sobre contratos históricos. Os resultados de testes registrados são evidência da execução anterior, não validação automática de futuras mudanças.

Os prompts exigem branches descritivas, commits Conventional Commits e verificações pertinentes. Não autorizam push, merge, deploy, alteração de bancos reais ou envio de mensagens. A preparação da publicação deve produzir algo concreto para revisão antes de pedir autorização para executá-la.
