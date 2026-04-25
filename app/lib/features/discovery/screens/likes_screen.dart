import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/models/models.dart';
import '../../../core/utils/app_theme.dart';

final receivedLikesProvider =
    FutureProvider.autoDispose<List<ReceivedLike>>((ref) async {
  final response = await ref.read(dioProvider).get('/discovery/likes');
  final data = response.data;
  final likes = data is List ? data : <dynamic>[];
  return likes
      .map((json) => ReceivedLike.fromJson(json as Map<String, dynamic>))
      .toList();
});

class LikesScreen extends ConsumerWidget {
  const LikesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final likesAsync = ref.watch(receivedLikesProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('INBOX', style: Theme.of(context).textTheme.labelSmall),
            Text('Likes', style: Theme.of(context).textTheme.headlineMedium),
          ],
        ),
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
              top: -100,
              right: -40,
              child: _buildAura(
                AppTheme.secondaryColor.withValues(alpha: 0.16),
                220,
              ),
            ),
            Positioned(
              bottom: -90,
              left: -40,
              child: _buildAura(
                AppTheme.primaryColor.withValues(alpha: 0.14),
                220,
              ),
            ),
            SafeArea(
              child: likesAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (_, __) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: _buildStateCard(
                      context,
                      icon: Icons.sync_problem_rounded,
                      title: 'Unable to load likes',
                      message:
                          'Try refreshing the inbox to reconnect with incoming signals.',
                      action: ElevatedButton(
                        onPressed: () => ref.refresh(receivedLikesProvider),
                        child: const Text('Retry'),
                      ),
                    ),
                  ),
                ),
                data: (likes) {
                  if (likes.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: _buildStateCard(
                          context,
                          icon: Icons.favorite_border_rounded,
                          title: 'No likes yet',
                          message:
                              'When someone sends you a signal, they will appear here.',
                        ),
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: () async =>
                        ref.refresh(receivedLikesProvider.future),
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                      itemCount: likes.length + 1,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: colorScheme.surfaceContainerHigh
                                  .withValues(alpha: 0.8),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: _buildMetric(
                                    context,
                                    'LIVE LIKES',
                                    '${likes.length}',
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _buildMetric(
                                    context,
                                    'STATUS',
                                    'PENDING',
                                  ),
                                ),
                              ],
                            ),
                          );
                        }

                        final like = likes[index - 1];
                        return _buildLikeCard(context, like);
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLikeCard(BuildContext context, ReceivedLike like) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context)
            .colorScheme
            .surfaceContainerHigh
            .withValues(alpha: 0.84),
        borderRadius: BorderRadius.circular(4),
        boxShadow: AppTheme.neonGlow(
          AppTheme.secondaryColor,
          blur: 18,
          opacity: 0.08,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: SizedBox(
                width: 72,
                height: 90,
                child: like.photos.isNotEmpty
                    ? Image.network(
                        like.photos.first,
                        fit: BoxFit.cover,
                      )
                    : Container(
                        color: Theme.of(context)
                            .colorScheme
                            .surfaceContainerHighest,
                        child: const Icon(Icons.person_rounded, size: 30),
                      ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${like.name}, ${like.age}',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ),
                      if (like.isVerified)
                        const Icon(
                          Icons.verified_rounded,
                          color: AppTheme.safetyHigh,
                          size: 18,
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatIntent(like.intent).toUpperCase(),
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: AppTheme.primaryColor,
                        ),
                  ),
                  const SizedBox(height: 8),
                  if ((like.bio ?? '').trim().isNotEmpty)
                    Text(
                      like.bio!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    ),
                  const SizedBox(height: 10),
                  Text(
                    'Liked ${_formatLikedAt(like.likedAt)}',
                    style: Theme.of(context).textTheme.labelMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetric(BuildContext context, String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 4),
        Text(value, style: Theme.of(context).textTheme.titleLarge),
      ],
    );
  }

  Widget _buildStateCard(
    BuildContext context, {
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
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 60, color: AppTheme.secondaryColor),
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
            const SizedBox(height: 18),
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

  static String _formatLikedAt(DateTime likedAt) {
    final diff = DateTime.now().difference(likedAt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  static String _formatIntent(String intent) {
    switch (intent) {
      case 'long_term':
        return 'Long-term';
      case 'short_term':
        return 'Short-term';
      case 'marriage':
        return 'Marriage';
      case 'companionship':
        return 'Companionship';
      default:
        return intent;
    }
  }
}
