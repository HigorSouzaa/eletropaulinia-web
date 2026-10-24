# Prompt 05 — Preparar MongoDB Atlas e preservar os dados

## Objetivo

Preparar a passagem dos dados existentes para MongoDB Atlas com inventário, transformação verificável, backup, restauração ensaiada e reversão. Entregar plano de corte e scripts seguros. Não executar migração, provisionamento ou alteração de banco real nesta tarefa.

## Contexto

Repositório exclusivo: https://github.com/HigorSouzaa/eletropaulinia-web
Cópia local: `C:/Users/higor/Documents/ChatGPT/eletropaulinia-web`

Última entrega local conhecida: branch `feat/fluxos-next-funcionarios`, commit `78087e8`. A etapa 04 concluiu as jornadas normais de OS e Funcionários. Passaram `npm run check` (42 testes HTTP/Mongo, tipagem, lint e build) e `npm run test:e2e` (15 testes Chromium com Mongo descartável). Revalide antes de afirmar que continuam passando. O SHA é histórico, não instrução de reset. Confira branch, status e alterações locais.

Arquitetura: Next.js/TypeScript → API Express separada → MongoDB Atlas como destino. Origem, volume, índices, duplicidades, backups e credenciais reais ainda não foram inventariados. Não presuma que o banco está vazio nem que dados podem ser descartados.

Leia `AGENTS.md`, se existir, `README.md`, `docs/PENDENCIAS.md`, `docs/dev-back/ETAPA-03-ENTREGA.md`, `docs/dev-front/ETAPA-04-ENTREGA.md`, `docs/contratos/API-V2.md` e o código dos modelos, serviços, índices, transformação legada e testes. Decisões recentes do usuário prevalecem sobre documentação histórica.

Use Dev Back Master para persistência, migração, integridade e testes. Use Dev Front Master somente se a compatibilidade Next/API precisar mudar. Leia as skills em `C:/Users/higor/.codex/skills/dev-back-master/SKILL.md` e `C:/Users/higor/.codex/skills/dev-front-master/SKILL.md`; respeite checkpoints aplicáveis e informe se alguma estiver indisponível.

## Decisões confirmadas e limites atuais

- Todos os funcionários acessam todas as OS. Gestão de funcionários e exclusão de OS continuam restritas a administradores.
- Uma OS admite vários equipamentos e retiradas individuais. Nome e telefone do cliente e identificação do equipamento são obrigatórios; e-mail, marca, modelo e série são opcionais. Há relato de defeito ou indicação explícita “Testar”.
- O cliente pode retirar um equipamento antes de Pronto, inclusive antes de aprovação do serviço. Todos os funcionários podem corrigir uma retirada lançada por engano. A composição da OS pode mudar após a primeira retirada, preservando o histórico dos itens já entregues.
- Essas três exceções foram **decididas pelo usuário, mas não implementadas**. A API/UI atual as bloqueia. P01/P02/P11 ficam abertas como trabalho técnico antes do uso real; não simule implementação na migração.
- A OS fica Entregue quando todos os equipamentos são retirados. Ordens não expiram. Exclusão administrativa explícita remove a OS da base ativa; retenção em backups exige política própria.
- Funcionário pode ser desativado sem apagar histórico; sessões são revogadas; admin redefine senha presencialmente, sem envio automático. Garantia, mensagens, WhatsApp, módulo completo de clientes, relatórios avançados e redesign amplo seguem adiados.

Na futura implementação da correção, preservar registro auditável do evento original e da correção. Detalhes de motivo, autorização e impacto na retirada física precisam de contrato técnico revisável; não inventar que já existem. Não apagar equipamento entregue para permitir mudança de composição.

## Escopo e requisitos

### 1. Inventário sem exposição de dados

- Inspecionar schemas, índices declarados, transformação legada e configuração. Separar fatos do código de condições do banco real ainda não verificadas.
- Preparar inventário agregado de OS/usuários, versões de schema, status, campos/datas ausentes, números inválidos ou duplicados, referências, índices efetivos, maior número, contador, documentos legados, entregas sem horário e perfis/atividade. Não imprimir documentos, nomes, telefones, e-mails, senhas, tokens ou URIs.
- Identificar responsável pela origem/destino, consumidores v1 e possibilidade de escritas durante a transição. Sem acesso autorizado, entregar comandos/scripts revisáveis sem executá-los em banco real.

### 2. Configuração Atlas

- Comparar, pela documentação oficial atual, opções de cluster, limites/custo, região, transações, backup e restauração. Backup diário pago em cluster Free existe como prévia privada e pode não estar disponível na conta; não presumir que venha incluído. Se Free for candidato, avaliar `mongodump`/`mongorestore`, consistência, armazenamento seguro e restauração ensaiada. Não contratar ou provisionar.
- Separar desenvolvimento, homologação e produção; documentar TLS, menor privilégio, rede/IP, rotação de credenciais, reutilização de conexão/pool e falhas. Documentar variáveis somente por nome/finalidade.
- Verificar em ambiente compatível que as transações usadas na proteção do último administrador ativo são suportadas; Mongo standalone local não comprova esse fluxo no destino.

### 3. Transformação e reconciliação

- Revisar a transformação legada idempotente e preparar aplicador para **ambiente isolado**, com dry-run, lotes, retomada e relatório agregado de exceções. Falhar fechado para URI de produção. Não incluir modo remoto perigoso sem revisão específica.
- Preservar `_id`, número, autoria, referências, datas e conteúdo conhecido. Não inventar marca, defeito, aprovação ou horário de retirada. Entregue histórico com instante desconhecido difere de item ainda presente. Reter fonte original para reconciliação sem expô-la em API/logs.
- Identificar duplicidades antes do índice único; não renumerar silenciosamente. Preparar índice de número, índice parcial de idempotência e contador acima do máximo reconciliado. Documentar anomalias que bloqueiam escrita v2.
- Confirmar que futuras correções de retirada e mudanças de composição não perderão histórico na transformação. Não reativar escritores v1 nem achatar OS de vários equipamentos.

### 4. Backup, ensaio e reversão

- Definir backup verificável da origem, armazenamento/acesso, consistência, retenção e tratamento de exclusões. Distinguir recurso do plano Atlas de procedimento manual.
- Em Mongo descartável ou destino isolado **explicitamente autorizado**, ensaiar inventário → backup → restauração → transformação → índices/contador → comparação. Sem acesso autorizado, limitar execução a fixtures descartáveis e registrar o bloqueio.
- Comparar IDs, números, vínculos, contagens e campos relevantes; testar repetição, interrupção e retomada. Não registrar dados pessoais no relatório.
- Planejar corte com congelamento de escrita ou captura/reconciliação das escritas, critérios de go/no-go e retorno. Nunca restaurar snapshot antigo sobre ordens criadas depois dele sem reconciliá-las.
- Separar rollback de aplicação e dados. Versão v1 não representa OS com vários equipamentos; retorno exige código compatível ou suspensão da escrita, sem achatamento.

## Cenários de validação

1. Legado íntegro e inconsistente: conversão ou exceção explícita, sem descarte.
2. OS histórica Entregue sem horário: instante permanece desconhecido.
3. Números duplicados/inválidos bloqueiam preparação do índice sem renumeração automática.
4. Duas execuções da transformação mantêm os mesmos IDs/conteúdos.
5. Falha intermediária permite retomada sem duplicatas.
6. Backup restaurado em destino isolado preserva IDs, números e relações.
7. Após ensaio, criação/edição v2 respeitam contador, índices, concorrência e autorização.
8. Reversão simulada após novas escritas não perde nem achata equipamentos.
9. Último admin ativo permanece protegido em replica set descartável.

Usar apenas dados sintéticos ou ambiente isolado autorizado. Identificar claramente simulações e pontos não verificáveis. Não fazer teste de carga em produção.

## Registro de pendências

Atualize `docs/PENDENCIAS.md` sem apagar histórico nem duplicar IDs. Priorize P15, P16, P17 e P24; P18 continua bloqueio da etapa 06. Registre P01/P02/P11 como **decisões recebidas, implementação pendente**. Defina próxima etapa de código e critérios observáveis para retirada antecipada, correção auditável e mudança de composição. Não incorpore essas funcionalidades automaticamente à migração.

Cada pendência exige evidência, impacto/prioridade, dependência, próxima ação e critério de conclusão. Só resolva com implementação e validação adequadas, citando commit e teste. Informe IDs abertos, atualizados e resolvidos.

## Protocolo Git e restrições

- Conferir branch/status/histórico e preservar alterações. Criar branch descritiva da base que contém a etapa 04 antes de salvar documentos/código; não partir automaticamente de main.
- Commits pequenos em Conventional Commits; revisar diff e rodar verificações pertinentes antes de cada commit. Versionar só arquivos da tarefa, sem segredos, dados reais ou artefatos.
- Não fazer push, merge, deploy, contratação, provisionamento, acesso/migração/exclusão de banco real ou envio de mensagens sem autorização específica. Script preparado não autoriza execução remota.
- Não ampliar automaticamente para a etapa 06/07 ou publicação. Concluir trabalho independente se faltar acesso e registrar o bloqueio exato.

## Critérios de aceite

- Plano identifica origem/destino, responsáveis, dados desconhecidos, sequência e condições para interromper o corte.
- Fixtures/scripts preservam IDs, números, equipamentos, datas conhecidas e origem legada; repetição e retomada são seguras.
- Índices, contador e transações são ensaiados no ambiente correspondente, sem presumir validade no banco real.
- Backup/restauração e rollback têm procedimento e evidência proporcionais ao acesso. Sem ensaio real, não declarar prontidão de corte.
- Nenhum segredo ou dado pessoal aparece no Git/relatório; nenhum banco real foi alterado.
- P01/P02/P11 e bloqueios de publicação continuam explícitos.

## Entrega esperada

Entregar scripts seguros/testados, inventário agregado quando autorizado, proposta Atlas, runbook de migração/restauração/reversão, resultados do ensaio e pendências atualizadas. Informar branch, commits, arquivos, comandos/resultados, o que foi validado versus não verificável, IDs alterados e continuidade. Antes de futura execução remota, apresentar destino e operações concretas para autorização específica.

## Referências

- `docs/dev-back/ETAPA-03-ENTREGA.md`, `docs/dev-front/ETAPA-04-ENTREGA.md`, `docs/PENDENCIAS.md`.
- MongoDB Atlas — backup/restauração: https://www.mongodb.com/docs/atlas/backup-restore-cluster/
- MongoDB Atlas — prévia privada de backup Free: https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/
- MongoDB — atomicidade e transações: https://www.mongodb.com/docs/manual/core/write-operations-atomicity/

Consultar documentação oficial atual para o cluster, rede e segurança escolhidos. Separar inspeção, execução, hipótese e ponto não verificável.
