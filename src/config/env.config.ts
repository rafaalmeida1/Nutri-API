export const envConfig = {
  // Configurações do Servidor
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000') || 3000,

  // Configuração do PostgreSQL (Banco Principal)
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432') || 5432,
    username: process.env.POSTGRES_USERNAME || 'nutri_user',
    password: process.env.POSTGRES_PASSWORD || 'nutri_password',
    database: process.env.POSTGRES_DATABASE || 'nutri_db',
  },

  // Configuração do MongoDB (Apenas para Logs)
  mongodbUri: process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/nutri_logs?authSource=admin',

  // Configuração do Redis (Cache)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379') || 6379,
    password: process.env.REDIS_PASSWORD || 'redis123',
  },

  // Configuração JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'seu-jwt-secret-super-seguro-aqui-mude-em-producao',
    expiration: process.env.JWT_EXPIRATION || '24h',
  },

  // Configuração do Super Admin
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@nutri.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'Admin123!',
  },
}; 