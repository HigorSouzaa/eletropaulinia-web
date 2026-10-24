# Etapa 04 — primeira fatia funcional para revisão

24/10/2026. Branch `feat/fluxos-next-funcionarios`, implementação `cba10f7`. Arquitetura e contrato foram aprovados pelo usuário antes desta fatia. **A revisão de design e funcionalidade desta fatia ainda aguarda resposta; nenhuma expansão foi presumida.**

## Comportamento implementado

- `/nova-ordem` usa a aparência laranja/cinza existente. O formulário permite cliente com nome/telefone obrigatórios e e-mail opcional, data de entrada e múltiplos equipamentos com identificação, opcionais e relato ou Testar. Remover item não remove o último. A primeira tela é real, não mock.
- O transporte Next permite somente POST fixo `/api/orders`, exige origem válida, corpo JSON limitado, sessão HttpOnly e `Idempotency-Key`; a chave é preservada para repetir a mesma tentativa após falha de rede. Express valida e grava; o navegador não recebe o token.
- Após resposta de sucesso, abre `/ordens/[id]`. O detalhe consulta a API pelo ID em cada abertura/recarga, inclusive por URL direta, apresenta todos os equipamentos e sinaliza legado como somente leitura. A listagem agora oferece link para criar e para abrir cada OS.
- Edição, andamento, retirada, exclusão e Funcionários ainda **não** estão implementados no Next nesta fatia. A API Express v2 anterior continua disponível. Não há acesso ao Atlas real.

## Evidência e limites

`npm run check` passou: tipagem, lint, 36 testes HTTP/Mongo descartável e build. `npm run test:e2e` passou oito testes, incluindo o novo fluxo real: atendente cria três equipamentos, um sem marca e marcado Testar, cliente sem e-mail, recarrega detalhe e encontra os três itens; regressões de login/lista continuam. Após adicionar verificações de 360/768/1280 px e negativas de sessão/origem ao teste da fatia, `npm run test:e2e -- tests/create-order.spec.ts` passou dois testes. O teste remove a OS sintética pela API administrativa somente no banco descartável. Avisos remanescentes de cor no runner; Browserslist antigo visto no build anterior permanece P20. Nenhum teste de carga, Atlas, backup/restore ou CI remoto foi executado.

O design ainda precisa de revisão humana e auditoria completa de acessibilidade. Erros de campos da API aparecem como caminhos técnicos provisórios; antes de concluir o formulário, ligá-los a mensagens legíveis e focar o primeiro campo inválido. Falha 503 mantém o rascunho, mas sua simulação específica na nova tela ainda precisa ser testada. A idempotência da API tem testes HTTP; o comportamento de repetição após interrupção no navegador precisa de cenário dedicado antes do aceite completo.

## Próxima fatia após aprovação

Edição com ETag/If-Match e preservação do rascunho em 412; depois andamento e retirada parcial, exclusão administrativa e Funcionários com desativação/redefinição presencial já decididas. Exceções P01/P02/P11 continuam fechadas até decisão. P15/P16/P18 bloqueiam publicação, independentemente da revisão desta fatia.
