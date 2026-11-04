# Clientes — endereço e documentos opcionais

04/11/2026. Arquitetura e direção visual aprovadas. Primeira jornada implementada localmente; revisão funcional e validação ampliada ainda pendentes. Nenhum banco remoto foi alterado.

## Diagnóstico verificado no código

- `backend/models/Client.js` guarda nome, telefone, e-mail, versão e autoria; telefone tem índice único. Não há tipo de pessoa, documento ou endereço.
- `backend/routes/clients.js` aplica sessão em todas as rotas, mas usa o mesmo `clientDTO` na busca por telefone, lista e detalhe. Só admin pode usar PATCH com `If-Match`; o índice de telefone é conferido antes de escrita.
- `web/Clients.tsx` tem uma única ficha com dados básicos e histórico paginado de OS. `web/NewOrder.tsx` solicita apenas dados básicos via `ClientLookup`.
- A OS referencia `clienteId` e guarda seu snapshot histórico. Atualizar a ficha não precisa nem deve reescrever ordens anteriores.
- O transporte Next de PATCH aceita até 1024 bytes; os novos campos exigirão limite pequeno, porém suficiente, por exemplo 4 KiB, alinhado ao Express.

## Modelo e semântica propostos

Adicionar à coleção `clients`, de forma aditiva:

| Campo | Regra |
| --- | --- |
| `tipoPessoa` | `null`, `fisica` ou `juridica`. `null` representa cadastro anterior/sem classificação; a escolha não obriga documento. |
| `documento` | `null`, CPF com 11 dígitos ou CNPJ com 12 caracteres alfanuméricos e 2 verificadores numéricos, coerente com `tipoPessoa`. CNPJ numérico permanece válido. Sem tipo, documento deve ser `null`. |
| `endereco` | Objeto opcional com `cep` (8 dígitos), `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf` (2 letras). Cada campo pode permanecer ausente/nulo; não consultar CEP externo nem inventar número. |

O ID interno e o telefone normalizado continuam a identificar o cliente. Documento não identifica ou une cadastros automaticamente. Em PATCH, omissão preserva o valor; `null` limpa documento/endereço ou um campo opcional; string vazia de documento é inválida e a interface envia `null` para limpeza. Trocar o tipo exige que o documento resultante seja válido para o novo tipo ou esteja nulo, sem apagar automaticamente o documento antigo. Limites propostos: logradouro 160, número 20, complemento 100, bairro/cidade 100 caracteres. Dados antigos sem esses campos são apresentados como não informados, sem migração de conteúdo.

Validar CPF/CNPJ e dígitos verificadores no Express, após remover somente máscara usual. Rejeitar caracteres inesperados, sequências inválidas e valores fora do comprimento. Armazenar CPF somente com dígitos e CNPJ alfanumérico em maiúsculas sem máscara; formatar no frontend para exibição. Não registrar documento em logs, URLs ou erros. A Receita Federal passou a atribuir CNPJ alfanumérico em julho de 2026; o cálculo segue [manual oficial](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf).

Índice único parcial `{ documento: 1 }` com filtro para string protege concorrência sem impedir vários clientes sem documento. Antes da primeira escrita de documento, verificar que o índice correto existe; sem ele, falhar com 503. Duplicidade recebe 409 `DOCUMENT_IN_USE`, sem expor o cadastro concorrente. Não criar índice no Atlas nesta tarefa.

## API, permissões e privacidade

- `POST /api/v2/clients/lookup` e `GET /api/v2/clients`: manter resposta básica (`_id`, nome, telefone, e-mail, versão, datas), sem endereço/documento. O preenchimento da Nova OS permanece igual e não copia os dados novos para o snapshot da OS.
- `GET /api/v2/clients/:id`: funcionário autenticado recebe dados básicos e histórico pela rota atual; admin recebe, adicionalmente, tipo, documento e endereço. `Cache-Control: private, no-store`. A autorização é decidida no Express, não por ocultação visual.
- `PATCH /api/v2/clients/:id`: somente admin; aceitar dados básicos e os novos campos, validar o estado final coerente, exigir `If-Match`, incrementar versão e retornar ETag novo. `400` validação, `401` sessão, `403` perfil, `404` ausente, `409` telefone/documento em uso, `412` versão antiga, `428` precondição ausente, `503` índice/banco indisponível.
- Reavaliar os limites do parser Express e transporte Next para 4 KiB. Não permitir campos extras, operadores Mongo nem valores desconhecidos.

Exemplo sintético de PATCH administrativo (sem documento real):

```json
{"tipoPessoa":"juridica","documento":null,"endereco":{"cep":"13000000","logradouro":"Rua Exemplo","numero":"10","complemento":null,"bairro":"Centro","cidade":"Paulínia","uf":"SP"}}
```

O exemplo mostra empresa sem CNPJ informado; a validação de dígitos verificadores será coberta com geradores de dados sintéticos nos testes, sem copiar documentos pessoais reais.

## Interface proposta

Manter a moldura e aparência atuais. Na ficha de Cliente, contato e histórico continuam visíveis. Apenas admin vê uma seção “Dados adicionais” abaixo do contato, com tipo de pessoa, documento contextual e endereço; em celular, os campos ficam em uma coluna e em desktop em duas quando couber. Ao trocar o tipo, não descartar rascunho silenciosamente. Mostrar validação junto ao campo, preservar rascunho em 409/412/503, e pedir confirmação antes de recarregar dados alterados por outra sessão. Não acrescentar nada à Nova OS.

## Primeira jornada e testes

Após aprovação: implementar só admin preenchendo tipo/endereço/documento opcional na ficha → PATCH versionado → Mongo descartável → recarga. Demonstrar 403 de funcionário e verificar que lookup/OS não recebem o documento. Pedir revisão funcional dessa primeira fatia antes de completar limpeza, duplicidade concorrente, mudança de tipo, responsividade e regressões.

Matriz final: PF/PJ com e sem documento; CPF/CNPJ inválido; duplicidade simultânea; limpeza via null; ETag desatualizado; funcionário 403; lista/lookup sem documento; cliente antigo legível; histórico de OS inalterado; recarga e 360/768/1280 px. Rodar HTTP/Mongo descartável, navegador, tipagem, lint e build. Não executar indexação no Atlas, push ou deploy.

## Implementação local e compatibilidade

Após os três checkpoints aprovados, a branch `feat/clientes-endereco-documentos` implementou os campos aditivos, a validação de CPF/CNPJ (inclusive CNPJ alfanumérico), índice único parcial declarado, resposta administrativa separada e a seção de edição na ficha. O índice é criado apenas nos bancos descartáveis dos testes. No Atlas publicado, gravação de documento falha com 503 enquanto o índice correto não for criado mediante autorização específica; as consultas e os dados básicos continuam funcionando.

A atualização remota futura deve inventariar a coleção `clients` sem expor documentos, verificar duplicidades, criar o índice `client_document_unique`, atualizar a API e só então disponibilizar a interface. A versão anterior da interface e a Nova ordem seguem usando apenas telefone, nome e e-mail; não há alteração no snapshot histórico da OS. Em reversão de aplicação, manter os campos adicionais e o índice no banco, sem apagar dados. Não transformar cadastros antigos nem inferir documento/tipo de pessoa.

Validação local da nova jornada: `backend/tests/clients.test.js` cobriu gravação, permissão, privacidade, CPF/CNPJ inválido, limpeza, ETag, concorrência do índice e histórico. `tests/clients.spec.ts` cobriu edição, recarga, ausência dos campos na Nova ordem e larguras de 360, 768 e 1280 px. Capturas sintéticas são geradas em `test-results/clientes-adicionais-{360,768,1280}.png` (fora do Git). Não houve acesso ou alteração no Atlas, Netlify ou Render.

Para repetir em ambiente local, seguir as variáveis de desenvolvimento do `README.md` e iniciar Next/Express com `npm run start-all`. Para validar sem banco externo: `npm run check` e `npm run test:e2e -- --grep "ficha administrativa salva documento"`. A suíte de navegador usa MongoDB descartável e credenciais sintéticas próprias; não apontar esses testes para o Atlas.
