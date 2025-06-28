import { Tenant } from '../../src/tenants/entities/tenant.entity';
import { CreateTenantDto } from '../../src/tenants/tenants.service';

export const mockTenants = {
  active: {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Clínica Teste',
    subdomain: 'clinica-teste',
    description: 'Clínica para testes',
    isActive: true,
    ownerId: '550e8400-e29b-41d4-a716-446655440002',
    settings: {
      maxPatients: 100,
      allowedFeatures: ['consultations', 'reports', 'meal_plans'],
      customBranding: {
        logo: 'https://example.com/logo.png',
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
      },
    },
    email: 'contato@clinica-teste.com',
    phone: '(11) 99999-9999',
    address: {
      street: 'Rua Teste, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
      country: 'Brasil',
    },
    metadata: {
      specialty: 'Nutrição Clínica',
      established: '2020',
    },
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    users: [],
  } as any,

  inactive: {
    id: '550e8400-e29b-41d4-a716-446655440011',
    name: 'Clínica Inativa',
    subdomain: 'clinica-inativa',
    description: 'Clínica inativa para testes',
    isActive: false,
    ownerId: '550e8400-e29b-41d4-a716-446655440003',
    settings: {
      maxPatients: 50,
      allowedFeatures: ['consultations'],
    },
    email: 'contato@clinica-inativa.com',
    phone: '(11) 88888-8888',
    address: {
      street: 'Rua Inativa, 456',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '20000-000',
      country: 'Brasil',
    },
    metadata: null,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    users: [],
  } as any,

  newTenant: {
    id: '550e8400-e29b-41d4-a716-446655440012',
    name: 'Nova Clínica',
    subdomain: 'nova-clinica',
    description: 'Nova clínica para testes',
    isActive: true,
    ownerId: '550e8400-e29b-41d4-a716-446655440004',
    settings: null,
    email: 'contato@nova-clinica.com',
    phone: '(11) 77777-7777',
    address: null,
    metadata: null,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    users: [],
  } as any,
};

export const mockCreateTenantDtos = {
  valid: {
    name: 'Clínica Exemplo',
    subdomain: 'clinica-exemplo',
    description: 'Uma clínica de exemplo',
    ownerId: '550e8400-e29b-41d4-a716-446655440002',
    email: 'contato@clinica-exemplo.com',
    phone: '(11) 99999-9999',
  } as CreateTenantDto,

  minimal: {
    name: 'Clínica Mínima',
    subdomain: 'clinica-minima',
    ownerId: '550e8400-e29b-41d4-a716-446655440002',
  } as CreateTenantDto,

  duplicate: {
    name: 'Clínica Teste', // Nome já existe
    subdomain: 'clinica-teste', // Subdomínio já existe
    ownerId: '550e8400-e29b-41d4-a716-446655440002',
  } as CreateTenantDto,
};

export const createMockTenant = (overrides: Partial<Tenant> = {}): Tenant => {
  return {
    ...mockTenants.active,
    ...overrides,
  };
};

export const createMockCreateTenantDto = (overrides: Partial<CreateTenantDto> = {}): CreateTenantDto => {
  return {
    ...mockCreateTenantDtos.valid,
    ...overrides,
  };
}; 