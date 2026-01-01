import {
    Entity,
    Column,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('refresh_tokens')
@Index(['token'])
@Index(['userId', 'expiresAt'])
export class RefreshToken extends BaseEntity {
    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    token: string; // hashed refresh token

    @Column({ name: 'device_info', nullable: true })
    deviceInfo?: string;

    @Column({ name: 'ip_address', nullable: true })
    ipAddress?: string;

    @Column({ name: 'expires_at', type: 'timestamp' })
    expiresAt: Date;

    @Column({ name: 'is_revoked', default: false })
    isRevoked: boolean;

    @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
    revokedAt?: Date;
}
