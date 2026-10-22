# Primeiro ciclo — entrega e validação

22/10/2026. Branch `fix/primeiro-ciclo-api`, criada a partir de `b53b52c` (diagnóstico). Escopo: preparar baseline executável e fechar os bloqueios de cadastro/sessão, mantendo Express e o frontend Vite atual. Next.js/Atlas não foram implementados ou publicados.

## Alterações

- Cadastro exige administrador; visitantes recebem 401, demais perfis 403. Resposta 201 não inclui senha nem token do usuário provisionado. Entrada validada e duplicidade retorna 409.
- Middleware aceita Bearer JWT HS256, valida identificador e exige usuário existente; mudança de perfil vale na próxima requisição. Erros de banco são diferenciados de sessão inválida e não expõem detalhes.
- Hook de senha não recalcula hash ao alterar somente nome. Testado com persistência real.
- App separado do startup para testes. Startup aguarda banco e valida configuração básica antes de abrir a porta; shutdown fecha servidor/conexão.
- Removida declaração duplicada de índice de numero; índice unique permanece. A primeira execução em banco novo reproduziu `IndexKeySpecsConflict`; após correção, a suíte inicializa normalmente. Geração concorrente de número continua pendente.
- Removidas credenciais padrão da árvore corrente e substituído bootstrap por execução manual com variáveis temporárias; não sobrescreve administrador existente. Histórico Git não foi reescrito; rotação em ambientes reais continua pendente se esses valores tiverem sido usados.
- Correções do frontend: imports/variáveis sem uso, captura de erro tipada; edição usa `_id`, aguarda resposta e exibe falha sem navegar antecipadamente. Não resolve ainda carregamento de deep link ou sincronização de sessão/lista.
- Scripts setup/check, runtime Node 24, lockfiles, exemplos de ambiente, README atualizado, lint do backend e configuração de CI.

## Contratos e limites

[CONTRATOS-CICLO-1.md](CONTRATOS-CICLO-1.md) registra entradas, respostas, erros e matriz. Regra provisória compatível: equipe interna acessa todas as ordens; só admin cadastra usuários/exclui ordens. A pergunta sobre restrição por técnico foi enviada e não foi respondida durante a implementação; não foi registrada como decisão aprovada da empresa. Nenhum isolamento por tenant/técnico foi inventado.

Senhas novas no provisionamento: mínimo 12 caracteres e máximo 72 bytes UTF-8; login mantém compatibilidade com contas existentes. JWT Bearer e armazenamento atual do frontend permanecem. Cookies, revogação de logout e política final de sessão são trabalho posterior.

## Evidências executadas

Windows, Node 24.21.0, npm 11.19.0, MongoDB 8.0.17 temporário em loopback. Nenhum mock de HTTP, modelo ou banco na suíte final. Nenhuma URI de produção/Atlas usada; fixtures são sintéticas. Binário obtido pelo mongodb-memory-server-core 11.3.0, dependência exclusiva de desenvolvimento.

| Comando | Resultado |
|---|---|
| `npm run setup` | Exit 0: instalação limpa por npm ci na raiz e backend, sem scripts de dependências |
| `npm run check` | Exit 0 após instalação limpa; encadeia tipos, lint, testes e build |
| Typecheck | Sem erros; anteriormente havia três |
| Lint | Zero erros, dois avisos preexistentes de react-refresh nos contextos |
| Testes HTTP/MongoDB | 13 passaram, zero falhas; aproximadamente 10,9 s na execução final |
| Build | Vite 5.4.21; 1543 módulos; 8,12 s; JS 250,05 kB (gzip 79,80 kB) |
| Revisão Git | diff --check sem erros; manifests e versões dos lockfiles conferidos |

Warnings adicionais de build: bases Browserslist e baseline-browser-mapping antigas. Não foram ocultados nem atualizados automaticamente. Medições locais não são benchmark de produção.

Regressão demonstrada: restaurando temporariamente apenas routes/auth.js e middleware/auth.js da base b53b52c, os testes de cadastro anônimo e usuário removido falharam (`201 != 401` e `200 != 401`). Os arquivos corrigidos foram restaurados e a suíte completa passou novamente. Isso confirma que os testes detectam os defeitos corrigidos.

### Cobertura dos 13 cenários

1. Visitante não cria usuário nem admin e não altera a coleção.
2. Token de usuário removido recebe 401 na leitura de ordens.
3. Login/perfil funcionam e hash persiste sem expor senha.
4. Token ausente, adulterado e expirado são negados.
5. Técnico/atendente não provisionam; admin provisiona os três perfis sem receber token da nova conta.
6. Cadastro inválido/campos desconhecidos são rejeitados; duplicidade retorna 409.
7. Tipos inesperados e credenciais incorretas não autenticam.
8. Alterar nome mantém hash e login válidos.
9. Cada perfil cria/lê/edita/altera status com persistência; só admin exclui.
10. JSON malformado não revela stack.
11. Rebaixar perfil bloqueia cadastro com token já emitido.
12. Bootstrap cria primeiro admin e recusa segunda execução, sem sobrescrever conta ou imprimir senha.
13. Configuração incompleta falha antes de conectar ao banco.

## Pendências e próximo ciclo

Nenhuma validação de navegador, Linux CI remoto, Atlas, backup/restauração ou desempenho com carga foi realizada. CI foi preparado localmente e não publicado. Alertas de dependências do diagnóstico não foram integralmente tratados; não há afirmação de segurança ou prontidão de produção.

Antes de uso real continuam necessários: regra de acesso por ordem, cardinalidade dos equipamentos/e-mail, numeração atômica, sessão/lista no cliente, validação completa das ordens, paginação, rate limit/CORS, triagem de dependências e plano de dados/Atlas. A fatia seguinte proposta é Next.js login→lista→criação após contratos de produto necessários; WhatsApp continua fora do escopo.

Não houve push, merge, deploy, rotação de credenciais reais ou execução do bootstrap contra banco da empresa.
