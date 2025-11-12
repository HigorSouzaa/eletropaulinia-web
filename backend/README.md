# Backend - Eletro Paulínia API

API RESTful para o sistema de gerenciamento de ordens de serviço.

## 🚀 Tecnologias

- Node.js
- Express.js
- MongoDB & Mongoose
- JWT para autenticação
- bcryptjs para criptografia de senhas

## 📦 Instalação

```bash
cd backend
npm install
```

## ⚙️ Configuração

1. Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

2. Configure as variáveis de ambiente no arquivo `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/eletropaulinia
PORT=5000
NODE_ENV=development
JWT_SECRET=seu-secret-key-super-seguro-aqui
JWT_EXPIRE=30d
```

## 🗄️ MongoDB

### Instalação Local

**Windows:**
1. Baixe o MongoDB Community Server em https://www.mongodb.com/try/download/community
2. Instale e inicie o serviço
3. MongoDB estará rodando em `mongodb://localhost:27017`

**Ou use MongoDB Atlas (Cloud):**
1. Crie uma conta em https://www.mongodb.com/cloud/atlas
2. Crie um cluster gratuito
3. Obtenha a connection string
4. Use no `.env`: `MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/eletropaulinia`

## ▶️ Executando

### Modo desenvolvimento (com auto-reload):
```bash
npm run dev
```

### Modo produção:
```bash
npm start
```

A API estará disponível em `http://localhost:5000`

## 📚 Endpoints da API

### Autenticação

#### POST `/api/auth/register`
Registrar novo usuário (use para criar o primeiro admin)

**Body:**
```json
{
  "username": "admin",
  "password": "admin123",
  "name": "Administrador",
  "role": "admin"
}
```

#### POST `/api/auth/login`
Fazer login

**Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "_id": "...",
  "username": "admin",
  "name": "Administrador",
  "role": "admin",
  "token": "eyJhbGc..."
}
```

#### GET `/api/auth/me`
Obter dados do usuário logado (requer token)

**Headers:**
```
Authorization: Bearer {token}
```

### Ordens de Serviço

Todas as rotas de ordens requerem autenticação (token JWT).

#### GET `/api/orders`
Listar todas as ordens

#### GET `/api/orders/:id`
Obter uma ordem específica

#### POST `/api/orders`
Criar nova ordem

**Body:**
```json
{
  "numero": "OS-0001",
  "cliente": "João Silva",
  "equipamento": "TV Samsung 50\"",
  "marca": "Samsung",
  "defeito": "Não liga",
  "dataEntrada": "2025-01-05",
  "dataPrevista": "2025-01-12",
  "tecnico": "Carlos",
  "observacoes": "Cliente relatou que TV apagou de repente",
  "status": "Aguardando"
}
```

#### PUT `/api/orders/:id`
Atualizar uma ordem completa

#### PATCH `/api/orders/:id/status`
Atualizar apenas o status

**Body:**
```json
{
  "status": "Em andamento"
}
```

#### DELETE `/api/orders/:id`
Deletar uma ordem (apenas admin)

## 🔐 Autenticação

A API usa JWT (JSON Web Tokens) para autenticação. Após o login, inclua o token no header de todas as requisições:

```
Authorization: Bearer {seu-token-aqui}
```

## 👥 Roles de Usuário

- **admin**: Acesso total (pode deletar ordens)
- **tecnico**: Pode criar e editar ordens
- **atendente**: Pode criar e visualizar ordens

## 📝 Modelos de Dados

### User
```javascript
{
  username: String (único),
  password: String (criptografado),
  name: String,
  role: String (admin | tecnico | atendente),
  createdAt: Date
}
```

### Order
```javascript
{
  numero: String (único),
  cliente: String,
  equipamento: String,
  marca: String,
  defeito: String,
  status: String (Aguardando | Em andamento | Pronto | Entregue),
  dataEntrada: Date,
  dataPrevista: Date,
  tecnico: String,
  observacoes: String,
  createdBy: ObjectId (ref: User),
  timestamps: true (createdAt, updatedAt)
}
```

## 🛠️ Scripts Úteis

### Criar usuário admin inicial

Use um cliente HTTP (Postman, Insomnia, ou curl):

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "name": "Administrador",
    "role": "admin"
  }'
```

## 🐛 Troubleshooting

### MongoDB não conecta
- Verifique se o MongoDB está rodando
- Confirme a connection string no `.env`
- Para MongoDB local, use: `mongodb://localhost:27017/eletropaulinia`

### Erro "JWT_SECRET is not defined"
- Certifique-se de ter criado o arquivo `.env` a partir do `.env.example`
- Defina um valor para `JWT_SECRET`

### Porta 5000 já em uso
- Altere a porta no `.env`: `PORT=3001`
- Atualize também no frontend (`.env` do React)

## 📄 Licença

Uso interno.
