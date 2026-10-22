# Contratos do primeiro ciclo

Data: 22/10/2026. Escopo autorizado: baseline, contratos/permissões e bloqueios da API. A autorização para executar o primeiro ciclo veio após apresentação do diagnóstico. Nenhuma migração Next/Atlas ou publicação é incluída.

A matriz abaixo é a proposta conservadora implementada: preserva o acesso compartilhado às ordens e fecha o cadastro público. A pergunta sobre atribuição exclusiva de ordens foi enviada; ausência de resposta não foi registrada como aprovação de uma regra de negócio. Se houver isolamento por técnico, isso requer especificação e implementação próprias.

## Permissões

| Operação | Visitante/token inválido/usuário removido | Atendente | Técnico | Admin |
|---|---|---|---|---|
| Login | Permitido com credenciais válidas | Permitido | Permitido | Permitido |
| Consultar perfil | 401 | Próprio | Próprio | Próprio |
| Cadastrar usuário | 401 | 403 | 403 | Permitido |
| Ler/criar/editar/status de ordens | 401 | Permitido | Permitido | Permitido |
| Excluir ordem | 401 | 403 | 403 | Permitido |

Permissões são verificadas no servidor. O perfil é lido do banco em cada requisição; rebaixamento de admin tem efeito mesmo com token já emitido. Não há conceito de tenant; createdBy não restringe visibilidade nesta versão.

## Sessão

Authorization: Bearer com JWT HS256 e id de usuário. Token ausente, malformado, adulterado, expirado ou de usuário inexistente recebe 401. Erro ao consultar o usuário no banco recebe 503 genérico. Senha/role não são confiados ao conteúdo enviado pelo cliente durante autorização. JWT_SECRET fica no servidor.

JWT_EXPIRE é configurável, padrão 1h; política final de duração/revogação é pendência operacional. O JWT não é revogado por logout local. Não foi feita migração para cookies neste ciclo.

## Auth

| Endpoint | Entrada | Sucesso | Falhas esperadas |
|---|---|---|---|
| POST /api/auth/login | username string não vazia, até 100 caracteres; password string não vazia, até 72 bytes | 200: _id, username, name, role, token | 400 tipos inválidos; 401 credenciais inválidas; 500 genérico |
| POST /api/auth/register | username 3–100 caracteres após trim; name 1–120 após trim; password mínimo 12 caracteres/máximo 72 bytes; role opcional admin/tecnico/atendente (default atendente) | 201: _id, username, name, role; **sem token** | 401 sem sessão; 403 sem admin; 400 inválido/campo desconhecido; 409 duplicado; 500 genérico |
| GET /api/auth/me | Sessão | 200: _id, username, name, role | 401 ou 503 no middleware |

Campos adicionais de cadastro são rejeitados. Campos omitidos obrigatórios são inválidos; null não equivale a string vazia. A senha não é aparada. O limite de 72 bytes evita truncamento silencioso pelo bcrypt. Contas antigas com senhas menores continuam podendo autenticar; não houve alteração de dados existentes.

Erros usam `{ message: string }`; cadastro inválido pode incluir `fields: string[]`, sem valores de entrada. Identificadores duplicados retornam 409 mesmo sob corrida, usando índice único. JSON inválido retorna 400 genérico e payload acima do limite do parser retorna 413.

## Ordens preservadas

Contrato legado permanece: GET /api/orders retorna array; POST cria uma ordem por equipamento com campos cliente, telefone, equipamento, marca, defeito e dados opcionais; GET/PUT/DELETE /api/orders/:id; PATCH /api/orders/:id/status. Status existentes: Aguardando, Em andamento, Pronto e Entregue. Não foram introduzidas novas transições ou campos.

O índice unico de numero foi mantido; a declaração duplicada não única foi removida. Isso corrige inicialização de banco novo, mas **não** resolve a geração concorrente do número. Validação/paginação/erros completos de ordens permanecem para um ciclo próprio.

## Aceite e compatibilidade

Testes HTTP + MongoDB isolado cobrem matriz, persistência, validação e regressões. O frontend de login continua usando o mesmo corpo/resposta. Não há tela de cadastro que dependa do antigo token em 201. Scripts antigos de cadastro anônimo precisam passar por provisionamento administrativo.

Bootstrap manual não faz parte do startup nem do CI. Sem administrador existente, operador autorizado executa create-admin com configuração temporária; execução não ocorreu em banco real.

Fontes de implementação de testes: [node:test](https://nodejs.org/api/test.html) e [mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server). Banco temporário não comprova prontidão do Atlas.
