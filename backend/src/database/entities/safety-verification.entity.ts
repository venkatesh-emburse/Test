import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { VerificationStatus } from './enums';

@Entity('safety_verifications')
@Index(['userId', 'createdAt'])
export class SafetyVerification extends BaseEntity {
    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, (user) => user.safetyVerifications, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'video_url', nullable: true })
    videoUrl?: string;

    @Column({ name: 'phrase_shown' })
    phraseShown: string;

    @Column({ name: 'phrase_detected', nullable: true })
    phraseDetected?: string;

    @Column({ name: 'speech_match_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
    speechMatchScore?: number;

    @Column({ name: 'face_match_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
    faceMatchScore?: number;

    @Column({ name: 'liveness_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
    livenessScore?: number;

    @Column({ name: 'verification_status', type: 'enum', enum: VerificationStatus, default: VerificationStatus.PENDING })
    verificationStatus: VerificationStatus;

    @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
    verifiedAt?: Date;

    @Column({ name: 'failure_reason', nullable: true })
    failureReason?: string;

    // Agora session tracking
    @Column({ name: 'agora_channel', nullable: true })
    agoraChannel?: string;

    @Column({ name: 'session_started_at', type: 'timestamp', nullable: true })
    sessionStartedAt?: Date;

    @Column({ name: 'session_ended_at', type: 'timestamp', nullable: true })
    sessionEndedAt?: Date;
}
