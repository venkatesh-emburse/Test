import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/services/location_service.dart';
import '../../../core/services/socket_service.dart';
import '../../../core/services/notification_service.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _controller.forward();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    print('\u{1F680} Splash: Starting auth check...');
    await Future.delayed(const Duration(seconds: 2));

    final storage = ref.read(secureStorageProvider);
    final token = await storage.read(key: 'access_token');
    print('\u{1F511} Splash: Token exists: ${token != null}');

    if (token != null) {
      ref.read(authTokenProvider.notifier).state = token;

      // Verify token is still valid
      try {
        print('\u{1F4E1} Splash: Calling /auth/me...');
        final response = await ref.read(dioProvider).get('/auth/me');
        print('\u2705 Splash: /auth/me success');
        final profileComplete = response.data['user']?['profileComplete'] ?? false;
        print('\u{1F464} Splash: Profile complete: $profileComplete');
        ref.read(profileCompleteProvider.notifier).state = profileComplete;

        // Update location, connect socket, and init notifications on every app launch (non-blocking)
        if (profileComplete) {
          ref.read(locationServiceProvider).updateLocationInBackground();
          ref.read(socketServiceProvider).connect();
          ref.read(notificationServiceProvider).initialize();
        }

        if (mounted) {
          if (profileComplete) {
            print('\u27A1\uFE0F Navigating to /discovery');
            context.go('/discovery');
          } else {
            print('\u27A1\uFE0F Navigating to /auth/onboarding');
            context.go('/auth/onboarding');
          }
        }
      } catch (e) {
        print('\u274C Splash: /auth/me failed: $e');
        if (mounted) context.go('/auth/login');
      }
    } else {
      print('\u27A1\uFE0F Navigating to /auth/login (no token)');
      if (mounted) context.go('/auth/login');
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Always dark background — branding screen should be consistent in both themes
    final bgColor = Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF0A0A0A) // pure dark
        : const Color(0xFF111827); // dark navy

    return Scaffold(
      backgroundColor: bgColor,
      body: Center(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Minimal logo — white rounded square with rose heart
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Icon(
                  Icons.favorite_rounded,
                  size: 44,
                  color: Theme.of(context).primaryColor,
                ),
              ),
              const SizedBox(height: 28),
              const Text(
                'LiveConnect',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Find your person',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w400,
                  color: Colors.white.withValues(alpha: 0.5),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
