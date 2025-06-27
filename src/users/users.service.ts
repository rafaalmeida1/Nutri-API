import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import { Role } from '../auth/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: RegisterDto): Promise<User> {
    // Verifica se email já existe
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Este email já está em uso');
    }

    // Hash da senha
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    // Cria o usuário
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
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
      where: { 
        tenantId, 
        role: Role.NUTRICIONISTA,
        isActive: true 
      },
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
} 