import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../enums/role.enum';

export class RegisterDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'admin@clinica.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'Por favor, forneça um email válido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'senha123456',
    minLength: 6
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'Dr. João Silva'
  })
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @ApiProperty({
    description: 'Role/função do usuário no sistema',
    enum: Role,
    example: Role.NUTRICIONISTA_ADMIN,
    enumName: 'Role'
  })
  @IsEnum(Role, { message: 'Role deve ser um dos valores: super_admin, nutricionista_admin, nutricionista_funcionario, paciente' })
  role: Role;

  @ApiPropertyOptional({
    description: 'ID do tenant (opcional para nutricionista admin - será criado automaticamente se não fornecido; obrigatório para funcionários e pacientes)',
    example: 'uuid-do-tenant',
    nullable: true
  })
  @ValidateIf(o => o.role === Role.PACIENTE || o.role === Role.NUTRICIONISTA_FUNCIONARIO)
  @IsNotEmpty({ message: 'TenantId é obrigatório para pacientes e nutricionistas funcionários' })
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({
    description: 'ID do nutricionista responsável (obrigatório apenas para pacientes)',
    example: 'uuid-do-nutricionista',
    nullable: true
  })
  @ValidateIf(o => o.role === Role.PACIENTE)
  @IsNotEmpty({ message: 'NutricionistaId é obrigatório para pacientes' })
  @IsString()
  nutricionistaId?: string;

  @ApiPropertyOptional({
    description: 'Número do CRN (Conselho Regional de Nutricionistas) - opcional para nutricionistas',
    example: '12345',
    nullable: true
  })
  @IsOptional()
  @IsString()
  crn?: string;

  @ApiPropertyOptional({
    description: 'Especialidade do nutricionista',
    example: 'Nutrição Clínica',
    nullable: true
  })
  @IsOptional()
  @IsString()
  especialidade?: string;

  // Campos para criação de tenant (usado quando nutricionista admin não tem tenantId)
  @ApiPropertyOptional({
    description: 'Nome do tenant/clínica (usado quando nutricionista admin não fornece tenantId)',
    example: 'Clínica NutriVida',
    nullable: true
  })
  @IsOptional()
  @IsString()
  tenantName?: string;

  @ApiPropertyOptional({
    description: 'Subdomínio único do tenant (usado quando nutricionista admin não fornece tenantId)',
    example: 'nutrivida',
    nullable: true
  })
  @IsOptional()
  @IsString()
  tenantSubdomain?: string;

  @ApiPropertyOptional({
    description: 'Descrição do tenant/clínica (usado quando nutricionista admin não fornece tenantId)',
    example: 'Clínica especializada em nutrição clínica e esportiva',
    nullable: true
  })
  @IsOptional()
  @IsString()
  tenantDescription?: string;
} 