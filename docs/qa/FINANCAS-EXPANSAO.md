# Finanças — expansão local

Data: 28/10/2026. Branch: `feat/financas-operacionais`. O usuário aprovou os checkpoints A, B e C e as quatro regras: um recebimento por equipamento, forma opcional, estorno integral auditado e bloqueio da exclusão de OS com histórico financeiro. Nenhuma operação foi executada no Atlas, Render ou Netlify nesta expansão.

## Entrega

- Express mantém pagamentos explícitos, estornos com motivo e versão, despesas pagas/previstas/canceladas e custos de peças ligados à OS/equipamento. Somente admin faz mutações; demais funcionários autenticados consultam.
- Recorrências mensais materializam competências previstas uma vez por regra/mês; a leitura de despesas gera as competências vencidas até o mês atual, sem marcá-las pagas. Ajustes de um mês não reescrevem a regra nem os meses anteriores.
- Resumo usa data do recebimento, estorno e pagamento da despesa no fuso `America/Sao_Paulo`. O resultado operacional subtrai despesas pagas da receita líquida; não é lucro contábil. Previsão separa orçamento em aberto, pronto aguardando retirada e retirado sem pagamento, sem somar à receita.
- Next oferece filtros, gráfico com tabela acessível, listas paginadas, formulários e correções administrativas. Valores ficam em centavos inteiros no banco. A OS mostra resultado parcial do equipamento somente quando há recebimento e custo de peça registrado; demais custos não são presumidos.
- A exclusão da OS é negada se houver qualquer histórico de recebimento ou custo de peça vinculado, inclusive estornado/cancelado.

## Validação local

`npm run check`: tipagem, lint, 84 testes HTTP/MongoDB descartável e build de produção aprovados. `npm run test:e2e`: 30 testes Chromium aprovados, incluindo confirmação de pagamento sem presumir receita na retirada e cadastro de despesa paga/competência mensal prevista. Testes financeiros incluem idempotência, corrida entre administradores, permissão, estorno, correção mensal, virada do dia e não duplicação do custo de peça. Os dados são sintéticos; não houve ensaio de carga ou teste em dispositivo físico.

## Preparação para publicação futura

Antes de ativar a nova versão, inventariar coleções e índices do banco de destino sem expor documentos, obter backup e ensaiar restauração isolada. Criar de forma **aditiva** as coleções e índices declarados em `FinanceReceipt`, `FinanceExpense` e `FinanceRecurrence`, conferindo especialmente os índices únicos parciais de recebimento ativo, chave de idempotência e competência da recorrência. Não usar `syncIndexes`, não remover índices existentes e não inferir pagamentos de OS antigas. A API responde 503 quando índices financeiros essenciais faltam. Validar API nova e índices antes de disponibilizar a tela nova. A execução remota exige revisão do destino e autorização específica.

## Limitações e pendências

- Previsão examina no máximo 2.000 OS no período e responde 503 acima disso, para evitar um total truncado. Medir volume real e implementar agregação/paginação escalável antes de uso maior.
- Não há dados de impostos, folha, outros custos e conciliação bancária; o painel não calcula lucro fiscal. Um equipamento tem um único recebimento ativo nesta versão; parcelas e devolução parcial exigem novo contrato.
- A recorrência não declara gasto pago automaticamente. Sua geração depende de uma consulta ao módulo ou da ação administrativa de materialização; a interface mostra a competência e permite marcar o pagamento.
- Não foi executado preparo de índices, migração, restauração, validação de performance ou publicação no Atlas/Render/Netlify. P31, P24 e P22 permanecem abertos para a etapa remota autorizada.
