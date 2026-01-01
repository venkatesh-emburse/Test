import {
    Entity,
    Column,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('profiles')
export class Profile extends BaseEntity {
    @Column({ name: 'user_id' })
    userId: string;

    @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'text', nullable: true })
    bio?: string;

    @Column({ name: 'looking_for', type: 'text', nullable: true })
    lookingFor?: string;

    @Column({ type: 'int', nullable: true })
    height?: number; // in cm

    @Column({ nullable: true })
    occupation?: string;

    @Column({ nullable: true })
    education?: string;

    @Column({ type: 'simple-array', nullable: true })
    photos?: string[]; // Array of S3 URLs

    @Column({ type: 'simple-array', nullable: true })
    interests?: string[]; // Interest tags

    @Column({ name: 'profile_completeness', type: 'int', default: 0 })
    profileCompleteness: number; // 0-100%

    @Column({ name: 'show_distance', default: true })
    showDistance: boolean;

    @Column({ name: 'show_age', default: true })
    showAge: boolean;

    // Preferences for matching
    @Column({ name: 'min_age_preference', type: 'int', nullable: true })
    minAgePreference?: number;

    @Column({ name: 'max_age_preference', type: 'int', nullable: true })
    maxAgePreference?: number;

    @Column({ name: 'max_distance_preference', type: 'int', nullable: true })
    maxDistancePreference?: number; // in km
}
