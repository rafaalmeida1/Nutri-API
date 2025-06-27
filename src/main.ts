import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { envConfig } from './config/env.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuração de CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Adicione seus domínios
    credentials: true,
  });

  // Prefixo global para todas as rotas
  app.setGlobalPrefix('api');

  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove propriedades não definidas nos DTOs
      forbidNonWhitelisted: true, // Rejeita propriedades extras
      transform: true, // Transforma tipos automaticamente
    }),
  );

  const port = envConfig.port;
  await app.listen(port);
  
  console.log(`🚀 Aplicação rodando na porta ${port}`);
  console.log(`📋 Swagger disponível em: http://localhost:${port}/api`);
  console.log(`🔍 MongoDB Express: http://localhost:8081`);
  console.log(`💾 Redis Insight: http://localhost:5540`);
}

bootstrap();
