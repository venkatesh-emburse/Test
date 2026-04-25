import { Entity, Column, Index, OneToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserIntent, Gender } from './enums';
import { Profile } from './profile.entity';
import { Swipe } from './swipe.entity';
import { Match } from './match.entity';
import { Signal } from './signal.entity';
import { Report } from './report.entity';
import { SafetyVerification } from './safety-verification.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true, nullable: true })
  @Index()
  phone?: string;

  @Column({ unique: true, nullable: true })
  @Index()
  email?: string;

  @Column({ name: 'phone_verified', default: false })
  phoneVerified: boolean;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'firebase_uid', nullable: true })
  @Index()
  firebaseUid?: string;

  @Column()
  name: string;

  @Column({ name: 'google_display_name', nullable: true })
  googleDisplayName?: string;

  @Column({ name: 'google_gender', type: 'enum', enum: Gender, nullable: true })
  googleGender?: Gender;

  @Column({ name: 'google_account_linked_at', type: 'timestamp', nullable: true })
  googleAccountLinkedAt?: Date;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: Date;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column({ type: 'enum', enum: UserIntent })
  intent: UserIntent;

  @Column({ name: 'intent_changed_at', type: 'timestamp', nullable: true })
  intentChangedAt?: Date;

  @Column({
    name: 'safety_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  safetyScore: number;

  @Column({
    name: 'behavioral_score_value',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 15,
  })
  behavioralScoreValue: number;

  @Column({
    name: 'account_age_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  accountAgeScore: number;

  @Column({ name: 'last_misbehavior_at', type: 'timestamp', nullable: true })
  lastMisbehaviorAt?: Date;

  @Column({ name: 'last_behavior_recovery_at', type: 'timestamp', nullable: true })
  lastBehaviorRecoveryAt?: Date;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_banned', default: false })
  isBanned: boolean;

  @Column({ name: 'last_active_at', type: 'timestamp', nullable: true })
  lastActiveAt?: Date;

  // Location stored as PostGIS Point - latitude, longitude
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  @Index({ spatial: true })
  location?: string;

  @Column({ name: 'location_updated_at', type: 'timestamp', nullable: true })
  locationUpdatedAt?: Date;

  @Column({ name: 'show_on_map', default: false })
  showOnMap: boolean;

  @Column({ name: 'is_invisible', default: false })
  isInvisible: boolean;

  @Column({ name: 'fcm_token', nullable: true })
  fcmToken?: string;

  @Column({ name: 'invisible_until', type: 'timestamp', nullable: true })
  invisibleUntil?: Date;

  @Column({ name: 'is_suspended', default: false })
  isSuspended: boolean;

  @Column({ name: 'suspended_at', type: 'timestamp', nullable: true })
  suspendedAt?: Date;

  @Column({ name: 'swipe_warning_count', default: 0 })
  swipeWarningCount: number;

  // Daily counters (reset at midnight)
  @Column({ name: 'swipes_today', default: 0 })
  swipesToday: number;

  @Column({ name: 'super_likes_today', default: 0 })
  superLikesToday: number;

  @Column({ name: 'counters_reset_at', type: 'date', nullable: true })
  countersResetAt?: Date;

  // Relationships
  @OneToOne(() => Profile, (profile) => profile.user)
  profile?: Profile;

  @OneToMany(() => Swipe, (swipe) => swipe.swiper)
  swipesMade?: Swipe[];

  @OneToMany(() => Swipe, (swipe) => swipe.swiped)
  swipesReceived?: Swipe[];

  @OneToMany(() => Signal, (signal) => signal.sender)
  signalsSent?: Signal[];

  @OneToMany(() => Signal, (signal) => signal.receiver)
  signalsReceived?: Signal[];

  @OneToMany(() => Report, (report) => report.reporter)
  reportsMade?: Report[];

  @OneToMany(() => Report, (report) => report.reported)
  reportsReceived?: Report[];

  @OneToMany(() => SafetyVerification, (verification) => verification.user)
  safetyVerifications?: SafetyVerification[];
}
