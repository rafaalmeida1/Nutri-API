import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TenantDocument = Tenant & Document;

@Schema({
  timestamps: true,
  collection: 'tenants',
})
export class Tenant {
  @Prop({ required: true, unique: true })
  name: string; // Nome da clínica/consultório

  @Prop({ required: true, unique: true })
  subdomain: string; // subdomínio único para acessar

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  ownerId: string; // ID do nutricionista proprietário

  // Configurações do tenant
  @Prop({ type: Object })
  settings?: {
    maxPatients?: number;
    allowedFeatures?: string[];
    customBranding?: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
  };

  // Contato
  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };

  // Metadata adicional
  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

// Índices para performance
TenantSchema.index({ subdomain: 1 });
TenantSchema.index({ ownerId: 1 });
TenantSchema.index({ isActive: 1 }); 