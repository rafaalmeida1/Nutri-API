import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AccessLogDocument = AccessLog & Document;

@Schema({
  timestamps: true, // Adiciona automaticamente createdAt e updatedAt
  collection: 'access_logs',
})
export class AccessLog {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userEmail: string;

  @Prop({ required: true })
  userRole: string;

  @Prop()
  tenantId?: string;

  @Prop({ required: true })
  action: string; // login, logout, access_resource, etc.

  @Prop({ required: true })
  resource: string; // qual endpoint foi acessado

  @Prop({ required: true })
  method: string; // GET, POST, PUT, DELETE

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop({ default: true })
  success: boolean;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>; // dados extras como parâmetros da requisição

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const AccessLogSchema = SchemaFactory.createForClass(AccessLog); 