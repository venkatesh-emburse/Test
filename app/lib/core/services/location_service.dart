import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../api/api_client.dart';

final locationServiceProvider = Provider<LocationService>((ref) {
  return LocationService(ref);
});

class LocationService {
  final Ref _ref;

  LocationService(this._ref);

  /// Request location permission, get position, and update backend.
  /// Runs silently — never blocks the user or throws to the caller.
  Future<void> updateLocationInBackground() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('📍 Location services disabled, skipping update');
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        debugPrint('📍 Location permission denied, skipping update');
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );

      await _ref.read(dioProvider).put(
        '/profile/location',
        data: {
          'latitude': position.latitude,
          'longitude': position.longitude,
        },
      );

      debugPrint('📍 Location updated: ${position.latitude}, ${position.longitude}');
    } catch (e) {
      debugPrint('📍 Location update failed (non-blocking): $e');
    }
  }
}
