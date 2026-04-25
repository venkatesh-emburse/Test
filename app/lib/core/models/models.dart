// User Model
class User {
  final String id;
  final String? name;
  final String? phone;
  final String? email;
  final DateTime? dateOfBirth;
  final String gender;
  final String intent;
  final DateTime? intentChangedAt;
  final double safetyScore;
  final bool isVerified;
  final bool showOnMap;
  final bool isInvisible;
  final bool isSuspended;
  final DateTime? lastActiveAt;
  final DateTime? createdAt;
  final Profile? profile;

  User({
    required this.id,
    this.name,
    this.phone,
    this.email,
    this.dateOfBirth,
    required this.gender,
    required this.intent,
    this.intentChangedAt,
    required this.safetyScore,
    required this.isVerified,
    this.showOnMap = false,
    this.isInvisible = false,
    this.isSuspended = false,
    this.lastActiveAt,
    this.createdAt,
    this.profile,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      name: json['name'],
      phone: json['phone'],
      email: json['email'],
      dateOfBirth: json['dateOfBirth'] != null
          ? DateTime.tryParse(json['dateOfBirth'].toString())
          : null,
      gender: json['gender'] ?? 'other',
      intent: json['intent'] ?? 'casual',
      intentChangedAt: json['intentChangedAt'] != null
          ? DateTime.tryParse(json['intentChangedAt'].toString())
          : null,
      safetyScore: (json['safetyScore'] ?? 0).toDouble(),
      isVerified: json['isVerified'] ?? false,
      showOnMap: json['showOnMap'] ?? false,
      isInvisible: json['isInvisible'] ?? false,
      isSuspended: json['isSuspended'] ?? false,
      lastActiveAt: json['lastActiveAt'] != null
          ? DateTime.tryParse(json['lastActiveAt'].toString())
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
      profile:
          json['profile'] != null ? Profile.fromJson(json['profile']) : null,
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
    final otherUserJson = Map<String, dynamic>.from(json['otherUser'] ?? {});

    if (otherUserJson['profile'] == null && otherUserJson['photos'] != null) {
      otherUserJson['profile'] = {
        'photos': otherUserJson['photos'],
      };
    }

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
      otherUser: User.fromJson(otherUserJson),
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
  final bool isMe;
  final String? warningType; // 'external_link' | 'phone_number' | 'financial'

  Message({
    required this.id,
    required this.senderId,
    required this.content,
    required this.createdAt,
    this.isRead = false,
    this.isDeleted = false,
    this.isMe = false,
    this.warningType,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'],
      senderId: json['senderId'] ?? '',
      content: json['content'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      isRead: json['isRead'] ?? json['readAt'] != null,
      isDeleted: json['isDeleted'] ?? false,
      isMe: json['isMe'] ?? false,
      warningType: json['warningType'],
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
  final DateTime? createdAt;

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
    this.createdAt,
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
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
    );
  }

  /// Returns verification tier based on safety score
  String get verificationTier {
    if (safetyScore >= 80) return 'Trusted';
    if (safetyScore >= 60) return 'Verified';
    if (safetyScore >= 30) return 'Basic';
    return 'New';
  }

  /// Returns member since label (e.g. "Jan 2026")
  String? get memberSince {
    if (createdAt == null) return null;
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[createdAt!.month - 1]} ${createdAt!.year}';
  }
}

class ReceivedLike {
  final String userId;
  final String name;
  final int age;
  final String intent;
  final String? bio;
  final List<String> photos;
  final double safetyScore;
  final bool isVerified;
  final DateTime likedAt;

  ReceivedLike({
    required this.userId,
    required this.name,
    required this.age,
    required this.intent,
    this.bio,
    this.photos = const [],
    required this.safetyScore,
    required this.isVerified,
    required this.likedAt,
  });

  factory ReceivedLike.fromJson(Map<String, dynamic> json) {
    return ReceivedLike(
      userId: json['userId'] ?? '',
      name: json['name'] ?? 'Someone',
      age: json['age'] ?? 0,
      intent: json['intent'] ?? '',
      bio: json['bio'],
      photos: List<String>.from(json['photos'] ?? []),
      safetyScore: (json['safetyScore'] ?? 0).toDouble(),
      isVerified: json['isVerified'] ?? false,
      likedAt: json['likedAt'] != null
          ? DateTime.parse(json['likedAt'])
          : DateTime.now(),
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

// Safety Score Log Model — tracks score change history
class SafetyScoreLog {
  final String id;
  final double previousScore;
  final double newScore;
  final double changeAmount;
  final String reason;
  final String
      category; // verification, profile, behavioral, activity, report_penalty, admin_action
  final DateTime createdAt;

  SafetyScoreLog({
    required this.id,
    required this.previousScore,
    required this.newScore,
    required this.changeAmount,
    required this.reason,
    required this.category,
    required this.createdAt,
  });

  factory SafetyScoreLog.fromJson(Map<String, dynamic> json) {
    return SafetyScoreLog(
      id: json['id'],
      previousScore: (json['previousScore'] ?? 0).toDouble(),
      newScore: (json['newScore'] ?? 0).toDouble(),
      changeAmount: (json['changeAmount'] ?? 0).toDouble(),
      reason: json['reason'] ?? '',
      category: json['category'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }

  bool get isPositive => changeAmount > 0;
  bool get isNegative => changeAmount < 0;
}
