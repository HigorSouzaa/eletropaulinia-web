# Etapa 04 — proposta de contrato de Funcionários

23/10/2026. Registro original de proposta para checkpoint; a seção abaixo descreve o estado implementado em 24/10/2026. `backend/models/User.js` contém `username`, `name`, hash de senha oculto e `role` (`admin`, `tecnico`, `atendente`). `/api/auth/register` já permitia cadastro somente por admin. A API consulta o perfil atual do banco a cada requisição protegida.

## Estado executável após a implementação

- `GET /api/v2/employees` lista somente para admin, com `page`/`pageSize` (1–100) e `meta`; `GET /:id` retorna perfil público e ETag. `PATCH /:id` aceita apenas nome/perfil e exige `If-Match`.
- Cadastro continua em `POST /api/auth/register`, admin apenas. Não cria sessão para o novo funcionário. Respostas não incluem senha, hash, token nem versão interna de sessão.
- `PATCH /api/v2/employees/:id/access` aceita `active: false/true`; desativação preserva o registro e relações históricas. `POST /api/v2/employees/:id/password-reset` aceita nova senha segundo a política de cadastro, devolve 204 e exige comunicação presencial. Ambos exigem ETag e incrementam `sessionVersion`, invalidando tokens anteriores. Login e middleware rejeitam contas inativas.
- Mudança de perfil e desativação usam transação MongoDB e escrita do mesmo documento de serialização. A contagem de administradores ativos ocorre dentro da transação. Duas desativações simultâneas deixam um admin ativo; última desativação/rebaixamento retorna 409. Se a transação estiver indisponível, a alteração falha, sem tentar uma escrita insegura fora dela.
- O transporte Next usa rotas fixas, cookie HttpOnly, checagem de origem nas mutações e `private, no-store`. A tela `/funcionarios` é protegida também no servidor Next; Express continua a autoridade de permissões.
- Testes HTTP com MongoDB descartável em replica set cobrem listagem, 401/403, cadastro, ETag, último admin, concorrência, revogação de sessão, reset e parser. Testes de navegador cobrem as jornadas administrativas e a negação ao não admin. Nenhum banco real foi alterado.

A proposta abaixo permanece como histórico de decisões técnicas. Divergências: listagem ainda não tem filtros de busca/perfil/ativo; redefinição não obriga troca no próximo login, pois a empresa aprovou redefinição presencial, não esse requisito adicional. A restauração da conta é pela operação `active:true`, sem envio de e-mail.

## Endpoints e contratos propostos

| Método/rota | Entrada/saída | Autorização e erros |
| --- | --- | --- |
| `GET /api/v2/employees?page=&pageSize=` | `{data:[{id,username,name,role,createdAt}],meta}`; paginação limitada e ordem estável | Admin; 401/403/400/503 |
| `POST /api/auth/register` | `username,name,password,role` existentes; 201 com dados públicos, sem sessão nova | Admin; 400/401/403/409/503 |
| `GET /api/v2/employees/:id` | Dados públicos e ETag de versão | Admin; 401/403/404/503 |
| `PATCH /api/v2/employees/:id` | `name` e/ou `role`; `If-Match` obrigatório | Admin; 400/401/403/404/412/428/409/503 |

Não aceitar edição de `username`, senha, hash, token, timestamps ou campos desconhecidos no PATCH. Retornar sempre dados públicos. Limite de página proposto 25 por padrão, 100 máximo, como ordens. `ETag` protege alterações concorrentes; 412 exige releitura, sem sobrescrever silenciosamente. Não incluir endpoint de desativação, exclusão, recuperação ou redefinição de senha sem decisão P03.

## Último administrador e concorrência

Uma contagem seguida de `save()` não basta: duas requisições poderiam rebaixar administradores diferentes. Proposta: cada alteração de perfil executa em transação MongoDB, escreve o mesmo documento técnico de serialização, conta administradores dentro da transação e rejeita o rebaixamento se restar zero. Conflitos transitórios da transação são repetidos com limite; depois de um rebaixamento vencedor, o segundo reavalia a contagem e recebe 409. A versão do usuário também é verificada na transação. O cadastro existente só acrescenta contas e não reduz a contagem, mas promoções via PATCH passam pelo mesmo fluxo. Testar com MongoDB descartável em replica set, como Atlas; se transações não estiverem disponíveis, falhar fechado nas alterações de perfil. Nenhuma operação será feita em Atlas nesta etapa.

## Primeira fatia e testes

Implementar primeiro cadastro admin existente mais listagem pública para admin e 403 para não admin em HTTP/Mongo descartável. Antes de ampliar para edição/perfil e telas completas, revisar resposta real e restrições. Depois testar 401, 403, campo inválido, ETag ausente/desatualizado, dois rebaixamentos simultâneos e manutenção de um admin. Conferir que resposta, log e props não contêm hash/senha/token. Acesso às OS continua compartilhado pelos três perfis; exclusão de OS continua somente admin.

## Decisão operacional posterior

O usuário confirmou em 24/10/2026: desativar funcionário sem apagar o histórico; revogar as sessões dele; permitir redefinição administrativa de senha presencialmente, sem envio automático. Esta decisão atualiza P03, mas **não está implementada** na primeira fatia de criação de OS. O contrato executável de desativação/redefinição e seus testes serão definidos na etapa de Funcionários, incluindo garantia de que o último administrador ativo não possa ser desativado e que tokens emitidos antes do desligamento sejam recusados.

## Limites

P03 segue aberta para implementação/validação de desativação/redefinição de senha; P18 continua bloqueio de publicação. Esta proposta não modifica o schema nem garante prontidão operacional. Referências: [transações MongoDB](https://www.mongodb.com/docs/manual/core/transactions/) e [segurança de dados Next.js](https://nextjs.org/docs/app/guides/data-security).
