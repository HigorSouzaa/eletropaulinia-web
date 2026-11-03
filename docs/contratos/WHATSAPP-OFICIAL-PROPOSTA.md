# WhatsApp oficial — arquitetura e contrato para revisão

03/11/2026. Branch `feat/whatsapp-oficial-contratos`, criada de `main` em `4ba9b33`. **Proposta, não implementação.** Não há credencial Meta configurada, modelo de mensagem aprovado, webhook publicado nem envio executado por esta etapa.

## Diagnóstico confirmado por inspeção

- A criação em `backend/services/orderCreation.js` valida `Idempotency-Key` e grava Cliente, contador e OS dentro de uma transação MongoDB. `backend/routes/ordersV2.js` retorna 201 na primeira criação e 200 no replay.
- `web/NewOrder.tsx` envia a OS para `app/api/orders/route.ts`, que valida origem e transporta a requisição ao Express. O formulário redireciona ao detalhe após resposta bem-sucedida.
- `web/Dashboard.tsx` consulta resumo e entradas recentes; não contém estado de WhatsApp. `web/OrderDetail.tsx` carrega a OS separadamente.
- Não há conector, modelo de notificação ou rota de webhook WhatsApp no código ativo. O Render Free pode dormir após inatividade e perde arquivos locais em reinícios; processamento contínuo e sessão local não são pressupostos deste desenho.

## Arquitetura proposta — checkpoint A (backend e frontend)

```text
Nova OS no Next -> Express -> transação Mongo (Cliente + OS + intenção de notificar)
                                    |
                                    +-> resposta 201/200 sem esperar Meta
                                    +-> dispatcher controlado -> API Cloud da Meta
                                                        |
                                            webhook assinado -> estado de entrega
```

Express permanece autoridade de consentimento, fila e estado. O Next só mostra a opção de consentir e transporta chamadas autenticadas; o webhook chega **diretamente ao Express**, pois é uma chamada servidor a servidor, sem cookie de funcionário. O conector usa HTTP para a API oficial, sem automação de WhatsApp Web, QR Code ou sessão de celular. Uma caixa de mensagens fica para outro ciclo.

**Fatia inicial para demonstração:** funcionário abre OS sintética com consentimento; a transação cria OS e um registro pendente; dispatcher de teste confirma aceite da Meta simulada; detalhe mostra “aceita pela plataforma”; webhook simulado e autenticado muda para “entregue”. Em seguida, demonstrar falta de consentimento e falha do provedor sem duplicar a OS. A expansão, após revisão funcional, inclui Dashboard, tentativas e casos de erro.

**Direção visual:** manter os cartões e a navegação atuais. Na Nova OS, opção desmarcada com texto curto sobre atualização daquela OS; após salvar, estado da OS e estado da mensagem aparecem separadamente. No detalhe, bloco discreto “Comunicação”; na Dashboard, cartão “WhatsApp” com configuração, última confirmação de webhook e contagem de falhas. Não usar “online”, pois a Cloud API não tem sessão de celular. Mostrar `não configurado` quando faltarem credenciais/modelo e `sem eventos ainda` quando apropriado.

## Contrato proposto — checkpoint B

### Consentimento

- Na abertura, `comunicacao.whatsapp.autorizado` deve ser booleano explícito e `origem` deve ser uma opção permitida para o atendimento presencial (proposta: `presencial`). `false` é padrão; ausência em clientes antigos não significa consentimento.
- Gravar na OS a decisão e seu instante no servidor para auditar a criação. Manter no Cliente a preferência atual de recebimento e eventual revogação. Se o cliente revogar, bloquear mensagens ainda pendentes e futuras; a decisão histórica da OS não é apagada.
- Não usar o aceite para mensagens de marketing. O texto deve especificar atualizações operacionais de ordens. Registrar somente metadados necessários; não guardar texto livre de consentimento.
- Em caso de telefone fixo ou formato que não possa receber WhatsApp, salvar a OS e marcar a notificação como não elegível; nunca inventar que foi enviada.

### Mensagem de abertura

- Modelo de utilidade em português brasileiro **a ser criado e aprovado na Meta**. Parâmetros propostos: nome do cliente, número da OS, data civil de entrada no formato `dd/MM/aaaa`. A marca da empresa fica no próprio modelo. Não incluir número de telefone, laudo, valor, documento ou URL com acesso livre.
- `POST /api/v2/orders` aceita o campo de consentimento em versão nova da normalização/hash de idempotência, sem reinterpretar hashes antigos. Em replay da mesma chave, retorna a mesma OS e a mesma intenção de envio; não cria outra notificação. Versões antigas do payload continuam aceitas com consentimento falso.
- Documento `NotificationOutbox` proposto: `orderId`, `kind=order_created`, `clientId`, telefone normalizado, decisão/snapshot mínimo, estado, tentativa, próximo instante, `providerMessageId` quando recebido, timestamps e código de falha sanitizado. Índice único `(orderId, kind)` e índice para pendentes. Não registrar token nem corpo bruto de webhook. A intenção é criada na **mesma transação** da OS; apenas o dispatcher chama a Meta depois do commit.
- O backend não deve devolver 503 de criação da OS apenas porque Meta está indisponível. O estado de comunicação é consultado separadamente para evitar acoplar sucesso da OS ao sucesso do envio.

### Estados e repetição

| Estado de interface | Significado |
| --- | --- |
| Não autorizado | Cliente não consentiu ou revogou antes do envio. Nenhuma chamada à Meta. |
| Pendente | OS salva; envio ainda não tentado. |
| Aceita pela plataforma | A API da Meta retornou identificador. Não afirmar entrega ao aparelho. |
| Entregue | Webhook de entrega associado ao identificador confirmou o evento. |
| Falha | Erro permanente ou temporário registrado; nova tentativa só conforme política. |
| Resultado incerto | Houve envio sem resposta conclusiva; bloquear repetição automática até reconciliação, para evitar mensagem duplicada. |

- Uma única confirmação automática é permitida por OS. Duplo clique, replay de criação, workers concorrentes e webhook repetido não podem criar dois registros lógicos.
- A Cloud API pode aceitar uma chamada cuja resposta se perde. **Não prometer exatamente uma entrega externa** sem garantia de idempotência do provedor; resultado incerto exige conferência pelo identificador/eventos ou ação administrativa explícita. Não reenviar por simples timeout.
- Um processo no Render Free pode dormir. Ao iniciar, receber uma requisição ou executar uma ação administrativa, o dispatcher pode retomar pendências elegíveis; não prometer envio imediato durante a suspensão. Não usar ping periódico para mascarar esse limite. Para entrega pontual garantida, será necessário runtime/worker que permaneça ativo e monitorado.

### API e segurança

- `GET /api/v2/orders/:id/notification`: autenticado, dados mínimos para detalhe. `POST /api/v2/orders/:id/notification/retry`: proposta de ação administrativa, aceita somente falhas classificadas como seguras para repetir; exige versão/precondição e registra ator. Rotas Next correspondentes devem ter allowlist e proteção de origem.
- `GET /api/v2/notifications/health`: autenticado, informação operacional agregada sem token/telefone; Dashboard usa `no-store`. Definir permissão de leitura conforme acesso compartilhado existente.
- `GET /api/webhooks/whatsapp`: desafio de verificação da Meta, com segredo de verificação. `POST /api/webhooks/whatsapp`: corpo bruto limitado, assinatura HMAC verificada com segredo do app antes de parsear e alterar dados; resposta idempotente para eventos repetidos e desconhecidos. Não usar CORS como autenticação do webhook.
- Variáveis somente no Express, por nome: token de acesso, ID do número remetente, segredo do app, token de verificação, versão da Graph API e nome/idioma do modelo aprovado. Conferir a versão vigente e permissões na documentação oficial antes de codificar. Nunca aceitar URL arbitrária de API ou destinatário arbitrário do navegador.
- Aplicar limites por mensagem e por telefone, timeout de rede, tratamento de 429 e erro classificado. Logs com ID interno/código de erro, sem conteúdo da mensagem, dados pessoais, token ou payload bruto.
- Em exclusão administrativa da OS, decidir no contrato final se uma OS com histórico de comunicação fica bloqueada ou se preserva o evento minimizado; não apagar evidência de consentimento e envio silenciosamente.

## Matriz de validação

1. OS nova com autorização: registro único de outbox na mesma transação; resposta de criação independe da Meta.
2. Sem autorização, revogação e telefone inelegível: nenhuma chamada externa.
3. Replay de `Idempotency-Key`, requisições concorrentes e crash antes/depois do commit: uma OS e uma intenção lógica.
4. Meta aceita / resposta perdida / 429 / 5xx / erro permanente: estados e repetição coerentes, sem duplicar automaticamente no incerto.
5. Webhook assinado, assinatura inválida, evento repetido, fora de ordem ou sem ID conhecido: nenhum vazamento nem regressão de estado.
6. Usuário não autenticado não vê dados; funcionário vê estado mínimo; mutação administrativa negada a não admin.
7. Login, logout, troca de conta, indisponibilidade do Render e larguras 360/768/1280; sem afirmar `online` por mera configuração.
8. `npm run check`, E2E com Express/Mongo descartável e provedor fake; teste em ambiente oficial da Meta somente com credenciais/conta de teste e destino autorizado.

## Dependências e decisões ainda não confirmadas

- Conta Meta Business, número remetente, permissões, modelo aprovado, webhook público e eventual custo ainda não foram inspecionados. Nenhum desses itens deve ser apresentado como existente.
- A política de retenção de consentimento/eventos e o responsável operacional por falhas precisam ser registrados antes de ativação real.
- O comportamento exato de exclusão de OS com histórico de comunicação precisa ser fechado junto com o contrato final; a proposta segura é impedir perda silenciosa de auditoria.
- A integração deve permanecer **desativada por padrão** até o ambiente e modelo aprovado estarem validados. Não alterar Atlas, Netlify ou Render neste checkpoint.

## Referências oficiais consultadas

- [WhatsApp Business Platform — mensagens iniciadas pela empresa e modelos](https://whatsappbusiness.com/products/business-platform-features/)
- [Política de mensagens — permissão e descadastro](https://whatsappbusiness.com/policy/)
- [Coleção oficial da Meta — envio e estados por webhook](https://www.postman.com/meta/whatsapp-business-platform/folder/o48mro7/messages)
- [Render Free — suspensão e arquivos efêmeros](https://render.com/docs/free)
