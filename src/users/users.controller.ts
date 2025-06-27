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
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import {
  SuperAdminOnly,
  NutricionistaOrAdmin,
  AuthenticatedOnly,
} from '../auth/decorators/roles.decorator';
import { RegisterDto } from '../auth/dto/register.dto';
import { Role } from '../auth/enums/role.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @SuperAdminOnly()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('by-tenant/:tenantId')
  @NutricionistaOrAdmin()
  async findByTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Nutricionistas só podem ver usuários do próprio tenant
    if (user.role === Role.NUTRICIONISTA && user.tenantId !== tenantId) {
      throw new Error('Acesso negado a usuários de outro tenant');
    }

    return this.usersService.findByTenant(tenantId);
  }

  @Get('patients/my')
  @NutricionistaOrAdmin()
  async getMyPatients(@CurrentUser() user: CurrentUserData) {
    if (user.role === Role.NUTRICIONISTA) {
      return this.usersService.findPatientsByNutricionista(user.id);
    }
    
    // Super admin pode ver todos os pacientes
    return this.usersService.findAll();
  }

  @Get('profile')
  @AuthenticatedOnly()
  async getMyProfile(@CurrentUser() user: CurrentUserData) {
    return this.usersService.findById(user.id);
  }

  @Get(':id')
  @NutricionistaOrAdmin()
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const targetUser = await this.usersService.findById(id);
    
    if (!targetUser) {
      throw new Error('Usuário não encontrado');
    }

    // Nutricionistas só podem ver usuários do próprio tenant
    if (user.role === Role.NUTRICIONISTA && user.tenantId !== targetUser.tenantId) {
      throw new Error('Acesso negado a usuário de outro tenant');
    }

    return targetUser;
  }

  @Post()
  @NutricionistaOrAdmin()
  async create(
    @Body(ValidationPipe) createUserDto: RegisterDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Nutricionistas só podem criar usuários no próprio tenant
    if (user.role === Role.NUTRICIONISTA) {
      if (createUserDto.tenantId !== user.tenantId) {
        throw new Error('Não é possível criar usuários em outros tenants');
      }
      
      // Nutricionistas só podem criar pacientes
      if (createUserDto.role !== Role.PACIENTE) {
        throw new Error('Nutricionistas só podem criar pacientes');
      }
      
      // Define o nutricionista como responsável
      createUserDto.nutricionistaId = user.id;
    }

    return this.usersService.create(createUserDto);
  }

  @Patch(':id/deactivate')
  @NutricionistaOrAdmin()
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const targetUser = await this.usersService.findById(id);
    
    if (!targetUser) {
      throw new Error('Usuário não encontrado');
    }

    // Nutricionistas só podem desativar usuários do próprio tenant
    if (user.role === Role.NUTRICIONISTA) {
      if (user.tenantId !== targetUser.tenantId) {
        throw new Error('Acesso negado a usuário de outro tenant');
      }
      
      // Nutricionistas só podem desativar pacientes
      if (targetUser.role !== Role.PACIENTE) {
        throw new Error('Nutricionistas só podem desativar pacientes');
      }
    }

    return this.usersService.deactivate(id);
  }
} 