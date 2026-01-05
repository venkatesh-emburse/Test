// User Model
class User {
  final String id;
  final String? name;
  final String? phone;
  final String? email;
  final DateTime? dateOfBirth;
  final String gender;
  final String intent;
  final double safetyScore;
  final bool isVerified;
  final String currentPlan;
  final Profile? profile;

  User({
    required this.id,
    this.name,
    this.phone,
    this.email,
    this.dateOfBirth,
    required this.gender,
    required this.intent,
    required this.safetyScore,
    required this.isVerified,
    required this.currentPlan,
    this.profile,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      name: json['name'],
      phone: json['phone'],
      email: json['email'],
      dateOfBirth: json['dateOfBirth'] != null 
          ? DateTime.tryParse(json['dateOfBirth']) 
          : null,
      gender: json['gender'] ?? 'other',
      intent: json['intent'] ?? 'casual',
      safetyScore: (json['safetyScore'] ?? 0).toDouble(),
      isVerified: json['isVerified'] ?? false,
      currentPlan: json['currentPlan'] ?? 'free',
      profile: json['profile'] != null ? Profile.fromJson(json['profile']) : null,
    );
  }

  int? get age {
    if (dateOfBirth == null) return null;
    final now = DateTime.now();
    int age = now.year - dateOfBirth!.year;
    if (now.month < dateOfBirth!.month ||
        (now.month == dateOfBirth!.month && now.day < dateOfBirth!.day)) {
      age--;
    }
    return age;
  }
  
  String get displayName => name ?? 'New User';
  String get displayAge => age?.toString() ?? '?';
}

// Profile Model
class Profile {
  final String? bio;
  final String? lookingFor;
  final int? height;
  final String? occupation;
  final String? education;
  final List<String> photos;
  final List<String> interests;
  final int profileCompleteness;

  Profile({
    this.bio,
    this.lookingFor,
    this.height,
    this.occupation,
    this.education,
    this.photos = const [],
    this.interests = const [],
    this.profileCompleteness = 0,
  });

  factory Profile.fromJson(Map<String, dynamic> json) {
    return Profile(
      bio: json['bio'],
      lookingFor: json['lookingFor'],
      height: json['height'],
      occupation: json['occupation'],
      education: json['education'],
      photos: List<String>.from(json['photos'] ?? []),
      interests: List<String>.from(json['interests'] ?? []),
      profileCompleteness: json['profileCompleteness'] ?? 0,
    );
  }
}

// Match Model
class Match {
  final String id;
  final User otherUser;
  final DateTime matchedAt;
  final String? microDateGame;
  final bool chatUnlocked;
  final String? lastMessage;
  final DateTime? lastMessageAt;
  final int unreadCount;

  Match({
    required this.id,
    required this.otherUser,
    required this.matchedAt,
    this.microDateGame,
    this.chatUnlocked = false,
    this.lastMessage,
    this.lastMessageAt,
    this.unreadCount = 0,
  });

  factory Match.fromJson(Map<String, dynamic> json) {
    // Handle both 'id' and 'matchId' (conversation endpoint uses matchId)
    final matchId = json['matchId'] ?? json['id'];
    
    // Handle lastMessage as object or string
    String? lastMessageContent;
    DateTime? lastMessageTime;
    if (json['lastMessage'] is Map) {
      lastMessageContent = json['lastMessage']['content'];
      lastMessageTime = json['lastMessage']['createdAt'] != null
          ? DateTime.parse(json['lastMessage']['createdAt'])
          : null;
    } else {
      lastMessageContent = json['lastMessage'];
      lastMessageTime = json['lastMessageAt'] != null
          ? DateTime.parse(json['lastMessageAt'])
          : null;
    }
    
    return Match(
      id: matchId,
      otherUser: User.fromJson(json['otherUser']),
      matchedAt: json['matchedAt'] != null 
          ? DateTime.parse(json['matchedAt']) 
          : DateTime.now(),
      microDateGame: json['microDateGame'],
      chatUnlocked: json['chatUnlocked'] ?? false,
      lastMessage: lastMessageContent,
      lastMessageAt: lastMessageTime,
      unreadCount: json['unreadCount'] ?? 0,
    );
  }
}

// Message Model
class Message {
  final String id;
  final String senderId;
  final String content;
  final DateTime createdAt;
  final bool isRead;
  final bool isDeleted;

  Message({
    required this.id,
    required this.senderId,
    required this.content,
    required this.createdAt,
    this.isRead = false,
    this.isDeleted = false,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'],
      senderId: json['senderId'],
      content: json['content'],
      createdAt: DateTime.parse(json['createdAt']),
      isRead: json['isRead'] ?? false,
      isDeleted: json['isDeleted'] ?? false,
    );
  }
}

// Discovery Profile Model
class DiscoveryProfile {
  final String id;
  final String name;
  final int age;
  final String gender;
  final String intent;
  final double safetyScore;
  final bool isVerified;
  final int compatibilityScore;
  final double? distanceKm;
  final List<String> photos;
  final String? bio;
  final List<String> interests;

  DiscoveryProfile({
    required this.id,
    required this.name,
    required this.age,
    required this.gender,
    required this.intent,
    required this.safetyScore,
    required this.isVerified,
    required this.compatibilityScore,
    this.distanceKm,
    this.photos = const [],
    this.bio,
    this.interests = const [],
  });

  factory DiscoveryProfile.fromJson(Map<String, dynamic> json) {
    return DiscoveryProfile(
      id: json['id'],
      name: json['name'],
      age: json['age'],
      gender: json['gender'],
      intent: json['intent'],
      safetyScore: (json['safetyScore'] ?? 0).toDouble(),
      isVerified: json['isVerified'] ?? false,
      compatibilityScore: json['compatibilityScore'] ?? 0,
      distanceKm: json['distanceKm']?.toDouble(),
      photos: List<String>.from(json['photos'] ?? []),
      bio: json['bio'],
      interests: List<String>.from(json['interests'] ?? []),
    );
  }
}

// Signal Model
class Signal {
  final String id;
  final String signalType;
  final User fromUser;
  final DateTime createdAt;
  final bool isNew;

  Signal({
    required this.id,
    required this.signalType,
    required this.fromUser,
    required this.createdAt,
    this.isNew = false,
  });

  factory Signal.fromJson(Map<String, dynamic> json) {
    return Signal(
      id: json['id'],
      signalType: json['signalType'],
      fromUser: User.fromJson(json['fromUser']),
      createdAt: DateTime.parse(json['createdAt']),
      isNew: json['isNew'] ?? false,
    );
  }
}

// Subscription Status
class SubscriptionStatus {
  final String currentPlan;
  final bool isActive;
  final DateTime? expiresAt;
  final PlanFeatures features;
  final int? daysRemaining;
  final bool canUpgrade;

  SubscriptionStatus({
    required this.currentPlan,
    required this.isActive,
    this.expiresAt,
    required this.features,
    this.daysRemaining,
    required this.canUpgrade,
  });

  factory SubscriptionStatus.fromJson(Map<String, dynamic> json) {
    return SubscriptionStatus(
      currentPlan: json['currentPlan'],
      isActive: json['isActive'] ?? false,
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'])
          : null,
      features: PlanFeatures.fromJson(json['features']),
      daysRemaining: json['daysRemaining'],
      canUpgrade: json['canUpgrade'] ?? true,
    );
  }
}

// Plan Features
class PlanFeatures {
  final int swipesPerDay;
  final int superLikesPerDay;
  final bool undoSwipe;
  final bool seeWhoLiked;
  final bool readReceipts;
  final int maxRadiusKm;
  final bool priorityDiscovery;
  final bool noAds;

  PlanFeatures({
    required this.swipesPerDay,
    required this.superLikesPerDay,
    required this.undoSwipe,
    required this.seeWhoLiked,
    required this.readReceipts,
    required this.maxRadiusKm,
    required this.priorityDiscovery,
    required this.noAds,
  });

  factory PlanFeatures.fromJson(Map<String, dynamic> json) {
    return PlanFeatures(
      swipesPerDay: json['swipesPerDay'] ?? 20,
      superLikesPerDay: json['superLikesPerDay'] ?? 1,
      undoSwipe: json['undoSwipe'] ?? false,
      seeWhoLiked: json['seeWhoLiked'] ?? false,
      readReceipts: json['readReceipts'] ?? false,
      maxRadiusKm: json['maxRadiusKm'] ?? 25,
      priorityDiscovery: json['priorityDiscovery'] ?? false,
      noAds: json['noAds'] ?? false,
    );
  }
}
