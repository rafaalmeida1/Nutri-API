import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { Role } from '../../auth/enums/role.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { JsonTransformer } from '../../common/transformers/json.transformer';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['tenantId', 'role'])
@Index(['nutricionistaId'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string; // será hasheada com bcrypt

  @Column()
  name: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  role: Role;

  @Column({ nullable: true })
  tenantId: string; // null para super_admin, obrigatório para nutricionista e paciente

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastLogin: Date;

  @Column({ type: 'varchar', nullable: true })
  refreshToken: string | null; // para controle de sessões

  // Campos específicos para pacientes
  @Column({ nullable: true })
  nutricionistaId: string; // ID do nutricionista responsável (se for paciente)

  // Campos específicos para nutricionistas
  @Column({ nullable: true })
  crn: string; // registro profissional

  @Column({ nullable: true })
  especialidade: string;

  // Metadata adicional
  @Column('text', { nullable: true, transformer: JsonTransformer })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => User, (user) => user.pacientes, { nullable: true })
  @JoinColumn({ name: 'nutricionistaId' })
  nutricionista: User;

  @OneToMany(() => User, (user) => user.nutricionista)
  pacientes: User[];
} 