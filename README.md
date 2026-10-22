# Eletro Paulínia

Sistema de ordens de serviço em retomada. Hoje: React/Vite/TypeScript e API Node.js/Express/Mongoose. Destino aprovado: Next.js/TypeScript, Express separado e MongoDB Atlas. A migração do frontend ainda não foi iniciada.

## Preparação

Use Node 24 (versão validada em `.node-version`) e npm 11.19.0.

```powershell
npm run setup
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
```

Preencha `backend/.env` com uma conexão de **desenvolvimento** e um `JWT_SECRET` aleatório de pelo menos 32 caracteres. Nenhuma senha padrão é fornecida. Não versione arquivos de ambiente. A conexão pode ser MongoDB local ou Atlas; não há provisionamento automático de infraestrutura.

```powershell
npm run start-all
```

Frontend: porta padrão do Vite (5173). API: porta 5000 ou PORT. A API só abre a porta após conectar ao banco. Variáveis e bootstrap manual: [backend/README.md](backend/README.md).

## Qualidade

```powershell
npm run check
```

Executa tipagem, lint (inclui backend), testes HTTP com MongoDB descartável e build. Os testes nunca usam MONGODB_URI do ambiente da pessoa; criam um banco isolado em loopback e o removem ao terminar. A primeira execução baixa MongoDB 8.0.17 do distribuidor oficial; no Windows, o arquivo de download tem aproximadamente 756 MB. Execuções seguintes reaproveitam o cache. É necessário acesso à rede no primeiro uso.

Scripts individuais: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. A configuração de GitHub Actions repete os checks em Linux; só rodará remotamente após publicação autorizada da branch.

## Autenticação e permissões iniciais

Login usa **username**, não e-mail. Cadastro de usuários exige sessão de administrador. O cadastro não devolve senha nem token do novo usuário. Para primeiro administrador, use o procedimento manual do backend.

Os perfis admin, tecnico e atendente mantêm acesso compartilhado às ordens; exclusão é somente admin. Essa é a regra inicial compatível com a base existente, sujeita à definição operacional da empresa. Consulte [contratos](docs/dev-back/CONTRATOS-CICLO-1.md).

## Estado e próximos passos

- [Diagnóstico original](docs/diagnostico/RETOMADA.md)
- [Entrega do primeiro ciclo](docs/dev-back/CICLO-1.md)
- [Decisões de continuidade](docs/dev-front/DECISIONS.md)

Ainda há bloqueios antes do uso real: perda de campos na criação, concorrência de numeração, sincronização de sessão/lista no frontend, paginação, triagem de dependências e homologação/backup do Atlas. A branch WhatsApp não faz parte deste ciclo. Build e testes aprovados não significam prontidão de produção.
