import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
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
  static const String _minimalMapStyle = '''
[
  {
    "featureType": "poi",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "poi.business",
    "stylers": [{"visibility": "off"}]
  },
  {
    "featureType": "transit.station",
    "stylers": [{"visibility": "off"}]
  }
]
''';
  static const double _markerCanvasSize = 72.0;
  static const double _nearbyAvatarRadius = 18.0;
  static const double _currentUserAvatarRadius = 16.0;

  GoogleMapController? _mapController;
  LatLng? _currentLocation;
  List<NearbyUser> _nearbyUsers = [];
  final Map<String, BitmapDescriptor> _userMarkerIcons = {};
  BitmapDescriptor? _currentUserMarkerIcon;
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
          _errorMessage =
              'Location services are disabled.\nPlease enable location in your device settings.';
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
            _errorMessage =
                'Location permission denied.\nPlease grant location access to see nearby users.';
            _isLoading = false;
          });
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _errorMessage =
              'Location permission permanently denied.\nPlease enable it in app settings.';
          _isLoading = false;
        });
        return;
      }

      // Get current position - use whatever the device/emulator returns
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );

      debugPrint(
          'Location detected: ${position.latitude}, ${position.longitude}');

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
      await _loadUserMarkerIcons();
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
              Icon(Icons.location_off,
                  size: 64, color: Theme.of(context).colorScheme.outline),
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
        GoogleMap(
          initialCameraPosition: CameraPosition(
            target: _currentLocation!,
            zoom: _defaultZoom,
          ),
          style: _minimalMapStyle,
          onMapCreated: (controller) => _mapController = controller,
          mapType: _isSatelliteView ? MapType.satellite : MapType.normal,
          minMaxZoomPreference:
              const MinMaxZoomPreference(_minZoomLevel, _maxZoomLevel),
          myLocationEnabled: false,
          myLocationButtonEnabled: false,
          zoomControlsEnabled: false,
          compassEnabled: true,
          circles: {
            Circle(
              circleId: const CircleId('search-radius'),
              center: _currentLocation!,
              radius: _maxRadiusMeters,
              fillColor: Theme.of(context).primaryColor.withValues(alpha: 0.08),
              strokeWidth: 2,
              strokeColor:
                  Theme.of(context).primaryColor.withValues(alpha: 0.5),
            ),
          },
          markers: _buildMarkers(context),
          onCameraMove: (position) {
            _currentZoom = position.zoom;
          },
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
                Icon(Icons.people,
                    size: 18, color: Theme.of(context).primaryColor),
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
                  final newZoom =
                      (_currentZoom + 1).clamp(_minZoomLevel, _maxZoomLevel);
                  _mapController?.animateCamera(CameraUpdate.zoomTo(newZoom));
                  _currentZoom = newZoom;
                },
              ),
              const SizedBox(height: 8),
              // Zoom out
              _buildMapButton(
                icon: Icons.remove,
                onPressed: () {
                  final newZoom =
                      (_currentZoom - 1).clamp(_minZoomLevel, _maxZoomLevel);
                  _mapController?.animateCamera(CameraUpdate.zoomTo(newZoom));
                  _currentZoom = newZoom;
                },
              ),
              const SizedBox(height: 12),
              // My location
              FloatingActionButton(
                heroTag: 'myLocation',
                onPressed: () {
                  if (_currentLocation != null) {
                    _mapController?.animateCamera(
                      CameraUpdate.newLatLngZoom(
                          _currentLocation!, _defaultZoom),
                    );
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

  Widget _buildMapButton(
      {required IconData icon, required VoidCallback onPressed}) {
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

  Set<Marker> _buildMarkers(BuildContext context) {
    final markers = _nearbyUsers
        .where(
          (user) =>
              user.approximateLatitude != 0 || user.approximateLongitude != 0,
        )
        .map(
          (user) => Marker(
            markerId: MarkerId('nearby-${user.id}'),
            position: LatLng(
              user.approximateLatitude,
              user.approximateLongitude,
            ),
            infoWindow: InfoWindow(
              title: user.displayName,
              snippet: '${user.distanceKm.toStringAsFixed(1)} km away',
              onTap: () => _showUserPreview(user),
            ),
            icon: _userMarkerIcons[user.id] ?? BitmapDescriptor.defaultMarker,
            onTap: () => _showUserPreview(user),
          ),
        )
        .toSet();

    if (_currentLocation != null && _currentUserMarkerIcon != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('current-user'),
          position: _currentLocation!,
          anchor: const Offset(0.5, 0.5),
          icon: _currentUserMarkerIcon!,
        ),
      );
    }

    return markers;
  }

  Future<void> _loadUserMarkerIcons() async {
    final usersToLoad = _nearbyUsers.where(
      (user) => !_userMarkerIcons.containsKey(user.id),
    );

    await Future.wait(usersToLoad.map((user) async {
      final icon = await _createUserMarkerIcon(user);
      if (icon != null) {
        _userMarkerIcons[user.id] = icon;
      }
    }));

    _currentUserMarkerIcon ??= await _createCurrentUserMarkerIcon();

    if (mounted) {
      setState(() {});
    }
  }

  Future<BitmapDescriptor?> _createUserMarkerIcon(NearbyUser user) async {
    try {
      if (user.photos.isEmpty) {
        return _createPlaceholderMarkerIcon(user);
      }

      final imageBytes = await NetworkAssetBundle(Uri.parse(user.photos.first))
          .load(user.photos.first);
      final codec = await ui.instantiateImageCodec(
        imageBytes.buffer.asUint8List(),
        targetWidth: _markerCanvasSize.toInt(),
        targetHeight: _markerCanvasSize.toInt(),
      );
      final frame = await codec.getNextFrame();

      const size = _markerCanvasSize;
      const avatarRadius = _nearbyAvatarRadius;
      const center = Offset(size / 2, size / 2 - 10);

      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final fillPaint = Paint()..color = Colors.white;
      final ringPaint = Paint()
        ..color =
            user.isVerified ? AppTheme.primaryColor : AppTheme.secondaryColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4;

      canvas.drawCircle(center, avatarRadius + 6, fillPaint);
      canvas.drawCircle(center, avatarRadius + 6, ringPaint);

      final clipPath = Path()
        ..addOval(Rect.fromCircle(center: center, radius: avatarRadius));
      canvas.save();
      canvas.clipPath(clipPath);
      paintImage(
        canvas: canvas,
        rect: Rect.fromCircle(center: center, radius: avatarRadius),
        image: frame.image,
        fit: BoxFit.cover,
      );
      canvas.restore();

      final dotPaint = Paint()
        ..color =
            user.isVerified ? AppTheme.primaryColor : AppTheme.secondaryColor;
      canvas.drawCircle(const Offset(size / 2, size - 12), 4.5, dotPaint);

      final picture = recorder.endRecording();
      final image = await picture.toImage(size.toInt(), size.toInt());
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) return null;

      final bytes = byteData.buffer.asUint8List();
      return BitmapDescriptor.bytes(bytes);
    } catch (e) {
      debugPrint('Marker icon error for ${user.id}: $e');
      return _createPlaceholderMarkerIcon(user);
    }
  }

  Future<BitmapDescriptor?> _createPlaceholderMarkerIcon(
      NearbyUser user) async {
    try {
      const size = _markerCanvasSize;
      const avatarRadius = _nearbyAvatarRadius;
      const center = Offset(size / 2, size / 2 - 10);

      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final fillPaint = Paint()
        ..color =
            user.isVerified ? AppTheme.primaryColor : AppTheme.secondaryColor;

      canvas.drawCircle(center, avatarRadius + 6, fillPaint);

      final iconPainter = TextPainter(
        text: TextSpan(
          text: String.fromCharCode(Icons.person.codePoint),
          style: TextStyle(
            fontSize: 18,
            fontFamily: Icons.person.fontFamily,
            package: Icons.person.fontPackage,
            color: const Color(0xFF08333A),
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();

      iconPainter.paint(
        canvas,
        Offset(center.dx - iconPainter.width / 2,
            center.dy - iconPainter.height / 2),
      );

      final picture = recorder.endRecording();
      final image = await picture.toImage(size.toInt(), size.toInt());
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) return null;

      return BitmapDescriptor.bytes(byteData.buffer.asUint8List());
    } catch (e) {
      debugPrint('Placeholder marker error for ${user.id}: $e');
      return null;
    }
  }

  Future<BitmapDescriptor?> _createCurrentUserMarkerIcon() async {
    try {
      const size = _markerCanvasSize;
      const avatarRadius = _currentUserAvatarRadius;
      const center = Offset(size / 2, size / 2);

      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      final fillPaint = Paint()..color = AppTheme.primaryColor;
      final ringPaint = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3;

      canvas.drawCircle(center, avatarRadius + 3, fillPaint);
      canvas.drawCircle(center, avatarRadius + 3, ringPaint);

      final iconPainter = TextPainter(
        text: TextSpan(
          text: String.fromCharCode(Icons.person.codePoint),
          style: TextStyle(
            fontSize: 16,
            fontFamily: Icons.person.fontFamily,
            package: Icons.person.fontPackage,
            color: const Color(0xFF08333A),
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();

      iconPainter.paint(
        canvas,
        Offset(
          center.dx - iconPainter.width / 2,
          center.dy - iconPainter.height / 2,
        ),
      );

      final picture = recorder.endRecording();
      final image = await picture.toImage(size.toInt(), size.toInt());
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) return null;

      return BitmapDescriptor.bytes(byteData.buffer.asUint8List());
    } catch (e) {
      debugPrint('Current user marker error: $e');
      return null;
    }
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
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
                  child: user.photos.isEmpty ? const Icon(Icons.person) : null,
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
                        style: TextStyle(
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant),
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
                    color: _getSafetyColor(user.safetyScore)
                        .withValues(alpha: 0.1),
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
                      builder: (context) =>
                          ProfileDetailsScreen(profile: profile),
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
