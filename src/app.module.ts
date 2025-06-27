import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';
import * as redisStore from 'cache-manager-redis-store';

import { envConfig } from './config/env.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { LogsModule } from './logs/logs.module';
import { AccessLogInterceptor } from './common/interceptors/access-log.interceptor';

// Importar entidades para TypeORM
import { User } from './users/entities/user.entity';
import { Tenant } from './tenants/entities/tenant.entity';

@Module({
  imports: [
    // Configuração do PostgreSQL (Banco Principal)
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: envConfig.postgres.host,
      port: envConfig.postgres.port,
      username: envConfig.postgres.username,
      password: envConfig.postgres.password,
      database: envConfig.postgres.database,
      entities: [User, Tenant],
      synchronize: envConfig.nodeEnv === 'development', // CUIDADO: apenas em desenvolvimento
      logging: envConfig.nodeEnv === 'development',
      ssl: envConfig.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
    }),

    // Configuração do MongoDB (Apenas para Logs)
    MongooseModule.forRoot(envConfig.mongodbUri),

    // Configuração do Redis (Cache)
    CacheModule.register({
      isGlobal: true,
      // Use cache em memória se Redis não estiver disponível
      ...(envConfig.nodeEnv === 'development' && {
        store: 'memory',
        ttl: 300,
      }),
      // Use Redis se estiver configurado
      ...(envConfig.nodeEnv === 'production' && {
        store: redisStore,
        host: envConfig.redis.host,
        port: envConfig.redis.port,
        password: envConfig.redis.password,
        ttl: 300,
      }),
    }),

    // Módulos da aplicação
    AuthModule,
    UsersModule,
    TenantsModule,
    LogsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AccessLogInterceptor,
    },
  ],
})
export class AppModule {}
