export enum UserIntent {
  MARRIAGE = 'marriage',
  LONG_TERM = 'long_term',
  SHORT_TERM = 'short_term',
  COMPANIONSHIP = 'companionship',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non_binary',
  OTHER = 'other',
}

export enum VerificationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

export enum VerificationType {
  VIDEO = 'video',
  SELFIE = 'selfie',
}

export enum SwipeAction {
  LIKE = 'like',
  PASS = 'pass',
  SUPER_LIKE = 'super_like',
}

export enum SignalType {
  WAVE = 'wave',
  INTERESTED = 'interested',
  VIEWED = 'viewed',
}

export enum ReportReason {
  FAKE_PROFILE = 'fake_profile',
  IMPERSONATION = 'impersonation',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  HARASSMENT = 'harassment',
  SPAM = 'spam',
  SCAM = 'scam',
  UNDERAGE = 'underage',
  OTHER = 'other',
}

export enum ScoreChangeCategory {
  VERIFICATION = 'verification',
  PROFILE = 'profile',
  BEHAVIORAL = 'behavioral',
  ACTIVITY = 'activity',
  REPORT_PENALTY = 'report_penalty',
  ADMIN_ACTION = 'admin_action',
}

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  SUPPORT = 'support',
}
