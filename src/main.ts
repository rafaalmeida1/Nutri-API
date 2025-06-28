import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { envConfig } from './config/env.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuração global de pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuração do CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  // Prefixo global para todas as rotas
  app.setGlobalPrefix('api');

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Nutri App API')
    .setDescription('API para sistema de nutrição com multi-tenancy')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Autenticação e registro')
    .addTag('users', 'Gerenciamento de usuários')
    .addTag('admin', 'Administração global do sistema')
    .addTag('tenant-admin', 'Administração de tenant')
    .addTag('tenants', 'Gerenciamento de tenants')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = envConfig.port;
  await app.listen(port);
  
  console.log(`🚀 Aplicação rodando na porta ${port}`);
  console.log(`📚 Documentação Swagger disponível em: http://localhost:${port}/api`);
  console.log(`🔍 MongoDB Express: http://localhost:8081`);
  console.log(`💾 Redis Insight: http://localhost:5540`);
}

bootstrap();
