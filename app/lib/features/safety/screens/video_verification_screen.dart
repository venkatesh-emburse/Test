import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/utils/app_theme.dart';
import '../../../core/services/upload_service.dart';

class VideoVerificationScreen extends ConsumerStatefulWidget {
  final String sessionId;
  final String code;

  const VideoVerificationScreen({
    super.key,
    required this.sessionId,
    required this.code,
  });

  @override
  ConsumerState<VideoVerificationScreen> createState() =>
      _VideoVerificationScreenState();
}

class _VideoVerificationScreenState
    extends ConsumerState<VideoVerificationScreen> {
  CameraController? _controller;
  bool _isInitializing = true;
  bool _isRecording = false;
  bool _isUploading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      final frontCamera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );

      final controller = CameraController(
        frontCamera,
        ResolutionPreset.medium,
        enableAudio: true,
      );

      await controller.initialize();

      if (!mounted) return;
      setState(() {
        _controller = controller;
        _isInitializing = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Camera init failed: $e';
        _isInitializing = false;
      });
    }
  }

  Future<void> _toggleRecording() async {
    if (_controller == null || !_controller!.value.isInitialized) return;

    if (_isRecording) {
      final file = await _controller!.stopVideoRecording();
      setState(() => _isRecording = false);
      await _uploadAndSubmit(file);
      return;
    }

    try {
      await _controller!.startVideoRecording();
      setState(() => _isRecording = true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Failed to start recording: $e');
    }
  }

  Future<void> _uploadAndSubmit(XFile file) async {
    setState(() => _isUploading = true);

    try {
      final uploadService = ref.read(uploadServiceProvider);
      final result = await uploadService.uploadVideo(File(file.path));
      if (result == null || !result.success) {
        throw Exception('Video upload failed');
      }

      await ref.read(dioProvider).post(
        '/safety/verification/submit',
        data: {
          'sessionId': widget.sessionId,
          'videoUrl': result.secureUrl,
          'phraseShown': widget.code,
        },
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Video submitted for review.')),
      );
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Upload failed: $e');
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isInitializing) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Video Verification')),
        body: Center(child: Text(_error!)),
      );
    }

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text('Video Verification'),
      ),
      body: Stack(
        children: [
          if (_controller != null) CameraPreview(_controller!),
          Positioned(
            top: 24,
            left: 24,
            right: 24,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context)
                    .colorScheme
                    .surfaceContainerHigh
                    .withValues(alpha: 0.78),
                borderRadius: BorderRadius.circular(4),
                boxShadow: AppTheme.neonGlow(AppTheme.primaryColor,
                    blur: 18, opacity: 0.12),
              ),
              child: Column(
                children: [
                  Text(
                    'Show this number in your video',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: Colors.white70,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.code,
                    style: Theme.of(context).textTheme.displayMedium?.copyWith(
                          color: Colors.white,
                          letterSpacing: 2,
                        ),
                  ),
                ],
              ),
            ),
          ),
          if (_isUploading)
            Container(
              color: Colors.black54,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(color: Colors.white),
                    const SizedBox(height: 12),
                    Text(
                      'Uploading...',
                      style: TextStyle(
                        color: Colors.white,
                        fontFamily:
                            Theme.of(context).textTheme.bodyMedium?.fontFamily,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: ElevatedButton.icon(
            onPressed: _isUploading ? null : _toggleRecording,
            icon: Icon(_isRecording ? Icons.stop : Icons.fiber_manual_record),
            label: Text(_isRecording ? 'Stop Recording' : 'Start Recording'),
            style: ElevatedButton.styleFrom(
              backgroundColor: _isRecording
                  ? AppTheme.error
                  : Theme.of(context).primaryColor,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4)),
            ),
          ),
        ),
      ),
    );
  }
}
