# Etapa 07 — validação local e roteiro de homologação

24/10/2026. Base: `9f64527`, branch de trabalho `test/homologacao-etapa-07`. Esta evidência usa Next.js 16.4.2, Express separado e MongoDB 8.0.17 descartável em loopback. Dados, usuários e senhas dos testes são sintéticos. Nenhum Atlas, staging ou produção foi acessado.

## Resultado executado

| Camada | Comando | Resultado |
| --- | --- | --- |
| Tipagem, lint, API/Mongo, build | `npm run check` | Passou: 57 testes HTTP/Mongo, tipagem, lint e build Next |
| Navegador integrado | `npm run test:e2e` | Passou: 18 cenários Chromium, incluindo jornada entre dois funcionários |
| Banco e API | Runner dos testes | Express real e MongoDB descartável; nenhuma URI do ambiente local é usada |
| CI remoto, Atlas e aceite da empresa | Não executados | Sem push, cluster, hospedagem e sessão de homologação com funcionários |

O teste novo em `tests/workflows.spec.ts` faz o funcionário A retirar um de três equipamentos, abre a mesma OS com o funcionário B, retira os outros dois, recarrega ambas as sessões e confirma que o estado final persiste. Os cenários de erro/vazio/503/401 por `page.route` são **interceptações simuladas**; os cenários normais usam a API Express e o MongoDB descartável reais. O teste de indisponibilidade da API interrompe o servidor de teste, sem atingir outro ambiente.

As capturas locais de login, lista, detalhe, edição e Funcionários são geradas em `test-results/` (ignorado pelo Git) pelos testes de navegador. Elas ajudam na inspeção visual, mas não substituem os asserts funcionais nem uma revisão humana em dispositivo real.

## Matriz requisito → evidência → resultado

Os IDs seguem `docs/contratos/VALIDACAO.md`; aquele documento é histórico e seus estados antigos não substituem esta execução.

| IDs | Evidência executada | Resultado e limite |
| --- | --- | --- |
| T01–T03, T16 | `backend/tests/auth.test.js`, `tests/session.spec.ts`, `tests/workflows.spec.ts` | Login, expiração/revogação, troca de conta, permissões administrativas e acesso compartilhado passaram localmente |
| T04–T07, T14 | `backend/tests/orders-v2.test.js`, `tests/create-order.spec.ts`, `tests/workflows.spec.ts` | Três equipamentos, e-mail/marca ausentes, indicação Testar, validação e limpeza de opcionais passaram |
| T08–T11 | Testes de API de retirada e duas jornadas de `tests/workflows.spec.ts` | Retirada parcial/final, repetição, retirada antecipada, correção auditada e composição posterior passaram |
| T12–T13 | Testes de conflitos, contador e idempotência; E2E de rascunho | Versão obsoleta, numeração concorrente e repetição de criação passaram no banco descartável |
| T15, T17 | Testes de consulta API e `tests/session.spec.ts` | Paginação, filtros, contagens, deep links, recarga e falhas distintas de vazio passaram |
| T18–T19 | Testes HTTP de Funcionários e `tests/workflows.spec.ts` | Admin gerencia contas; não admin recebe 403; desativação revoga sessão; último admin protegido em replica set descartável |
| T20–T21 | Testes de transformação/legado e exclusão API/E2E | Fixtures preservam dados conhecidos; legado só leitura; exclusão afeta a OS alvo. Banco histórico real não foi inspecionado e seu transporte foi dispensado pelo usuário para a nova operação |
| T22 | Testes HTTP de validação/limite e `tests/session.spec.ts` | Respostas 400/413/429 e ausência de detalhes internos passaram localmente |
| T23 | `backend/tests/stage05-fixture.test.js` e roteiro de banco novo | Apenas ensaio sintético e guarda de banco vazio; backup/restauração Atlas e reversão operacional ainda não verificados |
| T24 | `tests/create-order.spec.ts`, `tests/session.spec.ts`, `tests/workflows.spec.ts` | Sem overflow a 360/768/1280 px nas telas exercitadas; labels, foco e Escape em diálogos selecionados passaram. Auditoria completa de acessibilidade, teclado e dispositivos reais permanece aberta |

## Medição local e capacidade

`backend/tests/orders-v2.test.js` cria 50 OS sintéticas e consulta a primeira página de 25 itens dez vezes em sequência no mesmo processo. O teste mede latência observada por `performance.now()`, tamanho do JSON serializado da resposta e `explain('executionStats')` para a ordenação. São números de loopback e banco descartável, não latência de internet, capacidade simultânea nem desempenho de produção. O volume esperado e o perfil de consultas da empresa ainda não foram informados; portanto os dados não são representativos da operação. Não há SLO aprovado.

Na repetição após ampliar a medição: mediana **19,37 ms**, p95 amostral **23,91 ms** (10 chamadas), maior valor **23,91 ms**; JSON serializado **28.568 bytes** por resposta de 25 itens. O plano retornou 25 documentos, examinou 25 e usou o índice de data registrado pelo teste. Com apenas dez chamadas sequenciais, esse p95 serve como registro da execução, não como estimativa confiável de cauda sob carga.

Antes de qualquer teste de carga: definir alvo isolado, volume de OS/equipamentos, mistura de GET/escritas, usuários sintéticos, taxa inicial e teto de RPS/VUs, duração, limite de erro/latência para parar, coleta de CPU/memória/pool/query e limpeza das fixtures. Rodar primeiro smoke funcional; medir p95, erros e vazão oferecida/realizada. Não executar carga contra produção por inferência.

## Roteiro para a empresa e critérios de liberação

1. Configurar cluster Atlas novo e confirmar que está vazio; preparar índices/contador e credenciais sem registrar segredos. Ensaiar backup e restauração em ambiente separado, com responsável e política de retenção.
2. Em homologação isolada, um funcionário cria OS com três equipamentos; outro consulta e edita; cliente retira um equipamento antes de Pronto; após recarga, dois continuam na empresa. Corrigir uma retirada por engano com motivo, adicionar equipamento depois da primeira retirada e concluir todos. Conferir datas, autoria, histórico e status agregado.
3. Admin cadastra, desativa e redefine presencialmente a senha de funcionário. Não admin tenta gerir Funcionários e excluir OS: operação deve ser negada. Admin exclui uma OS de teste e confirma que outra permanece.
4. Simular API fora do ar, versão obsoleta e sessão expirada. Confirmar que rascunhos não se perdem e erros são compreensíveis. Revisar teclado, leitores de tela e larguras de dispositivos usados pela equipe.
5. Registrar data, ambiente, responsável, resultados e defeitos reais; obter aceite explícito da empresa. Repetir verificações de segurança e saúde na hospedagem escolhida antes de publicar.

**Prontidão atual:** os fluxos locais críticos passaram, mas não há evidência de Atlas, backup/restauração, CI remoto, segurança no destino, carga representativa ou aceite humano. Esta etapa não autoriza corte nem publicação.

As dependências já estavam instaladas nesta execução; a instalação limpa havia passado na etapa 06, mas não foi repetida aqui. A avaliação atual não cobre navegadores além do Chromium.
