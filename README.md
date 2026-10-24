# Eletro Paulínia

Sistema de ordens de serviço em retomada. Next.js/App Router/TypeScript integrado à API Node.js/Express/Mongoose. A API v2 de múltiplos equipamentos, retiradas parciais, concorrência e consultas foi entregue na [etapa 03](docs/dev-back/ETAPA-03-ENTREGA.md). A etapa 04 acrescentou criação, detalhe, edição, retirada, exclusão e gestão de Funcionários no Next, validados somente com MongoDB descartável. A preparação operacional do Atlas continua pendente.

**Sem liberação operacional**: Next lista registros legados e v2, com busca/filtros/paginação no servidor. Escritores v1 bloqueados; registros antigos permanecem somente para leitura até reconciliação. Contador/índices preparados apenas em testes descartáveis, sem migrador real. POST v2 falha fechado sem preparação explícita. [Pendências](docs/PENDENCIAS.md).

## Preparação

Use Node 24 (versão validada em `.node-version`) e npm 11.19.0.

```powershell
npm run setup
# Somente se os arquivos locais ainda não existirem:
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
```

Preencha `backend/.env` com uma conexão de **desenvolvimento** e um `JWT_SECRET` aleatório de pelo menos 32 caracteres. Nenhuma senha padrão é fornecida. Não versione arquivos de ambiente. A conexão pode ser MongoDB local ou Atlas; as alterações administrativas de Funcionários exigem um MongoDB configurado como replica set para transações. Um servidor local standalone permite consultas, mas essas alterações falham de modo seguro. Não há provisionamento automático de infraestrutura.

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

Ensaio local da primeira fatia da etapa 05: `node backend/scripts/stage05-fixture-rehearsal.js --fixtures-only`. O comando cria MongoDB descartável próprio e usa apenas OS sintéticas; não lê `MONGODB_URI`. Consulte [evidências e limites](docs/dev-back/ETAPA-05-PRIMEIRA-FATIA.md). Ele não prepara Atlas nem substitui backup ou migração operacional.

Testes de navegador: execute `npx playwright install chromium`, `npm run build` e `npm run test:e2e`. O runner inicia Next (3100), Express (5101) e MongoDB descartável, sem usar o banco do ambiente local. Porta 5102 é um controle exclusivo de teste para simular indisponibilidade real. As três portas devem estar livres. Produção local: `npm run build` e `npm run preview`; a API precisa rodar separadamente.

O frontend Vite foi preservado em [legacy](legacy/README.md), sem integrar o build ativo. No Next, use `/ordens` para consultar, `/nova-ordem` para cadastrar, `/ordens/:id` para detalhe/retirada/exclusão, `/editar-ordem/:id` para edição e `/funcionarios` para gestão administrativa. Registros antigos são somente leitura. Alterações usam sessão HttpOnly e versões `ETag`/`If-Match`; criação usa `Idempotency-Key`.

## Autenticação e permissões iniciais

Login usa **username**, não e-mail. Cadastro de usuários exige sessão de administrador. O cadastro não devolve senha nem token do novo usuário. Para primeiro administrador, use o procedimento manual do backend.

Os perfis admin, tecnico e atendente mantêm acesso compartilhado às ordens; exclusão e gestão de Funcionários são somente admin. O acesso compartilhado foi confirmado pela empresa. A desativação mantém o histórico e revoga sessões; a redefinição de senha é administrativa e presencial, sem envio automático. Consulte o [contrato v2](docs/contratos/API-V2.md) e o [contrato executado de Funcionários](docs/dev-back/ETAPA-04-FUNCIONARIOS-CONTRATO.md). Retirada antecipada, correção de retirada por qualquer funcionário e alteração da composição após a primeira retirada foram aprovadas como regras, mas ainda não foram implementadas; P01/P02/P11 permanecem abertas.

## Estado e próximos passos

- [Diagnóstico original](docs/diagnostico/RETOMADA.md)
- [Entrega do primeiro ciclo](docs/dev-back/CICLO-1.md)
- [Decisões de continuidade](docs/dev-front/DECISIONS.md)

Ainda há bloqueios antes do uso real: decisões excepcionais, preparação/reconciliação dos dados e índices, triagem de dependências, testes operacionais e homologação/backup do Atlas. Veja docs/PENDENCIAS.md para os estados atuais. A branch WhatsApp não faz parte deste ciclo. Build e testes aprovados não significam prontidão de produção.
