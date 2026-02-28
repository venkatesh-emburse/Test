import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { AdminRole } from './enums';

@Entity('admin_users')
export class AdminUser extends BaseEntity {
  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AdminRole, default: AdminRole.ADMIN })
  role: AdminRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date;
}
