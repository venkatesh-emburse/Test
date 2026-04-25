import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

String get baseUrl =>
    'https://a8d5cdd05627.ngrok.app/api/v1';
String get wsUrl =>
    'https://a8d5cdd05627.ngrok.app';

// Secure Storage Provider
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

// Auth Token Provider
final authTokenProvider = StateProvider<String?>((ref) => null);

// Profile Complete Provider (null = unknown, true/false = determined)
final profileCompleteProvider = StateProvider<bool?>((ref) => null);

// Dio Provider with interceptors
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
    headers: {
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true', // Required for localtunnel
    },
  ));

  // Auth interceptor
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = ref.read(authTokenProvider);
      debugPrint('🔐 API Request: ${options.method} ${options.path}');
      debugPrint(
        '🔑 Token: ${token != null ? "exists (${token.substring(0, 20)}...)" : "null"}',
      );
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      return handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401) {
        // Token expired - try refresh
        final storage = ref.read(secureStorageProvider);
        final refreshToken = await storage.read(key: 'refresh_token');

        if (refreshToken != null) {
          try {
            final response = await Dio().post(
              '$baseUrl/auth/refresh',
              data: {'refreshToken': refreshToken},
            );

            final newToken = response.data['accessToken'];
            ref.read(authTokenProvider.notifier).state = newToken;
            await storage.write(key: 'access_token', value: newToken);

            // Retry the request
            final opts = error.requestOptions;
            opts.headers['Authorization'] = 'Bearer $newToken';
            final clonedRequest = await dio.fetch(opts);
            return handler.resolve(clonedRequest);
          } catch (_) {
            // Refresh failed - logout
            ref.read(authTokenProvider.notifier).state = null;
            await storage.deleteAll();
          }
        }
      }
      return handler.next(error);
    },
  ));

  return dio;
});

// API Client
class ApiClient {
  final Dio _dio;

  ApiClient(this._dio);

  // Generic request methods
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    required T Function(dynamic) fromJson,
  }) async {
    final response = await _dio.get(path, queryParameters: queryParameters);
    return fromJson(response.data);
  }

  Future<T> post<T>(
    String path, {
    dynamic data,
    required T Function(dynamic) fromJson,
  }) async {
    final response = await _dio.post(path, data: data);
    return fromJson(response.data);
  }

  Future<T> put<T>(
    String path, {
    dynamic data,
    required T Function(dynamic) fromJson,
  }) async {
    final response = await _dio.put(path, data: data);
    return fromJson(response.data);
  }

  Future<void> delete(String path) async {
    await _dio.delete(path);
  }
}

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.watch(dioProvider));
});
