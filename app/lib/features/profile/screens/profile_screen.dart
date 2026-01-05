import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/api/api_client.dart';
import '../../../core/models/models.dart';

// Current user provider - autoDispose ensures fresh data on each access
final currentUserProvider = FutureProvider.autoDispose<User>((ref) async {
  final response = await ref.read(dioProvider).get('/auth/me');
  // Backend returns { user: {...}, profile: {...} }
  final userData = response.data['user'] as Map<String, dynamic>;
  final profileData = response.data['profile'] as Map<String, dynamic>?;
  
  // Merge profile into user data for parsing
  if (profileData != null) {
    userData['profile'] = profileData;
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
                      backgroundColor: Colors.grey[200],
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
                      color: Colors.green.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.verified, color: Colors.green, size: 16),
                        SizedBox(width: 4),
                        Text(
                          'Verified',
                          style: TextStyle(color: Colors.green),
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
              color: Colors.grey[50],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildStat('Safety Score', '${user.safetyScore.toInt()}'),
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
            onTap: () {},
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
            onTap: () => context.go('/safety'),
          ),
          _buildMenuItem(
            icon: Icons.workspace_premium,
            title: 'Premium Features',
            onTap: () => context.go('/premium'),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.green,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text(
                'FREE',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          _buildMenuItem(
            icon: Icons.privacy_tip,
            title: 'Privacy Settings',
            onTap: () {},
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
            color: Colors.red,
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
            color: Colors.grey[600],
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
      trailing: trailing ?? Icon(Icons.chevron_right, color: Colors.grey[400]),
      onTap: onTap,
    );
  }
}

