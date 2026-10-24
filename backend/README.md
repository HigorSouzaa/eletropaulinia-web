# API Eletro Paulínia

Node.js 24, Express e Mongoose. `app.js` compõe as rotas sem conectar ao banco ou abrir portas; `server.js` carrega configuração e inicia o serviço após conexão. Contrato atual de ordens: [etapa 03](../docs/dev-back/ETAPA-03-ENTREGA.md); o [ciclo 1](../docs/dev-back/CONTRATOS-CICLO-1.md) é histórico.

## Ambiente

Copie `.env.example` para `.env` dentro de backend. Defina:

| Variável | Finalidade |
|---|---|
| MONGODB_URI | URI do banco do ambiente escolhido. O exemplo fica vazio até você configurar um destino |
| JWT_SECRET | Segredo aleatório de pelo menos 32 caracteres; nunca expor no frontend |
| JWT_EXPIRE | Duração dos tokens; padrão 1h. Use duração positiva, por exemplo 1h |
| PORT | Porta da API; padrão 5000 |
| NODE_ENV | development ou production |
| ADMIN_USERNAME / ADMIN_NAME / ADMIN_PASSWORD | Somente no provisionamento manual inicial |

Não há credenciais padrão. Gere o segredo por ferramenta segura local e armazene fora do Git. O startup rejeita falta de URI, segredo curto ou porta inválida. Sem conexão ao banco, não abre a porta HTTP.

Para iniciar com banco novo e vazio após configurar Atlas, consulte o [roteiro da etapa 05](../docs/dev-back/ETAPA-05-BASE-ZERO.md). O comando `node scripts/prepare-fresh-database.js --database NOME --confirm-empty`, executado nesta pasta, prepara índices e contador apenas quando o banco selecionado está vazio. Ele nunca limpa dados; confira o nome do banco antes de executá-lo. Ainda não foi usado em Atlas.

## Primeiro administrador

O endpoint de cadastro não pode criar o primeiro administrador anonimamente. Um operador com acesso autorizado ao banco deve:

1. Conferir explicitamente o ambiente e a URI antes de executar.
2. Definir ADMIN_USERNAME, ADMIN_NAME e ADMIN_PASSWORD em ambiente local seguro. Senha nova: mínimo 12 caracteres e máximo 72 bytes UTF-8.
3. Executar `npm run create-admin` **na pasta backend**.
4. Remover ADMIN_* do ambiente após o sucesso.

O script recusa provisionamento quando já existe administrador; não altera senhas existentes e não imprime credenciais. Execute uma única instância do script. Usuários adicionais são provisionados pela API com sessão administrativa. Se o administrador existente perdeu acesso, é necessário um procedimento de recuperação separado; não apague usuários para contornar essa proteção.

Arquivos com credenciais padrão foram removidos/substituídos na árvore atual. Valores históricos continuam no Git. Se tiverem sido usados em algum ambiente real, a rotação permanece pendente de ação autorizada.

## Execução e testes

```powershell
npm ci --ignore-scripts
npm run dev
# Em outra execução, para a suíte isolada:
npm test
```

Não execute `create-admin` para rodar testes: a suíte cria fixtures sintéticas em MongoDB descartável, sem usar .env. Usa node:test, fetch HTTP real e MongoDB 8.0.17 via mongodb-memory-server-core. O binário é baixado no primeiro teste e os dados temporários são removidos ao encerrar.

A suíte cobre autenticação/revogação/perfis e OS v2: múltiplos equipamentos, validação, numeração/idempotência, edição concorrente, retirada parcial/completa, exclusão, consultas e legado. Não valida Atlas ou latência de produção. Navegador é validado por `npm run test:e2e` na raiz após build.

## Limites operacionais atuais

Express revalida JWT e revogação; Next mantém credencial em cookie HttpOnly. CORS, rate limit e dependências continuam P18, bloqueando publicação. Escritores v1 foram desativados; use /api/v2/orders. Não há inicialização automática de contador/índices ou migração de dados reais: preparar ambiente com inventário e backup na etapa 05, mediante autorização. Scripts/testes de fixtures não devem ser apontados para a empresa. Na raiz, `node backend/scripts/transform-order-fixtures.js --fixtures-only` demonstra transformação puramente sintética, sem conexão ou escrita.
