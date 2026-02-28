import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/api/api_client.dart';
import '../../../core/models/models.dart';
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

  print('👤 Profile: Loaded user ${userData['name']} with ${(profileData?['photos'] as List?)?.length ?? 0} photos');
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
        maxWidth: 800,  // Reduced for smaller uploads
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
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
          userAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Error: $e')),
            data: (user) => _buildProfile(context, ref, user),
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
          // Profile Header
          Container(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                // Avatar with camera button
                Stack(
                  children: [
                    CircleAvatar(
                      radius: 60,
                      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                      backgroundImage: user.profile?.photos.isNotEmpty == true
                          ? NetworkImage(user.profile!.photos.first)
                          : null,
                      child: user.profile?.photos.isEmpty ?? true
                          ? const Icon(Icons.person, size: 60)
                          : null,
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
                            shape: BoxShape.circle,
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
                Text(
                  '${user.displayName}, ${user.displayAge}',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (user.isVerified)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.success.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.verified_rounded, color: AppTheme.success, size: 15),
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
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerLowest,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildStat('Trust Score', '${user.safetyScore.toInt()}'),
                _buildStat('Photos', '${user.profile?.photos.length ?? 0}/6'),
                _buildStat('Completeness', '${user.profile?.profileCompleteness ?? 0}%'),
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
            onTap: () => context.push('/profile/edit'),
          ),
          _buildMenuItem(
            icon: Icons.help,
            title: 'Help & Support',
            onTap: () {},
          ),
          _buildMenuItem(
            icon: Icons.logout,
            title: 'Logout',
            onTap: () async {
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
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
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
    return ListTile(
      leading: Icon(icon, color: color),
      title: Text(title, style: TextStyle(color: color)),
      subtitle: subtitle != null ? Text(subtitle) : null,
      trailing: trailing ?? Icon(Icons.chevron_right, color: Theme.of(context).colorScheme.outline),
      onTap: onTap,
    );
  }
}
