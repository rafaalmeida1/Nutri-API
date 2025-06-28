import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminController } from './admin.controller';
import { TenantAdminController } from './tenant-admin.controller';
import { User } from './entities/user.entity';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    TenantsModule,
  ],
  controllers: [UsersController, AdminController, TenantAdminController],
  providers: [UsersService],
  exports: [UsersService], // Exporta para usar em outros módulos
})
export class UsersModule {} 