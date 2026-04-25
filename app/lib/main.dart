import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'core/providers/router_provider.dart';
import 'core/services/notification_service.dart';
import 'core/utils/app_theme.dart';

/// Theme mode provider — defaults to the neon dark system.
final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.dark);

/// Top-level handler for background/terminated FCM messages.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('🔔 Background message: ${message.messageId}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  runApp(const ProviderScope(child: LiveConnectApp()));
}

class LiveConnectApp extends ConsumerStatefulWidget {
  const LiveConnectApp({super.key});

  @override
  ConsumerState<LiveConnectApp> createState() => _LiveConnectAppState();
}

class _LiveConnectAppState extends ConsumerState<LiveConnectApp> {
  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    // Listen for notification taps and navigate to the chat
    ref.listen<String?>(pendingNotificationMatchIdProvider, (previous, next) {
      if (next != null) {
        debugPrint('🔔 Navigating to chat from notification: $next');
        router.push('/chat/$next');
        // Clear it so it doesn't re-trigger
        ref.read(pendingNotificationMatchIdProvider.notifier).state = null;
      }
    });

    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp.router(
      title: 'LiveConnect',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      routerConfig: router,
    );
  }
}
