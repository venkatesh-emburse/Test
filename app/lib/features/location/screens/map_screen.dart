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
  bool _isSatelliteView = false;
  double _currentZoom = 14.5;
  static const double _maxRadiusMeters = 1500;
  static const double _minZoomLevel = 12.0;
  static const double _maxZoomLevel = 19.0;
  static const double _defaultZoom = 14.5;

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
          'radiusKm': 1.5,
          'activeWithinMinutes': 1440,
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
            initialZoom: _defaultZoom,
            minZoom: _minZoomLevel,
            maxZoom: _maxZoomLevel,
            onPositionChanged: (position, hasGesture) {
              if (position.zoom != null) {
                _currentZoom = position.zoom!;
              }
            },
          ),
          children: [
            // Tile layer — satellite or standard
            TileLayer(
              urlTemplate: _isSatelliteView
                  ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                  : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.liveconnect.app',
              maxZoom: 19,
            ),
            // Radius circle
            CircleLayer(
              circles: [
                CircleMarker(
                  point: _currentLocation!,
                  radius: _maxRadiusMeters,
                  useRadiusInMeter: true,
                  color: Theme.of(context).primaryColor.withValues(alpha: 0.08),
                  borderStrokeWidth: 1.5,
                  borderColor: Theme.of(context).primaryColor.withValues(alpha: 0.5),
                ),
              ],
            ),
            // Markers
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
                      boxShadow: [
                        BoxShadow(
                          color: Theme.of(context).primaryColor.withValues(alpha: 0.4),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
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
          ],
        ),

        // Top left — user count badge
        Positioned(
          top: 16,
          left: 16,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.people, size: 18, color: Theme.of(context).primaryColor),
                const SizedBox(width: 6),
                Text(
                  '${_nearbyUsers.length} nearby',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ),

        // Top right — satellite toggle
        Positioned(
          top: 16,
          right: 16,
          child: Container(
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                ),
              ],
            ),
            child: IconButton(
              icon: Icon(
                _isSatelliteView ? Icons.map_outlined : Icons.satellite_alt,
                color: Theme.of(context).primaryColor,
              ),
              tooltip: _isSatelliteView ? 'Standard view' : 'Satellite view',
              onPressed: () {
                setState(() => _isSatelliteView = !_isSatelliteView);
              },
            ),
          ),
        ),

        // Bottom right — zoom controls + my location
        Positioned(
          bottom: 16,
          right: 16,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Zoom in
              _buildMapButton(
                icon: Icons.add,
                onPressed: () {
                  final newZoom = (_currentZoom + 1).clamp(_minZoomLevel, _maxZoomLevel);
                  _mapController.move(_mapController.camera.center, newZoom);
                  _currentZoom = newZoom;
                },
              ),
              const SizedBox(height: 8),
              // Zoom out
              _buildMapButton(
                icon: Icons.remove,
                onPressed: () {
                  final newZoom = (_currentZoom - 1).clamp(_minZoomLevel, _maxZoomLevel);
                  _mapController.move(_mapController.camera.center, newZoom);
                  _currentZoom = newZoom;
                },
              ),
              const SizedBox(height: 12),
              // My location
              FloatingActionButton(
                heroTag: 'myLocation',
                onPressed: () {
                  if (_currentLocation != null) {
                    _mapController.move(_currentLocation!, _defaultZoom);
                    _currentZoom = _defaultZoom;
                  }
                },
                child: const Icon(Icons.my_location),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMapButton({required IconData icon, required VoidCallback onPressed}) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: IconButton(
        icon: Icon(icon, size: 20),
        onPressed: onPressed,
        padding: EdgeInsets.zero,
      ),
    );
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
