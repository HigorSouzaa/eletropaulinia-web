# WhatsApp Web com QR Code — proposta revisada

03/11/2026. O usuário mudou a direção: WhatsApp Web com QR Code primeiro e nenhum envio automático por enquanto. Arquitetura/contrato aprovados; primeira jornada local implementada para revisão funcional. A conexão com aparelho real não foi validada.

## Estado atual e transição

A branch `feat/whatsapp-oficial-contratos` guarda uma primeira fatia local da API oficial: opção de consentimento na Nova OS, intenção transacional `NotificationOutbox`, adaptador Meta não acionado automaticamente e testes com provedor falso. Ainda não há QR Code, sessão Web nem envio automático. `WHATSAPP-OFICIAL-PROPOSTA.md` permanece como histórico, mas não orienta a próxima implementação.

A Nova OS deixou de mostrar a opção de envio. A criação não gera novas intenções; o adaptador Meta foi removido. Registros históricos da fila permanecem sem processador e sem envio. Nenhuma OS criada nesta fase promete mensagem ao cliente.

## Arquitetura proposta

- Express controla uma única sessão da loja com `whatsapp-web.js` e Chromium/Puppeteer, habilitada explicitamente apenas em desenvolvimento local. Next consulta estado/QR e exibe interface, sem acessar arquivos da sessão diretamente.
- Isolar o gerenciador de sessão por interface interna do processo HTTP; nunca iniciar cliente WhatsApp por requisição de listagem ou no startup sem configuração explícita.
- Guardar autenticação em pasta local fora do Git, com acesso restrito. QR é credencial temporária: acesso admin, `no-store`, validade curta, sem logs nem capturas reais.
- Render Free não é destino operacional: suspende por inatividade e perde arquivos locais em reinícios. Uso remoto exige runtime persistente e plano de reconexão/armazenamento. Não criar rotina para “acordar” o serviço.
- Estados: desligado, iniciando, aguardando QR, autenticando, conectado, desconectado e erro. `Conectado` reflete o evento da biblioteca; não é garantia de envio ou entrega.

## Contrato mínimo proposto

- `GET /api/whatsapp/status`: qualquer funcionário autenticado; estado, instante e descrição sanitizada, sem QR ou segredo.
- `POST /api/whatsapp/connect`: admin; operação idempotente para iniciar sessão local.
- `GET /api/whatsapp/qr`: admin; QR vigente, sem cache, ou estado informando que não há QR.
- `POST /api/whatsapp/disconnect`: admin; desconecta, mas não apaga credenciais. Desvincular o aparelho será operação distinta.
- Nenhum endpoint de envio nesta fatia. Caixa de mensagens e envios manuais exigem contrato posterior de acesso, retenção e auditoria.

## Interface e primeira jornada

Dashboard mostra um cartão com estado/última transição. Página WhatsApp apenas para admin mostra QR quando necessário e instrução para escanear pelo aparelho da loja. Funcionário comum vê somente estado. Primeira prova local: admin inicia → QR sintético aparece em teste → evento falso muda estado → funcionário consulta estado → não admin recebe 403 para conectar/QR → criação de OS não gera envio. Usar fake da biblioteca e Mongo descartável; não parear telefone real em testes.

## Riscos e verificação

`whatsapp-web.js` é um cliente não oficial baseado em Puppeteer; seu projeto avisa que não há garantia contra bloqueio. Antes de uso real, revisar política de mensagens, risco à conta, retenção e hospedagem. Telefone cadastrado não equivale a permissão para mensagens; a preferência anterior por enviar a todo número não será automatizada.

Testar acesso, sessão, QR temporário, reconexão, repetição de connect, troca de usuário, falha do Chromium, criação sem mensagem, tipagem, lint, build e navegador. Não fazer push, merge, deploy nem alterar Atlas, Render ou Netlify nesta fase. Primeira jornada demonstrada com QR sintético; a revisão funcional do usuário precede expansão para caixa de mensagens ou envio.

## Primeira jornada local e limites

Backend: `backend/services/whatsappWeb.js` isola uma sessão; `backend/routes/whatsapp.js` expõe status autenticado e connect/QR/disconnect só para admin. Frontend: `web/WhatsAppConnection.tsx` e `/whatsapp`; a Dashboard mostra status sem QR. Em produção, a factory recusa iniciar a biblioteca. Em desenvolvimento local, exige `WHATSAPP_SESSION_DIR` absoluto fora do repositório e `WHATSAPP_CHROME_PATH` absoluto; ambos ficam fora do Git. A instalação usou `--ignore-scripts`, portanto não baixou Chromium. Chrome local foi iniciado e uma sessão temporária gerou QR real, sem pareamento de telefone. Veja [runbook e limites](../qa/WHATSAPP-LOCAL.md).

Verificações: `npm run check` passou com 87 testes HTTP/Mongo, tipagem, lint e build; `npm run test:e2e` passou 33/33 antes do teste visual novo; `npx playwright test tests/whatsapp.spec.ts` passou 1/1; `node --test backend/tests/whatsapp-web.test.js` passou 4/4 após a última ampliação. QR real, desconexão real e reconexão real não foram comprovados. A captura sintética está em `test-results/whatsapp-local-first-slice.png`, ignorada pelo Git.

Depois de mover `whatsapp-web.js` e `qrcode` para dependências apenas locais e carregamento dinâmico, `npm audit --omit=dev` reportou zero alertas no backend de produção. A auditoria completa ainda reporta 12 altos e 7 moderados, ligados principalmente à cadeia do navegador. Não houve atualização indiscriminada para esconder alertas; a sessão continua desativada em produção e a triagem permanece necessária antes de uso com aparelho/ativação remota.
