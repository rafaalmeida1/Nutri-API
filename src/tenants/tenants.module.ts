import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant]),
  ],
  providers: [TenantsService],
  exports: [TenantsService], // Exporta para usar em outros módulos
})
export class TenantsModule {} 