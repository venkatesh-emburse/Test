import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image/image.dart' as img;
import '../api/api_client.dart';

/// Upload result from Cloudinary
class UploadResult {
  final bool success;
  final String publicId;
  final String url;
  final String secureUrl;
  final int? width;
  final int? height;

  UploadResult({
    required this.success,
    required this.publicId,
    required this.url,
    required this.secureUrl,
    this.width,
    this.height,
  });

  factory UploadResult.fromJson(Map<String, dynamic> json) {
    return UploadResult(
      success: json['success'] ?? false,
      publicId: json['publicId'] ?? '',
      url: json['url'] ?? '',
      secureUrl: json['secureUrl'] ?? '',
      width: json['width'],
      height: json['height'],
    );
  }
}

/// Service for handling photo/video uploads via Cloudinary
class UploadService {
  final Ref ref;
  final ImagePicker _picker = ImagePicker();

  UploadService(this.ref);

  /// Pick and upload a photo from gallery
  Future<UploadResult?> pickAndUploadPhoto({
    bool isProfile = false,
    int maxWidth = 1080,
    int maxHeight = 1350,
    int quality = 85,
  }) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: maxWidth.toDouble(),
        maxHeight: maxHeight.toDouble(),
        imageQuality: quality,
      );

      if (pickedFile == null) return null;

      return await uploadPhoto(
        File(pickedFile.path),
        isProfile: isProfile,
      );
    } catch (e) {
      print('Error picking photo: $e');
      return null;
    }
  }

  /// Take and upload a photo from camera
  Future<UploadResult?> takeAndUploadPhoto({
    bool isProfile = false,
    int maxWidth = 1080,
    int maxHeight = 1350,
    int quality = 85,
  }) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: maxWidth.toDouble(),
        maxHeight: maxHeight.toDouble(),
        imageQuality: quality,
        preferredCameraDevice: CameraDevice.front,
      );

      if (pickedFile == null) return null;

      return await uploadPhoto(
        File(pickedFile.path),
        isProfile: isProfile,
      );
    } catch (e) {
      print('Error taking photo: $e');
      return null;
    }
  }

  /// Upload a photo file to Cloudinary
  Future<UploadResult?> uploadPhoto(
    File file, {
    bool isProfile = false,
  }) async {
    try {
      // Read and convert to base64
      final bytes = await file.readAsBytes();
      
      // Compress if needed
      final compressed = await _compressImage(bytes);
      
      final base64String = base64Encode(compressed);
      final mimeType = _getMimeType(file.path);

      // Upload to backend
      final response = await ref.read(dioProvider).post(
        '/upload/photo',
        data: {
          'file': 'data:$mimeType;base64,$base64String',
          'isProfile': isProfile,
        },
      );

      return UploadResult.fromJson(response.data);
    } catch (e) {
      print('Error uploading photo: $e');
      return null;
    }
  }

  /// Pick and upload a video
  Future<UploadResult?> pickAndUploadVideo() async {
    try {
      final XFile? pickedFile = await _picker.pickVideo(
        source: ImageSource.camera,
        maxDuration: const Duration(seconds: 10),
      );

      if (pickedFile == null) return null;

      return await uploadVideo(File(pickedFile.path));
    } catch (e) {
      print('Error picking video: $e');
      return null;
    }
  }

  /// Upload a video file to Cloudinary
  Future<UploadResult?> uploadVideo(File file) async {
    try {
      final bytes = await file.readAsBytes();
      final base64String = base64Encode(bytes);

      final response = await ref.read(dioProvider).post(
        '/upload/video',
        data: {
          'file': 'data:video/mp4;base64,$base64String',
        },
      );

      return UploadResult.fromJson(response.data);
    } catch (e) {
      print('Error uploading video: $e');
      return null;
    }
  }

  /// Delete a photo from Cloudinary
  Future<bool> deletePhoto(String photoIdOrUrl) async {
    try {
      final response = await ref.read(dioProvider).delete(
        '/upload/photo',
        data: {'photoId': photoIdOrUrl},
      );

      return response.data['success'] ?? false;
    } catch (e) {
      print('Error deleting photo: $e');
      return false;
    }
  }

  /// Compress image to reasonable size
  Future<List<int>> _compressImage(List<int> bytes) async {
    try {
      final image = img.decodeImage(Uint8List.fromList(bytes));
      if (image == null) return bytes;

      // Only compress if image is large
      if (image.width <= 1080 && image.height <= 1350) {
        return bytes;
      }

      // Resize maintaining aspect ratio
      final resized = img.copyResize(
        image,
        width: image.width > image.height ? 1080 : null,
        height: image.height >= image.width ? 1350 : null,
      );

      // Encode as JPEG with 85% quality
      return img.encodeJpg(resized, quality: 85);
    } catch (e) {
      return bytes;
    }
  }

  String _getMimeType(String path) {
    final extension = path.split('.').last.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }
}

/// Provider for upload service
final uploadServiceProvider = Provider<UploadService>((ref) {
  return UploadService(ref);
});

/// State notifier for tracking upload progress
class UploadState {
  final bool isUploading;
  final double progress;
  final String? error;
  final UploadResult? result;

  UploadState({
    this.isUploading = false,
    this.progress = 0,
    this.error,
    this.result,
  });

  UploadState copyWith({
    bool? isUploading,
    double? progress,
    String? error,
    UploadResult? result,
  }) {
    return UploadState(
      isUploading: isUploading ?? this.isUploading,
      progress: progress ?? this.progress,
      error: error,
      result: result,
    );
  }
}

class UploadNotifier extends StateNotifier<UploadState> {
  final UploadService _uploadService;

  UploadNotifier(this._uploadService) : super(UploadState());

  Future<UploadResult?> pickAndUploadPhoto({bool isProfile = false}) async {
    state = state.copyWith(isUploading: true, progress: 0);

    try {
      final result = await _uploadService.pickAndUploadPhoto(isProfile: isProfile);
      
      if (result != null) {
        state = state.copyWith(isUploading: false, progress: 1.0, result: result);
      } else {
        state = state.copyWith(isUploading: false, error: 'Upload cancelled');
      }
      
      return result;
    } catch (e) {
      state = state.copyWith(isUploading: false, error: e.toString());
      return null;
    }
  }

  Future<UploadResult?> takeAndUploadPhoto({bool isProfile = false}) async {
    state = state.copyWith(isUploading: true, progress: 0);

    try {
      final result = await _uploadService.takeAndUploadPhoto(isProfile: isProfile);
      
      if (result != null) {
        state = state.copyWith(isUploading: false, progress: 1.0, result: result);
      } else {
        state = state.copyWith(isUploading: false, error: 'Upload cancelled');
      }
      
      return result;
    } catch (e) {
      state = state.copyWith(isUploading: false, error: e.toString());
      return null;
    }
  }

  void reset() {
    state = UploadState();
  }
}

final uploadNotifierProvider = StateNotifierProvider<UploadNotifier, UploadState>((ref) {
  return UploadNotifier(ref.read(uploadServiceProvider));
});
