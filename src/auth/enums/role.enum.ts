export enum Role {
  SUPER_ADMIN = 'super_admin',             // Acesso total ao sistema
  NUTRICIONISTA_ADMIN = 'nutricionista_admin', // Admin do tenant - gerencia tudo no tenant
  NUTRICIONISTA_FUNCIONARIO = 'nutricionista_funcionario', // Funcionário - acesso limitado no tenant
  PACIENTE = 'paciente',                   // Acesso apenas aos próprios dados
}

export enum Permission {
  // Permissões de usuários
  CREATE_USER = 'create_user',
  READ_USER = 'read_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',
  
  // Permissões de tenant
  CREATE_TENANT = 'create_tenant',
  READ_TENANT = 'read_tenant',
  UPDATE_TENANT = 'update_tenant',
  DELETE_TENANT = 'delete_tenant',
  MANAGE_TENANT_SETTINGS = 'manage_tenant_settings',
  
  // Permissões de pacientes
  CREATE_PATIENT = 'create_patient',
  READ_PATIENT = 'read_patient',
  UPDATE_PATIENT = 'update_patient',
  DELETE_PATIENT = 'delete_patient',
  READ_OWN_DATA = 'read_own_data',
  UPDATE_OWN_DATA = 'update_own_data',
  
  // Permissões de nutricionistas no tenant
  MANAGE_NUTRICIONISTA_ROLES = 'manage_nutricionista_roles',
  INVITE_NUTRICIONISTA = 'invite_nutricionista',
  REMOVE_NUTRICIONISTA = 'remove_nutricionista',
  READ_TENANT_REPORTS = 'read_tenant_reports',
  
  // Permissões de consultas/atendimentos
  CREATE_CONSULTATION = 'create_consultation',
  READ_CONSULTATION = 'read_consultation',
  UPDATE_CONSULTATION = 'update_consultation',
  DELETE_CONSULTATION = 'delete_consultation',
}

// Mapeamento de permissões por role
export const ROLE_PERMISSIONS = {
  [Role.SUPER_ADMIN]: [
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.CREATE_TENANT,
    Permission.READ_TENANT,
    Permission.UPDATE_TENANT,
    Permission.DELETE_TENANT,
    Permission.MANAGE_TENANT_SETTINGS,
    Permission.CREATE_PATIENT,
    Permission.READ_PATIENT,
    Permission.UPDATE_PATIENT,
    Permission.DELETE_PATIENT,
    Permission.MANAGE_NUTRICIONISTA_ROLES,
    Permission.INVITE_NUTRICIONISTA,
    Permission.REMOVE_NUTRICIONISTA,
    Permission.READ_TENANT_REPORTS,
    Permission.CREATE_CONSULTATION,
    Permission.READ_CONSULTATION,
    Permission.UPDATE_CONSULTATION,
    Permission.DELETE_CONSULTATION,
  ],
  [Role.NUTRICIONISTA_ADMIN]: [
    Permission.CREATE_PATIENT,
    Permission.READ_PATIENT,
    Permission.UPDATE_PATIENT,
    Permission.DELETE_PATIENT,
    Permission.READ_OWN_DATA,
    Permission.UPDATE_OWN_DATA,
    Permission.READ_TENANT,
    Permission.UPDATE_TENANT,
    Permission.MANAGE_TENANT_SETTINGS,
    Permission.MANAGE_NUTRICIONISTA_ROLES,
    Permission.INVITE_NUTRICIONISTA,
    Permission.REMOVE_NUTRICIONISTA,
    Permission.READ_TENANT_REPORTS,
    Permission.CREATE_CONSULTATION,
    Permission.READ_CONSULTATION,
    Permission.UPDATE_CONSULTATION,
    Permission.DELETE_CONSULTATION,
  ],
  [Role.NUTRICIONISTA_FUNCIONARIO]: [
    Permission.CREATE_PATIENT,
    Permission.READ_PATIENT,
    Permission.UPDATE_PATIENT,
    Permission.READ_OWN_DATA,
    Permission.UPDATE_OWN_DATA,
    Permission.CREATE_CONSULTATION,
    Permission.READ_CONSULTATION,
    Permission.UPDATE_CONSULTATION,
  ],
  [Role.PACIENTE]: [
    Permission.READ_OWN_DATA,
    Permission.UPDATE_OWN_DATA,
  ],
};

// Helper para verificar se um role é nutricionista
export const isNutricionista = (role: Role): boolean => {
  return role === Role.NUTRICIONISTA_ADMIN || role === Role.NUTRICIONISTA_FUNCIONARIO;
};

// Helper para verificar se um role tem permissões de admin no tenant
export const isTenantAdmin = (role: Role): boolean => {
  return role === Role.SUPER_ADMIN || role === Role.NUTRICIONISTA_ADMIN;
}; 