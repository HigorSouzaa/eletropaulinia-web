# Arquivos de implantação OCI (modelos, ainda não aplicados)

Topologia: Caddy HTTPS → Next em `127.0.0.1:3000` → Express em `127.0.0.1:5000` → Atlas Free. Os arquivos `.example` precisam ser revisados para a imagem Linux, o caminho do Node 24, o usuário do serviço e o domínio escolhidos. Não instale nem habilite os serviços antes de validar as contas, o cluster, o backup e o roteiro de homologação.

## Segredos e variáveis locais da VM

Criar `/etc/eletropaulinia/api.env` e `/etc/eletropaulinia/web.env` fora do Git, com leitura somente pelo administrador e pelo usuário de serviço. Não copiar `.env` de desenvolvimento ou credenciais por chat. Os arquivos devem conter:

```text
# api.env
NODE_ENV=production
PORT=5000
API_HOST=127.0.0.1
MONGODB_URI=<URI_DO_BANCO_NOVO>
JWT_SECRET=<SEGREDO_ALEATORIO_COM_32_OU_MAIS_CARACTERES>
JWT_EXPIRE=1h
CORS_ORIGINS=

# web.env
NODE_ENV=production
API_INTERNAL_URL=http://127.0.0.1:5000/api
APP_ORIGIN=https://<DOMINIO_REAL>
```

`EnvironmentFile` do systemd aceita `KEY=value`; linhas de comentário do exemplo acima devem ser separadas nos respectivos arquivos. O URI e o segredo não devem entrar no shell history, logs, Git ou comandos registrados. Confirmar o IP de saída da VM no Atlas; liberar somente esse IP, nunca toda a internet por conveniência.

## Ordem de instalação e verificação

1. Na conta OCI, confirmar instância **Always Free** na região principal e cotas antes de criar. Configurar SSH por chave, atualizações do sistema, usuário sem privilégios para a aplicação e firewall OCI/host. Abrir publicamente somente 80/443; limitar SSH ao IP administrativo. Bloquear 3000/5000 externamente.
2. Instalar Node 24 ARM64 e Caddy de fontes oficiais. Confirmar `command -v node` e `command -v npm`; ajustar `ExecStart` se não forem `/usr/bin/node` e `/usr/bin/npm`. Construir em diretório de release, com `npm ci`, `npm --prefix backend ci --omit=dev`, `npm run check`, e depois apontar `/srv/eletropaulinia/current` para o release verificado. O comando `npm run check` precisa das dependências de desenvolvimento da raiz.
3. Criar cluster Atlas Free e usuário do banco com privilégio mínimo; guardar variáveis na VM. Antes de conectar dados reais, ensaiar preparo do banco vazio, transações, backup e restauração em destino isolado. O primeiro administrador é criado manualmente, nunca no startup.
4. Copiar os arquivos de serviço para `/etc/systemd/system/` sem `.example` e o Caddyfile para `/etc/caddy/Caddyfile` após substituir o domínio. Rodar `systemd-analyze verify` nos serviços e `caddy validate --config /etc/caddy/Caddyfile` antes de habilitar. Caddy só obtém certificado se DNS público e portas 80/443 estiverem corretos.
5. Verificar localmente `http://127.0.0.1:5000/health/ready`, `http://127.0.0.1:3000` e, pelo domínio, HTTPS. Conferir por outra rede que 3000/5000 não respondem. Testar login, sessão, OS com vários equipamentos, retirada, correção, permissões, logout e troca de funcionário com dados sintéticos em homologação.

Os serviços usam `ProtectSystem=strict`, o que impede gravações fora de áreas explicitamente liberadas. O Next tem escrita restrita à pasta `.next` para seu cache; confirmar as permissões no release e ajustar a área se o comportamento real exigir. Definir monitoramento e responsável pelo backup antes de abrir para a equipe.

O limite geral de login ainda agrupa todos os funcionários atrás do Next no endereço de loopback. Corrigir/testar essa regra antes do piloto; manter P18 aberta. Ver [alternativa gratuita](../../docs/operacao/ALTERNATIVA-GRATUITA.md) e [pendências](../../docs/PENDENCIAS.md).
