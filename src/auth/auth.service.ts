import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';
import { Role } from './enums/role.enum';
import { JwtPayload } from './strategies/jwt.strategy';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string, tenantSubdomain?: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      return null;
    }

    // Verifica se a senha está correta
    const isPasswordValid = await this.usersService.validatePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // Validação específica para tenants
    if (user.role !== Role.SUPER_ADMIN) {
      if (!tenantSubdomain) {
        throw new BadRequestException('Tenant é obrigatório para este tipo de usuário');
      }

      const tenant = await this.tenantsService.findBySubdomain(tenantSubdomain);
      if (!tenant || !tenant.isActive) {
        throw new UnauthorizedException('Tenant inválido ou inativo');
      }

      if (user.tenantId !== tenant.id) {
        throw new UnauthorizedException('Usuário não pertence a este tenant');
      }
    }

    // Remove a senha do objeto de retorno
    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(
      loginDto.email, 
      loginDto.password, 
      loginDto.tenantSubdomain
    );

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Atualiza último login
    await this.usersService.updateLastLogin(user.id);

    // Gera tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Salva o refresh token no banco
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Validações específicas por role
    if (registerDto.role === Role.SUPER_ADMIN) {
      // Super admin não pode ter tenantId
      if (registerDto.tenantId) {
        throw new BadRequestException('Super admin não deve ter tenantId');
      }
    } else if (registerDto.role === Role.NUTRICIONISTA_ADMIN) {
      // Nutricionista admin pode não ter tenantId (será criado automaticamente)
      if (registerDto.tenantId) {
        // Se fornecido, verifica se o tenant existe e está ativo
        const tenant = await this.tenantsService.findById(registerDto.tenantId);
        if (!tenant || !tenant.isActive) {
          throw new BadRequestException('Tenant inválido ou inativo');
        }
      }
      // Se não fornecido, será criado automaticamente no UsersService
    } else if (registerDto.role === Role.NUTRICIONISTA_FUNCIONARIO) {
      // Nutricionista funcionário deve ter tenantId obrigatório
      if (!registerDto.tenantId) {
        throw new BadRequestException('TenantId é obrigatório para nutricionista funcionário');
      }

      // Verifica se o tenant existe e está ativo
      const tenant = await this.tenantsService.findById(registerDto.tenantId);
      if (!tenant || !tenant.isActive) {
        throw new BadRequestException('Tenant inválido ou inativo');
      }
    } else if (registerDto.role === Role.PACIENTE) {
      // Paciente deve ter tenantId e nutricionistaId
      if (!registerDto.tenantId) {
        throw new BadRequestException('TenantId é obrigatório para pacientes');
      }

      if (!registerDto.nutricionistaId) {
        throw new BadRequestException('NutricionistaId é obrigatório para pacientes');
      }

      // Verifica se o tenant existe e está ativo
      const tenant = await this.tenantsService.findById(registerDto.tenantId);
      if (!tenant || !tenant.isActive) {
        throw new BadRequestException('Tenant inválido ou inativo');
      }

      // Verifica se o nutricionista existe e pertence ao mesmo tenant
      const nutricionista = await this.usersService.findById(registerDto.nutricionistaId);
      if (!nutricionista || 
          (nutricionista.role !== Role.NUTRICIONISTA_ADMIN && nutricionista.role !== Role.NUTRICIONISTA_FUNCIONARIO) ||
          nutricionista.tenantId !== registerDto.tenantId) {
        throw new BadRequestException('Nutricionista inválido ou não pertence ao tenant');
      }
    }

    // Criar o usuário
    const user = await this.usersService.create(registerDto);

    // Gerar tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Atualizar refresh token no banco
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      // Busca o usuário para verificar se ainda existe e está ativo
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Usuário inválido');
      }

      // Gera novo access token
      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      };

      const accessToken = this.jwtService.sign(newPayload);

      return {
        access_token: accessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async logout(userId: string) {
    // Remove o refresh token do banco
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logout realizado com sucesso' };
  }
} 