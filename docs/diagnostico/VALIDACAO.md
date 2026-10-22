# Verificações — 22/10/2026

Base inspecionada: `959d360156ea0a426e81a7548071b22b60f89d55`. Windows, Node v24.21.0, npm 11.19.0. Somente documentação foi alterada. Dependências e dist são artefatos locais ignorados pelo Git.

## Comandos e resultados

| Verificação | Resultado observado |
|---|---|
| Git inicial | main limpa, sincronizada com origin/main; outra branch remota feat-wp-chat |
| `npm ci --ignore-scripts --no-audit --no-fund` em raiz/backend | Instalações iniciadas; sessões perderam identificação antes de recuperar seus códigos de saída. Depois, ferramentas e dependências estavam disponíveis. Não se afirma conclusão íntegra apenas pela existência de node_modules |
| Primeira tentativa de typecheck durante instalação | tsc não encontrado; falha de preparação, substituída pela execução posterior abaixo |
| `npm run typecheck` após disponibilização das ferramentas | Reprovado: TS6133 Bell em Layout.tsx:3; TS6133 logout em Sidebar.tsx:7; TS2339 order.id em EditarOrdem.tsx:60 |
| `npm run lint` | Reprovado: quatro erros (Bell, logout, any em OrderContext:50 e err em Login:41); dois avisos react-refresh nos contextos |
| `npm run build` | Aprovado, código de saída 0 ao final da sequência. Vite 5.4.21, 1543 módulos; tempo interno do Vite 31,36 s nesta execução |
| `node --check` nos arquivos JS de backend fora de node_modules | Nenhum diagnóstico de sintaxe emitido; não verifica regra de negócio, segurança ou conexão |
| Testes automatizados existentes | Não há scripts/suíte de testes identificados |
| Banco, persistência, navegador e API real | Não executados; ausência de configuração local de banco e dados de teste. Nenhum serviço de produção acessado |

Build não executa typecheck: por isso build aprovado e tipagem reprovada são resultados compatíveis. Não corrigimos o código para tornar a análise verde.

Bundle informado pelo Vite: HTML 0,62 kB (gzip 0,40); CSS 17,76 kB (gzip 3,83); JavaScript 249,80 kB (gzip 79,72). Houve avisos de dados Browserslist/baseline-browser-mapping desatualizados. Nenhum pacote foi atualizado. O tempo de build depende da máquina/carga e não mede latência de navegação; não há Lighthouse/Core Web Vitals ou p95 da API.

## Auditoria de dependências

`npm audit --json --ignore-scripts` consultou o registro com os lockfiles existentes; nenhum `audit fix` foi aplicado. Os totais incluem desenvolvimento e dependências transitivas, e contam pacotes classificados, não falhas exploráveis distintas do produto. O comando foi processado por PowerShell para resumir JSON; o exit code do wrapper não deve ser interpretado como ausência de alertas.

| Árvore | Baixa | Moderada | Alta | Crítica | Total |
|---|---:|---:|---:|---:|---:|
| Raiz/frontend e ferramentas | 1 | 6 | 27 | 2 | 36 |
| Backend e ferramentas | 0 | 2 | 11 | 1 | 14 |

Versões resolvidas lidas dos lockfiles: React 18.3.1, React Router DOM 7.9.5, Axios 1.13.2, Vite 5.4.21, TypeScript 5.9.3; Express 4.21.2, Mongoose 8.19.3, jsonwebtoken 9.0.2 e proxy-addr 2.0.7.

Exemplos para triagem:

- Backend: proxy-addr com alerta crítico [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h). O código não configura trust proxy; validar precondições de uso antes de declarar exploração por IP spoofing.
- Backend: jws com alerta de verificação HMAC [GHSA-869p-cjfg-cm3x](https://github.com/advisories/GHSA-869p-cjfg-cm3x); revisar a cadeia usada pelo JWT e atualizar com testes, sem presumir bypass confirmado.
- Backend: Mongoose com alertas de sanitização/casting; testar tipos de entrada e caminhos usados. Rotas não recebem objetos arbitrários de update integral, mas login precisa de validação explícita.
- Frontend: alertas de Axios e React Router incluem funcionalidades Node/SSR/RSC que não são necessariamente usadas por esta SPA. Não converter o total em alegação de RCE ou SSRF comprovada.
- Ferramentas: Vite, Rollup, parsers e nodemon entram nos totais. Algumas sugestões automáticas envolvem major ou até downgrade; precisam de triagem, não execução cega.

Pendência B15/P1: revisar cada alerta por versão resolvida, dependência de produção/desenvolvimento, caminho alcançável e correção compatível. Aceite: lockfiles revisados, regressões testadas e alertas remanescentes documentados com justificativa; qualquer risco crítico alcançável deve ser tratado como bloqueio P0 antes da exposição.

## Pontos reproduzíveis sem sistema real

Referências fixadas na base analisada:

- B01: [rota pública, linha 7](https://github.com/HigorSouzaa/eletropaulinia-web/blob/959d360156ea0a426e81a7548071b22b60f89d55/backend/routes/auth.js#L7) e [role do corpo, linha 30](https://github.com/HigorSouzaa/eletropaulinia-web/blob/959d360156ea0a426e81a7548071b22b60f89d55/backend/controllers/authController.js#L30). Pré-condição: API acessível e banco operacional. Impacto alto: criação de administrador por não autenticado. Mitigação temporária: não expor a rota; correção: provisionamento autorizado e allowlist de campos/perfis. Não foi criado usuário real.
- B03: [protect, linhas 16 e 18](https://github.com/HigorSouzaa/eletropaulinia-web/blob/959d360156ea0a426e81a7548071b22b60f89d55/backend/middleware/auth.js#L16) e [consulta sem principal, linha 8](https://github.com/HigorSouzaa/eletropaulinia-web/blob/959d360156ea0a426e81a7548071b22b60f89d55/backend/controllers/orderController.js#L8). Pré-condição: token ainda válido de usuário removido. Impacto alto: middleware não interrompe acesso. Correção: negar usuário ausente antes de next e testar leitura protegida.
- B05: [somente primeiro equipamento, linha 79](https://github.com/HigorSouzaa/eletropaulinia-web/blob/959d360156ea0a426e81a7548071b22b60f89d55/src/pages/NovaOrdem.tsx#L79).
- B06: [leitura do último número, linha 87](https://github.com/HigorSouzaa/eletropaulinia-web/blob/959d360156ea0a426e81a7548071b22b60f89d55/backend/models/Order.js#L87). Corrida inferida da implementação; não houve teste concorrente com banco.
- B08: [identificador da edição, linha 60](https://github.com/HigorSouzaa/eletropaulinia-web/blob/959d360156ea0a426e81a7548071b22b60f89d55/src/pages/EditarOrdem.tsx#L60), confirmado pelo compilador.

Reprodução local adicional: importação direta de middleware/controller/modelo, chave efêmera sintética, substituição em memória de User.findById/findOne/create e validação Mongoose sem conexão. Não sobe servidor, não usa .env e não persiste dados. Comando `node --input-type=module`, código de saída 0, com assertions de Node:

1. **Reproduzido:** protect chama next com req.user null quando o lookup simulado não encontra usuário.
2. **Reproduzido:** register retorna 201/role admin para corpo que solicita admin, com criação de usuário simulada.
3. **Validado:** validateSync do schema Order rejeita status fora do enum.
4. **Observado:** Mongoose emite aviso de declaração duplicada do índice numero. Não prova duplicidade física de índices no banco.

Esses resultados elevam B01/B03 a reprodução isolada em execução, mantendo as condições e limitações: não validam autorização HTTP ponta a ponta, disponibilidade em produção ou persistência MongoDB.
