import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { UsersService } from './users.service';
import { TenantsService } from '../tenants/tenants.service';
import { User } from './entities/user.entity';
import { Role } from '../auth/enums/role.enum';
import { mockUsers, mockRegisterDtos, createMockUser } from '../../test/fixtures/user.fixtures';
import { mockTenants, createMockTenant } from '../../test/fixtures/tenant.fixtures';
import { createMockRepository } from '../../test/mocks/repository.mock';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;
  let tenantsService: jest.Mocked<TenantsService>;

  beforeEach(async () => {
    const mockUserRepository = createMockRepository();
    const mockTenantsService = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: TenantsService, useValue: mockTenantsService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
    tenantsService = module.get(TenantsService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('deve criar usuário super admin com sucesso', async () => {
      const createUserDto = mockRegisterDtos.superAdmin;
      const hashedPassword = 'hashed-password';
      const savedUser = mockUsers.superAdmin;

      userRepository.findOne.mockResolvedValue(null); // Email não existe
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      userRepository.create.mockReturnValue(savedUser);
      userRepository.save.mockResolvedValue(savedUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(savedUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 12);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: hashedPassword,
      });
      expect(userRepository.save).toHaveBeenCalledWith(savedUser);
    });

    it('deve lançar erro se email já existir', async () => {
      const createUserDto = mockRegisterDtos.superAdmin;
      const existingUser = mockUsers.superAdmin;

      userRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
    });

    it('deve criar nutricionista admin e tenant automaticamente', async () => {
      const createUserDto = {
        ...mockRegisterDtos.nutricionistaAdmin,
        tenantId: undefined,
      };
      const hashedPassword = 'hashed-password';
      const createdTenant = mockTenants.active;
      const savedUser = {
        ...mockUsers.nutricionistaAdmin,
        tenantId: createdTenant.id,
      };

      userRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      tenantsService.create.mockResolvedValue(createdTenant);
      userRepository.create.mockReturnValue(savedUser);
      userRepository.save.mockResolvedValue(savedUser);
      tenantsService.update.mockResolvedValue(createdTenant);

      const result = await service.create(createUserDto);

      expect(result).toEqual(savedUser);
      expect(tenantsService.create).toHaveBeenCalledWith({
        name: createUserDto.tenantName,
        subdomain: createUserDto.tenantSubdomain,
        description: createUserDto.tenantDescription,
        ownerId: 'temp',
        email: createUserDto.email,
      });
      expect(tenantsService.update).toHaveBeenCalledWith(createdTenant.id, {
        ownerId: savedUser.id,
      });
    });

    it('deve validar regras para nutricionista funcionário', async () => {
      const createUserDto = {
        ...mockRegisterDtos.nutricionistaFuncionario,
        tenantId: undefined,
      };

      await expect(service.create(createUserDto)).rejects.toThrow(BadRequestException);
    });

    it('deve validar regras para paciente sem tenantId', async () => {
      const createUserDto = {
        ...mockRegisterDtos.paciente,
        tenantId: undefined,
      };

      await expect(service.create(createUserDto)).rejects.toThrow(BadRequestException);
    });

    it('deve validar regras para paciente sem nutricionistaId', async () => {
      const createUserDto = {
        ...mockRegisterDtos.paciente,
        nutricionistaId: undefined,
      };

      await expect(service.create(createUserDto)).rejects.toThrow(BadRequestException);
    });

    it('deve validar regras para super admin com tenantId', async () => {
      const createUserDto = {
        ...mockRegisterDtos.superAdmin,
        tenantId: 'some-tenant-id',
      };

      await expect(service.create(createUserDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByEmail', () => {
    it('deve encontrar usuário por email', async () => {
      const email = 'test@test.com';
      const user = mockUsers.superAdmin;

      userRepository.findOne.mockResolvedValue(user);

      const result = await service.findByEmail(email);

      expect(result).toEqual(user);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email, isActive: true },
        relations: ['tenant'],
      });
    });

    it('deve retornar null se usuário não existir', async () => {
      const email = 'nonexistent@test.com';

      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('deve encontrar usuário por ID', async () => {
      const id = 'user-id';
      const user = mockUsers.superAdmin;

      userRepository.findOne.mockResolvedValue(user);

      const result = await service.findById(id);

      expect(result).toEqual(user);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['tenant', 'nutricionista', 'pacientes'],
      });
    });

    it('deve retornar null se usuário não existir', async () => {
      const id = 'nonexistent-id';

      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findById(id);

      expect(result).toBeNull();
    });
  });

  describe('findByTenant', () => {
    it('deve encontrar usuários por tenant', async () => {
      const tenantId = 'tenant-id';
      const users = [mockUsers.nutricionistaAdmin, mockUsers.paciente];

      userRepository.find.mockResolvedValue(users);

      const result = await service.findByTenant(tenantId);

      expect(result).toEqual(users);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { tenantId, isActive: true },
        relations: ['tenant'],
      });
    });
  });

  describe('findPatientsByNutricionista', () => {
    it('deve encontrar pacientes por nutricionista', async () => {
      const nutricionistaId = 'nutricionista-id';
      const patients = [mockUsers.paciente];

      userRepository.find.mockResolvedValue(patients);

      const result = await service.findPatientsByNutricionista(nutricionistaId);

      expect(result).toEqual(patients);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { 
          nutricionistaId, 
          role: Role.PACIENTE,
          isActive: true 
        },
        relations: ['tenant'],
      });
    });
  });

  describe('validatePassword', () => {
    it('deve validar senha correta', async () => {
      const password = 'password123';
      const hashedPassword = 'hashed-password';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePassword(password, hashedPassword);

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('deve invalidar senha incorreta', async () => {
      const password = 'wrongpassword';
      const hashedPassword = 'hashed-password';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePassword(password, hashedPassword);

      expect(result).toBe(false);
    });
  });

  describe('updateLastLogin', () => {
    it('deve atualizar último login', async () => {
      const userId = 'user-id';
      const updateSpy = jest.spyOn(Date, 'now').mockReturnValue(1640995200000);

      userRepository.update.mockResolvedValue(undefined as any);

      await service.updateLastLogin(userId);

      expect(userRepository.update).toHaveBeenCalledWith(userId, { 
        lastLogin: expect.any(Date)
      });

      updateSpy.mockRestore();
    });
  });

  describe('updateRefreshToken', () => {
    it('deve atualizar refresh token', async () => {
      const userId = 'user-id';
      const refreshToken = 'refresh-token';
      const hashedToken = 'hashed-token';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedToken);
      userRepository.update.mockResolvedValue(undefined as any);

      await service.updateRefreshToken(userId, refreshToken);

      expect(bcrypt.hash).toHaveBeenCalledWith(refreshToken, 10);
      expect(userRepository.update).toHaveBeenCalledWith(userId, { 
        refreshToken: hashedToken 
      });
    });

    it('deve limpar refresh token quando null', async () => {
      const userId = 'user-id';

      userRepository.update.mockResolvedValue(undefined as any);

      await service.updateRefreshToken(userId, null);

      expect(userRepository.update).toHaveBeenCalledWith(userId, { 
        refreshToken: null 
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deve encontrar todos os usuários ativos', async () => {
      const users = [mockUsers.superAdmin, mockUsers.nutricionistaAdmin];

      userRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['tenant'],
      });
    });
  });

  describe('deactivate', () => {
    it('deve desativar usuário', async () => {
      const userId = 'user-id';
      const user = createMockUser({ id: userId, isActive: true });
      const deactivatedUser = { ...user, isActive: false };

      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(deactivatedUser);

      const result = await service.deactivate(userId);

      expect(result).toEqual(deactivatedUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(userRepository.save).toHaveBeenCalledWith(deactivatedUser);
    });

    it('deve lançar erro se usuário não existir', async () => {
      const userId = 'nonexistent-id';

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.deactivate(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar usuário', async () => {
      const userId = 'user-id';
      const updateData = { name: 'Novo Nome' };
      const user = createMockUser({ id: userId });
      const updatedUser = { ...user, ...updateData };

      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(userRepository.save).toHaveBeenCalledWith(updatedUser);
    });

    it('deve lançar erro se usuário não existir', async () => {
      const userId = 'nonexistent-id';
      const updateData = { name: 'Novo Nome' };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.update(userId, updateData)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findNutricionistasInTenant', () => {
    it('deve encontrar nutricionistas no tenant', async () => {
      const tenantId = 'tenant-id';
      const nutricionistas = [mockUsers.nutricionistaAdmin, mockUsers.nutricionistaFuncionario];

      userRepository.find.mockResolvedValue(nutricionistas);

      const result = await service.findNutricionistasInTenant(tenantId);

      expect(result).toEqual(nutricionistas);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: [
          { 
            tenantId, 
            role: Role.NUTRICIONISTA_ADMIN,
            isActive: true 
          },
          { 
            tenantId, 
            role: Role.NUTRICIONISTA_FUNCIONARIO,
            isActive: true 
          }
        ],
        relations: ['tenant', 'pacientes'],
      });
    });
  });

  describe('findSuperAdmins', () => {
    it('deve encontrar super admins', async () => {
      const superAdmins = [mockUsers.superAdmin];

      userRepository.find.mockResolvedValue(superAdmins);

      const result = await service.findSuperAdmins();

      expect(result).toEqual(superAdmins);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { 
          role: Role.SUPER_ADMIN,
          isActive: true 
        },
      });
    });
  });

  describe('updateUserRole', () => {
    beforeEach(() => {
      // Mock para métodos que não foram testados ainda mas são chamados
      jest.spyOn(service, 'findById').mockImplementation((id) => {
        if (id === 'user-id') return Promise.resolve(mockUsers.nutricionistaAdmin);
        if (id === 'requesting-user-id') return Promise.resolve(mockUsers.superAdmin);
        return Promise.resolve(null);
      });
    });

    it('deve atualizar role do usuário', async () => {
      const userId = 'user-id';
      const newRole = Role.NUTRICIONISTA_FUNCIONARIO;
      const requestingUserId = 'requesting-user-id';
      const updatedUser = { ...mockUsers.nutricionistaAdmin, role: newRole };

      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateUserRole(userId, newRole, requestingUserId);

      expect(result).toEqual(updatedUser);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: newRole })
      );
    });

    it('deve lançar erro se usuário não existir', async () => {
      const userId = 'nonexistent-id';
      const newRole = Role.NUTRICIONISTA_FUNCIONARIO;
      const requestingUserId = 'requesting-user-id';

      jest.spyOn(service, 'findById').mockResolvedValueOnce(null);

      await expect(
        service.updateUserRole(userId, newRole, requestingUserId)
      ).rejects.toThrow(NotFoundException);
    });
  });
}); 