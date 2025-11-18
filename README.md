# Eletro Paulínia - Sistema de Gerenciamento de Ordens

Sistema web para gerenciamento de ordens de serviço desenvolvido com React, TypeScript, Vite e Tailwind CSS.

## 🚀 Tecnologias

- **React 18** - Biblioteca para construção de interfaces
- **TypeScript** - Superset JavaScript com tipagem estática
- **Vite** - Build tool e dev server rápido
- **Tailwind CSS** - Framework CSS utility-first
- **React Router DOM** - Roteamento de páginas
- **Supabase** - Backend as a Service (banco de dados e autenticação)
- **Lucide React** - Biblioteca de ícones

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Conta no Supabase (para configuração do backend)

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone <seu-repositorio>
cd eletropaulinia-web
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env e adicione suas credenciais do Supabase
# VITE_SUPABASE_URL=sua-url-do-supabase
# VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

# Eletro Paulínia - Sistema de Gerenciamento de Ordens

Sistema web completo para gerenciamento de ordens de serviço desenvolvido com:
- **Frontend**: React, TypeScript, Vite e Tailwind CSS
- **Backend**: Node.js, Express.js e MongoDB

## 🚀 Tecnologias

### Frontend
- **React 18** - Biblioteca para construção de interfaces
- **TypeScript** - Superset JavaScript com tipagem estática
- **Vite** - Build tool e dev server rápido
- **Tailwind CSS** - Framework CSS utility-first
- **React Router DOM** - Roteamento de páginas
- **Axios** - Cliente HTTP
- **Lucide React** - Biblioteca de ícones

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **MongoDB** - Banco de dados NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticação via tokens
- **bcryptjs** - Criptografia de senhas

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- MongoDB instalado localmente OU conta no MongoDB Atlas (cloud gratuito)

## 🔧 Instalação Rápida

### 1. Clone o repositório
```bash
git clone <seu-repositorio>
cd eletropaulinia-web
```

### 2. Instale o MongoDB

**Opção A: Local (Windows)**
- Baixe em https://www.mongodb.com/try/download/community
- Instale e o serviço iniciará automaticamente

**Opção B: MongoDB Atlas (Cloud)**
- Crie conta gratuita em https://www.mongodb.com/cloud/atlas
- Crie um cluster e obtenha a connection string

### 3. Configure o Backend

```bash
cd backend
npm install
cp .env.example .env
# Edite o .env se necessário
npm run dev
```

### 4. Crie o usuário admin

Com o backend rodando, execute (PowerShell):
```powershell
$body = @{
    username = "admin"
    password = "admin123"
    name = "Administrador"
    role = "admin"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
```

### 5. Configure e execute o Frontend

Em outro terminal:
```bash
cd ..
npm install
npm run dev
```

Acesse http://localhost:5173

## 🎯 Configuração Detalhada

### Backend (.env)

```env
MONGODB_URI=mongodb://localhost:27017/eletropaulinia
PORT=5000
NODE_ENV=development
JWT_SECRET=seu-secret-super-seguro
JWT_EXPIRE=30d
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000/api
```

## 🎮 Scripts Disponíveis

### Frontend
```bash
npm run dev        # Desenvolvimento
npm run build      # Build para produção
npm run preview    # Preview do build
npm run lint       # Executar linter
npm run typecheck  # Verificar tipos TypeScript
```

### Backend
```bash
npm run dev        # Desenvolvimento (com nodemon)
npm start          # Produção
```

## 📂 Estrutura do Projeto

```
eletropaulinia-web/
├── backend/                      # API Node.js + Express
│   ├── config/
│   │   └── database.js           # Configuração MongoDB
│   ├── controllers/
│   │   ├── authController.js     # Lógica de autenticação
│   │   └── orderController.js    # Lógica de ordens
│   ├── middleware/
│   │   └── auth.js               # JWT middleware
│   ├── models/
│   │   ├── User.js               # Schema de usuário
│   │   └── Order.js              # Schema de ordem
│   ├── routes/
│   │   ├── auth.js               # Rotas de autenticação
│   │   └── orders.js             # Rotas de ordens
│   ├── .env.example
│   ├── package.json
│   ├── README.md
│   └── server.js                 # Servidor Express
│
├── src/
│   ├── components/               # Componentes reutilizáveis
│   │   ├── FormInput.tsx
│   │   ├── Layout.tsx
│   │   ├── OrderDetailsModal.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatusBadge.tsx
│   │   └── StatusModal.tsx
│   ├── contexts/                 # Contextos React
│   │   ├── AuthContext.tsx       # Estado de autenticação
│   │   └── OrderContext.tsx      # Estado de ordens
│   ├── pages/                    # Páginas da aplicação
│   │   ├── EditarOrdem.tsx
│   │   ├── Login.tsx
│   │   ├── NovaOrdem.tsx
│   │   └── Ordens.tsx
│   ├── services/
│   │   └── api.ts                # Cliente Axios configurado
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── .env
├── .env.example
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## 🎨 Funcionalidades

- ✅ Autenticação JWT com roles de usuário
- ✅ API RESTful completa
- ✅ Listagem de ordens de serviço
- ✅ Criação de novas ordens
- ✅ Edição de ordens existentes
- ✅ Filtros de busca (cliente, número, status)
- ✅ Atualização de status das ordens
- ✅ Visualização detalhada de ordens
- ✅ Interface responsiva com Tailwind CSS
- ✅ Banco de dados MongoDB

## 📡 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário logado

### Ordens (requer autenticação)
- `GET /api/orders` - Listar todas as ordens
- `GET /api/orders/:id` - Obter ordem específica
- `POST /api/orders` - Criar nova ordem
- `PUT /api/orders/:id` - Atualizar ordem
- `PATCH /api/orders/:id/status` - Atualizar apenas status
- `DELETE /api/orders/:id` - Deletar ordem (apenas admin)

📖 **Documentação completa:** Veja `backend/README.md`

## 🐛 Resolução de Problemas

### Backend não conecta no MongoDB
```bash
# Verifique se o MongoDB está rodando
# Windows: Verifique no Serviços (services.msc)
# Ou use MongoDB Atlas (cloud)
```

### Frontend não conecta no backend
```bash
# Verifique se o backend está rodando na porta 5000
# Confirme VITE_API_URL no arquivo .env
```

### Erro 401 Unauthorized
```bash
# Token expirado ou inválido - faça login novamente
```

### Limpar cache e reinstalar
```bash
# Frontend
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
```

## 📝 Licença

Este projeto é privado e de uso interno.

## 👥 Contribuição

Para contribuir com o projeto:
1. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
2. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
3. Push para a branch (`git push origin feature/MinhaFeature`)
4. Abra um Pull Request

## 📧 Contato

Para dúvidas ou suporte, entre em contato com a equipe de desenvolvimento.

