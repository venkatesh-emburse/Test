import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/models/models.dart';
import '../../../core/utils/app_theme.dart';
import '../../../main.dart';
import 'profile_details_screen.dart';

// Discovery profiles provider
final discoveryProfilesProvider =
    FutureProvider.autoDispose<List<DiscoveryProfile>>((ref) async {
  try {
    final response = await ref.read(dioProvider).get('/discovery/profiles');

    final data = response.data;
    final List<dynamic> profiles;

    if (data is List) {
      profiles = data;
    } else if (data is Map && data['profiles'] != null) {
      profiles = data['profiles'] as List;
    } else {
      return [];
    }

    return profiles.map((json) => DiscoveryProfile.fromJson(json)).toList();
  } catch (e) {
    rethrow;
  }
});

class DiscoveryScreen extends ConsumerStatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  ConsumerState<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen> {
  final CardSwiperController _controller = CardSwiperController();
  final Set<String> _dismissedProfileIds = <String>{};

  List<DiscoveryProfile> _visibleProfiles(List<DiscoveryProfile> profiles) {
    return profiles
        .where((profile) => !_dismissedProfileIds.contains(profile.id))
        .toList();
  }

  Future<void> _swipe(String profileId, String action) async {
    try {
      final response = await ref.read(dioProvider).post(
        '/discovery/swipe',
        data: {'targetUserId': profileId, 'action': action},
      );

      if (response.data['isMatch'] == true) {
        final matchId = response.data['match']?['id'];
        final userName = response.data['match']?['user']?['name'] ?? 'Someone';
        if (mounted) _showMatchDialog(matchId, userName);
      }
    } catch (e) {
      debugPrint('Swipe error: $e');
    }
  }

  void _showMatchDialog(String? matchId, String userName) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppTheme.likeColor.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.favorite_rounded,
                    size: 32, color: AppTheme.likeColor),
              ),
              const SizedBox(height: 20),
              const Text(
                "It's a Match!",
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                'You and $userName liked each other',
                style: TextStyle(
                    color: Theme.of(ctx).colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Keep Swiping'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        if (matchId != null) {
                          context.push('/chat/$matchId');
                        }
                      },
                      child: const Text('Message'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openLikesScreen() {
    context.push('/likes');
  }

  @override
  Widget build(BuildContext context) {
    final profilesAsync = ref.watch(discoveryProfilesProvider);
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('DISCOVERY', style: textTheme.labelSmall),
            Text('Kinetic Pulse', style: textTheme.headlineMedium),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(
              Theme.of(context).brightness == Brightness.dark
                  ? Icons.light_mode_rounded
                  : Icons.dark_mode_rounded,
              size: 22,
            ),
            onPressed: () {
              final current = ref.read(themeModeProvider);
              final next = switch (current) {
                ThemeMode.system =>
                  Theme.of(context).brightness == Brightness.dark
                      ? ThemeMode.light
                      : ThemeMode.dark,
                ThemeMode.light => ThemeMode.dark,
                ThemeMode.dark => ThemeMode.light,
              };
              ref.read(themeModeProvider.notifier).state = next;
            },
          ),
          IconButton(
            icon: const Icon(Icons.favorite_border_rounded, size: 22),
            onPressed: _openLikesScreen,
          ),
          IconButton(
            icon: const Icon(Icons.tune_rounded, size: 22),
            onPressed: () {},
          ),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              colorScheme.surface,
              colorScheme.surfaceContainerLow,
              colorScheme.surface,
            ],
          ),
        ),
        child: Stack(
          children: [
            Positioned(
              top: -120,
              left: -40,
              child: _buildAura(
                  AppTheme.primaryColor.withValues(alpha: 0.16), 220),
            ),
            Positioned(
              top: 180,
              right: -70,
              child: _buildAura(
                  AppTheme.secondaryColor.withValues(alpha: 0.12), 200),
            ),
            SafeArea(
              child: profilesAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: _buildMessageState(
                      icon: Icons.wifi_off_rounded,
                      title: 'Signal lost',
                      message:
                          'Check your connection and tap back into the pulse.',
                      action: ElevatedButton(
                        onPressed: () => ref.refresh(discoveryProfilesProvider),
                        child: const Text('Retry'),
                      ),
                    ),
                  ),
                ),
                data: (profiles) {
                  final visibleProfiles = _visibleProfiles(profiles);
                  if (visibleProfiles.isEmpty) return _buildEmptyState();
                  return _buildSwipeStack(visibleProfiles);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: _buildMessageState(
          icon: Icons.radar_rounded,
          title: 'No more profiles in range',
          message:
              'Your feed is clear for now. New signals will show up here soon.',
        ),
      ),
    );
  }

  Widget _buildSwipeStack(List<DiscoveryProfile> profiles) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
          child: Row(
            children: [
              Expanded(
                child: _buildMetricChip(
                  context,
                  label: 'LIVE STACK',
                  value: '${profiles.length}',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricChip(
                  context,
                  label: 'MODE',
                  value: 'MATCH BY INTENT',
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: CardSwiper(
            key: ValueKey(profiles.map((profile) => profile.id).join(',')),
            controller: _controller,
            cardsCount: profiles.length,
            numberOfCardsDisplayed: profiles.length.clamp(1, 2),
            allowedSwipeDirection: const AllowedSwipeDirection.only(
              left: true,
              right: true,
            ),
            backCardOffset: const Offset(0, -24),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            onSwipe: (previousIndex, currentIndex, direction) {
              final profile = profiles[previousIndex];
              String action = 'pass';
              if (direction == CardSwiperDirection.right) action = 'like';

              setState(() {
                _dismissedProfileIds.add(profile.id);
              });

              _swipe(profile.id, action);
              return true;
            },
            cardBuilder:
                (context, index, percentThresholdX, percentThresholdY) {
              if (index >= profiles.length) {
                return const SizedBox.shrink();
              }

              return _buildProfileCard(profiles[index], onTap: () {
                _openProfileDetails(profiles[index]);
              });
            },
          ),
        ),

        // Action buttons
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 10, 24, 28),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildActionButton(
                icon: Icons.close_rounded,
                color: AppTheme.passColor,
                onTap: () => _controller.swipeLeft(),
              ),
              _buildActionButton(
                icon: Icons.favorite_rounded,
                color: AppTheme.likeColor,
                onTap: () => _controller.swipeRight(),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _openProfileDetails(DiscoveryProfile profile) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProfileDetailsScreen(
          profile: profile,
          onLike: () => _controller.swipeRight(),
          onPass: () => _controller.swipeLeft(),
        ),
      ),
    );
  }

  Widget _buildProfileCard(DiscoveryProfile profile, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(4),
          boxShadow: AppTheme.neonGlow(
            AppTheme.primaryColor,
            blur: 26,
            opacity: 0.08,
          ),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Photo
              profile.photos.isNotEmpty
                  ? Image.network(
                      profile.photos.first,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: Theme.of(context)
                            .colorScheme
                            .surfaceContainerHighest,
                        child: Icon(Icons.person_rounded,
                            size: 80,
                            color: Theme.of(context).colorScheme.outline),
                      ),
                    )
                  : Container(
                      color:
                          Theme.of(context).colorScheme.surfaceContainerHighest,
                      child: Icon(Icons.person_rounded,
                          size: 80,
                          color: Theme.of(context).colorScheme.outline),
                    ),

              // Gradient overlay
              Container(
                decoration: BoxDecoration(
                  gradient: AppTheme.profileCardGradient,
                ),
              ),

              Positioned(
                left: 16,
                top: 18,
                child: _buildTag(
                  context,
                  icon: Icons.bolt_rounded,
                  label: '${profile.compatibilityScore}% MATCH',
                  color: AppTheme.secondaryColor,
                ),
              ),

              // Info overlay
              Positioned(
                left: 20,
                right: 20,
                bottom: 20,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${profile.name}, ${profile.age}',
                            style: Theme.of(context)
                                .textTheme
                                .displayMedium
                                ?.copyWith(
                                  color: Colors.white,
                                  fontSize: 32,
                                ),
                          ),
                        ),
                        if (profile.isVerified)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color:
                                  AppTheme.primaryColor.withValues(alpha: 0.16),
                              borderRadius: BorderRadius.circular(4),
                              boxShadow: AppTheme.neonGlow(
                                AppTheme.primaryColor,
                                blur: 18,
                                opacity: 0.18,
                              ),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.verified_rounded,
                                    color: AppTheme.primaryColor, size: 14),
                                SizedBox(width: 4),
                                Text(
                                  'Verified',
                                  style: TextStyle(
                                      color: AppTheme.primaryColor,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    if (profile.memberSince != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Member since ${profile.memberSince}',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.7),
                          fontSize: 12,
                        ),
                      ),
                    ],
                    if (profile.bio != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        profile.bio!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.7),
                          fontSize: 14,
                        ),
                      ),
                    ],
                    if (profile.interests.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: profile.interests.take(4).map((interest) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              interest,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),

              // Verification tier badge
              Positioned(
                top: 16,
                right: 16,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Theme.of(context)
                        .colorScheme
                        .surfaceContainerHigh
                        .withValues(alpha: 0.82),
                    borderRadius: BorderRadius.circular(4),
                    boxShadow: AppTheme.neonGlow(
                      _getTierColor(profile.verificationTier),
                      blur: 16,
                      opacity: 0.15,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.shield_rounded,
                        size: 14,
                        color: _getTierColor(profile.verificationTier),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        profile.verificationTier,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                          color: _getTierColor(profile.verificationTier),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getTierColor(String tier) {
    switch (tier) {
      case 'Trusted':
        return const Color(0xFFD4A017); // Gold
      case 'Verified':
        return const Color(0xFF8E8E93); // Silver
      case 'Basic':
        return const Color(0xFFCD7F32); // Bronze
      default:
        return const Color(0xFFAEAEB2); // Gray for "New"
    }
  }

  Widget _buildActionButton({
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    double size = 52,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHigh,
          shape: BoxShape.circle,
          boxShadow: AppTheme.neonGlow(
            color,
            blur: 20,
            opacity: 0.2,
          ),
        ),
        child: Icon(icon, color: color, size: size * 0.45),
      ),
    );
  }

  Widget _buildMetricChip(
    BuildContext context, {
    required String label,
    required String value,
  }) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHigh.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(height: 4),
          Text(value, style: Theme.of(context).textTheme.titleMedium),
        ],
      ),
    );
  }

  Widget _buildMessageState({
    required IconData icon,
    required String title,
    required String message,
    Widget? action,
  }) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Theme.of(context)
            .colorScheme
            .surfaceContainerHigh
            .withValues(alpha: 0.84),
        borderRadius: BorderRadius.circular(4),
        boxShadow:
            AppTheme.neonGlow(AppTheme.primaryColor, blur: 20, opacity: 0.08),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 56, color: AppTheme.primaryColor),
          const SizedBox(height: 16),
          Text(title, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          if (action != null) ...[
            const SizedBox(height: 20),
            action,
          ],
        ],
      ),
    );
  }

  Widget _buildAura(Color color, double size) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [color, color.withValues(alpha: 0)],
          ),
        ),
      ),
    );
  }

  Widget _buildTag(
    BuildContext context, {
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.42),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style:
                Theme.of(context).textTheme.labelSmall?.copyWith(color: color),
          ),
        ],
      ),
    );
  }
}
