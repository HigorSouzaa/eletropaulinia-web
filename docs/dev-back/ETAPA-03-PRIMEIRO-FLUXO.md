# Etapa 03 — primeiro fluxo para revisão

Histórico da primeira fatia. O usuário aprovou o checkpoint C posteriormente (“Pode aprovar então”); limitações de edição/retirada/listagem desta fatia foram tratadas na [entrega da etapa 03](ETAPA-03-ENTREGA.md). Consultar esse relatório para o estado atual; restrições de publicação e dados reais permanecem.

Branch feat/backend-ordens-v2, base 6f949fa. Aprovação explícita “Pode aprovar” para arquitetura/contrato A/B, incluindo agregado proposto. Implementação delimitada ao checkpoint C da Dev Back Master, sem expandir para toda a etapa.

## Implementado

- POST /api/v2/orders e GET /api/v2/orders/:id, com autenticação Express existente, acesso compartilhado, Cache-Control private/no-store, DTO sem metadados de idempotência e ETag.
- Três ou mais equipamentos persistidos na mesma OS (limite 100), IDs individuais, nome/telefone obrigatórios, opcionais normalizados para null, solicitação relato ou Testar explícito. Campos desconhecidos e datas civis inválidas rejeitados.
- Criação inicia andamento Aguardando e nenhuma retirada. Campos derivados, autoria, número e IDs são controlados pelo servidor.
- Contador atômico, índice único de número e índice idempotente por ator/chave. POST não inicializa contador nem instala índices: responde 503 se não preparados. Repetição normalizada retorna 200, primeira criação 201, conteúdo divergente 409. Índices são conferidos antes de alocar número; isso não protege contra um administrador externo removê-los durante a operação.
- Número consumido pode deixar lacuna quando inserção falha; não reduzir contador. Contador ausente e índice ausente falham sem criação. Erro de número duplicado retorna conflito controlado.
- Parser v2 limitado a 512 KiB e erro padronizado com requestId, sem stack/corpo/erro bruto. Não alterar autenticação legada para introduzir segunda autoridade.
- Escritas HTTP v1 bloqueadas explicitamente. Não administrador continua recebendo 403 na exclusão; admin recebe necessidade de atualização para v2. Leituras v1 continuam disponíveis para legado, mas recusam representar documento/conjunto com v2: nenhum achatamento silencioso.

## Demonstração sintética reproduzível

Executar `npm --prefix backend test`: a suíte orders-v2.test.js inicia HTTP Express e MongoDB 8.0.17 descartável em loopback, sem dotenv/URI externa. Prepara contador/índices exclusivamente nesse banco com helper protegido pelo nome de banco de teste. A suíte anterior continua isolada em outro banco.

Payload do primeiro cenário:

```json
{
  "cliente": {"nome": "Cliente sintético", "telefone": "(00) 0000-0000"},
  "dataEntrada": "2026-10-23",
  "equipamentos": [
    {"nome": "Ventilador", "marca": "Marca sintética", "modelo": "Modelo A", "numeroSerie": "SERIE-TESTE", "solicitacao": {"tipo": "relato", "descricao": "Não liga"}},
    {"nome": "Rádio", "solicitacao": {"tipo": "testar"}},
    {"nome": "Ferro", "solicitacao": {"tipo": "relato", "descricao": "Não aquece"}}
  ]
}
```

Header Idempotency-Key aleatório obrigatório (16–128 caracteres ASCII alfanuméricos, hífen ou underscore). Sem imprimir credencial. Resposta 201 `{data: OS}` com Location, ETag e três IDs diferentes; GET por outra conta devolve exatamente os mesmos dados persistidos. Cliente sem e-mail e equipamento sem marca retornam null. Entrega `{total:3, retirados:0, situacao:"nenhuma"}`.

Concorrência limitada local: 16 criações distintas e oito envios da mesma tentativa. Não é teste de carga nem benchmark. Verifica número/documento real no MongoDB, não mock. Testes também cobrem entrada inválida sem consumo do contador, IDs, 401, legado reconhecido sem transformação, inventário inválido, contadores ausentes, colisão e bloqueio do escritor v1.

## Limites deliberados do checkpoint

Ainda não implementados: edição/If-Match, retiradas, exclusão v2, paginação/summary, projeção completa do legado, transformação e compatibilidade da listagem Next com v2. ETag retornado agora não comprova controle de atualização: não há rota v2 de update nesta fatia.

O Next continua usando listagem v1. Sua jornada com dados legados deve permanecer validada; quando houver OS v2, a API v1 recusa o conjunto e a tela atual mostra erro. Esse bloqueio é explícito e temporário até a adaptação da próxima fatia; **não liberar esta versão para operação da empresa**. Nenhum formulário novo foi exposto. Não afirmar integração Next/v2 concluída.

Helper numbering-fixture.js só instala índices/reconcilia máximo em banco de teste; não é aplicador de produção. Não há comando remoto de migração. Dados antigos inconsistentes não são corrigidos nem excluídos. GET v2 de OS legada retorna LEGACY_MIGRATION_REQUIRED sem modificar documento. Rollback operacional exige preservar dados v2 e impedir escritores antigos; não reverter a aplicação em produção como se essa representação fosse compatível.

Agregado misto aprovado para implementação posterior. Retirada antecipada, correção e composição após primeira retirada continuam sem definição operacional e indisponíveis. Nenhum histórico real, Atlas, deploy, push, merge ou envio externo. P18 permanece bloqueio de publicação.

## Validação e Git

Implementação: `df1e852`. Sem alterações de dependências. `npm run check` exit 0: tipagem, lint, 27 testes e build aprovados. Depois foi acrescentada a proteção de índice obrigatório e seu teste; `npm run lint` passou e `npm --prefix backend test` exit 0 com **28 testes** aprovados (21,20 s). `npm run test:e2e` exit 0, **seis testes** Chromium aprovados (26,5 s), usando dados legados. Nada disso comprova a listagem Next/v2 ainda pendente. Não repetida instalação limpa. `git diff --check` passou; avisos de conversão LF/CRLF no Windows e NO_COLOR/FORCE_COLOR do runner não impediram execução.

Alterações: modelos Counter/OrderV2; serviços de validação/criação/consulta; router v2 e montagem em app; bloqueio v1 e teste legado adaptado à mudança intencional; helper e testes de integração v2. Documentos API-V2, plano, entrega parcial, README e PENDENCIAS atualizados. Nenhum ID encerrado: P06/P08/P09/P24 em andamento, P07/P10 abertos, P11 parcialmente decidido; P01/P02 mantidos abertos.

Checkpoint C: apresentar estes resultados e limitações antes de ampliar. Próxima fatia após revisão: edição versionada, retiradas, exclusão, consultas/Next e transformação de fixtures dentro do Prompt 03; nenhuma tela completa da etapa 04.
