import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { TenantsModule } from '../src/tenants/tenants.module';
import { User } from '../src/users/entities/user.entity';
import { Tenant } from '../src/tenants/entities/tenant.entity';
import { Role } from '../src/auth/enums/role.enum';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let superAdminToken: string;
  let nutricionistaAdminToken: string;
  let pacienteToken: string;
  
  const testTenant = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Clínica Teste E2E',
    subdomain: 'clinica-teste-e2e',
    ownerId: '550e8400-e29b-41d4-a716-446655440002',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // SQLite em memória para testes
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User, Tenant],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([User, Tenant]),
        JwtModule.register({
          secret: 'test-jwt-secret',
          signOptions: { expiresIn: '1h' },
        }),
        AuthModule,
        UsersModule,
        TenantsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix('api');
    await app.init();

    // Criação de usuários de teste
    await setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupTestData() {
    // Criar Super Admin
    const superAdminResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'superadmin@test.com',
        password: 'password123',
        name: 'Super Admin E2E',
        role: Role.SUPER_ADMIN,
      })
      .expect(201);

    superAdminToken = superAdminResponse.body.access_token;

    // Criar Nutricionista Admin com Tenant
    const nutricionistaResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'nutri.admin@test.com',
        password: 'password123',
        name: 'Nutricionista Admin E2E',
        role: Role.NUTRICIONISTA_ADMIN,
        crn: 'CRN-E2E-001',
        especialidade: 'Nutrição Clínica',
        tenantName: testTenant.name,
        tenantSubdomain: testTenant.subdomain,
      })
      .expect(201);

    nutricionistaAdminToken = nutricionistaResponse.body.access_token;
    testTenant.id = nutricionistaResponse.body.user.tenantId;
    testTenant.ownerId = nutricionistaResponse.body.user.id;

    // Criar Paciente
    const pacienteResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'paciente@test.com',
        password: 'password123',
        name: 'Paciente E2E',
        role: Role.PACIENTE,
        tenantId: testTenant.id,
        nutricionistaId: testTenant.ownerId,
      })
      .expect(201);

    pacienteToken = pacienteResponse.body.access_token;
  }

  describe('/api/auth/register (POST)', () => {
    it('deve registrar super admin com sucesso', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'superadmin2@test.com',
          password: 'password123',
          name: 'Super Admin 2',
          role: Role.SUPER_ADMIN,
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.user).toMatchObject({
        email: 'superadmin2@test.com',
        name: 'Super Admin 2',
        role: Role.SUPER_ADMIN,
        tenantId: null,
      });
    });

    it('deve registrar nutricionista admin criando tenant automaticamente', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'nutri.admin2@test.com',
          password: 'password123',
          name: 'Nutricionista Admin 2',
          role: Role.NUTRICIONISTA_ADMIN,
          crn: 'CRN-E2E-002',
          especialidade: 'Nutrição Esportiva',
          tenantName: 'Clínica Esportiva',
          tenantSubdomain: 'clinica-esportiva',
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user).toMatchObject({
        email: 'nutri.admin2@test.com',
        role: Role.NUTRICIONISTA_ADMIN,
      });
      expect(response.body.user.tenantId).toBeDefined();
    });

    it('deve registrar nutricionista funcionário', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'nutri.funcionario@test.com',
          password: 'password123',
          name: 'Nutricionista Funcionário',
          role: Role.NUTRICIONISTA_FUNCIONARIO,
          tenantId: testTenant.id,
          crn: 'CRN-E2E-003',
          especialidade: 'Nutrição Infantil',
        })
        .expect(201);

      expect(response.body.user).toMatchObject({
        email: 'nutri.funcionario@test.com',
        role: Role.NUTRICIONISTA_FUNCIONARIO,
        tenantId: testTenant.id,
      });
    });

    it('deve registrar paciente', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'paciente2@test.com',
          password: 'password123',
          name: 'Paciente 2',
          role: Role.PACIENTE,
          tenantId: testTenant.id,
          nutricionistaId: testTenant.ownerId,
        })
        .expect(201);

      expect(response.body.user).toMatchObject({
        email: 'paciente2@test.com',
        role: Role.PACIENTE,
        tenantId: testTenant.id,
      });
    });

    it('deve rejeitar email duplicado', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'superadmin@test.com', // Email já existe
          password: 'password123',
          name: 'Tentativa Duplicada',
          role: Role.SUPER_ADMIN,
        })
        .expect(409);
    });

    it('deve rejeitar dados inválidos', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'email-invalido', // Email malformado
          password: '123', // Senha muito curta
          name: '',
          role: 'role_inexistente',
        })
        .expect(400);
    });

    it('deve rejeitar super admin com tenantId', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'superadmin3@test.com',
          password: 'password123',
          name: 'Super Admin Inválido',
          role: Role.SUPER_ADMIN,
          tenantId: testTenant.id, // Super admin não deve ter tenant
        })
        .expect(400);
    });

    it('deve rejeitar paciente sem nutricionistaId', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'paciente3@test.com',
          password: 'password123',
          name: 'Paciente Inválido',
          role: Role.PACIENTE,
          tenantId: testTenant.id,
          // nutricionistaId ausente
        })
        .expect(400);
    });
  });

  describe('/api/auth/login (POST)', () => {
    it('deve fazer login de super admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'superadmin@test.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.user.role).toBe(Role.SUPER_ADMIN);
    });

    it('deve fazer login de nutricionista com tenant', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nutri.admin@test.com',
          password: 'password123',
          tenantSubdomain: testTenant.subdomain,
        })
        .expect(201);

      expect(response.body.user.role).toBe(Role.NUTRICIONISTA_ADMIN);
      expect(response.body.user.tenantId).toBe(testTenant.id);
    });

    it('deve fazer login de paciente', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'paciente@test.com',
          password: 'password123',
          tenantSubdomain: testTenant.subdomain,
        })
        .expect(201);

      expect(response.body.user.role).toBe(Role.PACIENTE);
    });

    it('deve rejeitar credenciais inválidas', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'superadmin@test.com',
          password: 'senhaerrada',
        })
        .expect(401);
    });

    it('deve rejeitar usuário inexistente', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'inexistente@test.com',
          password: 'password123',
        })
        .expect(401);
    });

    it('deve rejeitar login sem tenant para não super admin', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nutri.admin@test.com',
          password: 'password123',
          // tenantSubdomain ausente
        })
        .expect(400);
    });

    it('deve rejeitar tenant inválido', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nutri.admin@test.com',
          password: 'password123',
          tenantSubdomain: 'tenant-inexistente',
        })
        .expect(401);
    });
  });

  describe('/api/auth/refresh (POST)', () => {
    it('deve renovar token com refresh token válido', async () => {
      // Primeiro fazer login para obter refresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'superadmin@test.com',
          password: 'password123',
        });

      const refreshToken = loginResponse.body.refresh_token;

      // Adicionar pequeno delay para garantir timestamp diferente
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Usar refresh token para obter novo access token
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.access_token).not.toBe(loginResponse.body.access_token);
    });

    it('deve rejeitar refresh token inválido', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);
    });

    it('deve rejeitar requisição sem authorization header', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .expect(401);
    });
  });

  describe('/api/auth/profile (GET)', () => {
    it('deve retornar perfil do super admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        email: 'superadmin@test.com',
        role: Role.SUPER_ADMIN,
      });
    });

    it('deve retornar perfil do nutricionista', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${nutricionistaAdminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        email: 'nutri.admin@test.com',
        role: Role.NUTRICIONISTA_ADMIN,
      });
    });

    it('deve retornar perfil do paciente', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${pacienteToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        email: 'paciente@test.com',
        role: Role.PACIENTE,
      });
    });

    it('deve rejeitar acesso sem token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);
    });

    it('deve rejeitar token inválido', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);
    });
  });

  describe('/api/auth/logout (POST)', () => {
    it('deve fazer logout com sucesso', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Logout realizado com sucesso',
      });
    });

    it('deve rejeitar logout sem token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(401);
    });
  });
}); 