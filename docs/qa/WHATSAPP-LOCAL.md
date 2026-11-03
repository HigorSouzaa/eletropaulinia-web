# WhatsApp Web — validação local

Primeira expansão após aprovação funcional em 03/11/2026. O Chrome instalado neste computador abriu em modo headless (`Chrome/156.0.8078.47`). Uma sessão real temporária chegou ao estado `aguardando_qr` com QR disponível; o conteúdo do QR não foi mostrado nem salvo. A pasta temporária da prova foi removida após desconexão. Os testes com cliente falso cobrem acesso por perfil, conexão concorrente, desconexão durante a inicialização e falha de inicialização. Nenhum aparelho foi pareado e nenhuma mensagem foi enviada.

Verificação final: `npm run check` passou com tipagem, lint, 90 testes HTTP/MongoDB e build. `npx playwright test tests/whatsapp.spec.ts` passou 1/1 após o ajuste da indicação de configuração; a suíte completa de 33 testes de navegador havia passado antes desse ajuste visual, e não foi repetida porque o novo teste cobre a área alterada.

## Para testar com o aparelho da loja em sessão futura

1. Usar banco de desenvolvimento isolado e confirmar que o backend não aponta para Atlas/produção. Não copiar credenciais ou dados reais para fixtures.
2. Definir `WHATSAPP_SESSION_DIR` como diretório absoluto fora do repositório e `WHATSAPP_CHROME_PATH` como caminho absoluto do Chrome instalado. Não versionar esses caminhos nem o conteúdo da sessão. O arquivo `backend/.env.example` lista apenas nomes.
3. Iniciar API e Next localmente; entrar como administrador e abrir `/whatsapp`. O funcionário autorizado escaneia o QR com o aparelho da loja. Não compartilhar captura ou texto do QR.
4. Conferir transição para `Conectado`, atualizar a página, desconectar e conectar novamente. Verificar que a Nova OS não envia mensagem. Se o Chrome falhar, a página deve mostrar erro sem expor detalhes internos.
5. Encerrar o processo e controlar o acesso à pasta de sessão. Um restart não reconecta automaticamente; o administrador inicia novamente. Desvincular o aparelho no WhatsApp é uma ação operacional separada.

## Limites antes de uso remoto

Render Free suspende o processo e perde arquivos locais. A sessão exige hospedagem persistente, armazenamento protegido e revisão dos alertas das dependências antes de publicação. `npm audit --omit=dev` encontrou 11 alertas altos e 6 moderados no grafo do backend após a nova dependência. Não habilitar a conexão remota nem mensagens automáticas com esse estado. O código recusa iniciar a sessão com `NODE_ENV=production`.

A geração do QR real foi comprovada em sessão temporária, mas leitura pelo aparelho, autenticação, reconexão real e bloqueio/limite da conta não foram medidos. Os testes simulados não provam esses pontos.
