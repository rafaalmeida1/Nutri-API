# 🍎 Sistema de Nutricionista - RBAC com JWT

Este é um sistema completo de gestão de nutricionistas com **Role-Based Access Control (RBAC)**, **autenticação JWT**, **multi-tenancy**, **logs de acesso** e **cache Redis**.

## 🏗️ **Arquitetura do Sistema**

### **Roles (Tipos de Acesso)**
- **Super Admin**: Acesso total ao sistema, gerencia tenants e usuários
- **Nutricionista**: Gerencia pacientes dentro do seu tenant
- **Paciente**: Acesso apenas aos próprios dados

### **Estrutura de Tenants**
- Cada clínica/consultório é um **tenant** isolado
- Nutricionistas e pacientes pertencem a um tenant específico
- Super Admin pode acessar todos os tenants

## 🚀 **Como Usar o Sistema**

### **1. Subir o Ambiente com Docker**

```bash
# Subir todos os serviços
npm run docker:up

# Ver logs da API
npm run docker:logs

# Parar todos os serviços
npm run docker:down
```

### **2. Acessar Interfaces Web**
- **API**: http://localhost:3000
- **MongoDB Express**: http://localhost:8081
- **Redis Insight**: http://localhost:5540

### **3. Criar Super Admin Inicial**

```bash
npm run seed:super-admin
```

## 📋 **Fluxo de Uso**

### **Como Super Admin:**

1. **Login**:
```bash
POST /api/auth/login
{
  "email": "admin@nutri.com",
  "password": "Admin123!"
}
```

2. **Criar um Tenant (Clínica)**:
```bash
POST /api/tenants
{
  "name": "Clínica Vida Saudável",
  "subdomain": "vida-saudavel",
  "description": "Clínica especializada em nutrição",
  "ownerId": "ID_DO_NUTRICIONISTA"
}
```

3. **Criar Nutricionista**:
```bash
POST /api/auth/register
{
  "email": "nutricionista@clinic.com",
  "password": "nutri123",
  "name": "Dr. João Silva",
  "role": "nutricionista",
  "tenantId": "ID_DO_TENANT",
  "crn": "12345",
  "especialidade": "Nutrição Esportiva"
}
```

### **Como Nutricionista:**

1. **Login no Tenant**:
```bash
POST /api/auth/login
{
  "email": "nutricionista@clinic.com",
  "password": "nutri123",
  "tenantSubdomain": "vida-saudavel"
}
```

2. **Criar Paciente**:
```bash
POST /api/users
{
  "email": "paciente@email.com",
  "password": "senha123",
  "name": "Maria Santos",
  "role": "paciente",
  "tenantId": "ID_DO_TENANT",
  "nutricionistaId": "ID_DO_NUTRICIONISTA"
}
```

3. **Ver Meus Pacientes**:
```bash
GET /api/users/patients/my
```

### **Como Paciente:**

1. **Login no Tenant**:
```bash
POST /api/auth/login
{
  "email": "paciente@email.com",
  "password": "senha123",
  "tenantSubdomain": "vida-saudavel"
}
```

2. **Ver Meu Perfil**:
```bash
GET /api/users/profile
```

## 🔐 **Sistema de Autenticação**

### **Headers Necessários**
```bash
Authorization: Bearer SEU_JWT_TOKEN
```

### **Refresh Token**
```bash
POST /api/auth/refresh
{
  "refresh_token": "SEU_REFRESH_TOKEN"
}
```

### **Logout**
```bash
POST /api/auth/logout
# Header: Authorization: Bearer SEU_JWT_TOKEN
```

## 📊 **Observabilidade e Logs**

### **Ver Logs de Acesso**
```bash
# Meus logs
GET /api/logs/my-access

# Logs do tenant (nutricionista/admin)
GET /api/logs/tenant/TENANT_ID

# Estatísticas globais (admin)
GET /api/logs/stats

# Estatísticas do tenant
GET /api/logs/stats/tenant/TENANT_ID
```

### **Dados Capturados nos Logs**
- **Usuário**: ID, email, role
- **Ação**: login, logout, read, create, update, delete
- **Recurso**: endpoint acessado
- **Metadata**: IP, User-Agent, tempo de resposta
- **Status**: sucesso/erro

## 🛡️ **Sistema RBAC Detalhado**

### **Permissões por Role**

**Super Admin**:
- ✅ Criar/editar/deletar usuários
- ✅ Criar/editar/deletar tenants
- ✅ Ver todos os logs
- ✅ Acesso a todas as funcionalidades

**Nutricionista**:
- ✅ Criar/editar pacientes (apenas do seu tenant)
- ✅ Ver dados dos seus pacientes
- ✅ Ver logs do seu tenant
- ❌ Não pode criar outros nutricionistas
- ❌ Não pode acessar outros tenants

**Paciente**:
- ✅ Ver/editar próprios dados
- ✅ Ver próprios logs
- ❌ Não pode ver dados de outros pacientes
- ❌ Não pode criar usuários

### **Isolamento de Tenants**

Cada tenant é **completamente isolado**:
- Nutricionistas só veem dados do próprio tenant
- Pacientes só veem próprios dados
- Logs são filtrados por tenant
- Cache é isolado por tenant

## 💾 **Cache Redis**

O sistema usa Redis para:
- **Sessões**: Controle de refresh tokens
- **Cache**: Dados frequentemente acessados
- **Rate Limiting**: Controle de requisições (futuro)

### **TTL Padrão**: 5 minutos

## 🗄️ **Banco de Dados**

### **Coleções MongoDB**

**users**:
- Todos os usuários (super admin, nutricionistas, pacientes)
- Senhas hasheadas com bcrypt
- Relacionamento com tenants

**tenants**:
- Clínicas/consultórios
- Configurações por tenant
- Proprietário (nutricionista)

**access_logs**:
- Todos os acessos ao sistema
- Metadata completa para auditoria
- Análises e observabilidade

### **Índices para Performance**
- `users.email` (único)
- `users.tenantId + users.role`
- `tenants.subdomain` (único)
- `access_logs.userId`
- `access_logs.tenantId`

## 🔧 **Desenvolvimento**

### **Estrutura de Pastas**
```
src/
├── auth/           # Autenticação e autorização
├── users/          # Gestão de usuários
├── tenants/        # Gestão de tenants
├── logs/           # Sistema de logs
├── common/         # Interceptors, guards, etc.
├── config/         # Configurações
└── scripts/        # Scripts utilitários
```

### **Comandos Úteis**
```bash
# Desenvolvimento
npm run start:dev

# Build
npm run build

# Testes
npm test

# Lint
npm run lint

# Criar super admin
npm run seed:super-admin
```

## 🛠️ **Configuração de Ambiente**

Crie um arquivo `.env` na raiz:

```env
# Servidor
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://admin:admin123@localhost:27017/nutri_logs?authSource=admin

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# JWT
JWT_SECRET=seu-jwt-secret-super-seguro-aqui
JWT_EXPIRATION=24h

# Super Admin
SUPER_ADMIN_EMAIL=admin@nutri.com
SUPER_ADMIN_PASSWORD=Admin123!
```

## 📝 **Exemplos de Uso Completos**

### **Fluxo Completo: Criar Clínica e Paciente**

1. **Login como Super Admin**
2. **Criar Tenant**
3. **Criar Nutricionista**
4. **Login como Nutricionista** 
5. **Criar Paciente**
6. **Login como Paciente**
7. **Acessar Dados**

Cada etapa é logada no MongoDB e pode ser monitorada em tempo real!

## 🚨 **Segurança Implementada**

- ✅ **Senhas hasheadas** com bcrypt (salt rounds: 12)
- ✅ **JWT com expiração** configurável
- ✅ **Refresh tokens** seguros
- ✅ **Isolamento de tenants**
- ✅ **Validação de entrada** (class-validator)
- ✅ **CORS configurado**
- ✅ **Logs de auditoria** completos
- ✅ **Rate limiting** ready (Redis)

## 🎯 **Próximos Passos**

Agora você tem um sistema completo de autenticação RBAC! Você pode:

1. **Testar as APIs** com Postman/Insomnia
2. **Ver os logs** no MongoDB Express
3. **Monitorar cache** no Redis Insight
4. **Expandir funcionalidades** (consultas, dietas, etc.)
5. **Adicionar frontend** React/Vue/Angular

**O sistema está pronto para produção** com observabilidade completa! 🎉 