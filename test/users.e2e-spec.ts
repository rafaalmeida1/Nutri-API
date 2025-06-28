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

describe('Users (e2e)', () => {
  let app: INestApplication;
  let superAdminToken: string;
  let nutricionistaAdminToken: string;
  let pacienteToken: string;
  
  let testTenant: any;
  let nutricionistaAdminId: string;
  let pacienteId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
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
      });
    superAdminToken = superAdminResponse.body.access_token;

    // Criar Nutricionista Admin com Tenant
    const nutricionistaAdminResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'nutri.admin@test.com',
        password: 'password123',
        name: 'Nutricionista Admin E2E',
        role: Role.NUTRICIONISTA_ADMIN,
        crn: 'CRN-E2E-001',
        especialidade: 'Nutrição Clínica',
        tenantName: 'Clínica Teste E2E',
        tenantSubdomain: 'clinica-teste-e2e',
      });
    
    nutricionistaAdminToken = nutricionistaAdminResponse.body.access_token;
    nutricionistaAdminId = nutricionistaAdminResponse.body.user.id;
    testTenant = {
      id: nutricionistaAdminResponse.body.user.tenantId,
      subdomain: 'clinica-teste-e2e',
    };

    // Criar Paciente
    const pacienteResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'paciente@test.com',
        password: 'password123',
        name: 'Paciente E2E',
        role: Role.PACIENTE,
        tenantId: testTenant.id,
        nutricionistaId: nutricionistaAdminId,
      });
    
    pacienteToken = pacienteResponse.body.access_token;
    pacienteId = pacienteResponse.body.user.id;
  }

  describe('/api/users (GET) - Super Admin Routes', () => {
    it('super admin deve listar todos os usuários', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('deve rejeitar acesso de não super admin', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${nutricionistaAdminToken}`)
        .expect(403);
    });
  });

  describe('/api/users/profile - Profile Routes', () => {
    it('usuário deve conseguir visualizar próprio perfil', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${pacienteToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: pacienteId,
        email: 'paciente@test.com',
        role: Role.PACIENTE,
      });
    });

    it('deve rejeitar acesso sem token', async () => {
      await request(app.getHttpServer())
        .get('/api/users/profile')
        .expect(401);
    });
  });
}); 