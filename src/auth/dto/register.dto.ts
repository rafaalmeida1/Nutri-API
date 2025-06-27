import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { Role } from '../enums/role.enum';

export class RegisterDto {
  @IsEmail({}, { message: 'Por favor, forneça um email válido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password: string;

  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @IsEnum(Role, { message: 'Role deve ser um dos valores: super_admin, nutricionista, paciente' })
  role: Role;

  // Obrigatório para nutricionista e paciente
  @ValidateIf(o => o.role !== Role.SUPER_ADMIN)
  @IsNotEmpty({ message: 'TenantId é obrigatório para nutricionista e paciente' })
  @IsString()
  tenantId?: string;

  // Obrigatório para pacientes
  @ValidateIf(o => o.role === Role.PACIENTE)
  @IsNotEmpty({ message: 'NutricionistaId é obrigatório para pacientes' })
  @IsString()
  nutricionistaId?: string;

  // Opcional para nutricionistas
  @IsOptional()
  @IsString()
  crn?: string;

  @IsOptional()
  @IsString()
  especialidade?: string;
} 