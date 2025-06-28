import { config } from 'dotenv';

// Carrega variáveis de ambiente para testes
config({ path: '.env.test' });

// Configurações globais para testes
global.console = {
  ...console,
  // Suprime alguns logs durante os testes para output mais limpo
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error, // Mantém errors visíveis
};

// Mock do setTimeout para evitar delays desnecessários nos testes
jest.setTimeout(10000);

// Configuração para trabalhar com datas nos testes
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.restoreAllMocks();
}); 