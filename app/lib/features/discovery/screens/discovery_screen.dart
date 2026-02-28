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

  Future<void> _swipe(String profileId, String action) async {
    try {
      final response = await ref.read(dioProvider).post(
        '/discovery/swipe',
        data: {'targetUserId': profileId, 'action': action},
      );

      if (response.data['isMatch'] == true) {
        final matchId = response.data['match']?['id'];
        final userName =
            response.data['match']?['user']?['name'] ?? 'Someone';
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

  @override
  Widget build(BuildContext context) {
    final profilesAsync = ref.watch(discoveryProfilesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.favorite_rounded,
                color: Theme.of(context).primaryColor, size: 22),
            const SizedBox(width: 8),
            const Text('Discover'),
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
            icon: const Icon(Icons.tune_rounded, size: 22),
            onPressed: () {},
          ),
        ],
      ),
      body: profilesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.wifi_off_rounded,
                    size: 56,
                    color: Theme.of(context).colorScheme.outline),
                const SizedBox(height: 16),
                const Text(
                  'Unable to load profiles',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                Text(
                  'Check your connection and try again',
                  style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () => ref.refresh(discoveryProfilesProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (profiles) {
          if (profiles.isEmpty) return _buildEmptyState();
          return _buildSwipeStack(profiles);
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off_rounded,
                size: 64, color: Theme.of(context).colorScheme.outline),
            const SizedBox(height: 16),
            const Text(
              'No more profiles',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            Text(
              'Check back later for new people',
              style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSwipeStack(List<DiscoveryProfile> profiles) {
    return Column(
      children: [
        Expanded(
          child: CardSwiper(
            controller: _controller,
            cardsCount: profiles.length,
            numberOfCardsDisplayed: profiles.length.clamp(1, 2),
            backCardOffset: const Offset(0, -30),
            padding: const EdgeInsets.all(16),
            onSwipe: (previousIndex, currentIndex, direction) {
              final profile = profiles[previousIndex];
              String action = 'pass';
              if (direction == CardSwiperDirection.right) action = 'like';
              if (direction == CardSwiperDirection.top) action = 'super_like';
              _swipe(profile.id, action);
              return true;
            },
            cardBuilder:
                (context, index, percentThresholdX, percentThresholdY) {
              return _buildProfileCard(profiles[index], onTap: () {
                _openProfileDetails(profiles[index]);
              });
            },
          ),
        ),

        // Action buttons
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildActionButton(
                icon: Icons.close_rounded,
                color: AppTheme.passColor,
                onTap: () => _controller.swipeLeft(),
              ),
              _buildActionButton(
                icon: Icons.star_rounded,
                color: AppTheme.superLikeColor,
                size: 64,
                onTap: () => _controller.swipeTop(),
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
          onSuperLike: () => _controller.swipeTop(),
        ),
      ),
    );
  }

  Widget _buildProfileCard(DiscoveryProfile profile, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
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
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: const [0.0, 0.5, 1.0],
                    colors: [
                      Colors.transparent,
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.75),
                    ],
                  ),
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
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                              letterSpacing: -0.3,
                            ),
                          ),
                        ),
                        if (profile.isVerified)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.verified_rounded,
                                    color: Colors.white, size: 14),
                                SizedBox(width: 4),
                                Text(
                                  'Verified',
                                  style: TextStyle(
                                      color: Colors.white,
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
                          color: Colors.white.withValues(alpha: 0.5),
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
                        children:
                            profile.interests.take(4).map((interest) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.2),
                              ),
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
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 8,
                      ),
                    ],
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
          color: Theme.of(context).colorScheme.surface,
          shape: BoxShape.circle,
          border: Border.all(
            color: color.withValues(alpha: 0.2),
          ),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.1),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Icon(icon, color: color, size: size * 0.45),
      ),
    );
  }
}
