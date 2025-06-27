import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, Permission, ROLE_PERMISSIONS } from '../enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Busca as roles necessárias definidas no decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Busca as permissões necessárias definidas no decorator
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se não há restrições, permite o acesso
    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Verifica roles se especificadas
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Acesso negado. Roles necessárias: ${requiredRoles.join(', ')}`);
    }

    // Verifica permissões se especificadas
    if (requiredPermissions) {
      const userPermissions = ROLE_PERMISSIONS[user.role as Role] || [];
      const hasPermission = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        throw new ForbiddenException(`Acesso negado. Permissões necessárias: ${requiredPermissions.join(', ')}`);
      }
    }

    // Validação adicional para tenant isolation
    if (user.role !== Role.SUPER_ADMIN) {
      const tenantId = request.params?.tenantId || request.body?.tenantId || request.query?.tenantId;
      
      if (tenantId && user.tenantId !== tenantId) {
        throw new ForbiddenException('Acesso negado a recursos de outro tenant');
      }
    }

    return true;
  }
} 