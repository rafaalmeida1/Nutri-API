import { User } from '../../src/users/entities/user.entity';
import { Role } from '../../src/auth/enums/role.enum';
import { RegisterDto } from '../../src/auth/dto/register.dto';

export const mockUsers = {
  superAdmin: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'superadmin@test.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/VwirMC3f8Qd6xVq2S', // 'password123'
    name: 'Super Admin',
    role: Role.SUPER_ADMIN,
    tenantId: null,
    isActive: true,
    lastLogin: new Date('2024-01-01T10:00:00.000Z'),
    refreshToken: null,
    nutricionistaId: null,
    crn: null,
    especialidade: null,
    metadata: null,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    tenant: null,
    nutricionista: null,
    pacientes: [],
  } as any,

  nutricionistaAdmin: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'nutri.admin@test.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/VwirMC3f8Qd6xVq2S',
    name: 'Nutricionista Admin',
    role: Role.NUTRICIONISTA_ADMIN,
    tenantId: '550e8400-e29b-41d4-a716-446655440010',
    isActive: true,
    lastLogin: new Date('2024-01-01T10:00:00.000Z'),
    refreshToken: null,
    nutricionistaId: null,
    crn: 'CRN-1234567',
    especialidade: 'Nutrição Clínica',
    metadata: null,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    tenant: null,
    nutricionista: null,
    pacientes: [],
  } as any,

  nutricionistaFuncionario: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'nutri.funcionario@test.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/VwirMC3f8Qd6xVq2S',
    name: 'Nutricionista Funcionário',
    role: Role.NUTRICIONISTA_FUNCIONARIO,
    tenantId: '550e8400-e29b-41d4-a716-446655440010',
    isActive: true,
    lastLogin: new Date('2024-01-01T10:00:00.000Z'),
    refreshToken: null,
    nutricionistaId: null,
    crn: 'CRN-7654321',
    especialidade: 'Nutrição Esportiva',
    metadata: null,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    tenant: null,
    nutricionista: null,
    pacientes: [],
  } as any,

  paciente: {
    id: '550e8400-e29b-41d4-a716-446655440004',
    email: 'paciente@test.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/VwirMC3f8Qd6xVq2S',
    name: 'Paciente Teste',
    role: Role.PACIENTE,
    tenantId: '550e8400-e29b-41d4-a716-446655440010',
    isActive: true,
    lastLogin: new Date('2024-01-01T10:00:00.000Z'),
    refreshToken: null,
    nutricionistaId: '550e8400-e29b-41d4-a716-446655440002',
    crn: null,
    especialidade: null,
    metadata: {
      peso: 70,
      altura: 170,
      objetivo: 'Perda de peso'
    },
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    tenant: null,
    nutricionista: null,
    pacientes: [],
  } as any,

  inactiveUser: {
    id: '550e8400-e29b-41d4-a716-446655440005',
    email: 'inactive@test.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/VwirMC3f8Qd6xVq2S',
    name: 'Usuário Inativo',
    role: Role.PACIENTE,
    tenantId: '550e8400-e29b-41d4-a716-446655440010',
    isActive: false,
    lastLogin: null,
    refreshToken: null,
    nutricionistaId: '550e8400-e29b-41d4-a716-446655440002',
    crn: null,
    especialidade: null,
    metadata: null,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    tenant: null,
    nutricionista: null,
    pacientes: [],
  } as any,
};

export const mockRegisterDtos = {
  superAdmin: {
    email: 'new.superadmin@test.com',
    password: 'password123',
    name: 'Novo Super Admin',
    role: Role.SUPER_ADMIN,
  } as RegisterDto,

  nutricionistaAdmin: {
    email: 'new.nutri.admin@test.com',
    password: 'password123',
    name: 'Novo Nutricionista Admin',
    role: Role.NUTRICIONISTA_ADMIN,
    crn: 'CRN-1111111',
    especialidade: 'Nutrição Funcional',
    tenantName: 'Nova Clínica',
    tenantSubdomain: 'nova-clinica',
    tenantDescription: 'Descrição da nova clínica',
  } as RegisterDto,

  nutricionistaFuncionario: {
    email: 'new.nutri.funcionario@test.com',
    password: 'password123',
    name: 'Novo Nutricionista Funcionário',
    role: Role.NUTRICIONISTA_FUNCIONARIO,
    tenantId: '550e8400-e29b-41d4-a716-446655440010',
    crn: 'CRN-2222222',
    especialidade: 'Nutrição Infantil',
  } as RegisterDto,

  paciente: {
    email: 'new.paciente@test.com',
    password: 'password123',
    name: 'Novo Paciente',
    role: Role.PACIENTE,
    tenantId: '550e8400-e29b-41d4-a716-446655440010',
    nutricionistaId: '550e8400-e29b-41d4-a716-446655440002',
  } as RegisterDto,
};

export const createMockUser = (overrides: Partial<User> = {}): User => {
  return {
    ...mockUsers.paciente,
    ...overrides,
  };
};

export const createMockRegisterDto = (overrides: Partial<RegisterDto> = {}): RegisterDto => {
  return {
    ...mockRegisterDtos.paciente,
    ...overrides,
  };
}; 