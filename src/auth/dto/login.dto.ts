import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
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

  @ApiPropertyOptional({
    description: 'Subdomínio do tenant (obrigatório para usuários não super admin)',
    example: 'clinicaabc',
    nullable: true
  })
  @IsOptional()
  @IsString({ message: 'Subdomínio do tenant deve ser uma string' })
  tenantSubdomain?: string; // Para login no contexto de um tenant específico
} 