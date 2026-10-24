# Exceções operacionais de ordens — entrega local

24/10/2026. Branch `feat/excecoes-retirada-os`, baseada na preparação do banco novo. Decisões do usuário: retirada antes de Pronto, correção por qualquer funcionário e mudança da composição após uma retirada. Nenhum banco real/Atlas foi acessado, e não houve push ou deploy.

## Comportamento

- Funcionário autenticado pode retirar item em qualquer andamento. O servidor registra UTC e autor sem mudar falsamente o andamento para Pronto. A tela avisa quando o item ainda não está Pronto. A OS fica Entregue somente quando todos os itens atuais estão retirados.
- Qualquer funcionário autenticado pode corrigir uma retirada operacional por `POST /api/v2/orders/:id/equipamentos/:eid/correcoes-retirada`, com `If-Match` e motivo de 1 a 500 caracteres. A retirada atual volta a `null`, mas `historicoRetiradas` conserva evento original, autor/horário da correção e motivo. A primeira correção de OS v2 anterior a este campo copia a retirada conhecida para o histórico. Não inventa horário de legado histórico.
- Após retirada, é possível incluir equipamento e remover um item ainda presente sem histórico. Item retirado ou previamente retirado e corrigido não pode ser removido (`EQUIPMENT_HISTORY_LOCKED`). Inclusão após OS Entregue reabre o agregado. Edição geral não aceita o histórico como entrada.
- Express revalida autenticação e versão; Next só transporta a nova rota e exibe ações. Não há autorização especial por perfil para correção. Exclusão da OS inteira continua somente admin.

## Validações

`node --test backend/tests/orders-v2.test.js`: 22 testes passaram, incluindo retirada antecipada, correção por outra conta, ausência de sessão, motivo inválido, repetição, versão antiga e composição após retirada. `npm run check`: tipagem, lint, 53 testes HTTP/Mongo descartável e build passaram. `npm run test:e2e`: 16 cenários Chromium, incluindo jornada nova e regressões das telas existentes, passaram. MongoDB descartável com fixtures sintéticas; não é homologação da empresa nem medição de produção. Aviso Browserslist antigo permanece P20.

## Limites

O histórico está embutido no documento da OS e é preservado enquanto a OS existir. A exclusão definitiva por administrador remove a OS da base ativa conforme regra anterior; backups seguem política ainda pendente. Não há integração de aprovação do serviço no modelo atual: a retirada antecipada é permitida em Aguardando/Em andamento e no estado Pronto, sem criar um novo estado comercial. Retirada legada histórica sem horário não é corrigida por este endpoint. A operação real ainda depende de Atlas configurado, backup/restauração, segurança P18, validação/CI P21 e aceite humano P23.
