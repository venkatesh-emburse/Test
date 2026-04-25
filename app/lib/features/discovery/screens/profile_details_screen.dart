import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/models.dart';
import '../../../core/utils/app_theme.dart';

class ProfileDetailsScreen extends ConsumerStatefulWidget {
  final DiscoveryProfile profile;
  final VoidCallback? onLike;
  final VoidCallback? onPass;
  final bool isMatched;

  const ProfileDetailsScreen({
    super.key,
    required this.profile,
    this.onLike,
    this.onPass,
    this.isMatched = false,
  });

  @override
  ConsumerState<ProfileDetailsScreen> createState() =>
      _ProfileDetailsScreenState();
}

class _ProfileDetailsScreenState extends ConsumerState<ProfileDetailsScreen> {
  int _currentPhotoIndex = 0;
  final PageController _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;

    // Debug logging
    debugPrint(
        '📸 Profile Details: ${profile.name} has ${profile.photos.length} photos');
    debugPrint('📸 Photos: ${profile.photos}');

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(context).colorScheme.surface,
              Theme.of(context).colorScheme.surfaceContainerLow,
              Theme.of(context).colorScheme.surface,
            ],
          ),
        ),
        child: Stack(
          children: [
            // Scrollable content
            CustomScrollView(
              slivers: [
                // Photo gallery
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: MediaQuery.of(context).size.height * 0.55,
                    child: Stack(
                      children: [
                        // Photos
                        PageView.builder(
                          controller: _pageController,
                          itemCount: profile.photos.isEmpty
                              ? 1
                              : profile.photos.length,
                          onPageChanged: (index) {
                            setState(() => _currentPhotoIndex = index);
                          },
                          itemBuilder: (context, index) {
                            if (profile.photos.isEmpty) {
                              return Container(
                                color: Theme.of(context)
                                    .colorScheme
                                    .surfaceContainerHighest,
                                child: Icon(Icons.person,
                                    size: 120,
                                    color:
                                        Theme.of(context).colorScheme.outline),
                              );
                            }
                            return Image.network(
                              profile.photos[index],
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                color: Theme.of(context)
                                    .colorScheme
                                    .surfaceContainerHighest,
                                child: Icon(Icons.person,
                                    size: 120,
                                    color:
                                        Theme.of(context).colorScheme.outline),
                              ),
                            );
                          },
                        ),

                        // Photo indicators
                        if (profile.photos.length > 1)
                          Positioned(
                            top: MediaQuery.of(context).padding.top + 12,
                            left: 16,
                            right: 16,
                            child: Row(
                              children: List.generate(
                                profile.photos.length,
                                (index) => Expanded(
                                  child: Container(
                                    height: 3,
                                    margin: const EdgeInsets.symmetric(
                                        horizontal: 2),
                                    decoration: BoxDecoration(
                                      color: index == _currentPhotoIndex
                                          ? Colors.white
                                          : Colors.white.withValues(alpha: 0.4),
                                      borderRadius: BorderRadius.circular(2),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),

                        // Back button
                        Positioned(
                          top: MediaQuery.of(context).padding.top + 8,
                          left: 8,
                          child: IconButton(
                            icon: const Icon(Icons.arrow_back,
                                color: Colors.white),
                            onPressed: () => Navigator.pop(context),
                            style: IconButton.styleFrom(
                              backgroundColor:
                                  Colors.black.withValues(alpha: 0.34),
                            ),
                          ),
                        ),

                        // Tap areas for photo navigation
                        if (profile.photos.length > 1)
                          Positioned.fill(
                            child: Row(
                              children: [
                                // Left tap area - previous photo
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () {
                                      if (_currentPhotoIndex > 0) {
                                        _pageController.previousPage(
                                          duration:
                                              const Duration(milliseconds: 300),
                                          curve: Curves.easeInOut,
                                        );
                                      }
                                    },
                                  ),
                                ),
                                // Right tap area - next photo
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () {
                                      if (_currentPhotoIndex <
                                          profile.photos.length - 1) {
                                        _pageController.nextPage(
                                          duration:
                                              const Duration(milliseconds: 300),
                                          curve: Curves.easeInOut,
                                        );
                                      }
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),

                // Profile info
                SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Theme.of(context)
                          .colorScheme
                          .surfaceContainerHigh
                          .withValues(alpha: 0.82),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Name and age
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${profile.name}, ${profile.age}',
                                style: Theme.of(context)
                                    .textTheme
                                    .displayMedium
                                    ?.copyWith(fontSize: 34),
                              ),
                            ),
                            if (profile.isVerified)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: AppTheme.safetyHigh
                                      .withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: <Widget>[
                                    const Icon(Icons.verified,
                                        color: AppTheme.safetyHigh, size: 18),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Verified',
                                      style: Theme.of(context)
                                          .textTheme
                                          .labelMedium
                                          ?.copyWith(
                                            color: AppTheme.safetyHigh,
                                            fontWeight: FontWeight.w700,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),

                        const SizedBox(height: 8),

                        // Distance and intent
                        Row(
                          children: [
                            if (profile.distanceKm != null) ...[
                              Icon(Icons.location_on,
                                  size: 16,
                                  color: Theme.of(context).colorScheme.outline),
                              const SizedBox(width: 4),
                              Text(
                                '${profile.distanceKm!.toStringAsFixed(1)} km away',
                                style: TextStyle(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant),
                              ),
                              const SizedBox(width: 16),
                            ],
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Theme.of(context)
                                    .primaryColor
                                    .withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                _formatIntent(profile.intent),
                                style: Theme.of(context)
                                    .textTheme
                                    .labelSmall
                                    ?.copyWith(
                                      color: Theme.of(context).primaryColor,
                                    ),
                              ),
                            ),
                          ],
                        ),

                        // Trust & Verification section
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: _getTierColor(profile.verificationTier)
                                .withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.shield_rounded,
                                    color:
                                        _getTierColor(profile.verificationTier),
                                    size: 32,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              profile.verificationTier,
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .titleLarge
                                                  ?.copyWith(
                                                    color: _getTierColor(
                                                      profile.verificationTier,
                                                    ),
                                                  ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              '${profile.safetyScore.toInt()}/100',
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .labelMedium
                                                  ?.copyWith(
                                                    color: Theme.of(context)
                                                        .colorScheme
                                                        .onSurfaceVariant,
                                                  ),
                                            ),
                                          ],
                                        ),
                                        Text(
                                          _getSafetyText(profile.safetyScore),
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall
                                              ?.copyWith(
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .onSurfaceVariant,
                                              ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              // Trust details row
                              Row(
                                children: [
                                  _buildTrustDetail(
                                    icon: profile.isVerified
                                        ? Icons.verified_rounded
                                        : Icons.cancel_outlined,
                                    label: profile.isVerified
                                        ? 'Verified'
                                        : 'Not Verified',
                                    color: profile.isVerified
                                        ? AppTheme.safetyHigh
                                        : Theme.of(context).colorScheme.outline,
                                  ),
                                  const SizedBox(width: 16),
                                  if (profile.memberSince != null)
                                    _buildTrustDetail(
                                      icon: Icons.calendar_today_rounded,
                                      label: 'Since ${profile.memberSince}',
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurfaceVariant,
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        // Bio
                        if (profile.bio != null && profile.bio!.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          Text(
                            'About',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            profile.bio!,
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurfaceVariant,
                                  height: 1.5,
                                ),
                          ),
                        ],

                        // Interests
                        if (profile.interests.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          Text(
                            'Interests',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: profile.interests.map((interest) {
                              return Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 8),
                                decoration: BoxDecoration(
                                  color: Theme.of(context)
                                      .primaryColor
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  interest,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                        color: Theme.of(context).primaryColor,
                                      ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],

                        // Bottom padding for action buttons
                        const SizedBox(height: 100),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Bottom bar: matched banner or action buttons
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: EdgeInsets.only(
                  left: 24,
                  right: 24,
                  bottom: MediaQuery.of(context).padding.bottom + 16,
                  top: 16,
                ),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Theme.of(context)
                          .scaffoldBackgroundColor
                          .withValues(alpha: 0),
                      Theme.of(context).scaffoldBackgroundColor,
                    ],
                  ),
                ),
                child: widget.isMatched
                    ? Container(
                        padding: const EdgeInsets.symmetric(
                            vertical: 16, horizontal: 20),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [
                              AppTheme.primaryColor,
                              AppTheme.secondaryColor
                            ],
                          ),
                          borderRadius: BorderRadius.circular(4),
                          boxShadow: AppTheme.neonGlow(AppTheme.primaryColor,
                              blur: 18, opacity: 0.2),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.favorite_rounded,
                                color: Colors.white, size: 22),
                            const SizedBox(width: 10),
                            Text(
                              "You're matched with ${profile.name}!",
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(
                                    color: Colors.white,
                                  ),
                            ),
                          ],
                        ),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildActionButton(
                            icon: Icons.close,
                            color: AppTheme.passColor,
                            onTap: () {
                              widget.onPass?.call();
                              Navigator.pop(context);
                            },
                          ),
                          _buildActionButton(
                            icon: Icons.favorite,
                            color: AppTheme.likeColor,
                            onTap: () {
                              widget.onLike?.call();
                              Navigator.pop(context);
                            },
                          ),
                        ],
                      ),
              ),
            ),
            Positioned(
              top: -120,
              right: -60,
              child: _buildAura(
                  AppTheme.primaryColor.withValues(alpha: 0.12), 220),
            ),
          ],
        ),
      ),
    );
  }

  String _formatIntent(String intent) {
    switch (intent) {
      case 'long_term':
        return 'Looking for Long-term';
      case 'dating':
        return 'Dating';
      case 'casual':
        return 'Casual';
      case 'friendship':
        return 'Friendship';
      default:
        return intent;
    }
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

  Widget _buildTrustDetail({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 4),
        Text(
          label,
          style:
              Theme.of(context).textTheme.labelMedium?.copyWith(color: color),
        ),
      ],
    );
  }

  String _getSafetyText(double score) {
    if (score >= 70) {
      return 'This profile has been verified and is considered safe';
    }
    if (score >= 40) return 'This profile has some verification';
    return 'Limited verification - proceed with caution';
  }

  Widget _buildActionButton({
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    double size = 56,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHigh,
          shape: BoxShape.circle,
          boxShadow: AppTheme.neonGlow(color, blur: 16, opacity: 0.18),
        ),
        child: Icon(icon, color: color, size: size * 0.5),
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
          gradient: RadialGradient(colors: [color, color.withValues(alpha: 0)]),
        ),
      ),
    );
  }
}
