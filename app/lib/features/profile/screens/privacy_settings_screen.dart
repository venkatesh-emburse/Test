import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';

import '../../../core/utils/app_theme.dart';
import 'profile_screen.dart'; // For currentUserProvider

class PrivacySettingsScreen extends ConsumerStatefulWidget {
  const PrivacySettingsScreen({super.key});

  @override
  ConsumerState<PrivacySettingsScreen> createState() =>
      _PrivacySettingsScreenState();
}

class _PrivacySettingsScreenState extends ConsumerState<PrivacySettingsScreen> {
  bool _showOnMap = false;
  bool _isInvisible = false;
  bool _isInitialized = false;

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(currentUserProvider);

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('PRIVACY', style: Theme.of(context).textTheme.labelSmall),
            Text('Settings', style: Theme.of(context).textTheme.headlineMedium),
          ],
        ),
      ),
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
        child: SafeArea(
          child: userAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Error loading settings: $e')),
            data: (user) {
              if (!_isInitialized) {
                _isInitialized = true;
                _showOnMap = user.showOnMap;
                _isInvisible = user.isInvisible;
              }
              return _buildPrivacySettings(context);
            },
          ),
        ),
      ),
    );
  }

  Widget _buildPrivacySettings(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Info header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.privacy_tip_outlined,
                    color: AppTheme.primaryColor, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Control how your profile appears to others.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Privacy toggles
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  title: const Text('Show on Map'),
                  subtitle: const Text('Let others see you on the map radar'),
                  secondary: const Icon(Icons.map_outlined),
                  value: _showOnMap,
                  onChanged: (value) {
                    setState(() => _showOnMap = value);
                    _updatePrivacy();
                  },
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                SwitchListTile(
                  title: const Text('Invisible Mode'),
                  subtitle: const Text('Hide your profile from discovery'),
                  secondary: const Icon(Icons.visibility_off_outlined),
                  value: _isInvisible,
                  onChanged: (value) {
                    if (value) {
                      // Show warning when turning ON
                      _showInvisibleModeWarning();
                    } else {
                      setState(() => _isInvisible = false);
                      _updatePrivacy();
                    }
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Save button (optional, since we update immediately)
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => context.pop(),
              icon: const Icon(Icons.arrow_back),
              label: const Text('Back to Profile'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _updatePrivacy() async {
    try {
      await ref.read(dioProvider).put('/profile/privacy', data: {
        'showOnMap': _showOnMap,
        'isInvisible': _isInvisible,
      });
      // Invalidate cached user data so profile screen reflects changes
      ref.invalidate(currentUserProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Privacy settings updated'),
            backgroundColor: AppTheme.success,
          ),
        );
      }
    } catch (e) {
      debugPrint('Privacy update error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update privacy: $e')),
        );
      }
    }
  }

  void _showInvisibleModeWarning() {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          icon: const Icon(Icons.visibility_off,
              size: 40, color: AppTheme.warning),
          title: const Text('Enable Invisible Mode?'),
          content: const Text(
            'Others won\'t be able to see your profile through discovery and you might not get likes as well.\n\nYou can turn this off anytime.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.pop(ctx);
                setState(() => _isInvisible = true);
                _updatePrivacy();
              },
              child: const Text('Enable'),
            ),
          ],
        );
      },
    );
  }
}
