# Etapa 04 — arquitetura e protótipo para revisão

Atualização 24/10/2026: arquitetura aprovada pelo usuário e fluxos normais implementados/validados. [Entrega final da etapa](ETAPA-04-ENTREGA.md). O texto abaixo registra o checkpoint anterior à implementação.

23/10/2026. Base `4157aae`, branch `feat/fluxos-next-funcionarios`. Este documento prepara os checkpoints das skills Dev Front Master e Dev Back Master. **Nenhuma tela ou endpoint novo foi implementado e nenhuma aprovação desta etapa foi presumida.** A interface seguirá a identidade laranja/cinza atual, sem biblioteca de formulário/estado ou redesign.

## Contrato executável encontrado

Express expõe `/api/v2/orders`: GET/POST da coleção; GET `summary`; GET/PATCH/DELETE por ID; POST de equipamento; PATCH/DELETE de equipamento; PUT de retirada. A criação exige `Idempotency-Key`; mutações de registro exigem `If-Match`, obtido no `ETag` do GET. Erros v2 usam `{error:{code,message,fields?,requestId}}`. Legado informa `compatibility.readOnly` e requer reconciliação. `/api/auth/register` já cadastra usuário somente por admin, sem trocar a sessão, mas faltam listagem/edição. O transporte Next atual admite apenas GET de ordens e login/logout. A documentação v2 é proposta onde divergir do código.

## Páginas e componentes

| URL | Camada/fluxo | Estado e ações |
| --- | --- | --- |
| `/ordens` | servidor lê sessão; componente cliente consulta API paginada | Links para detalhe e criação; atualizar após mutação |
| `/nova-ordem` | formulário cliente dentro do layout protegido | Cliente, lista de equipamentos, relato ou Testar, opcionais; confirmação apenas após 201/200 |
| `/ordens/[id]` | busca própria por ID; componente interativo para andamento e retirada | Erro/legado explícitos; Pronto permite retirada; contagem parcial; admin pode excluir |
| `/editar-ordem/[id]` | busca própria; formulário cliente | Campos permitidos, equipamentos e opcionais; rascunho preservado em 412/503 |
| `/funcionarios` | servidor confere sessão/perfil para navegação; Express autoriza cada operação | Listar, cadastrar e alterar nome/perfil; somente admin |

O primeiro protótipo funcional a revisar é criar uma OS com três equipamentos, consultar por deep link e recarregar. Depois vêm edição/retirada/exclusão e, por fim, Funcionários. O layout mantém navegação e componentes existentes; diálogos terão foco inicial, fechamento por teclado e retorno do foco. Testar 360, 768 e 1280 px. Links de módulos opcionais sem destino útil serão ocultos.

## Transporte, sessão e dados

Route Handlers Next terão caminhos e métodos fixos para ordens e funcionários, limite de corpo e `validOrigin` em mutações. O token continuará somente no cookie HttpOnly e na chamada servidor→Express; não será enviado ao JavaScript, props ou URL. Express permanece autoridade para identidade, perfil, validação e regra de negócio. Respostas autenticadas terão `private, no-store`; 401 limpará cookie e estado da conta anterior. Falha 503 preservará formulários. Requisições antigas serão abortadas/ignoradas quando a identidade ou URL mudar.

Uma chave UUID fica associada à mesma tentativa lógica de criação e é reutilizada após erro de rede; mudança intencional do formulário inicia nova tentativa. GET fornece ETag para edição/retirada/exclusão. Em 412, o rascunho e a resposta atual serão exibidos lado a lado antes de o usuário optar por atualizar a base da edição; não reenviar automaticamente com ETag novo. Horários UTC da API serão formatados em `America/Sao_Paulo` apenas na apresentação. Em legado, ações de escrita ficam indisponíveis.

## Primeiro recorte visual para validação

Usar a composição atual: título e navegação no topo, cartões claros com bordas sutis, ação primária laranja. Na criação, um cartão de cliente e uma lista numerada de cartões de equipamentos; cada cartão tem identificação, marca/modelo/série opcionais e escolha excludente entre relato e Testar. A ação de remover identifica o equipamento e nunca remove o último. Na página de detalhe, separar presentes e retirados, mostrar `1 de 3 retirados` sem trocar o andamento agregado por um estado inventado; retirada exige confirmação nominal. Em Funcionários, a tabela móvel vira cartões, com perfil legível e ação administrativa claramente identificada. Labels permanentes, erro junto ao campo e resumo de erros focável.

## Matriz de aceite antes de ampliar

1. Fatia inicial: POST real→Mongo descartável→GET por ID, três equipamentos, marca/e-mail opcionais e Testar; recarga e troca de conta.
2. Edição: PATCH com If-Match, limpar opcional, preservar outros itens; 412 mantém rascunho.
3. Retirada: Pronto, primeiro de três, repetição sem segundo evento, depois último→Entregue; horário local é só apresentação.
4. Exclusão: admin confirma número, 204 remove apenas alvo; não admin recebe 403 no Express.
5. Funcionários: admin cadastra/lista/altera; conta criada faz login; não admin recebe 403; dois rebaixamentos simultâneos preservam um admin.
6. 401/503, vazio, teclado, foco e larguras 360/768/1280; distinguir interceptações de integração real.

## Decisões em aberto

P01 retirada antes de Pronto, P02 correção de retirada, P11 composição após primeira retirada e P03 desativação/recuperação não são habilitadas neste recorte. Garantia, mensagens, Atlas real e deploy não pertencem à etapa. O contrato específico de funcionários está em [ETAPA-04-FUNCIONARIOS-CONTRATO.md](../dev-back/ETAPA-04-FUNCIONARIOS-CONTRATO.md).
