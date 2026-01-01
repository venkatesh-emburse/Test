import {
    Entity,
    Column,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export enum OtpPurpose {
    PHONE_VERIFICATION = 'phone_verification',
    EMAIL_VERIFICATION = 'email_verification',
    PASSWORD_RESET = 'password_reset',
}

@Entity('otp_codes')
@Index(['identifier', 'purpose', 'expiresAt'])
export class OtpCode extends BaseEntity {
    @Column()
    identifier: string; // phone number or email

    @Column()
    code: string; // 6-digit OTP (hashed)

    @Column({ name: 'plain_code', nullable: true })
    plainCode?: string; // Unencrypted OTP for dev mode only

    @Column({ type: 'enum', enum: OtpPurpose })
    purpose: OtpPurpose;

    @Column({ name: 'expires_at', type: 'timestamp' })
    expiresAt: Date;

    @Column({ name: 'is_used', default: false })
    isUsed: boolean;

    @Column({ name: 'attempts', default: 0 })
    attempts: number;

    @Column({ name: 'user_id', nullable: true })
    userId?: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user?: User;
}
