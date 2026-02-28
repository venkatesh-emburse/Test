import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../api/api_client.dart';

/// Global key so notifications can navigate even when triggered from background.
final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

/// The Android notification channel for chat messages.
const AndroidNotificationChannel chatChannel = AndroidNotificationChannel(
  'chat_messages', // Must match AndroidManifest + backend channelId
  'Chat Messages',
  description: 'Notifications for new chat messages',
  importance: Importance.high,
  playSound: true,
);

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService(ref);
});

/// Stores the matchId from the last notification tap so the router can pick it up.
final pendingNotificationMatchIdProvider = StateProvider<String?>((ref) => null);

class NotificationService {
  final Ref _ref;
  bool _initialized = false;

  NotificationService(this._ref);

  /// Initialize FCM + local notifications.
  /// Call this after the user is authenticated (has a JWT token).
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    try {
      // ---- 1. Set up flutter_local_notifications ----
      await _setupLocalNotifications();

      // ---- 2. Create the Android notification channel ----
      await _createNotificationChannel();

      // ---- 3. Request FCM permission ----
      final messaging = FirebaseMessaging.instance;

      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        announcement: false,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
      );

      debugPrint('🔔 Notification permission: ${settings.authorizationStatus}');

      if (settings.authorizationStatus != AuthorizationStatus.authorized &&
          settings.authorizationStatus != AuthorizationStatus.provisional) {
        debugPrint('🔔 Notifications not authorized, skipping FCM setup');
        return;
      }

      // ---- 4. Get FCM token and send to backend ----
      final token = await messaging.getToken();
      if (token != null) {
        debugPrint('🔔 FCM Token: ${token.substring(0, 20)}...');
        await _sendTokenToBackend(token);
      } else {
        debugPrint('⚠️ FCM Token is null');
      }

      // ---- 5. Listen for token refresh ----
      messaging.onTokenRefresh.listen((newToken) {
        debugPrint('🔔 FCM Token refreshed');
        _sendTokenToBackend(newToken);
      });

      // ---- 6. Handle FOREGROUND messages → show local notification ----
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // ---- 7. Handle notification tap when app is in BACKGROUND (not terminated) ----
      FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

      // ---- 8. Check if app was opened from a TERMINATED state notification ----
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) {
        debugPrint('🔔 App opened from terminated notification');
        _handleNotificationTap(initialMessage);
      }

      debugPrint('✅ Notification service fully initialized');
    } catch (e) {
      debugPrint('❌ Notification init error: $e');
    }
  }

  /// Set up flutter_local_notifications plugin.
  Future<void> _setupLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false, // Already handled by FCM
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await flutterLocalNotificationsPlugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        // User tapped on the local notification
        debugPrint('🔔 Local notification tapped, payload: ${response.payload}');
        if (response.payload != null) {
          try {
            final data = jsonDecode(response.payload!);
            final matchId = data['matchId'];
            if (matchId != null) {
              _ref.read(pendingNotificationMatchIdProvider.notifier).state = matchId;
            }
          } catch (e) {
            debugPrint('❌ Failed to parse notification payload: $e');
          }
        }
      },
    );
  }

  /// Create the high-importance channel for chat notifications on Android.
  Future<void> _createNotificationChannel() async {
    final androidPlugin = flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    if (androidPlugin != null) {
      await androidPlugin.createNotificationChannel(chatChannel);
      debugPrint('🔔 Android notification channel created: ${chatChannel.id}');
    }
  }

  /// Show a local notification when a FCM message arrives in the foreground.
  void _handleForegroundMessage(RemoteMessage message) {
    debugPrint('🔔 Foreground message: ${message.notification?.title}');

    final notification = message.notification;
    final android = message.notification?.android;

    // Only show if there's a notification payload
    if (notification != null) {
      flutterLocalNotificationsPlugin.show(
        notification.hashCode, // Unique ID
        notification.title ?? 'New Message',
        notification.body ?? '',
        NotificationDetails(
          android: AndroidNotificationDetails(
            chatChannel.id,
            chatChannel.name,
            channelDescription: chatChannel.description,
            importance: Importance.high,
            priority: Priority.high,
            icon: android?.smallIcon ?? '@mipmap/ic_launcher',
            playSound: true,
          ),
          iOS: const DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
        // Pass data as payload so we can navigate on tap
        payload: jsonEncode(message.data),
      );
    }
  }

  /// Handle when user taps on a notification (from background/terminated).
  void _handleNotificationTap(RemoteMessage message) {
    debugPrint('🔔 Notification tap: ${message.data}');
    final matchId = message.data['matchId'];
    if (matchId != null) {
      _ref.read(pendingNotificationMatchIdProvider.notifier).state = matchId;
    }
  }

  /// Send FCM token to backend so it can push notifications to this device.
  Future<void> _sendTokenToBackend(String fcmToken) async {
    try {
      final authToken = _ref.read(authTokenProvider);
      if (authToken == null) {
        debugPrint('🔔 No auth token, skipping FCM token upload');
        return;
      }

      await _ref.read(dioProvider).put(
        '/auth/fcm-token',
        data: {'fcmToken': fcmToken},
      );
      debugPrint('✅ FCM token sent to backend');
    } catch (e) {
      debugPrint('❌ Failed to send FCM token: $e');
    }
  }
}
