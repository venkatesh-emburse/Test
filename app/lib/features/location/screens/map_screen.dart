import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/api/api_client.dart';
import '../../../core/utils/app_theme.dart';
import '../../../core/models/models.dart';
import '../../discovery/screens/profile_details_screen.dart';

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final MapController _mapController = MapController();
  LatLng? _currentLocation;
  List<NearbyUser> _nearbyUsers = [];
  bool _isLoading = true;
  String? _errorMessage;
  static const double _maxRadiusMeters = 300;
  static const double _minZoomLevel = 17.0;

  @override
  void initState() {
    super.initState();
    _initLocation();
  }

  Future<void> _initLocation() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _errorMessage = 'Location services are disabled.\nPlease enable location in your device settings.';
          _isLoading = false;
        });
        return;
      }

      // Check and request permission
      LocationPermission permission = await Geolocator.checkPermission();
      
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() {
            _errorMessage = 'Location permission denied.\nPlease grant location access to see nearby users.';
            _isLoading = false;
          });
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _errorMessage = 'Location permission permanently denied.\nPlease enable it in app settings.';
          _isLoading = false;
        });
        return;
      }

      // Get current position - use whatever the device/emulator returns
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );
      
      debugPrint('Location detected: ${position.latitude}, ${position.longitude}');
      
      setState(() {
        _currentLocation = LatLng(position.latitude, position.longitude);
      });
      
      _loadNearbyUsers();
    } catch (e) {
      debugPrint('Location error: $e');
      setState(() {
        _errorMessage = 'Could not get your location.\nError: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  Future<void> _loadNearbyUsers() async {
    if (_currentLocation == null) return;

    try {
      final response = await ref.read(dioProvider).get(
        '/location/nearby',
        queryParameters: {
          'latitude': _currentLocation!.latitude,
          'longitude': _currentLocation!.longitude,
          'radiusKm': 0.3,
          'activeWithinMinutes': 60,
        },
      );
      setState(() {
        _nearbyUsers = (response.data as List)
            .map((json) => NearbyUser.fromJson(json))
            .toList();
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Nearby users error: $e');
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nearby'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _initLocation,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    // Show loading
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Getting your location...'),
          ],
        ),
      );
    }

    // Show error with retry
    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.location_off, size: 64, color: Theme.of(context).colorScheme.outline),
              const SizedBox(height: 16),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _initLocation,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => Geolocator.openLocationSettings(),
                child: const Text('Open Location Settings'),
              ),
            ],
          ),
        ),
      );
    }

    // Show map
    if (_currentLocation == null) {
      return const Center(child: Text('No location available'));
    }

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _currentLocation!,
            initialZoom: 17.5,
            minZoom: _minZoomLevel,
            maxZoom: 19,
            maxBounds: _buildBounds(_currentLocation!, _maxRadiusMeters),
            onPositionChanged: (position, hasGesture) {
              if (position.center == null) return;
              final bounds = _buildBounds(_currentLocation!, _maxRadiusMeters);
              if (!bounds.contains(position.center!)) {
                final clamped = _clampToBounds(position.center!, bounds);
                _mapController.move(clamped, position.zoom ?? _minZoomLevel);
              }
            },
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.liveconnect.app',
              maxZoom: 19,
            ),
            MarkerLayer(
              markers: [
                // Current user marker
                Marker(
                  point: _currentLocation!,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).primaryColor,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 3),
                    ),
                    padding: const EdgeInsets.all(8),
                    child: const Icon(
                      Icons.person,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
                // Nearby users
                ..._nearbyUsers.map((user) => Marker(
                      point: LatLng(
                        user.approximateLatitude,
                        user.approximateLongitude,
                      ),
                      child: GestureDetector(
                        onTap: () => _showUserPreview(user),
                        child: Container(
                          decoration: BoxDecoration(
                            color: user.isVerified
                                ? AppTheme.safetyHigh
                                : Theme.of(context).colorScheme.outline,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: Colors.white,
                              width: 2,
                            ),
                          ),
                          child: CircleAvatar(
                            radius: 12,
                            backgroundImage: user.photos.isNotEmpty
                                ? NetworkImage(user.photos.first)
                                : null,
                            child: user.photos.isEmpty
                                ? const Icon(Icons.person, size: 12, color: Colors.white)
                                : null,
                          ),
                        ),
                      ),
                    )),
              ],
            ),
            CircleLayer(
              circles: [
                CircleMarker(
                  point: _currentLocation!,
                  radius: _maxRadiusMeters,
                  useRadiusInMeter: true,
                  color: Theme.of(context).primaryColor.withOpacity(0.08),
                  borderStrokeWidth: 1,
                  borderColor: Theme.of(context).primaryColor.withOpacity(0.5),
                ),
              ],
            ),
          ],
        ),

        // User count badge
        Positioned(
          top: 16,
          left: 16,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 8,
            ),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.people,
                  size: 18,
                  color: Theme.of(context).primaryColor,
                ),
                const SizedBox(width: 6),
                Text(
                  '${_nearbyUsers.length} nearby',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ),

        // Center on me button
        Positioned(
          bottom: 16,
          right: 16,
          child: FloatingActionButton(
            onPressed: () {
              if (_currentLocation != null) {
                _mapController.move(_currentLocation!, 13);
              }
            },
            child: const Icon(Icons.my_location),
          ),
        ),
      ],
    );
  }

  LatLngBounds _buildBounds(LatLng center, double radiusMeters) {
    final latDelta = radiusMeters / 111320;
    final lngDelta = radiusMeters / (111320 * cos(center.latitude * pi / 180));
    return LatLngBounds(
      LatLng(center.latitude - latDelta, center.longitude - lngDelta),
      LatLng(center.latitude + latDelta, center.longitude + lngDelta),
    );
  }

  LatLng _clampToBounds(LatLng point, LatLngBounds bounds) {
    final clampedLat = point.latitude.clamp(bounds.south, bounds.north);
    final clampedLng = point.longitude.clamp(bounds.west, bounds.east);
    return LatLng(clampedLat, clampedLng);
  }

  void _showUserPreview(NearbyUser user) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundImage: user.photos.isNotEmpty
                      ? NetworkImage(user.photos.first)
                      : null,
                  child: user.photos.isEmpty
                      ? const Icon(Icons.person)
                      : null,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            user.displayName,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (user.isVerified)
                            const Padding(
                              padding: EdgeInsets.only(left: 4),
                              child: Icon(
                                Icons.verified,
                                size: 18,
                                color: AppTheme.success,
                              ),
                            ),
                        ],
                      ),
                      Text(
                        '${user.distanceKm.toStringAsFixed(1)} km away',
                        style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: _getSafetyColor(user.safetyScore).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.shield,
                        size: 14,
                        color: _getSafetyColor(user.safetyScore),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${user.safetyScore.toInt()}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: _getSafetyColor(user.safetyScore),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  // Create DiscoveryProfile from NearbyUser
                  final profile = DiscoveryProfile(
                    id: user.id,
                    name: user.name ?? 'Unknown',
                    age: user.age,
                    gender: user.gender,
                    intent: user.intent,
                    safetyScore: user.safetyScore,
                    isVerified: user.isVerified,
                    compatibilityScore: user.compatibilityScore,
                    distanceKm: user.distanceKm,
                    photos: user.photos,
                    bio: user.bio,
                    interests: user.interests,
                  );
                  
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ProfileDetailsScreen(profile: profile),
                    ),
                  );
                },
                child: const Text('View Profile'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getSafetyColor(double score) {
    if (score >= 70) return AppTheme.safetyHigh;
    if (score >= 40) return AppTheme.safetyMedium;
    return AppTheme.safetyLow;
  }
}

class NearbyUser {
  final String id;
  final String? name;
  final int age;
  final String gender;
  final String intent;
  final List<String> photos;
  final bool isVerified;
  final double safetyScore;
  final int compatibilityScore;
  final double distanceKm;
  final double approximateLatitude;
  final double approximateLongitude;
  final String? bio;
  final List<String> interests;

  NearbyUser({
    required this.id,
    this.name,
    required this.age,
    required this.gender,
    required this.intent,
    required this.photos,
    required this.isVerified,
    required this.safetyScore,
    this.compatibilityScore = 0,
    required this.distanceKm,
    required this.approximateLatitude,
    required this.approximateLongitude,
    this.bio,
    this.interests = const [],
  });

  String get displayName => name ?? 'Nearby User';

  factory NearbyUser.fromJson(Map<String, dynamic> json) {
    return NearbyUser(
      id: json['id'] ?? '',
      name: json['name'],
      age: json['age'] ?? 0,
      gender: json['gender'] ?? 'other',
      intent: json['intent'] ?? 'casual',
      photos: List<String>.from(json['photos'] ?? []),
      isVerified: json['isVerified'] ?? false,
      safetyScore: (json['safetyScore'] ?? 0).toDouble(),
      compatibilityScore: json['compatibilityScore'] ?? 0,
      distanceKm: (json['distanceKm'] ?? 0).toDouble(),
      approximateLatitude: json['approximateLocation']?['latitude'] ?? 0,
      approximateLongitude: json['approximateLocation']?['longitude'] ?? 0,
      bio: json['bio'],
      interests: List<String>.from(json['interests'] ?? []),
    );
  }
}
