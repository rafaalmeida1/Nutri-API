import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { TenantsService } from '../tenants/tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { SuperAdminOnly } from '../auth/decorators/roles.decorator';
import { RegisterDto } from '../auth/dto/register.dto';
import { Role } from '../auth/enums/role.enum';

interface UpdateTenantSettingsDto {
  maxPatients?: number;
  allowedFeatures?: string[];
  customBranding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

interface GlobalRoleUpdateDto {
  userId: string;
  newRole: Role;
  tenantId?: string;
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@SuperAdminOnly()
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
  ) {}

  // Gerenciamento global de usuários
  @Get('users')
  @ApiOperation({
    summary: 'Listar todos os usuários (Super Admin)',
    description: 'Retorna todos os usuários do sistema'
  })
  @ApiOkResponse({ description: 'Lista de todos os usuários' })
  @ApiForbiddenResponse({ description: 'Acesso negado - apenas super admin' })
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @Get('users/super-admins')
  @ApiOperation({
    summary: 'Listar super admins',
    description: 'Retorna lista de todos os super administradores'
  })
  @ApiOkResponse({ description: 'Lista de super admins' })
  async getSuperAdmins() {
    return this.usersService.findSuperAdmins();
  }

  @Post('users/create-super-admin')
  @ApiOperation({
    summary: 'Criar super admin',
    description: 'Cria um novo super administrador'
  })
  @ApiBody({
    description: 'Dados do super admin',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'superadmin@sistema.com' },
        password: { type: 'string', example: 'senha123456' },
        name: { type: 'string', example: 'Super Administrador' }
      },
      required: ['email', 'password', 'name']
    }
  })
  @ApiCreatedResponse({ description: 'Super admin criado com sucesso' })
  async createSuperAdmin(
    @Body(ValidationPipe) createAdminDto: {
      email: string;
      password: string;
      name: string;
    },
  ) {
    const registerDto: RegisterDto = {
      ...createAdminDto,
      role: Role.SUPER_ADMIN,
    };

    return this.usersService.create(registerDto);
  }

  @Patch('users/:id/role')
  @ApiOperation({
    summary: 'Alterar role globalmente',
    description: 'Altera a role de qualquer usuário no sistema'
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário',
    example: 'uuid-do-usuario'
  })
  @ApiBody({
    description: 'Dados para alteração de role',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: 'uuid-do-usuario' },
        newRole: { 
          type: 'string', 
          enum: ['super_admin', 'nutricionista_admin', 'nutricionista_funcionario', 'paciente'],
          example: 'nutricionista_admin'
        },
        tenantId: { type: 'string', example: 'uuid-do-tenant', nullable: true }
      },
      required: ['userId', 'newRole']
    }
  })
  @ApiOkResponse({ description: 'Role alterada com sucesso' })
  async updateUserRoleGlobal(
    @Param('id') userId: string,
    @Body(ValidationPipe) updateDto: GlobalRoleUpdateDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Super admin pode alterar qualquer role
    if (updateDto.newRole !== Role.SUPER_ADMIN && updateDto.tenantId) {
      // Se não for super admin, precisa de tenantId
      const targetUser = await this.usersService.findById(userId);
      if (targetUser) {
        await this.usersService.update(userId, { tenantId: updateDto.tenantId });
      }
    }

    return this.usersService.updateUserRole(userId, updateDto.newRole, user.id);
  }

  @Delete('users/:id')
  @ApiOperation({
    summary: 'Deletar usuário',
    description: 'Remove um usuário do sistema'
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário',
    example: 'uuid-do-usuario'
  })
  @ApiOkResponse({ description: 'Usuário removido com sucesso' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  async deleteUser(@Param('id') userId: string) {
    return this.usersService.deactivate(userId);
  }

  // Gerenciamento global de tenants
  @Get('tenants')
  @ApiOperation({
    summary: 'Listar todos os tenants',
    description: 'Retorna lista de todos os tenants do sistema'
  })
  @ApiOkResponse({ description: 'Lista de tenants' })
  async getAllTenants() {
    return this.tenantsService.findAll();
  }

  @Get('tenants/:id/stats')
  @ApiOperation({
    summary: 'Estatísticas do tenant',
    description: 'Retorna estatísticas detalhadas de um tenant'
  })
  @ApiParam({
    name: 'id',
    description: 'ID do tenant',
    example: 'uuid-do-tenant'
  })
  @ApiOkResponse({ description: 'Estatísticas do tenant' })
  @ApiNotFoundResponse({ description: 'Tenant não encontrado' })
  async getTenantStats(@Param('id') tenantId: string) {
    return this.tenantsService.getTenantStats(tenantId);
  }

  @Patch('tenants/:id/settings')
  @ApiOperation({
    summary: 'Atualizar configurações do tenant',
    description: 'Atualiza configurações específicas de um tenant'
  })
  @ApiParam({
    name: 'id',
    description: 'ID do tenant',
    example: 'uuid-do-tenant'
  })
  @ApiBody({
    description: 'Configurações do tenant',
    schema: {
      type: 'object',
      properties: {
        maxPatients: { type: 'number', example: 100 },
        allowedFeatures: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['reports', 'scheduling', 'nutrition_plans']
        },
        customBranding: {
          type: 'object',
          properties: {
            logo: { type: 'string', example: 'https://logo-url.com' },
            primaryColor: { type: 'string', example: '#00A86B' },
            secondaryColor: { type: 'string', example: '#FFF' }
          }
        }
      }
    }
  })
  @ApiOkResponse({ description: 'Configurações atualizadas com sucesso' })
  async updateTenantSettings(
    @Param('id') tenantId: string,
    @Body(ValidationPipe) settingsDto: UpdateTenantSettingsDto,
  ) {
    return this.tenantsService.update(tenantId, {
      settings: settingsDto,
    });
  }

  @Delete('tenants/:id')
  @ApiOperation({
    summary: 'Desativar tenant',
    description: 'Desativa um tenant do sistema'
  })
  @ApiParam({
    name: 'id',
    description: 'ID do tenant',
    example: 'uuid-do-tenant'
  })
  @ApiOkResponse({ description: 'Tenant desativado com sucesso' })
  async deactivateTenant(@Param('id') tenantId: string) {
    return this.tenantsService.deactivate(tenantId);
  }

  @Patch('tenants/:id/activate')
  @ApiOperation({
    summary: 'Ativar tenant',
    description: 'Ativa um tenant no sistema'
  })
  @ApiParam({
    name: 'id',
    description: 'ID do tenant',
    example: 'uuid-do-tenant'
  })
  @ApiOkResponse({ description: 'Tenant ativado com sucesso' })
  async activateTenant(@Param('id') tenantId: string) {
    return this.tenantsService.activate(tenantId);
  }

  // Relatórios e estatísticas globais
  @Get('reports/system-overview')
  @ApiOperation({
    summary: 'Visão geral do sistema',
    description: 'Retorna estatísticas gerais do sistema'
  })
  @ApiOkResponse({
    description: 'Visão geral do sistema',
    schema: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number' },
        totalTenants: { type: 'number' },
        activeTenants: { type: 'number' },
        usersByRole: { type: 'object' },
        systemHealth: {
          type: 'object',
          properties: {
            activeUsers: { type: 'number' },
            inactiveUsers: { type: 'number' },
            tenantsWithUsers: { type: 'number' }
          }
        }
      }
    }
  })
  async getSystemOverview() {
    const allUsers = await this.usersService.findAll();
    const allTenants = await this.tenantsService.findAll();

    const usersByRole = allUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const activeTenants = allTenants.filter(t => t.isActive).length;
    const totalUsers = allUsers.length;

    return {
      totalUsers,
      totalTenants: allTenants.length,
      activeTenants,
      usersByRole,
      systemHealth: {
        activeUsers: allUsers.filter(u => u.isActive).length,
        inactiveUsers: allUsers.filter(u => !u.isActive).length,
        tenantsWithUsers: allTenants.filter(t => t.users && t.users.length > 0).length,
      },
    };
  }

  @Get('reports/tenant/:id/details')
  @ApiOperation({
    summary: 'Relatório detalhado do tenant',
    description: 'Retorna relatório completo de um tenant específico'
  })
  @ApiParam({
    name: 'id',
    description: 'ID do tenant',
    example: 'uuid-do-tenant'
  })
  @ApiOkResponse({ description: 'Relatório detalhado do tenant' })
  @ApiNotFoundResponse({ description: 'Tenant não encontrado' })
  async getTenantDetailedReport(@Param('id') tenantId: string) {
    const tenantStats = await this.tenantsService.getTenantStats(tenantId);
    const tenantUsers = await this.usersService.findByTenant(tenantId);
    const nutricionistas = await this.usersService.findNutricionistasInTenant(tenantId);

    return {
      ...tenantStats,
      users: tenantUsers,
      nutricionistas,
      patientsPerNutricionista: nutricionistas.map(nut => ({
        nutricionistaId: nut.id,
        nutricionistaName: nut.name,
        patientsCount: tenantUsers.filter(u => u.nutricionistaId === nut.id).length,
      })),
    };
  }
} 