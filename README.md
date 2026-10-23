# Eletro Paulínia

Sistema de ordens de serviço em retomada. Base Next.js/App Router/TypeScript com login e listagem integrados à API Node.js/Express/Mongoose. Atlas e os fluxos de múltiplos equipamentos permanecem para as próximas etapas. [Entrega da etapa 02](docs/dev-front/ETAPA-02-ENTREGA.md).

Etapa 03 em andamento: criação/consulta v2 com múltiplos equipamentos entregues como primeira fatia de revisão. **Versão intermediária, sem liberação operacional**: escritores v1 bloqueados; Next ainda lista somente o conjunto legado e não representa OS v2. Contador/índices preparados apenas em testes descartáveis, sem migrador real. [Escopo e limitações](docs/dev-back/ETAPA-03-PRIMEIRO-FLUXO.md).

## Preparação

Use Node 24 (versão validada em `.node-version`) e npm 11.19.0.

```powershell
npm run setup
# Somente se os arquivos locais ainda não existirem:
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
```

Preencha `backend/.env` com uma conexão de **desenvolvimento** e um `JWT_SECRET` aleatório de pelo menos 32 caracteres. Nenhuma senha padrão é fornecida. Não versione arquivos de ambiente. A conexão pode ser MongoDB local ou Atlas; não há provisionamento automático de infraestrutura.

```powershell
npm run start-all
```

Frontend: http://127.0.0.1:3000. API: porta 5000 ou PORT. Configure no ambiente do Next API_INTERNAL_URL=http://127.0.0.1:5000/api e APP_ORIGIN=http://127.0.0.1:3000. A origem do navegador deve coincidir com APP_ORIGIN; em produção, usar HTTPS. Esses valores não têm prefixo NEXT_PUBLIC. Arquivos .env existentes não são alterados automaticamente. A API só abre a porta após conectar ao banco. Variáveis e bootstrap manual: [backend/README.md](backend/README.md).

## Qualidade

```powershell
npm run check
```

Executa tipagem, lint (inclui backend), testes HTTP com MongoDB descartável e build. Os testes nunca usam MONGODB_URI do ambiente da pessoa; criam um banco isolado em loopback e o removem ao terminar. A primeira execução baixa MongoDB 8.0.17 do distribuidor oficial; no Windows, o arquivo de download tem aproximadamente 756 MB. Execuções seguintes reaproveitam o cache. É necessário acesso à rede no primeiro uso.

Scripts individuais: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. A configuração de GitHub Actions repete os checks em Linux; só rodará remotamente após publicação autorizada da branch.

Testes de navegador: execute `npx playwright install chromium`, `npm run build` e `npm run test:e2e`. O runner inicia Next (3100), Express (5101) e MongoDB descartável, sem usar o banco do ambiente local. Porta 5102 é um controle exclusivo de teste para simular indisponibilidade real. As três portas devem estar livres. Produção local: `npm run build` e `npm run preview`; a API precisa rodar separadamente.

O frontend Vite foi preservado em [legacy](legacy/README.md), sem integrar o build ativo. Cadastro e edição no Next estão temporariamente indisponíveis até a API v2; não há promessa de paridade completa.

## Autenticação e permissões iniciais

Login usa **username**, não e-mail. Cadastro de usuários exige sessão de administrador. O cadastro não devolve senha nem token do novo usuário. Para primeiro administrador, use o procedimento manual do backend.

Os perfis admin, tecnico e atendente mantêm acesso compartilhado às ordens; exclusão é somente admin. O acesso compartilhado foi confirmado pela empresa. Consulte os [contratos consolidados e propostas da etapa 01](docs/contratos/README.md) e o [contrato histórico implementado](docs/dev-back/CONTRATOS-CICLO-1.md). Os contratos v2 são propostas, ainda não implementadas.

## Estado e próximos passos

- [Diagnóstico original](docs/diagnostico/RETOMADA.md)
- [Entrega do primeiro ciclo](docs/dev-back/CICLO-1.md)
- [Decisões de continuidade](docs/dev-front/DECISIONS.md)

Ainda há bloqueios antes do uso real: múltiplos equipamentos e retiradas na API, concorrência de numeração, conclusão dos formulários, paginação, triagem de dependências e homologação/backup do Atlas. Sessão/listagem do primeiro fluxo Next foram validadas; veja docs/PENDENCIAS.md para os estados atuais. A branch WhatsApp não faz parte deste ciclo. Build e testes aprovados não significam prontidão de produção.
