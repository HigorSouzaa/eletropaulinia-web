# Piloto gratuito: Netlify + Render + MongoDB Atlas

## Topologia

- Netlify Free hospeda o Next.js. As chamadas autenticadas saem do servidor Next para a API Express; o navegador não recebe o token da API nem a URI do banco.
- Render Free hospeda o Express. Configure `API_HOST=0.0.0.0` para escutar na porta fornecida em `PORT`. Use `/health/ready` para verificar a conexão com o banco.
- Um projeto e cluster Atlas Free dedicados ao Eletro Paulínia isolam os dados dos outros projetos da organização. O banco desta implantação começa vazio; não apague nem reutilize coleções de outro sistema.

## Configuração

Render: repositório `HigorSouzaa/eletropaulinia-web`, branch desta entrega, runtime Node 24, região próxima do cluster, plano Free, build `npm --prefix backend ci --omit=dev`, start `npm --prefix backend start`. Variáveis: `NODE_ENV=production`, `API_HOST=0.0.0.0`, `MONGODB_URI` (segredo), `JWT_SECRET` (segredo aleatório com ao menos 32 caracteres), `JWT_EXPIRE=1h`. `CORS_ORIGINS` pode ficar vazio, pois o tráfego do Next é servidor a servidor. Não imprima valores de segredos em logs ou documentação.

Netlify: repositório e branch iguais, base no diretório raiz, build `npm run build`, publicação gerenciada pelo suporte Next.js da plataforma, Node 24 via `.node-version`. Variáveis de ambiente apenas no servidor: `API_INTERNAL_URL=https://<servico-render>.onrender.com/api` e `APP_ORIGIN=https://<site-netlify>.netlify.app` (ou domínio final exato). Não prefixe `NEXT_PUBLIC_` nessas variáveis.

Atlas: criar um usuário de banco exclusivo com somente `readWrite` no banco desta aplicação, sem usuário administrativo para a API. Restringir a lista de IPs de rede aos endereços de saída efetivos do Render, quando disponíveis e estáveis. Caso o plano Free não forneça IP de saída estável, avaliar a exposição de rede com aprovação específica antes de liberar acesso amplo. Configurar TLS e usar a URI SRV do cluster. O usuário deve preencher as credenciais diretamente nas plataformas.

## Inicialização e validação

1. Criar o cluster vazio e o acesso mínimo ao banco; testar conexão a partir do Render.
2. Executar o preparo inicial de índices e contador no banco novo, após conferir o alvo e validar que está vazio. O script local de ensaio recusa bancos não descartáveis; a operação remota exige procedimento revisado e autorização específica.
3. Criar primeiro administrador por procedimento administrativo, nunca por cadastro público ou variável versionada.
4. Confirmar `/health/ready`, login, listagem, criação e retirada com dados sintéticos no domínio final. Revisar CORS, cookie, logout, conflito de versão, falha do banco e troca de conta.
5. Registrar backup manual criptografado e ensaiar restauração isolada antes de inserir dados reais. Atlas Free não fornece backup automático do Atlas.

Render Free pode suspender o serviço após inatividade. A tela de login consulta `/api/system/ready` em intervalos de cinco segundos por até 90 segundos e informa a inicialização; não repete automaticamente a tentativa de login. A rota de readiness usa prazo de quatro segundos para não prender uma função Next durante o despertar. Falha persistente exige diagnóstico nos logs do Render e Atlas. Não criar serviço de ping periódico apenas para contornar suspensão.

## Critérios antes do uso diário

Confirmar custo/cotas atuais, segurança de rede do Atlas, backup e restauração, limitação de login quando vários funcionários compartilham o proxy, monitoramento, administrador inicial e aceite dos fluxos reais. A disponibilidade e os limites dos planos gratuitos não oferecem garantia operacional para a empresa; reavaliar plano pago quando o sistema se tornar indispensável.
