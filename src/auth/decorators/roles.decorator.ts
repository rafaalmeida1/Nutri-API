import { SetMetadata } from '@nestjs/common';
import { Role, Permission } from '../enums/role.enum';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

export const Permissions = (...permissions: Permission[]) => SetMetadata('permissions', permissions);

// Decorador para super admin apenas
export const SuperAdminOnly = () => Roles(Role.SUPER_ADMIN);

// Decorador para nutricionistas admin apenas
export const NutricionistaAdminOnly = () => Roles(Role.NUTRICIONISTA_ADMIN);

// Decorador para qualquer nutricionista (admin ou funcionário)
export const NutricionistaOnly = () => Roles(Role.NUTRICIONISTA_ADMIN, Role.NUTRICIONISTA_FUNCIONARIO);

// Decorador para pacientes apenas
export const PacienteOnly = () => Roles(Role.PACIENTE);

// Decorador para nutricionistas e super admin
export const NutricionistaOrAdmin = () => Roles(Role.NUTRICIONISTA_ADMIN, Role.NUTRICIONISTA_FUNCIONARIO, Role.SUPER_ADMIN);

// Decorador para admins do tenant (nutricionista admin ou super admin)
export const TenantAdminOnly = () => Roles(Role.NUTRICIONISTA_ADMIN, Role.SUPER_ADMIN);

// Decorador para todos os usuários autenticados (qualquer role)
export const AuthenticatedOnly = () => Roles(Role.SUPER_ADMIN, Role.NUTRICIONISTA_ADMIN, Role.NUTRICIONISTA_FUNCIONARIO, Role.PACIENTE); 