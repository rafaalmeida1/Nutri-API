import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { JsonTransformer } from '../../common/transformers/json.transformer';

@Entity('tenants')
@Index(['subdomain'], { unique: true })
@Index(['ownerId'])
@Index(['isActive'])
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // Nome da clínica/consultório

  @Column({ unique: true })
  subdomain: string; // subdomínio único para acessar

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  ownerId: string; // ID do nutricionista proprietário

  // Configurações do tenant
  @Column('text', { nullable: true, transformer: JsonTransformer })
  settings: {
    maxPatients?: number;
    allowedFeatures?: string[];
    customBranding?: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
  };

  // Contato
  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column('text', { nullable: true, transformer: JsonTransformer })
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };

  // Metadata adicional
  @Column('text', { nullable: true, transformer: JsonTransformer })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @OneToMany(() => User, (user) => user.tenant)
  users: User[];
} 