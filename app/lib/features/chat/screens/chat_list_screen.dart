import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_client.dart';
import '../../../core/models/models.dart';
import '../../../core/utils/app_theme.dart';

final conversationsProvider =
    FutureProvider.autoDispose<List<Match>>((ref) async {
  final response = await ref.read(dioProvider).get('/chat/conversations');
  return (response.data as List).map((json) => Match.fromJson(json)).toList();
});

class ChatListScreen extends ConsumerWidget {
  const ChatListScreen({super.key});

  static const _screenBg = Color(0xFF121214);
  static const _panelBg = Color(0xFF1A1A1A);
  static const _border = Color(0xFF2E2F2D);
  static const _cyan = Color(0xFF00F0FF);
  static const _orange = Color(0xFFFF4D00);
  static const _hotRed = Color(0xFFFF003C);
  static const _softText = Color(0xFF7E7E86);
  static const _creamText = Color(0xFFF5F2F1);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conversationsAsync = ref.watch(conversationsProvider);

    return Scaffold(
      backgroundColor: _screenBg,
      body: SafeArea(
        child: conversationsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: _buildStateCard(
                context,
                title: 'Unable to load conversations',
                message: '$error',
                icon: Icons.forum_outlined,
              ),
            ),
          ),
          data: (matches) {
            if (matches.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: _buildStateCard(
                    context,
                    title: 'No messages yet',
                    message:
                        'Match with someone and complete a micro-date to unlock the channel.',
                    icon: Icons.chat_bubble_outline_rounded,
                  ),
                ),
              );
            }

            final recentActive = _buildRecentActiveProfiles(matches);

            return ListView(
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
              children: [
                Text('Messages',
                    style: Theme.of(context)
                        .textTheme
                        .displayMedium
                        ?.copyWith(color: _creamText)),
                const SizedBox(height: 24),
                _buildEncryptionBanner(context),
                if (recentActive.isNotEmpty) ...[
                  const SizedBox(height: 36),
                  Text('NEW VIBES',
                      style: Theme.of(context)
                          .textTheme
                          .headlineMedium
                          ?.copyWith(color: _creamText)),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 112,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: recentActive.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 14),
                      itemBuilder: (context, index) {
                        final match = recentActive[index];
                        return _buildRecentActiveAvatar(context, match);
                      },
                    ),
                  ),
                ],
                const SizedBox(height: 36),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('DIRECT',
                        style: Theme.of(context)
                            .textTheme
                            .headlineMedium
                            ?.copyWith(color: _creamText)),
                  ],
                ),
                const SizedBox(height: 18),
                ...matches.map((match) => Padding(
                      padding: const EdgeInsets.only(bottom: 18),
                      child: _buildConversationCard(context, match),
                    )),
              ],
            );
          },
        ),
      ),
    );
  }

  List<Match> _buildRecentActiveProfiles(List<Match> matches) {
    final sorted = [...matches]..sort((a, b) {
        final aTime =
            a.otherUser.lastActiveAt ?? a.lastMessageAt ?? DateTime(1970);
        final bTime =
            b.otherUser.lastActiveAt ?? b.lastMessageAt ?? DateTime(1970);
        return bTime.compareTo(aTime);
      });

    return sorted
        .where((match) {
          final activeAt = match.otherUser.lastActiveAt ?? match.lastMessageAt;
          if (activeAt == null) return false;
          return DateTime.now().difference(activeAt).inDays < 7;
        })
        .take(8)
        .toList();
  }

  Widget _buildEncryptionBanner(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: _panelBg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: _border, width: 2),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.lock_rounded, color: _cyan, size: 18),
          const SizedBox(width: 10),
          Text(
            'END-TO-END ENCRYPTED',
            style: _labelStyle(context, color: _cyan),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentActiveAvatar(BuildContext context, Match match) {
    final isActive = _isActive(match.otherUser.lastActiveAt);

    return GestureDetector(
      onTap: () => context.push('/chat/${match.id}'),
      child: Column(
        children: [
          SizedBox(
            width: 84,
            height: 84,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: _cyan, width: 2),
                    boxShadow: AppTheme.neonGlow(_cyan, blur: 14, opacity: 0.4),
                  ),
                  child: ClipOval(
                    child: _buildAvatar(match, size: 78),
                  ),
                ),
                if (match.otherUser.isVerified)
                  Positioned(
                    right: -2,
                    bottom: 2,
                    child: Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: _screenBg,
                        shape: BoxShape.circle,
                        border: Border.all(color: _cyan, width: 2),
                      ),
                      child: const Icon(
                        Icons.verified_rounded,
                        size: 14,
                        color: _cyan,
                      ),
                    ),
                  ),
                if (isActive)
                  Positioned(
                    right: 2,
                    top: -1,
                    child: Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(
                        color: _hotRed,
                        shape: BoxShape.circle,
                        border: Border.all(color: _screenBg, width: 2),
                        boxShadow:
                            AppTheme.neonGlow(_hotRed, blur: 12, opacity: 0.4),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: 84,
            child: Text(
              match.otherUser.displayName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .labelLarge
                  ?.copyWith(color: _creamText),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConversationCard(BuildContext context, Match match) {
    final isUnread = match.unreadCount > 0;
    final isActive = _isActive(match.otherUser.lastActiveAt);

    return GestureDetector(
      onTap: () => context.push('/chat/${match.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: _panelBg.withValues(alpha: isUnread ? 0.84 : 0.72),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: _border, width: 2),
          boxShadow: isUnread
              ? [
                  const BoxShadow(
                    color: _orange,
                    offset: Offset(0, 4),
                    blurRadius: 0,
                  ),
                ]
              : null,
        ),
        child: Stack(
          clipBehavior: Clip.antiAlias,
          children: [
            if (match.otherUser.isVerified)
              Positioned(
                left: 0,
                top: 8,
                bottom: 8,
                child: Container(
                  width: 6,
                  decoration: BoxDecoration(
                    color: _cyan,
                    borderRadius: BorderRadius.circular(999),
                    boxShadow:
                        AppTheme.neonGlow(_cyan, blur: 10, opacity: 0.35),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(18),
              child: Row(
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        width: 58,
                        height: 58,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: _border, width: 2),
                        ),
                        child: ClipOval(child: _buildAvatar(match, size: 58)),
                      ),
                      if (isActive)
                        Positioned(
                          top: -2,
                          right: -2,
                          child: Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color: _hotRed,
                              shape: BoxShape.circle,
                              border: Border.all(color: _screenBg, width: 2),
                              boxShadow: AppTheme.neonGlow(_hotRed,
                                  blur: 12, opacity: 0.4),
                            ),
                          ),
                        ),
                      if (match.otherUser.isVerified)
                        Positioned(
                          right: -2,
                          bottom: -2,
                          child: Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color: _screenBg,
                              shape: BoxShape.circle,
                              border: Border.all(color: _cyan, width: 2),
                            ),
                            child: const Icon(
                              Icons.verified_rounded,
                              size: 12,
                              color: _cyan,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          match.otherUser.displayName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context)
                              .textTheme
                              .headlineMedium
                              ?.copyWith(
                                color: _creamText,
                                fontSize: 18,
                              ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          match.lastMessage ?? 'No messages yet',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:
                              Theme.of(context).textTheme.bodyLarge?.copyWith(
                                    color: isUnread ? _creamText : _softText,
                                    fontWeight: isUnread
                                        ? FontWeight.w700
                                        : FontWeight.w500,
                                  ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        _formatTime(match.lastMessageAt),
                        style: _labelStyle(
                          context,
                          color: isActive && isUnread ? _hotRed : _softText,
                        ),
                      ),
                      if (match.unreadCount > 0) ...[
                        const SizedBox(height: 10),
                        Container(
                          width: 22,
                          height: 22,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: _cyan,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            '${match.unreadCount}',
                            style: _labelStyle(context, color: _screenBg),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatar(Match match, {required double size}) {
    final photo = match.otherUser.profile?.photos.isNotEmpty == true
        ? match.otherUser.profile!.photos.first
        : null;

    if (photo != null) {
      return Image.network(photo, width: size, height: size, fit: BoxFit.cover);
    }

    return Container(
      width: size,
      height: size,
      color: const Color(0xFF2A313C),
      child: Icon(Icons.person_rounded, color: _softText, size: size * 0.45),
    );
  }

  Widget _buildStateCard(
    BuildContext context, {
    required String title,
    required String message,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: _panelBg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: _border, width: 2),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: _cyan, size: 40),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context)
                .textTheme
                .headlineMedium
                ?.copyWith(color: _creamText),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: _softText),
          ),
        ],
      ),
    );
  }

  bool _isActive(DateTime? lastActiveAt) {
    if (lastActiveAt == null) return false;
    return DateTime.now().difference(lastActiveAt).inMinutes <= 15;
  }

  TextStyle _labelStyle(BuildContext context, {required Color color}) {
    return Theme.of(context).textTheme.labelSmall!.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
          letterSpacing: 2,
        );
  }

  String _formatTime(DateTime? time) {
    if (time == null) return '';
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 1) return 'NOW';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return '${time.day}/${time.month}';
  }
}
