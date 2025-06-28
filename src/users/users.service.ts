import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import { Role, isNutricionista } from '../auth/enums/role.enum';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tenantsService: TenantsService,
  ) {}

  async create(createUserDto: RegisterDto): Promise<User> {
    // Verifica se email já existe
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Este email já está em uso');
    }

    // Lógica especial para nutricionista admin sem tenantId - cria tenant automaticamente
    if (
      createUserDto.role === Role.NUTRICIONISTA_ADMIN && 
      !createUserDto.tenantId
    ) {
      const tenantName = createUserDto.tenantName || `Clínica de ${createUserDto.name}`;
      const tenantSubdomain = createUserDto.tenantSubdomain || 
        createUserDto.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Cria o tenant primeiro
      const tenant = await this.tenantsService.create({
        name: tenantName,
        subdomain: tenantSubdomain,
        description: createUserDto.tenantDescription,
        ownerId: 'temp', // Será atualizado depois
        email: createUserDto.email,
      });

      createUserDto.tenantId = tenant.id;
    }

    // Validações de regras de negócio
    this.validateUserCreationRules(createUserDto);

    // Hash da senha
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    // Cria o usuário
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // Se criou um tenant, atualiza o ownerId
    if (
      createUserDto.role === Role.NUTRICIONISTA_ADMIN && 
      createUserDto.tenantId
    ) {
      await this.tenantsService.update(createUserDto.tenantId, {
        ownerId: savedUser.id,
      });
    }

    return savedUser;
  }

  private validateUserCreationRules(createUserDto: RegisterDto): void {
    // Nutricionista funcionário deve ter tenantId
    if (createUserDto.role === Role.NUTRICIONISTA_FUNCIONARIO && !createUserDto.tenantId) {
      throw new BadRequestException('Nutricionista funcionário deve ter um tenantId');
    }

    // Paciente deve ter tenantId e nutricionistaId
    if (createUserDto.role === Role.PACIENTE) {
      if (!createUserDto.tenantId) {
        throw new BadRequestException('Paciente deve ter um tenantId');
      }
      if (!createUserDto.nutricionistaId) {
        throw new BadRequestException('Paciente deve ter um nutricionistaId');
      }
    }

    // Super admin não deve ter tenantId
    if (createUserDto.role === Role.SUPER_ADMIN && createUserDto.tenantId) {
      throw new BadRequestException('Super admin não deve ter tenantId');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, isActive: true },
      relations: ['tenant'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['tenant', 'nutricionista', 'pacientes'],
    });
  }

  async findByTenant(tenantId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { tenantId, isActive: true },
      relations: ['tenant'],
    });
  }

  async findPatientsByNutricionista(nutricionistaId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { 
        nutricionistaId, 
        role: Role.PACIENTE,
        isActive: true 
      },
      relations: ['tenant'],
    });
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, { 
      lastLogin: new Date() 
    });
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const hashedToken = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.userRepository.update(userId, { 
      refreshToken: hashedToken 
    });
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      where: { isActive: true },
      relations: ['tenant'],
    });
  }

  async deactivate(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    user.isActive = false;
    return this.userRepository.save(user);
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  // Métodos específicos para relacionamentos
  async findNutricionistasInTenant(tenantId: string): Promise<User[]> {
    return this.userRepository.find({
      where: [
        { 
          tenantId, 
          role: Role.NUTRICIONISTA_ADMIN,
          isActive: true 
        },
        { 
          tenantId, 
          role: Role.NUTRICIONISTA_FUNCIONARIO,
          isActive: true 
        }
      ],
      relations: ['tenant', 'pacientes'],
    });
  }

  async findSuperAdmins(): Promise<User[]> {
    return this.userRepository.find({
      where: { 
        role: Role.SUPER_ADMIN,
        isActive: true 
      },
    });
  }

  // Novos métodos para gerenciamento de roles
  async updateUserRole(userId: string, newRole: Role, requestingUserId: string): Promise<User> {
    const user = await this.findById(userId);
    const requestingUser = await this.findById(requestingUserId);

    if (!user || !requestingUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Validações de permissão
    this.validateRoleUpdatePermission(user, newRole, requestingUser);

    user.role = newRole;
    return this.userRepository.save(user);
  }

  private validateRoleUpdatePermission(targetUser: User, newRole: Role, requestingUser: User): void {
    // Super admin pode alterar qualquer role
    if (requestingUser.role === Role.SUPER_ADMIN) {
      return;
    }

    // Nutricionista admin só pode alterar roles no próprio tenant
    if (requestingUser.role === Role.NUTRICIONISTA_ADMIN) {
      if (requestingUser.tenantId !== targetUser.tenantId) {
        throw new BadRequestException('Não é possível alterar roles de usuários de outros tenants');
      }

      // Não pode alterar role de outro admin
      if (targetUser.role === Role.NUTRICIONISTA_ADMIN) {
        throw new BadRequestException('Não é possível alterar role de outro admin');
      }

      // Só pode definir roles de funcionário ou paciente
      if (newRole !== Role.NUTRICIONISTA_FUNCIONARIO && newRole !== Role.PACIENTE) {
        throw new BadRequestException('Nutricionista admin só pode definir roles de funcionário ou paciente');
      }

      return;
    }

    throw new BadRequestException('Sem permissão para alterar roles');
  }
} 