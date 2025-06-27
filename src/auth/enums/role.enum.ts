export enum Role {
  SUPER_ADMIN = 'super_admin',     // Acesso total ao sistema
  NUTRICIONISTA = 'nutricionista', // Gerencia pacientes do seu tenant
  PACIENTE = 'paciente',           // Acesso apenas aos próprios dados
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
  
  // Permissões de pacientes
  CREATE_PATIENT = 'create_patient',
  READ_PATIENT = 'read_patient',
  UPDATE_PATIENT = 'update_patient',
  DELETE_PATIENT = 'delete_patient',
  READ_OWN_DATA = 'read_own_data',
  UPDATE_OWN_DATA = 'update_own_data',
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
    Permission.CREATE_PATIENT,
    Permission.READ_PATIENT,
    Permission.UPDATE_PATIENT,
    Permission.DELETE_PATIENT,
  ],
  [Role.NUTRICIONISTA]: [
    Permission.CREATE_PATIENT,
    Permission.READ_PATIENT,
    Permission.UPDATE_PATIENT,
    Permission.DELETE_PATIENT,
    Permission.READ_OWN_DATA,
    Permission.UPDATE_OWN_DATA,
  ],
  [Role.PACIENTE]: [
    Permission.READ_OWN_DATA,
    Permission.UPDATE_OWN_DATA,
  ],
}; 