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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { TenantsService } from '../tenants/tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { TenantAdminOnly, NutricionistaAdminOnly } from '../auth/decorators/roles.decorator';
import { RegisterDto } from '../auth/dto/register.dto';
import { Role } from '../auth/enums/role.enum';

interface InviteNutricionistaDto {
  email: string;
  name: string;
  crn?: string;
  especialidade?: string;
  tempPassword?: string;
}

interface UpdateTenantUserDto {
  name?: string;
  email?: string;
  crn?: string;
  especialidade?: string;
  isActive?: boolean;
}

interface TenantPermissionsDto {
  maxPatients?: number;
  allowedFeatures?: string[];
  nutricionistaPermissions?: {
    canCreatePatients?: boolean;
    canDeletePatients?: boolean;
    canViewReports?: boolean;
    canManageSchedule?: boolean;
  };
}

@ApiTags('tenant-admin')
@Controller('tenant-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class TenantAdminController {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
  ) {}

  // Gerenciamento de usuários no tenant
  @Get('users')
  @TenantAdminOnly()
  @ApiOperation({
    summary: 'Usuários do tenant',
    description: 'Lista todos os usuários do tenant do admin logado'
  })
  @ApiOkResponse({ description: 'Lista de usuários do tenant' })
  @ApiBadRequestResponse({ description: 'Usuário não possui tenant' })
  async getTenantUsers(@CurrentUser() user: CurrentUserData) {
    if (!user.tenantId) {
      throw new BadRequestException('Usuário não possui tenant');
    }
    return this.usersService.findByTenant(user.tenantId);
  }

  @Get('nutricionistas')
  @TenantAdminOnly()
  @ApiOperation({
    summary: 'Nutricionistas do tenant',
    description: 'Lista todos os nutricionistas do tenant'
  })
  @ApiOkResponse({ description: 'Lista de nutricionistas do tenant' })
  async getTenantNutricionistas(@CurrentUser() user: CurrentUserData) {
    if (!user.tenantId) {
      throw new BadRequestException('Usuário não possui tenant');
    }
    return this.usersService.findNutricionistasInTenant(user.tenantId);
  }

  @Get('patients')
  @TenantAdminOnly()
  @ApiOperation({
    summary: 'Pacientes do tenant',
    description: 'Lista todos os pacientes do tenant'
  })
  @ApiOkResponse({ description: 'Lista de pacientes do tenant' })
  async getTenantPatients(@CurrentUser() user: CurrentUserData) {
    if (!user.tenantId) {
      throw new BadRequestException('Usuário não possui tenant');
    }
    const allUsers = await this.usersService.findByTenant(user.tenantId);
    return allUsers.filter(u => u.role === Role.PACIENTE);
  }

  @Post('invite-nutricionista')
  @NutricionistaAdminOnly()
  @ApiOperation({
    summary: 'Convidar nutricionista funcionário',
    description: 'Convida um nutricionista funcionário para o tenant'
  })
  @ApiBody({
    description: 'Dados do convite',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'funcionario@clinica.com' },
        name: { type: 'string', example: 'Dra. Maria Santos' },
        crn: { type: 'string', example: '67890' },
        especialidade: { type: 'string', example: 'Nutrição Esportiva' },
        tempPassword: { type: 'string', example: 'tempPassword123!' }
      },
      required: ['email', 'name']
    }
  })
  @ApiCreatedResponse({ description: 'Nutricionista convidado com sucesso' })
  @ApiForbiddenResponse({ description: 'Acesso negado - apenas nutricionista admin' })
  async inviteNutricionista(
    @Body(ValidationPipe) inviteDto: InviteNutricionistaDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    if (!user.tenantId) {
      throw new BadRequestException('Usuário não possui tenant');
    }

    const registerDto: RegisterDto = {
      email: inviteDto.email,
      name: inviteDto.name,
      password: inviteDto.tempPassword || 'tempPassword123!',
      role: Role.NUTRICIONISTA_FUNCIONARIO,
      tenantId: user.tenantId,
      crn: inviteDto.crn,
      especialidade: inviteDto.especialidade,
    };

    return this.usersService.create(registerDto);
  }

  @Patch('users/:id/role')
  @NutricionistaAdminOnly()
  @ApiOperation({
    summary: 'Alterar role de usuário no tenant',
    description: 'Altera a role de um usuário dentro do tenant'
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário',
    example: 'uuid-do-usuario'
  })
  @ApiBody({
    description: 'Nova role',
    schema: {
      type: 'object',
      properties: {
        role: { 
          type: 'string', 
          enum: ['nutricionista_funcionario', 'paciente'],
          example: 'nutricionista_funcionario'
        }
      },
      required: ['role']
    }
  })
  @ApiOkResponse({ description: 'Role alterada com sucesso' })
  @ApiBadRequestResponse({ description: 'Role não permitido ou usuário não encontrado' })
  async updateUserRole(
    @Param('id') userId: string,
    @Body(ValidationPipe) updateDto: { role: Role },
    @CurrentUser() user: CurrentUserData,
  ) {
    if (!user.tenantId) {
      throw new BadRequestException('Usuário não possui tenant');
    }

    const targetUser = await this.usersService.findById(userId);
    if (!targetUser || targetUser.tenantId !== user.tenantId) {
      throw new BadRequestException('Usuário não encontrado no tenant');
    }

    // Nutricionista admin não pode alterar role de outro admin
    if (targetUser.role === Role.NUTRICIONISTA_ADMIN) {
      throw new BadRequestException('Não é possível alterar role de outro admin');
    }

    // Só pode definir roles permitidos
    if (updateDto.role !== Role.NUTRICIONISTA_FUNCIONARIO && updateDto.role !== Role.PACIENTE) {
      throw new BadRequestException('Role não permitido');
    }

    return this.usersService.updateUserRole(userId, updateDto.role, user.id);
  }

  @Patch('users/:id')
  @TenantAdminOnly()
  @ApiOperation({
    summary: 'Atualizar usuário do tenant',
    description: 'Atualiza dados de um usuário do tenant'
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário',
    example: 'uuid-do-usuario'
  })
  @ApiBody({
    description: 'Dados para atualização',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Dr. João Silva Santos' },
        email: { type: 'string', example: 'joao.silva@clinica.com' },
        crn: { type: 'string', example: '12345' },
        especialidade: { type: 'string', example: 'Nutrição Clínica e Esportiva' },
        isActive: { type: 'boolean', example: true }
      }
    }
  })
  @ApiOkResponse({ description: 'Usuário atualizado com sucesso' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado no tenant' })
  async updateUser(
    @Param('id') userId: string,
    @Body(ValidationPipe) updateDto: UpdateTenantUserDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    if (!user.tenantId) {
      throw new BadRequestException('Usuário não possui tenant');
    }

    const targetUser = await this.usersService.findById(userId);
    if (!targetUser || targetUser.tenantId !== user.tenantId) {
      throw new BadRequestException('Usuário não encontrado no tenant');
    }

    return this.usersService.update(userId, updateDto);
  }

  @Delete('users/:id')
  @TenantAdminOnly()
  @ApiOperation({
    summary: 'Remover usuário do tenant',
    description: 'Remove (desativa) um usuário do tenant'
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário',
    example: 'uuid-do-usuario'
  })
  @ApiOkResponse({ description: 'Usuário removido com sucesso' })
  @ApiBadRequestResponse({ description: 'Não é possível remover este usuário' })
  async removeUser(
    @Param('id') userId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    if (!user.tenantId) {
      throw new BadRequestException('Usuário não possui tenant');
    }

    const targetUser = await this.usersService.findById(userId);
    if (!targetUser || targetUser.tenantId !== user.tenantId) {
      throw new BadRequestException('Usuário não encontrado no tenant');
    }

    // Nutricionista admin não pode remover outro admin
    if (user.role === Role.NUTRICIONISTA_ADMIN && targetUser.role === Role.NUTRICIONISTA_ADMIN) {
      throw new BadRequestException('Não é possível remover outro admin');
    }

    return this.usersService.deactivate(userId);
  }

  // Gerenciamento do tenant
  @Get('tenant/info')
  @TenantAdminOnly()
  @ApiOperation({
    summary: 'Informações do tenant',
    description: 'Retorna informações do tenant do usuário logado'
  })
  @ApiOkResponse({ description: 'Informações do tenant' })
  async getTenantInfo(@CurrentUser() user: CurrentUserData) {
    if (!user.tenantId) {
      throw new BadRequestException('Usuário não possui tenant');
    }
    return this.tenantsService.findById(user.tenantId);
  }

  @Get('tenant/stats')
  @TenantAdminOnly()
  @ApiOperation({
    summary: 'Estatísticas do tenant',
    description: 'Retorna estatísticas do tenant do usuário logado'
  })
  @ApiOkResponse({ description: 'Estatísticas do tenant' })
  async getTenantStats(@CurrentUser() user: CurrentUserData) {
    if (!user.tenantId) {
      throw new BadRequestException('Usuário não possui tenant');
    }
    return this.tenantsService.getTenantStats(user.tenantId);
  }

  @Patch('tenant/settings')
  @NutricionistaAdminOnly()
  @ApiOperation({
    summary: 'Atualizar configurações do tenant',
    description: 'Atualiza configurações e permissões do tenant'
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
        nutricionistaPermissions: {
          type: 'object',
          properties: {
            canCreatePatients: { type: 'boolean', example: true },
            canDeletePatients: { type: 'boolean', example: false },
            canViewReports: { type: 'boolean', example: true },
            canManageSchedule: { type: 'boolean', example: true }
          }
        }
      }
    }
  })
  @ApiOkResponse({ description: 'Configurações atualizadas com sucesso' })
  @ApiForbiddenResponse({ description: 'Acesso negado - apenas nutricionista admin' })
  async updateTenantSettings(
    @Body(ValidationPipe) settingsDto: TenantPermissionsDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    if (!user.tenantId) {
      throw new BadRequestException('Usuário não possui tenant');
    }

    const currentTenant = await this.tenantsService.findById(user.tenantId);
    if (!currentTenant) {
      throw new BadRequestException('Tenant não encontrado');
    }

    const updatedSettings = {
      ...currentTenant.settings,
      ...settingsDto,
    };

    return this.tenantsService.update(user.tenantId, {
      settings: updatedSettings,
    });
  }

  // Relatórios do tenant
  @Get('reports/overview')
  @TenantAdminOnly()
  @ApiOperation({
    summary: 'Visão geral do tenant',
    description: 'Retorna visão geral e estatísticas do tenant'
  })
  @ApiOkResponse({
    description: 'Visão geral do tenant',
    schema: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number' },
        totalNutricionistas: { type: 'number' },
        totalPacientes: { type: 'number' },
        activeUsers: { type: 'number' },
        nutricionistaDetails: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              patientsCount: { type: 'number' }
            }
          }
        }
      }
    }
  })
  async getTenantOverview(@CurrentUser() user: CurrentUserData) {
    if (!user.tenantId) {
      throw new BadRequestException('Usuário não possui tenant');
    }

    const tenantUsers = await this.usersService.findByTenant(user.tenantId);
    const nutricionistas = tenantUsers.filter(u => 
      u.role === Role.NUTRICIONISTA_ADMIN || u.role === Role.NUTRICIONISTA_FUNCIONARIO
    );
    const pacientes = tenantUsers.filter(u => u.role === Role.PACIENTE);

    return {
      totalUsers: tenantUsers.length,
      totalNutricionistas: nutricionistas.length,
      totalPacientes: pacientes.length,
      activeUsers: tenantUsers.filter(u => u.isActive).length,
      nutricionistaDetails: nutricionistas.map(nut => ({
        id: nut.id,
        name: nut.name,
        role: nut.role,
        crn: nut.crn,
        especialidade: nut.especialidade,
        patientsCount: pacientes.filter(p => p.nutricionistaId === nut.id).length,
      })),
    };
  }

  @Get('reports/patients-distribution')
  @TenantAdminOnly()
  @ApiOperation({
    summary: 'Distribuição de pacientes',
    description: 'Retorna distribuição de pacientes por nutricionista no tenant'
  })
  @ApiOkResponse({
    description: 'Distribuição de pacientes por nutricionista',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nutricionistaId: { type: 'string' },
          nutricionistaName: { type: 'string' },
          patientsCount: { type: 'number' },
          patients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                isActive: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  })
  async getPatientsDistribution(@CurrentUser() user: CurrentUserData) {
    if (!user.tenantId) {
      throw new BadRequestException('Usuário não possui tenant');
    }

    const tenantUsers = await this.usersService.findByTenant(user.tenantId);
    const nutricionistas = tenantUsers.filter(u => 
      u.role === Role.NUTRICIONISTA_ADMIN || u.role === Role.NUTRICIONISTA_FUNCIONARIO
    );
    const pacientes = tenantUsers.filter(u => u.role === Role.PACIENTE);

    return nutricionistas.map(nut => {
      const nutPacientes = pacientes.filter(p => p.nutricionistaId === nut.id);
      return {
        nutricionistaId: nut.id,
        nutricionistaName: nut.name,
        patientsCount: nutPacientes.length,
        patients: nutPacientes.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          isActive: p.isActive,
          createdAt: p.createdAt,
        })),
      };
    });
  }
} 