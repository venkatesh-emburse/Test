import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/screens/splash_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/otp_screen.dart';
import '../../features/auth/screens/email_login_screen.dart';
import '../../features/auth/screens/email_otp_screen.dart';
import '../../features/auth/screens/onboarding_screen.dart';
import '../../features/discovery/screens/home_screen.dart';
import '../../features/discovery/screens/discovery_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/profile/screens/manage_photos_screen.dart';
import '../../features/profile/screens/edit_profile_screen.dart';
import '../../features/chat/screens/chat_list_screen.dart';
import '../../features/chat/screens/chat_screen.dart';
import '../../features/location/screens/map_screen.dart';
import '../../features/safety/screens/safety_screen.dart';
import '../../features/profile/screens/help_support_screen.dart';
import '../api/api_client.dart';

// Shell navigation for bottom nav bar with back-button handling
class ShellScreen extends StatefulWidget {
  final Widget child;
  final int currentIndex;

  const ShellScreen({
    super.key,
    required this.child,
    required this.currentIndex,
  });

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
  DateTime? _lastBackPressTime;

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;

        // If not on Discovery tab, go back to Discovery
        if (widget.currentIndex != 0) {
          context.go('/discovery');
          return;
        }

        // On Discovery tab: double-back-to-exit
        final now = DateTime.now();
        if (_lastBackPressTime != null &&
            now.difference(_lastBackPressTime!) < const Duration(seconds: 2)) {
          // Exit the app
          SystemNavigator.pop();
          return;
        }

        _lastBackPressTime = now;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Press back again to exit'),
            duration: Duration(seconds: 2),
          ),
        );
      },
      child: Scaffold(
        body: widget.child,
        bottomNavigationBar: Container(
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(
                color: Theme.of(context).dividerTheme.color ?? Colors.grey.shade200,
                width: 0.5,
              ),
            ),
          ),
          child: NavigationBar(
          selectedIndex: widget.currentIndex,
          onDestinationSelected: (index) {
            switch (index) {
              case 0:
                context.go('/discovery');
                break;
              case 1:
                context.go('/map');
                break;
              case 2:
                context.go('/chat');
                break;
              case 3:
                context.go('/profile');
                break;
            }
          },
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.favorite_outline_rounded),
              selectedIcon: Icon(Icons.favorite_rounded),
              label: 'Discover',
            ),
            NavigationDestination(
              icon: Icon(Icons.location_on_outlined),
              selectedIcon: Icon(Icons.location_on_rounded),
              label: 'Map',
            ),
            NavigationDestination(
              icon: Icon(Icons.chat_bubble_outline_rounded),
              selectedIcon: Icon(Icons.chat_bubble_rounded),
              label: 'Chat',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline_rounded),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'Profile',
            ),
          ],
        ),
        ),
      ),
    );
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final location = state.matchedLocation;

      // Auth routes — always allowed
      const authRoutes = ['/', '/auth/login', '/auth/otp', '/auth/email', '/auth/email/otp', '/auth/onboarding'];
      if (authRoutes.contains(location)) return null;

      // For all main app routes, check profile completion
      final token = ref.read(authTokenProvider);
      if (token == null) return '/auth/login';

      final profileComplete = ref.read(profileCompleteProvider);
      if (profileComplete == false) return '/auth/onboarding';

      return null;
    },
    routes: [
      // Splash
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),

      // Auth Routes
      GoRoute(
        path: '/auth/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/auth/otp',
        builder: (context, state) {
          final phone = state.uri.queryParameters['phone'];
          return OtpScreen(phone: phone ?? '');
        },
      ),
      GoRoute(
        path: '/auth/email',
        builder: (context, state) => const EmailLoginScreen(),
      ),
      GoRoute(
        path: '/auth/email/otp',
        builder: (context, state) {
          final email = state.uri.queryParameters['email'] ?? '';
          return EmailOtpScreen(email: email);
        },
      ),
      GoRoute(
        path: '/auth/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),

      // Main App Routes with Shell
      ShellRoute(
        builder: (context, state, child) {
          int index = 0;
          if (state.matchedLocation.startsWith('/map')) index = 1;
          if (state.matchedLocation.startsWith('/chat')) index = 2;
          if (state.matchedLocation.startsWith('/profile')) index = 3;
          return ShellScreen(currentIndex: index, child: child);
        },
        routes: [
          GoRoute(
            path: '/discovery',
            builder: (context, state) => const DiscoveryScreen(),
          ),
          GoRoute(
            path: '/map',
            builder: (context, state) => const MapScreen(),
          ),
          GoRoute(
            path: '/chat',
            builder: (context, state) => const ChatListScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),

      // Chat Detail (outside shell)
      GoRoute(
        path: '/chat/:matchId',
        builder: (context, state) {
          final matchId = state.pathParameters['matchId']!;
          return ChatScreen(matchId: matchId);
        },
      ),

      // Edit Profile (outside shell to have back button)
      GoRoute(
        path: '/profile/edit',
        builder: (context, state) => const EditProfileScreen(),
      ),

      // Profile Photos (outside shell to have back button)
      GoRoute(
        path: '/profile/photos',
        builder: (context, state) => const ManagePhotosScreen(),
      ),

      // Safety
      GoRoute(
        path: '/safety',
        builder: (context, state) => const SafetyScreen(),
      ),

      // Help & Support
      GoRoute(
        path: '/help',
        builder: (context, state) => const HelpSupportScreen(),
      ),
    ],
  );
});

