# API Eletro Paulínia

Node.js 24, Express e Mongoose. `app.js` compõe as rotas sem conectar ao banco ou abrir portas; `server.js` carrega configuração e inicia o serviço após conexão. Regra atual e respostas: [contratos](../docs/dev-back/CONTRATOS-CICLO-1.md).

## Ambiente

Copie `.env.example` para `.env` dentro de backend. Defina:

| Variável | Finalidade |
|---|---|
| MONGODB_URI | Banco do ambiente escolhido; usar desenvolvimento local/staging nesta fase |
| JWT_SECRET | Segredo aleatório de pelo menos 32 caracteres; nunca expor no frontend |
| JWT_EXPIRE | Duração dos tokens; padrão 1h. Use duração positiva, por exemplo 1h |
| PORT | Porta da API; padrão 5000 |
| NODE_ENV | development ou production |
| ADMIN_USERNAME / ADMIN_NAME / ADMIN_PASSWORD | Somente no provisionamento manual inicial |

Não há credenciais padrão. Gere o segredo por ferramenta segura local e armazene fora do Git. O startup rejeita falta de URI, segredo curto ou porta inválida. Sem conexão ao banco, não abre a porta HTTP.

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

A suíte cobre cadastro negado a visitantes/outros perfis, provisionamento administrativo, tokens inválidos/expirados/usuários removidos, mudança imediata de perfil, persistência de hash, validação de entrada e um ciclo de ordens por perfil. Não valida Atlas, latência de produção ou navegador.

## Limites do primeiro ciclo

JWT Bearer permanece compatível com o frontend atual. Logout no navegador ainda não revoga um token emitido; cookies HttpOnly, revogação e sincronização de sessão serão tratados no ciclo correspondente. CORS aberto, rate limit, validação completa das ordens e atualização de dependências permanecem pendências do diagnóstico. Não expor como sistema pronto para produção.
