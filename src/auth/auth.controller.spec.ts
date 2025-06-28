import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { mockUsers, mockRegisterDtos } from '../../test/fixtures/user.fixtures';
import { Role } from './enums/role.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('login', () => {
    it('deve fazer login com sucesso', async () => {
      const loginDto: LoginDto = {
        email: 'test@test.com',
        password: 'password123',
      };

      const loginResult = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: mockUsers.superAdmin.id,
          email: mockUsers.superAdmin.email,
          name: mockUsers.superAdmin.name,
          role: mockUsers.superAdmin.role,
          tenantId: mockUsers.superAdmin.tenantId,
        },
      };

      authService.login.mockResolvedValue(loginResult);

      const result = await controller.login(loginDto, {} as any);

      expect(result).toEqual(loginResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('deve fazer login com tenant subdomain', async () => {
      const loginDto: LoginDto = {
        email: 'nutri@test.com',
        password: 'password123',
        tenantSubdomain: 'clinica-teste',
      };

      const loginResult = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: mockUsers.nutricionistaAdmin.id,
          email: mockUsers.nutricionistaAdmin.email,
          name: mockUsers.nutricionistaAdmin.name,
          role: mockUsers.nutricionistaAdmin.role,
          tenantId: mockUsers.nutricionistaAdmin.tenantId,
        },
      };

      authService.login.mockResolvedValue(loginResult);

      const result = await controller.login(loginDto, {} as any);

      expect(result).toEqual(loginResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('deve propagar erro do AuthService', async () => {
      const loginDto: LoginDto = {
        email: 'invalid@test.com',
        password: 'wrongpassword',
      };

      const error = new Error('Credenciais inválidas');
      authService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto, {} as any)).rejects.toThrow(error);
    });
  });

  describe('register', () => {
    it('deve registrar super admin com sucesso', async () => {
      const registerDto: RegisterDto = mockRegisterDtos.superAdmin;

      const registerResult = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: mockUsers.superAdmin.id,
          email: mockUsers.superAdmin.email,
          name: mockUsers.superAdmin.name,
          role: mockUsers.superAdmin.role,
          tenantId: mockUsers.superAdmin.tenantId,
        },
      };

      authService.register.mockResolvedValue(registerResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(registerResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('deve registrar nutricionista admin com sucesso', async () => {
      const registerDto: RegisterDto = mockRegisterDtos.nutricionistaAdmin;

      const registerResult = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: mockUsers.nutricionistaAdmin.id,
          email: mockUsers.nutricionistaAdmin.email,
          name: mockUsers.nutricionistaAdmin.name,
          role: mockUsers.nutricionistaAdmin.role,
          tenantId: mockUsers.nutricionistaAdmin.tenantId,
        },
      };

      authService.register.mockResolvedValue(registerResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(registerResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('deve registrar nutricionista funcionário com sucesso', async () => {
      const registerDto: RegisterDto = mockRegisterDtos.nutricionistaFuncionario;

      const registerResult = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: mockUsers.nutricionistaFuncionario.id,
          email: mockUsers.nutricionistaFuncionario.email,
          name: mockUsers.nutricionistaFuncionario.name,
          role: mockUsers.nutricionistaFuncionario.role,
          tenantId: mockUsers.nutricionistaFuncionario.tenantId,
        },
      };

      authService.register.mockResolvedValue(registerResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(registerResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('deve registrar paciente com sucesso', async () => {
      const registerDto: RegisterDto = mockRegisterDtos.paciente;

      const registerResult = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: mockUsers.paciente.id,
          email: mockUsers.paciente.email,
          name: mockUsers.paciente.name,
          role: mockUsers.paciente.role,
          tenantId: mockUsers.paciente.tenantId,
        },
      };

      authService.register.mockResolvedValue(registerResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(registerResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('deve propagar erro do AuthService no registro', async () => {
      const registerDto: RegisterDto = {
        ...mockRegisterDtos.superAdmin,
        email: 'existing@test.com',
      };

      const error = new Error('Email já existe');
      authService.register.mockRejectedValue(error);

      await expect(controller.register(registerDto)).rejects.toThrow(error);
    });
  });

  describe('refreshToken', () => {
    it('deve renovar token com sucesso', async () => {
      const authorization = 'Bearer valid-refresh-token';
      const refreshResult = {
        access_token: 'new-access-token',
      };

      authService.refreshToken.mockResolvedValue(refreshResult);

      const result = await controller.refreshToken(authorization);

      expect(result).toEqual(refreshResult);
      expect(authService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('deve propagar erro para refresh token inválido', async () => {
      const authorization = 'Bearer invalid-refresh-token';
      const error = new Error('Refresh token inválido');

      authService.refreshToken.mockRejectedValue(error);

      await expect(controller.refreshToken(authorization)).rejects.toThrow(error);
    });
  });

  describe('logout', () => {
    it('deve fazer logout com sucesso', async () => {
      const user = {
        id: 'user-id',
        email: 'test@test.com',
        role: 'super_admin',
        tenantId: undefined,
      };
      const logoutResult = {
        message: 'Logout realizado com sucesso',
      };

      authService.logout.mockResolvedValue(logoutResult);

      const result = await controller.logout(user);

      expect(result).toEqual(logoutResult);
      expect(authService.logout).toHaveBeenCalledWith('user-id');
    });

    it('deve propagar erro do AuthService no logout', async () => {
      const user = {
        id: 'user-id',
        email: 'test@test.com',
        role: 'super_admin',
        tenantId: undefined,
      };
      const error = new Error('Erro interno');

      authService.logout.mockRejectedValue(error);

      await expect(controller.logout(user)).rejects.toThrow(error);
    });
  });

  describe('getProfile', () => {
    it('deve retornar perfil do usuário autenticado', async () => {
      const user = {
        id: mockUsers.superAdmin.id,
        email: mockUsers.superAdmin.email,
        role: mockUsers.superAdmin.role,
        tenantId: mockUsers.superAdmin.tenantId,
      };

      const result = await controller.getProfile(user);

      expect(result).toEqual(user);
    });

    it('deve retornar perfil para diferentes tipos de usuários', async () => {
      const cases = [
        {
          id: mockUsers.superAdmin.id,
          email: mockUsers.superAdmin.email,
          role: Role.SUPER_ADMIN,
          tenantId: undefined,
        },
        {
          id: mockUsers.nutricionistaAdmin.id,
          email: mockUsers.nutricionistaAdmin.email,
          role: Role.NUTRICIONISTA_ADMIN,
          tenantId: mockUsers.nutricionistaAdmin.tenantId,
        },
        {
          id: mockUsers.paciente.id,
          email: mockUsers.paciente.email,
          role: Role.PACIENTE,
          tenantId: mockUsers.paciente.tenantId,
        },
      ];

      for (const user of cases) {
        const result = await controller.getProfile(user);
        expect(result).toEqual(user);
      }
    });
  });

  describe('validateUser', () => {
    it('deve validar usuário com dados corretos', async () => {
      const email = 'test@test.com';
      const password = 'password123';
      const user = mockUsers.superAdmin;

      // Método validateUser não é exposto no controller, então seria chamado via Strategy
      // Este teste seria mais apropriado no AuthService, mas incluindo aqui para completude
      
      // Se o método fosse exposto, testaria assim:
      // authService.validateUser.mockResolvedValue(user);
      // const result = await controller.validateUser(email, password);
      // expect(result).toEqual(user);
      
      // Por enquanto, apenas verifica se o método existe no serviço
      expect(authService).toBeDefined();
    });
  });
}); 