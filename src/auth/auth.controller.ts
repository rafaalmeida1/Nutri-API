import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Headers,
  Get,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiHeader,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CurrentUser, CurrentUserData } from './decorators/current-user.decorator';
import { SuperAdminOnly } from './decorators/roles.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ 
    summary: 'Login de usuário',
    description: 'Autentica um usuário e retorna tokens de acesso'
  })
  @ApiBody({ 
    type: LoginDto,
    description: 'Credenciais de login',
    examples: {
      superAdmin: {
        summary: 'Super Admin',
        value: {
          email: 'admin@sistema.com',
          password: 'senha123'
        }
      },
      nutricionistaAdmin: {
        summary: 'Nutricionista Admin',
        value: {
          email: 'admin@clinica.com',
          password: 'senha123',
          tenantSubdomain: 'clinicaabc'
        }
      },
      paciente: {
        summary: 'Paciente',
        value: {
          email: 'paciente@email.com',
          password: 'senha123',
          tenantSubdomain: 'clinicaabc'
        }
      }
    }
  })
  @ApiCreatedResponse({
    description: 'Login realizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', description: 'Token de acesso JWT' },
        refresh_token: { type: 'string', description: 'Token de refresh' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['super_admin', 'nutricionista_admin', 'nutricionista_funcionario', 'paciente'] },
            tenantId: { type: 'string', nullable: true }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas' })
  @ApiBadRequestResponse({ description: 'Dados de entrada inválidos' })
  async login(@Body(ValidationPipe) loginDto: LoginDto, @Request() req) {
    // O LocalAuthGuard já validou as credenciais
    // O usuário está disponível em req.user
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ 
    summary: 'Registro de usuário',
    description: 'Registra um novo usuário no sistema'
  })
  @ApiBody({ 
    type: RegisterDto,
    description: 'Dados para registro',
    examples: {
      superAdmin: {
        summary: 'Super Admin',
        value: {
          email: 'admin@sistema.com',
          password: 'senha123456',
          name: 'Super Administrador',
          role: 'super_admin'
        }
      },
      nutricionistaAdmin: {
        summary: 'Nutricionista Admin (Novo Tenant)',
        value: {
          email: 'admin@clinica.com',
          password: 'senha123456',
          name: 'Dr. João Silva',
          role: 'nutricionista_admin',
          crn: '12345',
          especialidade: 'Nutrição Clínica',
          tenantName: 'Clínica ABC',
          tenantSubdomain: 'clinicaabc'
        }
      },
      nutricionistaFuncionario: {
        summary: 'Nutricionista Funcionário',
        value: {
          email: 'funcionario@clinica.com',
          password: 'senha123456',
          name: 'Dra. Maria Santos',
          role: 'nutricionista_funcionario',
          tenantId: 'uuid-do-tenant',
          crn: '67890',
          especialidade: 'Nutrição Esportiva'
        }
      },
      paciente: {
        summary: 'Paciente',
        value: {
          email: 'paciente@email.com',
          password: 'senha123456',
          name: 'Ana Costa',
          role: 'paciente',
          tenantId: 'uuid-do-tenant',
          nutricionistaId: 'uuid-do-nutricionista'
        }
      }
    }
  })
  @ApiCreatedResponse({
    description: 'Usuário registrado com sucesso',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            tenantId: { type: 'string', nullable: true }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou email já em uso' })
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('register/super-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SuperAdminOnly()
  @HttpCode(HttpStatus.CREATED)
  async registerSuperAdmin(@Body(ValidationPipe) registerDto: RegisterDto) {
    // Força o role para super_admin
    registerDto.role = 'super_admin' as any;
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @ApiOperation({ 
    summary: 'Renovar token de acesso',
    description: 'Gera um novo token de acesso usando o refresh token'
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Refresh token no formato: Bearer {refresh_token}',
    required: true
  })
  @ApiOkResponse({
    description: 'Novo token gerado com sucesso',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', description: 'Novo token de acesso' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido ou expirado' })
  async refreshToken(@Headers('authorization') authorization: string) {
    const token = authorization?.replace('Bearer ', '');
    return this.authService.refreshToken(token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Logout do usuário',
    description: 'Invalida o refresh token do usuário'
  })
  @ApiOkResponse({
    description: 'Logout realizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logout realizado com sucesso' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido' })
  async logout(@CurrentUser() user: CurrentUserData) {
    return this.authService.logout(user.id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Perfil do usuário',
    description: 'Retorna informações do usuário logado'
  })
  @ApiOkResponse({
    description: 'Perfil do usuário',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        tenantId: { type: 'string', nullable: true }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido' })
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return user;
  }
} 