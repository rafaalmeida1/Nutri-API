import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';

export interface CreateTenantDto {
  name: string;
  subdomain: string;
  description?: string;
  ownerId: string;
  email?: string;
  phone?: string;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    // Verifica se o subdomínio já existe
    const existingTenant = await this.tenantRepository.findOne({
      where: { subdomain: createTenantDto.subdomain },
    });

    if (existingTenant) {
      throw new ConflictException('Este subdomínio já está em uso');
    }

    // Verifica se o nome já existe
    const existingName = await this.tenantRepository.findOne({
      where: { name: createTenantDto.name },
    });

    if (existingName) {
      throw new ConflictException('Este nome já está em uso');
    }

    const tenant = this.tenantRepository.create(createTenantDto);
    return this.tenantRepository.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find({
      where: { isActive: true },
      relations: ['users'],
    });
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({
      where: { id },
      relations: ['users'],
    });
  }

  async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({
      where: { subdomain, isActive: true },
      relations: ['users'],
    });
  }

  async findByOwner(ownerId: string): Promise<Tenant[]> {
    return this.tenantRepository.find({
      where: { ownerId, isActive: true },
      relations: ['users'],
    });
  }

  async update(id: string, updateData: Partial<CreateTenantDto>): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    // Verifica conflitos de subdomínio se estiver sendo alterado
    if (updateData.subdomain && updateData.subdomain !== tenant.subdomain) {
      const existingSubdomain = await this.tenantRepository.findOne({
        where: { subdomain: updateData.subdomain },
      });

      if (existingSubdomain) {
        throw new ConflictException('Este subdomínio já está em uso');
      }
    }

    // Verifica conflitos de nome se estiver sendo alterado
    if (updateData.name && updateData.name !== tenant.name) {
      const existingName = await this.tenantRepository.findOne({
        where: { name: updateData.name },
      });

      if (existingName) {
        throw new ConflictException('Este nome já está em uso');
      }
    }

    Object.assign(tenant, updateData);
    return this.tenantRepository.save(tenant);
  }

  async deactivate(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    tenant.isActive = false;
    return this.tenantRepository.save(tenant);
  }

  async activate(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    tenant.isActive = true;
    return this.tenantRepository.save(tenant);
  }

  // Métodos de estatísticas
  async getTenantStats(id: string): Promise<any> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const totalUsers = tenant.users.length;
    const activeUsers = tenant.users.filter(user => user.isActive).length;
    const nutricionistas = tenant.users.filter(user => user.role === 'nutricionista').length;
    const pacientes = tenant.users.filter(user => user.role === 'paciente').length;

    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      totalUsers,
      activeUsers,
      nutricionistas,
      pacientes,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
    };
  }
} 