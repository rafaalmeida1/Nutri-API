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
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import {
  SuperAdminOnly,
  NutricionistaOrAdmin,
  AuthenticatedOnly,
  TenantAdminOnly,
  NutricionistaAdminOnly,
} from '../auth/decorators/roles.decorator';
import { RegisterDto } from '../auth/dto/register.dto';
import { Role, isNutricionista, isTenantAdmin } from '../auth/enums/role.enum';

interface CreateNutricionistaDto {
  email: string;
  password: string;
  name: string;
  crn?: string;
  especialidade?: string;
  tenantId?: string; // Opcional - se não fornecido, cria novo tenant
  tenantName?: string;
  tenantSubdomain?: string;
  tenantDescription?: string;
}

interface UpdateRoleDto {
  role: Role;
}

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @SuperAdminOnly()
  @ApiOperation({
    summary: 'Listar todos os usuários',
    description: 'Retorna lista de todos os usuários do sistema (apenas super admin)'
  })
  @ApiOkResponse({
    description: 'Lista de usuários retornada com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          tenantId: { type: 'string', nullable: true },
          isActive: { type: 'boolean' }
        }
      }
    }
  })
  @ApiForbiddenResponse({ description: 'Acesso negado - apenas super admin' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('by-tenant/:tenantId')
  @NutricionistaOrAdmin()
  @ApiOperation({
    summary: 'Listar usuários por tenant',
    description: 'Retorna usuários de um tenant específico'
  })
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: 'uuid-do-tenant'
  })
  @ApiOkResponse({ description: 'Usuários do tenant retornados com sucesso' })
  @ApiForbiddenResponse({ description: 'Acesso negado ao tenant' })
  async findByTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Nutricionistas só podem ver usuários do próprio tenant
    if (isNutricionista(user.role as Role) && user.tenantId !== tenantId) {
      throw new Error('Acesso negado a usuários de outro tenant');
    }

    return this.usersService.findByTenant(tenantId);
  }

  @Get('patients/my')
  @NutricionistaOrAdmin()
  @ApiOperation({
    summary: 'Meus pacientes',
    description: 'Retorna pacientes do nutricionista logado'
  })
  @ApiOkResponse({ description: 'Lista de pacientes retornada com sucesso' })
  async getMyPatients(@CurrentUser() user: CurrentUserData) {
    if (isNutricionista(user.role as Role)) {
      return this.usersService.findPatientsByNutricionista(user.id);
    }
    
    // Super admin pode ver todos os pacientes
    return this.usersService.findAll();
  }

  @Get('profile')
  @AuthenticatedOnly()
  @ApiOperation({
    summary: 'Perfil do usuário',
    description: 'Retorna perfil do usuário logado'
  })
  @ApiOkResponse({ description: 'Perfil retornado com sucesso' })
  async getMyProfile(@CurrentUser() user: CurrentUserData) {
    return this.usersService.findById(user.id);
  }

  @Get(':id')
  @NutricionistaOrAdmin()
  @ApiOperation({
    summary: 'Buscar usuário por ID',
    description: 'Retorna dados de um usuário específico'
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário',
    example: 'uuid-do-usuario'
  })
  @ApiOkResponse({ description: 'Usuário encontrado' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @ApiForbiddenResponse({ description: 'Acesso negado ao usuário' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const targetUser = await this.usersService.findById(id);
    
    if (!targetUser) {
      throw new Error('Usuário não encontrado');
    }

    // Nutricionistas só podem ver usuários do próprio tenant
    if (isNutricionista(user.role as Role) && user.tenantId !== targetUser.tenantId) {
      throw new Error('Acesso negado a usuário de outro tenant');
    }

    return targetUser;
  }

  @Post()
  @NutricionistaOrAdmin()
  @ApiOperation({
    summary: 'Criar usuário',
    description: 'Cria um novo usuário no sistema'
  })
  @ApiBody({
    type: RegisterDto,
    description: 'Dados do usuário a ser criado'
  })
  @ApiCreatedResponse({ description: 'Usuário criado com sucesso' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiForbiddenResponse({ description: 'Sem permissão para criar usuário' })
  async create(
    @Body(ValidationPipe) createUserDto: RegisterDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Nutricionistas só podem criar usuários no próprio tenant
    if (isNutricionista(user.role as Role)) {
      if (createUserDto.tenantId !== user.tenantId) {
        throw new Error('Não é possível criar usuários em outros tenants');
      }
      
      // Nutricionistas funcionários só podem criar pacientes
      if (user.role === Role.NUTRICIONISTA_FUNCIONARIO && createUserDto.role !== Role.PACIENTE) {
        throw new Error('Nutricionistas funcionários só podem criar pacientes');
      }

      // Nutricionistas admin podem criar funcionários e pacientes
      if (user.role === Role.NUTRICIONISTA_ADMIN) {
        if (createUserDto.role !== Role.NUTRICIONISTA_FUNCIONARIO && createUserDto.role !== Role.PACIENTE) {
          throw new Error('Nutricionistas admin só podem criar funcionários e pacientes');
        }
      }
      
      // Define o nutricionista como responsável se for paciente
      if (createUserDto.role === Role.PACIENTE) {
        createUserDto.nutricionistaId = user.id;
      }
    }

    return this.usersService.create(createUserDto);
  }

  @Post('nutricionista')
  @SuperAdminOnly()
  @ApiOperation({
    summary: 'Criar nutricionista',
    description: 'Cria nutricionista admin (novo tenant) ou funcionário (tenant existente via query param)'
  })
  @ApiQuery({
    name: 'tenantId',
    description: 'ID do tenant (se fornecido, cria funcionário; se não, cria admin com novo tenant)',
    required: false,
    example: 'uuid-do-tenant'
  })
  @ApiBody({
    description: 'Dados do nutricionista',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'nutri@clinica.com' },
        password: { type: 'string', example: 'senha123456' },
        name: { type: 'string', example: 'Dr. João Silva' },
        crn: { type: 'string', example: '12345' },
        especialidade: { type: 'string', example: 'Nutrição Clínica' },
        tenantName: { type: 'string', example: 'Clínica ABC' },
        tenantSubdomain: { type: 'string', example: 'clinicaabc' },
        tenantDescription: { type: 'string', example: 'Clínica especializada' }
      }
    }
  })
  @ApiCreatedResponse({ description: 'Nutricionista criado com sucesso' })
  async createNutricionista(
    @Body(ValidationPipe) createNutricionistaDto: CreateNutricionistaDto,
    @Query('tenantId') tenantId?: string,
  ) {
    const registerDto: RegisterDto = {
      ...createNutricionistaDto,
      role: tenantId ? Role.NUTRICIONISTA_FUNCIONARIO : Role.NUTRICIONISTA_ADMIN,
      tenantId: tenantId, // Se fornecido via query, é funcionário; se não, é admin
    };

    return this.usersService.create(registerDto);
  }

  @Patch(':id/role')
  @TenantAdminOnly()
  @ApiOperation({
    summary: 'Alterar role do usuário',
    description: 'Altera a role de um usuário (apenas admins do tenant)'
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
          enum: ['super_admin', 'nutricionista_admin', 'nutricionista_funcionario', 'paciente'],
          example: 'nutricionista_funcionario'
        }
      }
    }
  })
  @ApiOkResponse({ description: 'Role alterada com sucesso' })
  @ApiForbiddenResponse({ description: 'Sem permissão para alterar role' })
  async updateUserRole(
    @Param('id') userId: string,
    @Body(ValidationPipe) updateRoleDto: UpdateRoleDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.usersService.updateUserRole(userId, updateRoleDto.role, user.id);
  }

  @Patch(':id/deactivate')
  @NutricionistaOrAdmin()
  @ApiOperation({
    summary: 'Desativar usuário',
    description: 'Desativa um usuário do sistema'
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário',
    example: 'uuid-do-usuario'
  })
  @ApiOkResponse({ description: 'Usuário desativado com sucesso' })
  @ApiForbiddenResponse({ description: 'Sem permissão para desativar usuário' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const targetUser = await this.usersService.findById(id);
    
    if (!targetUser) {
      throw new Error('Usuário não encontrado');
    }

    // Nutricionistas só podem desativar usuários do próprio tenant
    if (isNutricionista(user.role as Role)) {
      if (user.tenantId !== targetUser.tenantId) {
        throw new Error('Acesso negado a usuário de outro tenant');
      }
      
      // Nutricionistas funcionários só podem desativar pacientes
      if (user.role === Role.NUTRICIONISTA_FUNCIONARIO && targetUser.role !== Role.PACIENTE) {
        throw new Error('Nutricionistas funcionários só podem desativar pacientes');
      }

      // Nutricionistas admin não podem desativar outros admins
      if (user.role === Role.NUTRICIONISTA_ADMIN && targetUser.role === Role.NUTRICIONISTA_ADMIN) {
        throw new Error('Não é possível desativar outro admin');
      }
    }

    return this.usersService.deactivate(id);
  }

  // Endpoints específicos para gerenciamento de permissões

  @Get('tenant/:tenantId/nutricionistas')
  @TenantAdminOnly()
  @ApiOperation({
    summary: 'Nutricionistas do tenant',
    description: 'Lista nutricionistas de um tenant específico'
  })
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: 'uuid-do-tenant'
  })
  @ApiOkResponse({ description: 'Lista de nutricionistas retornada' })
  async getNutricionistasInTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Nutricionista admin só pode ver do próprio tenant
    if (user.role === Role.NUTRICIONISTA_ADMIN && user.tenantId !== tenantId) {
      throw new Error('Acesso negado a tenant diferente');
    }

    return this.usersService.findNutricionistasInTenant(tenantId);
  }

  @Post('invite-nutricionista')
  @NutricionistaAdminOnly()
  @ApiOperation({
    summary: 'Convidar nutricionista',
    description: 'Convida um nutricionista funcionário para o tenant'
  })
  @ApiBody({
    description: 'Dados do convite',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'funcionario@clinica.com' },
        name: { type: 'string', example: 'Dra. Maria Santos' },
        role: { type: 'string', enum: ['nutricionista_funcionario'], example: 'nutricionista_funcionario' },
        crn: { type: 'string', example: '67890' },
        especialidade: { type: 'string', example: 'Nutrição Esportiva' }
      }
    }
  })
  @ApiCreatedResponse({ description: 'Nutricionista convidado com sucesso' })
  async inviteNutricionistaToTenant(
    @Body(ValidationPipe) inviteDto: {
      email: string;
      name: string;
      role: Role.NUTRICIONISTA_FUNCIONARIO;
      crn?: string;
      especialidade?: string;
    },
    @CurrentUser() user: CurrentUserData,
  ) {
    const registerDto: RegisterDto = {
      ...inviteDto,
      password: 'temp123456', // Senha temporária - deve ser alterada no primeiro login
      tenantId: user.tenantId,
    };

    return this.usersService.create(registerDto);
  }
} 