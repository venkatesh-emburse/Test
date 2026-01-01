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

export enum SubscriptionPlan {
    FREE = 'free',
    PREMIUM = 'premium',
}

export enum ReportReason {
    FAKE_PROFILE = 'fake_profile',
    INAPPROPRIATE_CONTENT = 'inappropriate_content',
    HARASSMENT = 'harassment',
    SPAM = 'spam',
    SCAM = 'scam',
    UNDERAGE = 'underage',
    OTHER = 'other',
}

export enum FeatureKey {
    // Swipe Features
    SWIPES_PER_DAY = 'swipes_per_day',
    SUPER_LIKES_PER_DAY = 'super_likes_per_day',
    UNDO_SWIPE = 'undo_swipe',

    // Discovery Features
    MAX_RADIUS_KM = 'max_radius_km',
    MAP_PROFILES_LIMIT = 'map_profiles_limit',
    MIN_COMPATIBILITY_SHOWN = 'min_compatibility_shown',

    // Profile Features
    SEE_WHO_LIKED = 'see_who_liked',
    READ_RECEIPTS = 'read_receipts',
    LAST_ACTIVE_FILTER = 'last_active_filter',
    SAFETY_SCORE_FILTER = 'safety_score_filter',

    // Premium Pricing
    INTENT_CHANGE_PRICE = 'intent_change_price',
    SERIOUS_INTENT_BADGE_PRICE = 'serious_intent_badge_price',
}
