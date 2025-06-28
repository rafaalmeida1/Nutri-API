import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';

import { User } from '../src/users/entities/user.entity';
import { Tenant } from '../src/tenants/entities/tenant.entity';

@Module({
  imports: [
    // TypeORM para testes com SQLite em memória
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Tenant],
      synchronize: true,
      dropSchema: true,
      logging: false,
      // Usar transformação para jsonb -> text
      migrations: [],
      migrationsRun: false,
    }),

    // Registra as entidades para uso nos testes
    TypeOrmModule.forFeature([User, Tenant]),

    // MongoDB para testes (opcional - pode usar mock)
    MongooseModule.forRoot('mongodb://memory'),

    // JWT para testes
    JwtModule.register({
      secret: 'test-jwt-secret',
      signOptions: { expiresIn: '1h' },
    }),

    // Cache em memória para testes
    CacheModule.register({
      store: 'memory',
      ttl: 300,
    }),
  ],
  exports: [TypeOrmModule, JwtModule, CacheModule],
})
export class TestModule {} 