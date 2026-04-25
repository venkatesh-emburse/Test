import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/api/api_client.dart';
import '../../../core/models/models.dart';
import '../../../core/services/firebase_auth_service.dart';
import '../../../core/utils/app_theme.dart';

// Current user provider - autoDispose ensures fresh data on each access
final currentUserProvider = FutureProvider.autoDispose<User>((ref) async {
  final dio = ref.read(dioProvider);

  final meResponse = await dio.get('/auth/me');

  // Backend returns { user: {...}, profile: {...} }
  final userData = meResponse.data['user'] as Map<String, dynamic>;
  final profileData = meResponse.data['profile'] as Map<String, dynamic>?;

  // Merge profile into user data for parsing
  if (profileData != null) {
    userData['profile'] = profileData;
  }

  // Fetch live safety score (recalculated) and override stored value
  try {
    final scoreResponse = await dio.get('/safety/score');
    final liveScore = scoreResponse.data['totalScore'];
    if (liveScore != null) {
      userData['safetyScore'] = liveScore;
    }
  } catch (_) {
    // Fall back to stored safetyScore from /auth/me
  }

  debugPrint(
    '👤 Profile: Loaded user ${userData['name']} with ${(profileData?['photos'] as List?)?.length ?? 0} photos',
  );
  return User.fromJson(userData);
});

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final ImagePicker _picker = ImagePicker();
  bool _isUploading = false;

  Future<void> _takeProfilePhoto() async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 800, // Reduced for smaller uploads
        maxHeight: 1000,
        imageQuality: 60, // Reduced for smaller uploads
        preferredCameraDevice: CameraDevice.front,
      );

      if (pickedFile == null) return;

      setState(() => _isUploading = true);

      // Read file and convert to base64
      final bytes = await File(pickedFile.path).readAsBytes();
      final base64String = base64Encode(bytes);
      final extension = pickedFile.path.split('.').last.toLowerCase();
      final mimeType = extension == 'png' ? 'image/png' : 'image/jpeg';

      // Upload to Cloudinary via backend
      final uploadResponse = await ref.read(dioProvider).post(
        '/upload/photo',
        data: {
          'file': 'data:$mimeType;base64,$base64String',
          'isProfile': true,
        },
      );

      if (uploadResponse.data['success'] == true) {
        final photoUrl = uploadResponse.data['secureUrl'];

        // Add photo to profile
        await ref.read(dioProvider).post(
          '/profile/photos',
          data: {'photoUrl': photoUrl},
        );

        // Refresh user data
        ref.invalidate(currentUserProvider);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Photo uploaded successfully!')),
          );
        }
      }
    } catch (e) {
      debugPrint('Upload error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    } finally {
      setState(() => _isUploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(currentUserProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('IDENTITY', style: Theme.of(context).textTheme.labelSmall),
            Text('Profile', style: Theme.of(context).textTheme.headlineMedium),
          ],
        ),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              // Navigate to settings
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          Container(
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
          ),
          Positioned(
            top: -100,
            right: -40,
            child:
                _buildAura(AppTheme.primaryColor.withValues(alpha: 0.14), 220),
          ),
          Positioned(
            bottom: -100,
            left: -40,
            child: _buildAura(
                AppTheme.secondaryColor.withValues(alpha: 0.12), 220),
          ),
          SafeArea(
            child: userAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: _buildInfoCard(
                    title: 'Unable to load profile',
                    subtitle: '$e',
                    icon: Icons.person_off_rounded,
                  ),
                ),
              ),
              data: (user) => _buildProfile(context, ref, user),
            ),
          ),
          if (_isUploading)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 16),
                    Text(
                      'Uploading...',
                      style: TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildProfile(BuildContext context, WidgetRef ref, User user) {
    return SingleChildScrollView(
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Theme.of(context)
                  .colorScheme
                  .surfaceContainerHigh
                  .withValues(alpha: 0.84),
              borderRadius: BorderRadius.circular(4),
              boxShadow: AppTheme.neonGlow(AppTheme.primaryColor,
                  blur: 20, opacity: 0.08),
            ),
            child: Column(
              children: [
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: SizedBox(
                        width: 124,
                        height: 150,
                        child: user.profile?.photos.isNotEmpty == true
                            ? Image.network(
                                user.profile!.photos.first,
                                fit: BoxFit.cover,
                              )
                            : Container(
                                color: Theme.of(context)
                                    .colorScheme
                                    .surfaceContainerHighest,
                                child: const Icon(Icons.person, size: 60),
                              ),
                      ),
                    ),
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: GestureDetector(
                        onTap: _takeProfilePhoto,
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Theme.of(context).primaryColor,
                            borderRadius: BorderRadius.circular(4),
                            boxShadow: AppTheme.neonGlow(
                              Theme.of(context).primaryColor,
                              blur: 16,
                              opacity: 0.18,
                            ),
                          ),
                          child: const Icon(
                            Icons.camera_alt,
                            size: 20,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text('PROFILE SIGNAL',
                    style: Theme.of(context).textTheme.labelSmall),
                const SizedBox(height: 6),
                Text(
                  '${user.displayName}, ${user.displayAge}',
                  style: Theme.of(context)
                      .textTheme
                      .displayMedium
                      ?.copyWith(fontSize: 34),
                ),
                const SizedBox(height: 8),
                Text(
                  user.intent.replaceAll('_', ' ').toUpperCase(),
                  style: Theme.of(context).textTheme.labelMedium,
                ),
                if (user.isVerified)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.success.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.verified_rounded,
                            color: AppTheme.success, size: 15),
                        SizedBox(width: 4),
                        Text(
                          'Verified',
                          style: TextStyle(
                            color: AppTheme.success,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          // Stats
          Container(
            margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context)
                  .colorScheme
                  .surfaceContainerLow
                  .withValues(alpha: 0.82),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildStat('Trust Score', '${user.safetyScore.toInt()}'),
                _buildStat('Photos', '${user.profile?.photos.length ?? 0}/6'),
                _buildStat('Completeness',
                    '${user.profile?.profileCompleteness ?? 0}%'),
              ],
            ),
          ),

          // Menu Items
          const SizedBox(height: 16),
          _buildMenuItem(
            icon: Icons.edit,
            title: 'Edit Profile',
            onTap: () => context.push('/profile/edit'),
          ),
          _buildMenuItem(
            icon: Icons.photo_library,
            title: 'Manage Photos',
            subtitle: '${user.profile?.photos.length ?? 0} photos',
            onTap: () => context.push('/profile/photos'),
          ),
          _buildMenuItem(
            icon: Icons.shield,
            title: 'Safety & Verification',
            onTap: () => context.push('/safety'),
          ),
          _buildMenuItem(
            icon: Icons.privacy_tip,
            title: 'Privacy Settings',
            onTap: () => context.push('/profile/privacy'),
          ),
          _buildMenuItem(
            icon: Icons.help,
            title: 'Help & Support',
            onTap: () => context.push('/help'),
          ),
          _buildMenuItem(
            icon: Icons.logout,
            title: 'Logout',
            onTap: () async {
              // Sign out from Google + Firebase (clears cached account)
              final firebaseAuth = ref.read(firebaseAuthServiceProvider);
              await firebaseAuth.signOut();
              final storage = ref.read(secureStorageProvider);
              await storage.deleteAll();
              ref.read(authTokenProvider.notifier).state = null;
              // Invalidate cached user data
              ref.invalidate(currentUserProvider);
              if (context.mounted) context.go('/auth/login');
            },
            color: AppTheme.error,
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildStat(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
    Color? color,
    Widget? trailing,
  }) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      decoration: BoxDecoration(
        color: Theme.of(context)
            .colorScheme
            .surfaceContainerHigh
            .withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(4),
      ),
      child: ListTile(
        leading:
            Icon(icon, color: color ?? Theme.of(context).colorScheme.primary),
        title: Text(title, style: TextStyle(color: color)),
        subtitle: subtitle != null ? Text(subtitle) : null,
        trailing: trailing ??
            Icon(
              Icons.chevron_right,
              color: Theme.of(context).colorScheme.outline,
            ),
        onTap: onTap,
      ),
    );
  }

  Widget _buildInfoCard({
    required String title,
    required String subtitle,
    required IconData icon,
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
          Icon(icon, size: 56, color: AppTheme.primaryColor),
          const SizedBox(height: 16),
          Text(title, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
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
          gradient: RadialGradient(colors: [color, color.withValues(alpha: 0)]),
        ),
      ),
    );
  }
}
