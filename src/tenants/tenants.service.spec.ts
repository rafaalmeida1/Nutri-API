import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { mockTenants, mockCreateTenantDtos, createMockTenant } from '../../test/fixtures/tenant.fixtures';
import { createMockRepository } from '../../test/mocks/repository.mock';

describe('TenantsService', () => {
  let service: TenantsService;
  let tenantRepository: jest.Mocked<Repository<Tenant>>;

  beforeEach(async () => {
    const mockTenantRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepository },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    tenantRepository = module.get(getRepositoryToken(Tenant));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('deve criar tenant com sucesso', async () => {
      const createTenantDto = mockCreateTenantDtos.valid;
      const savedTenant = mockTenants.active;

      tenantRepository.findOne.mockResolvedValueOnce(null) // Subdomínio não existe
                             .mockResolvedValueOnce(null); // Nome não existe
      tenantRepository.create.mockReturnValue(savedTenant);
      tenantRepository.save.mockResolvedValue(savedTenant);

      const result = await service.create(createTenantDto);

      expect(result).toEqual(savedTenant);
      expect(tenantRepository.findOne).toHaveBeenCalledTimes(2);
      expect(tenantRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { subdomain: createTenantDto.subdomain },
      });
      expect(tenantRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { name: createTenantDto.name },
      });
      expect(tenantRepository.create).toHaveBeenCalledWith(createTenantDto);
      expect(tenantRepository.save).toHaveBeenCalledWith(savedTenant);
    });

    it('deve lançar erro se subdomínio já existir', async () => {
      const createTenantDto = mockCreateTenantDtos.duplicate;
      const existingTenant = mockTenants.active;

      tenantRepository.findOne.mockResolvedValue(existingTenant);

      await expect(service.create(createTenantDto)).rejects.toThrow(ConflictException);
      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { subdomain: createTenantDto.subdomain },
      });
    });

    it('deve lançar erro se nome já existir', async () => {
      const createTenantDto = mockCreateTenantDtos.duplicate;
      const existingTenant = mockTenants.active;

      tenantRepository.findOne.mockResolvedValueOnce(null) // Subdomínio não existe
                             .mockResolvedValueOnce(existingTenant); // Nome existe

      await expect(service.create(createTenantDto)).rejects.toThrow(ConflictException);
      expect(tenantRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('deve criar tenant com dados mínimos', async () => {
      const createTenantDto = mockCreateTenantDtos.minimal;
      const savedTenant = createMockTenant(createTenantDto);

      tenantRepository.findOne.mockResolvedValue(null);
      tenantRepository.create.mockReturnValue(savedTenant);
      tenantRepository.save.mockResolvedValue(savedTenant);

      const result = await service.create(createTenantDto);

      expect(result).toEqual(savedTenant);
    });
  });

  describe('findAll', () => {
    it('deve encontrar todos os tenants ativos', async () => {
      const tenants = [mockTenants.active, mockTenants.newTenant];

      tenantRepository.find.mockResolvedValue(tenants);

      const result = await service.findAll();

      expect(result).toEqual(tenants);
      expect(tenantRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['users'],
      });
    });

    it('deve retornar array vazio se não houver tenants', async () => {
      tenantRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('deve encontrar tenant por ID', async () => {
      const id = 'tenant-id';
      const tenant = mockTenants.active;

      tenantRepository.findOne.mockResolvedValue(tenant);

      const result = await service.findById(id);

      expect(result).toEqual(tenant);
      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['users'],
      });
    });

    it('deve retornar null se tenant não existir', async () => {
      const id = 'nonexistent-id';

      tenantRepository.findOne.mockResolvedValue(null);

      const result = await service.findById(id);

      expect(result).toBeNull();
    });
  });

  describe('findBySubdomain', () => {
    it('deve encontrar tenant por subdomínio', async () => {
      const subdomain = 'clinica-teste';
      const tenant = mockTenants.active;

      tenantRepository.findOne.mockResolvedValue(tenant);

      const result = await service.findBySubdomain(subdomain);

      expect(result).toEqual(tenant);
      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { subdomain, isActive: true },
        relations: ['users'],
      });
    });

    it('deve retornar null se tenant não existir ou inativo', async () => {
      const subdomain = 'nonexistent';

      tenantRepository.findOne.mockResolvedValue(null);

      const result = await service.findBySubdomain(subdomain);

      expect(result).toBeNull();
    });
  });

  describe('findByOwner', () => {
    it('deve encontrar tenants por proprietário', async () => {
      const ownerId = 'owner-id';
      const tenants = [mockTenants.active];

      tenantRepository.find.mockResolvedValue(tenants);

      const result = await service.findByOwner(ownerId);

      expect(result).toEqual(tenants);
      expect(tenantRepository.find).toHaveBeenCalledWith({
        where: { ownerId, isActive: true },
        relations: ['users'],
      });
    });

    it('deve retornar array vazio se proprietário não tiver tenants', async () => {
      const ownerId = 'owner-without-tenants';

      tenantRepository.find.mockResolvedValue([]);

      const result = await service.findByOwner(ownerId);

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('deve atualizar tenant com sucesso', async () => {
      const id = 'tenant-id';
      const updateData = { name: 'Novo Nome', description: 'Nova descrição' };
      const tenant = createMockTenant({ id });
      const updatedTenant = { ...tenant, ...updateData };

      tenantRepository.findOne.mockResolvedValueOnce(tenant) // Busca o tenant atual
                             .mockResolvedValueOnce(null) // Verifica se subdomain já existe 
                             .mockResolvedValueOnce(null); // Verifica se nome já existe
      tenantRepository.save.mockResolvedValue(updatedTenant);

      const result = await service.update(id, updateData);

      expect(result).toEqual(updatedTenant);
      expect(tenantRepository.save).toHaveBeenCalledWith(updatedTenant);
    });

    it('deve lançar erro se tenant não existir', async () => {
      const id = 'nonexistent-id';
      const updateData = { name: 'Novo Nome' };

      tenantRepository.findOne.mockResolvedValue(null);

      await expect(service.update(id, updateData)).rejects.toThrow(NotFoundException);
    });

    it('deve validar conflito de subdomínio na atualização', async () => {
      const id = 'tenant-id';
      const updateData = { subdomain: 'novo-subdominio' };
      const tenant = createMockTenant({ id, subdomain: 'subdominio-antigo' });
      const conflictingTenant = createMockTenant({ subdomain: 'novo-subdominio' });

      tenantRepository.findOne.mockResolvedValueOnce(tenant) // Busca o tenant atual
                             .mockResolvedValueOnce(conflictingTenant); // Verifica conflito

      await expect(service.update(id, updateData)).rejects.toThrow(ConflictException);
    });

    it('deve validar conflito de nome na atualização', async () => {
      const id = 'tenant-id';
      const updateData = { name: 'Novo Nome' };
      const tenant = createMockTenant({ id, name: 'Nome Antigo' });
      const conflictingTenant = createMockTenant({ id: 'different-id', name: 'Novo Nome' });

      tenantRepository.findOne
        .mockResolvedValueOnce(tenant) // Busca o tenant atual
        .mockResolvedValueOnce(conflictingTenant); // Nome conflitante

      await expect(service.update(id, updateData)).rejects.toThrow(ConflictException);
    });

    it('deve permitir atualização sem alterar subdomínio/nome', async () => {
      const id = 'tenant-id';
      const updateData = { description: 'Nova descrição' };
      const tenant = createMockTenant({ id });
      const updatedTenant = { ...tenant, ...updateData };

      tenantRepository.findOne.mockResolvedValue(tenant);
      tenantRepository.save.mockResolvedValue(updatedTenant);

      const result = await service.update(id, updateData);

      expect(result).toEqual(updatedTenant);
      // Não deve verificar conflitos se não mudou nome/subdomínio
      expect(tenantRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('deactivate', () => {
    it('deve desativar tenant', async () => {
      const id = 'tenant-id';
      const tenant = createMockTenant({ id, isActive: true });
      const deactivatedTenant = { ...tenant, isActive: false };

      tenantRepository.findOne.mockResolvedValue(tenant);
      tenantRepository.save.mockResolvedValue(deactivatedTenant);

      const result = await service.deactivate(id);

      expect(result).toEqual(deactivatedTenant);
      expect(tenantRepository.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(tenantRepository.save).toHaveBeenCalledWith(deactivatedTenant);
    });

    it('deve lançar erro se tenant não existir', async () => {
      const id = 'nonexistent-id';

      tenantRepository.findOne.mockResolvedValue(null);

      await expect(service.deactivate(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate', () => {
    it('deve ativar tenant', async () => {
      const id = 'tenant-id';
      const tenant = createMockTenant({ id, isActive: false });
      const activatedTenant = { ...tenant, isActive: true };

      tenantRepository.findOne.mockResolvedValue(tenant);
      tenantRepository.save.mockResolvedValue(activatedTenant);

      const result = await service.activate(id);

      expect(result).toEqual(activatedTenant);
      expect(tenantRepository.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(tenantRepository.save).toHaveBeenCalledWith(activatedTenant);
    });

    it('deve lançar erro se tenant não existir', async () => {
      const id = 'nonexistent-id';

      tenantRepository.findOne.mockResolvedValue(null);

      await expect(service.activate(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTenantStats', () => {
    it('deve retornar estatísticas do tenant', async () => {
      const id = 'tenant-id';
      const tenant = {
        ...mockTenants.active,
        users: [
          { role: 'nutricionista_admin', isActive: true },
          { role: 'nutricionista_funcionario', isActive: true },
          { role: 'paciente', isActive: true },
          { role: 'paciente', isActive: false },
        ] as any,
      };

      tenantRepository.findOne.mockResolvedValue(tenant);

      const result = await service.getTenantStats(id);

      expect(result).toEqual({
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        totalUsers: 4,
        activeUsers: 3,
        nutricionistas: 2,
        pacientes: 2,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
      });

      expect(tenantRepository.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['users'],
      });
    });

    it('deve lançar erro se tenant não existir', async () => {
      const id = 'nonexistent-id';

      tenantRepository.findOne.mockResolvedValue(null);

      await expect(service.getTenantStats(id)).rejects.toThrow(NotFoundException);
    });

    it('deve retornar estatísticas corretas para tenant sem usuários', async () => {
      const id = 'tenant-id';
      const tenant = {
        ...mockTenants.active,
        users: [],
      };

      tenantRepository.findOne.mockResolvedValue(tenant);

      const result = await service.getTenantStats(id);

      expect(result).toMatchObject({
        totalUsers: 0,
        activeUsers: 0,
        nutricionistas: 0,
        pacientes: 0,
      });
    });
  });
}); 