import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../auth/enums/role.enum';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string; // será hasheada com bcrypt

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: Role })
  role: Role;

  @Prop()
  tenantId?: string; // null para super_admin, obrigatório para nutricionista e paciente

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLogin?: Date;

  @Prop()
  refreshToken?: string; // para controle de sessões

  // Campos específicos para pacientes
  @Prop()
  nutricionistaId?: string; // ID do nutricionista responsável (se for paciente)

  // Campos específicos para nutricionistas
  @Prop()
  crn?: string; // registro profissional

  @Prop()
  especialidade?: string;

  // Metadata adicional
  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Índices para performance
UserSchema.index({ email: 1 });
UserSchema.index({ tenantId: 1, role: 1 });
UserSchema.index({ nutricionistaId: 1 }); 