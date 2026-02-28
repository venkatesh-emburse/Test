import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/services/firebase_auth_service.dart';
import '../../../core/services/location_service.dart';
import '../../../core/services/socket_service.dart';
import '../../../core/services/notification_service.dart';
import '../../../core/utils/app_theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  bool _isLoading = false;
  String? _error;

  Future<void> _signInWithGoogle() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final firebaseAuth = ref.read(firebaseAuthServiceProvider);

      try {
        await firebaseAuth.signInWithGoogle();
      } catch (e) {
        if (e.toString().contains('PigeonUserDetails')) {
          debugPrint('PigeonUserDetails error, but checking if auth succeeded...');
        } else {
          rethrow;
        }
      }

      final currentUser = firebaseAuth.currentUser;
      if (currentUser == null) {
        throw Exception('Authentication failed');
      }

      final idToken = await firebaseAuth.getIdToken();
      if (idToken == null) {
        throw Exception('Failed to get Firebase token');
      }

      final response = await ref.read(dioProvider).post(
        '/auth/firebase/verify',
        data: {'idToken': idToken},
      );

      final accessToken = response.data['accessToken'];
      final refreshToken = response.data['refreshToken'];
      final profileComplete = response.data['profileComplete'] ?? false;
      ref.read(profileCompleteProvider.notifier).state = profileComplete;

      final storage = ref.read(secureStorageProvider);
      await storage.write(key: 'access_token', value: accessToken);
      await storage.write(key: 'refresh_token', value: refreshToken);
      ref.read(authTokenProvider.notifier).state = accessToken;

      ref.read(locationServiceProvider).updateLocationInBackground();
      ref.read(socketServiceProvider).connect();
      ref.read(notificationServiceProvider).initialize();

      if (mounted) {
        if (!profileComplete) {
          context.go('/auth/onboarding');
        } else {
          context.go('/discovery');
        }
      }
    } catch (e) {
      debugPrint('Login error: $e');
      String errorMessage = 'Sign in failed. Please try again.';

      if (e.toString().contains('cancelled')) {
        errorMessage = 'Sign in was cancelled';
      } else if (e.toString().contains('network')) {
        errorMessage = 'Network error. Please check your connection.';
      }

      setState(() => _error = errorMessage);
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Spacer(flex: 3),

              // Minimal logo
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor,
                  borderRadius: BorderRadius.circular(22),
                ),
                child: const Icon(
                  Icons.favorite_rounded,
                  size: 40,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'LiveConnect',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: Theme.of(context).colorScheme.onSurface,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Find meaningful connections safely',
                style: TextStyle(
                  fontSize: 15,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),

              const Spacer(flex: 4),

              // Error message
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.error.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppTheme.error.withValues(alpha: 0.15),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, color: AppTheme.error, size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(
                            color: AppTheme.error,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Google Sign-In Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton(
                  onPressed: _isLoading ? null : _signInWithGoogle,
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(
                      color: Theme.of(context).colorScheme.outline,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: _isLoading
                      ? SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.g_mobiledata,
                              size: 26,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Continue with Google',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                          ],
                        ),
                ),
              ),

              const SizedBox(height: 16),

              // Divider
              Row(
                children: [
                  Expanded(
                    child: Divider(
                      color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.3),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'or',
                      style: TextStyle(
                        fontSize: 13,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Divider(
                      color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.3),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Email Login Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton(
                  onPressed: _isLoading ? null : () => context.push('/auth/email'),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(
                      color: Theme.of(context).colorScheme.outline,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.email_outlined,
                        size: 22,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Continue with Email',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Safety message
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.success.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.success.withValues(alpha: 0.12),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.shield_outlined, color: AppTheme.success, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Verify your phone after login to boost your safety score',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Terms
              Text(
                'By continuing, you agree to our Terms of Service and Privacy Policy',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
                ),
              ),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
