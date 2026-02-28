import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/services/location_service.dart';
import '../../../core/services/socket_service.dart';
import '../../../core/services/notification_service.dart';
import '../../../core/utils/app_theme.dart';

class EmailOtpScreen extends ConsumerStatefulWidget {
  final String email;

  const EmailOtpScreen({super.key, required this.email});

  @override
  ConsumerState<EmailOtpScreen> createState() => _EmailOtpScreenState();
}

class _EmailOtpScreenState extends ConsumerState<EmailOtpScreen> {
  final List<TextEditingController> _controllers = List.generate(
    6,
    (_) => TextEditingController(),
  );
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  bool _isLoading = false;
  bool _isResending = false;
  String? _error;

  @override
  void dispose() {
    for (var c in _controllers) {
      c.dispose();
    }
    for (var n in _focusNodes) {
      n.dispose();
    }
    super.dispose();
  }

  String get _otp => _controllers.map((c) => c.text).join();

  Future<void> _verifyOtp() async {
    if (_otp.length != 6) {
      setState(() => _error = 'Please enter the complete 6-digit code');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final email = Uri.decodeComponent(widget.email);

      final response = await ref.read(dioProvider).post(
        '/auth/otp/email/verify',
        data: {'email': email, 'code': _otp},
      );

      final accessToken = response.data['accessToken'];
      final refreshToken = response.data['refreshToken'];
      final profileComplete = response.data['profileComplete'] ?? false;
      ref.read(profileCompleteProvider.notifier).state = profileComplete;

      // Store tokens
      final storage = ref.read(secureStorageProvider);
      await storage.write(key: 'access_token', value: accessToken);
      await storage.write(key: 'refresh_token', value: refreshToken);
      ref.read(authTokenProvider.notifier).state = accessToken;

      // Initialize background services
      ref.read(locationServiceProvider).updateLocationInBackground();
      ref.read(socketServiceProvider).connect();
      ref.read(notificationServiceProvider).initialize();

      if (mounted) {
        if (!profileComplete) {
          context.go('/auth/onboarding');
        } else {
          context.go('/discovery');
        }
      }
    } catch (e) {
      debugPrint('Email OTP verify error: $e');
      String errorMessage = 'Verification failed. Please try again.';

      if (e.toString().contains('Invalid') || e.toString().contains('invalid')) {
        errorMessage = 'Invalid code. Please check and try again.';
      } else if (e.toString().contains('expired')) {
        errorMessage = 'Code expired. Please request a new one.';
      } else if (e.toString().contains('attempts')) {
        errorMessage = 'Too many attempts. Please request a new code.';
      } else if (e.toString().contains('network') ||
          e.toString().contains('SocketException')) {
        errorMessage = 'Network error. Please check your connection.';
      }

      setState(() => _error = errorMessage);
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _resendOtp() async {
    setState(() {
      _isResending = true;
      _error = null;
    });

    try {
      final email = Uri.decodeComponent(widget.email);
      await ref.read(dioProvider).post(
        '/auth/otp/email/send',
        data: {'email': email},
      );

      // Clear existing input
      for (var c in _controllers) {
        c.clear();
      }
      _focusNodes[0].requestFocus();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('New OTP sent to your email'),
            backgroundColor: AppTheme.success,
          ),
        );
      }
    } catch (e) {
      debugPrint('Resend email OTP error: $e');
      String errorMessage = 'Failed to resend. Please try again.';

      if (e.toString().contains('Too many')) {
        errorMessage = 'Too many requests. Please wait before trying again.';
      }

      setState(() => _error = errorMessage);
    } finally {
      if (mounted) {
        setState(() => _isResending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayEmail = Uri.decodeComponent(widget.email);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Verify Email'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              const Text(
                'Enter verification code',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'We sent a 6-digit code to',
                style: TextStyle(
                  fontSize: 14,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                displayEmail,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),

              const SizedBox(height: 32),

              // OTP Input Fields
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: List.generate(6, (index) {
                  return SizedBox(
                    width: 48,
                    child: TextField(
                      controller: _controllers[index],
                      focusNode: _focusNodes[index],
                      textAlign: TextAlign.center,
                      keyboardType: TextInputType.number,
                      maxLength: 1,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                      decoration: InputDecoration(
                        counterText: '',
                        contentPadding: const EdgeInsets.symmetric(vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onChanged: (value) {
                        if (value.isNotEmpty && index < 5) {
                          _focusNodes[index + 1].requestFocus();
                        }
                        if (value.isEmpty && index > 0) {
                          _focusNodes[index - 1].requestFocus();
                        }
                        // Auto-verify when all 6 digits entered
                        if (_otp.length == 6) {
                          _verifyOtp();
                        }
                      },
                    ),
                  );
                }),
              ),

              // Error message
              if (_error != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.error.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppTheme.error, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(color: AppTheme.error, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 24),

              // Verify Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _verifyOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Verify & Continue',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),

              const SizedBox(height: 16),

              // Resend OTP
              Center(
                child: TextButton(
                  onPressed: (_isLoading || _isResending) ? null : _resendOtp,
                  child: _isResending
                      ? SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        )
                      : const Text('Resend OTP'),
                ),
              ),

              const Spacer(),

              // Hint for dev
              Center(
                child: Text(
                  'Check your email inbox (and spam folder)',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.6),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
