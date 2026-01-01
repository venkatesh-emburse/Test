import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { ReportReason } from './enums';

@Entity('reports')
@Index(['reportedId', 'createdAt'])
@Index(['reporterId', 'createdAt'])
export class Report extends BaseEntity {
    @Column({ name: 'reporter_id' })
    reporterId: string;

    @ManyToOne(() => User, (user) => user.reportsMade, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reporter_id' })
    reporter: User;

    @Column({ name: 'reported_id' })
    reportedId: string;

    @ManyToOne(() => User, (user) => user.reportsReceived, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reported_id' })
    reported: User;

    @Column({ type: 'enum', enum: ReportReason })
    reason: ReportReason;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ name: 'is_reviewed', default: false })
    isReviewed: boolean;

    @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
    reviewedAt?: Date;

    @Column({ name: 'reviewed_by', nullable: true })
    reviewedBy?: string;

    @Column({ name: 'action_taken', nullable: true })
    actionTaken?: string;
}
