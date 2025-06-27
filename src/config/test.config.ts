export const testConfig = {
  // Configurações do Servidor
  nodeEnv: 'test',
  port: 3000,

  // MongoDB em memória para testes (você pode instalar mongodb-memory-server)
  mongodbUri: 'mongodb://localhost:27017/nutri_test',

  // Redis simulado (cache em memória)
  redis: {
    host: 'localhost',
    port: 6379,
    password: '',
  },

  // JWT para testes
  jwt: {
    secret: 'test-jwt-secret',
    expiration: '1h',
  },

  // Super Admin para testes
  superAdmin: {
    email: 'admin@test.com',
    password: 'admin123',
  },
}; 