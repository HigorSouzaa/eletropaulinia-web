# Etapa 04 — proposta de contrato de Funcionários

23/10/2026. **Proposta para checkpoint; ainda não implementada.** `backend/models/User.js` contém `username`, `name`, hash de senha oculto e `role` (`admin`, `tecnico`, `atendente`). `/api/auth/register` já permite cadastro somente por admin. A API consulta o perfil atual do banco a cada requisição protegida; a mudança de perfil pode surtir efeito no token existente. Ainda não há listagem/edição e não há política aprovada de desativação ou recuperação.

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

## Limites

P03 segue aberta para desativação/redefinição de senha; P18 continua bloqueio de publicação. Esta proposta não modifica o schema nem garante prontidão operacional. Referências: [transações MongoDB](https://www.mongodb.com/docs/manual/core/transactions/) e [segurança de dados Next.js](https://nextjs.org/docs/app/guides/data-security).
