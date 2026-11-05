# WhatsApp Web — validação local

Primeira expansão após aprovação funcional em 03/11/2026. O Chrome instalado neste computador abriu em modo headless (`Chrome/156.0.8078.47`). Uma sessão real temporária chegou ao estado `aguardando_qr` com QR disponível; o conteúdo do QR não foi mostrado nem salvo. A pasta temporária da prova foi removida após desconexão. Os testes com cliente falso cobrem acesso por perfil, conexão concorrente, desconexão durante a inicialização e falha de inicialização. Nenhum aparelho foi pareado e nenhuma mensagem foi enviada.

Verificação final: `npm run check` passou com tipagem, lint, 90 testes HTTP/MongoDB e build. `npx playwright test tests/whatsapp.spec.ts` passou 1/1 após o ajuste da indicação de configuração; a suíte completa de 33 testes de navegador havia passado antes desse ajuste visual, e não foi repetida porque o novo teste cobre a área alterada.

Revalidação após separar dependências: `npm run check` passou com 91 testes HTTP/MongoDB, tipagem, lint e build; o teste de navegador da tela WhatsApp passou 1/1. A rota de conexão retorna 503 sem configuração e não abre Chromium nesse caso.

## Para testar com o aparelho da loja em sessão futura

1. Usar banco de desenvolvimento isolado e confirmar que o backend não aponta para Atlas/produção. Não copiar credenciais ou dados reais para fixtures.
2. Definir `WHATSAPP_SESSION_DIR` como diretório absoluto fora do repositório e `WHATSAPP_CHROME_PATH` como caminho absoluto do Chrome instalado. Não versionar esses caminhos nem o conteúdo da sessão. O arquivo `backend/.env.example` lista apenas nomes.
3. Iniciar API e Next localmente; entrar como administrador e abrir `/whatsapp`. O funcionário autorizado escaneia o QR com o aparelho da loja. Não compartilhar captura ou texto do QR.
4. Conferir transição para `Conectado`, atualizar a página, desconectar e conectar novamente. Verificar que a Nova OS não envia mensagem. Se o Chrome falhar, a página deve mostrar erro sem expor detalhes internos.
5. Encerrar o processo e controlar o acesso à pasta de sessão. Um restart não reconecta automaticamente; o administrador inicia novamente. Desvincular o aparelho no WhatsApp é uma ação operacional separada.

## Dependências e limites antes de uso remoto

Render Free suspende o processo e perde arquivos locais. A sessão exige hospedagem persistente e armazenamento protegido. A biblioteca `whatsapp-web.js` e o gerador QR foram movidos para `devDependencies` porque o runtime está desativado em produção e ambos são carregados dinamicamente apenas na sessão local. `npm audit --omit=dev` passou a reportar **zero alertas** no pacote de produção do backend. A auditoria completa, incluindo desenvolvimento, ainda reporta **12 altos e 7 moderados** na cadeia do WhatsApp Web; esses alertas precisam de triagem antes de parear o aparelho da loja ou planejar ativação remota. O código recusa iniciar a sessão com `NODE_ENV=production`; a rota de conexão retorna 503 quando não configurada. Não habilitar mensagens automáticas com esse estado.

A geração do QR real foi comprovada em sessão temporária, mas leitura pelo aparelho, autenticação, reconexão real e bloqueio/limite da conta não foram medidos. Os testes simulados não provam esses pontos.

## Experimento autorizado na Render Free — 04/11/2026

O usuário aceitou um QR temporário na Render gratuita. Com `NODE_ENV=production` e `WHATSAPP_RUNTIME=temporary`, o backend usa `NoAuth`: não grava arquivos de sessão e exige novo QR após suspensão ou reinício. A conexão continua manual, exclusiva de administrador; nenhuma OS envia mensagem automaticamente. O frontend indica a limitação. O Chromium é instalado pelo Puppeteer no cache do projeto configurado em `backend/.puppeteerrc.cjs`, fora do Git. Antes de abrir a porta, o backend testa se consegue iniciar e fechar o navegador; uma falha impede que a nova versão substitua a API ativa.

No teste local, o Chromium instalado pelo Puppeteer iniciou e uma sessão `NoAuth` produziu evento de QR sem exibir seu conteúdo. `npm run typecheck`, `npm run lint`, 95 testes HTTP/MongoDB, `npm run build` e o teste de navegador WhatsApp passaram. Pareamento com o aparelho, permanência da sessão e memória real da Render continuam sem comprovação até a ativação remota. A auditoria do pacote completo apontou 12 alertas altos e 5 moderados na cadeia do WhatsApp Web; o acesso ao QR é restrito e não há envio, mas isso não elimina os alertas. Reavaliar antes de usar o canal para mensagens de clientes.
