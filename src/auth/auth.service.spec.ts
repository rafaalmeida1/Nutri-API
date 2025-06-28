import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { Role } from './enums/role.enum';
import { mockUsers, mockRegisterDtos } from '../../test/fixtures/user.fixtures';
import { mockTenants } from '../../test/fixtures/tenant.fixtures';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let tenantsService: jest.Mocked<TenantsService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      validatePassword: jest.fn(),
      updateLastLogin: jest.fn(),
      updateRefreshToken: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    const mockTenantsService = {
      findBySubdomain: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: TenantsService, useValue: mockTenantsService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    tenantsService = module.get(TenantsService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('validateUser', () => {
    it('deve validar um super admin com sucesso', async () => {
      const user = mockUsers.superAdmin;
      usersService.findByEmail.mockResolvedValue(user);
      usersService.validatePassword.mockResolvedValue(true);

      const result = await service.validateUser('superadmin@test.com', 'password123');

      expect(result).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        refreshToken: user.refreshToken,
        nutricionistaId: user.nutricionistaId,
        crn: user.crn,
        especialidade: user.especialidade,
        metadata: user.metadata,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        tenant: user.tenant,
        nutricionista: user.nutricionista,
        pacientes: user.pacientes,
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith('superadmin@test.com');
      expect(usersService.validatePassword).toHaveBeenCalledWith('password123', user.password);
    });

    it('deve validar um nutricionista admin com tenant válido', async () => {
      const user = mockUsers.nutricionistaAdmin;
      const tenant = mockTenants.active;
      
      usersService.findByEmail.mockResolvedValue(user);
      usersService.validatePassword.mockResolvedValue(true);
      tenantsService.findBySubdomain.mockResolvedValue(tenant);

      const result = await service.validateUser('nutri.admin@test.com', 'password123', 'clinica-teste');

      expect(result).toBeDefined();
      expect(result.email).toBe(user.email);
      expect(tenantsService.findBySubdomain).toHaveBeenCalledWith('clinica-teste');
    });

    it('deve retornar null para usuário inexistente', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('inexistente@test.com', 'password123');

      expect(result).toBeNull();
    });

    it('deve retornar null para senha incorreta', async () => {
      const user = mockUsers.superAdmin;
      usersService.findByEmail.mockResolvedValue(user);
      usersService.validatePassword.mockResolvedValue(false);

      const result = await service.validateUser('superadmin@test.com', 'senhaerrada');

      expect(result).toBeNull();
    });

    it('deve lançar erro se usuário não super admin tentar logar sem tenant', async () => {
      const user = mockUsers.nutricionistaAdmin;
      usersService.findByEmail.mockResolvedValue(user);
      usersService.validatePassword.mockResolvedValue(true);

      await expect(
        service.validateUser('nutri.admin@test.com', 'password123')
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar erro para tenant inválido', async () => {
      const user = mockUsers.nutricionistaAdmin;
      usersService.findByEmail.mockResolvedValue(user);
      usersService.validatePassword.mockResolvedValue(true);
      tenantsService.findBySubdomain.mockResolvedValue(null);

      await expect(
        service.validateUser('nutri.admin@test.com', 'password123', 'tenant-inexistente')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar erro para tenant inativo', async () => {
      const user = mockUsers.nutricionistaAdmin;
      const tenant = { ...mockTenants.active, isActive: false };
      
      usersService.findByEmail.mockResolvedValue(user);
      usersService.validatePassword.mockResolvedValue(true);
      tenantsService.findBySubdomain.mockResolvedValue(tenant);

      await expect(
        service.validateUser('nutri.admin@test.com', 'password123', 'clinica-teste')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar erro se usuário não pertencer ao tenant', async () => {
      const user = { ...mockUsers.nutricionistaAdmin, tenantId: 'outro-tenant-id' };
      const tenant = mockTenants.active;
      
      usersService.findByEmail.mockResolvedValue(user);
      usersService.validatePassword.mockResolvedValue(true);
      tenantsService.findBySubdomain.mockResolvedValue(tenant);

      await expect(
        service.validateUser('nutri.admin@test.com', 'password123', 'clinica-teste')
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('deve fazer login com sucesso', async () => {
      const user = mockUsers.superAdmin;
      const loginDto = { email: 'superadmin@test.com', password: 'password123' };
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      usersService.findByEmail.mockResolvedValue(user);
      usersService.validatePassword.mockResolvedValue(true);
      usersService.updateLastLogin.mockResolvedValue(undefined);
      usersService.updateRefreshToken.mockResolvedValue(undefined);
      jwtService.sign.mockReturnValueOnce(accessToken).mockReturnValueOnce(refreshToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        },
      });

      expect(usersService.updateLastLogin).toHaveBeenCalledWith(user.id);
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(user.id, refreshToken);
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('deve lançar erro para credenciais inválidas', async () => {
      const loginDto = { email: 'invalid@test.com', password: 'password123' };
      
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('deve registrar super admin com sucesso', async () => {
      const registerDto = mockRegisterDtos.superAdmin;
      const createdUser = mockUsers.superAdmin;
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      usersService.create.mockResolvedValue(createdUser);
      usersService.updateRefreshToken.mockResolvedValue(undefined);
      jwtService.sign.mockReturnValueOnce(accessToken).mockReturnValueOnce(refreshToken);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
          role: createdUser.role,
          tenantId: createdUser.tenantId,
        },
      });

      expect(usersService.create).toHaveBeenCalledWith(registerDto);
    });

    it('deve lançar erro se super admin tiver tenantId', async () => {
      const registerDto = { ...mockRegisterDtos.superAdmin, tenantId: 'some-tenant-id' };

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('deve registrar nutricionista admin sem tenantId (criará tenant)', async () => {
      const registerDto = mockRegisterDtos.nutricionistaAdmin;
      const createdUser = mockUsers.nutricionistaAdmin;
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      usersService.create.mockResolvedValue(createdUser);
      usersService.updateRefreshToken.mockResolvedValue(undefined);
      jwtService.sign.mockReturnValueOnce(accessToken).mockReturnValueOnce(refreshToken);

      const result = await service.register(registerDto);

      expect(result).toBeDefined();
      expect(result.access_token).toBe(accessToken);
      expect(usersService.create).toHaveBeenCalledWith(registerDto);
    });

    it('deve validar tenant para nutricionista admin com tenantId fornecido', async () => {
      const registerDto = {
        ...mockRegisterDtos.nutricionistaAdmin,
        tenantId: '550e8400-e29b-41d4-a716-446655440010',
      };
      const tenant = mockTenants.active;
      const createdUser = mockUsers.nutricionistaAdmin;

      tenantsService.findById.mockResolvedValue(tenant);
      usersService.create.mockResolvedValue(createdUser);
      usersService.updateRefreshToken.mockResolvedValue(undefined);
      jwtService.sign.mockReturnValue('token');

      await service.register(registerDto);

      expect(tenantsService.findById).toHaveBeenCalledWith(registerDto.tenantId);
    });

    it('deve lançar erro para tenant inválido no registro de nutricionista admin', async () => {
      const registerDto = {
        ...mockRegisterDtos.nutricionistaAdmin,
        tenantId: '550e8400-e29b-41d4-a716-446655440010',
      };

      tenantsService.findById.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar erro se nutricionista funcionário não tiver tenantId', async () => {
      const registerDto = {
        ...mockRegisterDtos.nutricionistaFuncionario,
        tenantId: undefined,
      };

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar erro se paciente não tiver tenantId', async () => {
      const registerDto = {
        ...mockRegisterDtos.paciente,
        tenantId: undefined,
      };

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar erro se paciente não tiver nutricionistaId', async () => {
      const registerDto = {
        ...mockRegisterDtos.paciente,
        nutricionistaId: undefined,
      };

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('deve validar nutricionista para paciente', async () => {
      const registerDto = mockRegisterDtos.paciente;
      const tenant = mockTenants.active;
      const nutricionista = mockUsers.nutricionistaAdmin;
      const createdUser = mockUsers.paciente;

      tenantsService.findById.mockResolvedValue(tenant);
      usersService.findById.mockResolvedValue(nutricionista);
      usersService.create.mockResolvedValue(createdUser);
      usersService.updateRefreshToken.mockResolvedValue(undefined);
      jwtService.sign.mockReturnValue('token');

      await service.register(registerDto);

      expect(usersService.findById).toHaveBeenCalledWith(registerDto.nutricionistaId);
    });

    it('deve lançar erro para nutricionista inválido no registro de paciente', async () => {
      const registerDto = mockRegisterDtos.paciente;
      const tenant = mockTenants.active;

      tenantsService.findById.mockResolvedValue(tenant);
      usersService.findById.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    it('deve gerar novo access token com refresh token válido', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 'user-id', email: 'test@test.com', role: Role.SUPER_ADMIN };
      const user = mockUsers.superAdmin;
      const newAccessToken = 'new-access-token';

      jwtService.verify.mockReturnValue(payload);
      usersService.findById.mockResolvedValue(user);
      jwtService.sign.mockReturnValue(newAccessToken);

      const result = await service.refreshToken(refreshToken);

      expect(result).toEqual({
        access_token: newAccessToken,
      });

      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken);
      expect(usersService.findById).toHaveBeenCalledWith(payload.sub);
    });

    it('deve lançar erro para refresh token inválido', async () => {
      const refreshToken = 'invalid-refresh-token';

      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar erro para usuário inválido no refresh', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 'invalid-user-id' };

      jwtService.verify.mockReturnValue(payload);
      usersService.findById.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar erro para usuário inativo no refresh', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 'user-id' };
      const inactiveUser = { ...mockUsers.superAdmin, isActive: false };

      jwtService.verify.mockReturnValue(payload);
      usersService.findById.mockResolvedValue(inactiveUser);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('deve fazer logout com sucesso', async () => {
      const userId = 'user-id';
      
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.logout(userId);

      expect(result).toEqual({
        message: 'Logout realizado com sucesso',
      });

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(userId, null);
    });
  });
}); 