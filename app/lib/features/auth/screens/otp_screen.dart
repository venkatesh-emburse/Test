import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/services/firebase_auth_service.dart';
import '../../../core/utils/app_theme.dart';

/// OTP Screen for optional phone verification (boosts safety score)
class OtpScreen extends ConsumerStatefulWidget {
  final String phone;

  const OtpScreen({super.key, required this.phone});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final List<TextEditingController> _controllers = List.generate(
    6,
    (_) => TextEditingController(),
  );
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    for (var controller in _controllers) {
      controller.dispose();
    }
    for (var node in _focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  String get _otp => _controllers.map((c) => c.text).join();

  Future<void> _verifyOtp() async {
    if (_otp.length != 6) {
      setState(() => _error = 'Please enter the complete OTP');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final firebaseAuth = ref.read(firebaseAuthServiceProvider);

      // Verify OTP and link phone to account
      debugPrint('🔐 Verifying OTP and linking phone...');
      await firebaseAuth.verifyOtpAndLinkPhone(_otp);

      // Notify backend about phone verification to boost safety score
      await ref.read(dioProvider).post(
        '/auth/verify-phone',
        data: {'phone': widget.phone},
      );

      debugPrint('✅ Phone verified successfully!');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content:
                Text('Phone verified! Safety score increased by 15 points.'),
            backgroundColor: AppTheme.success,
          ),
        );
        context.pop();
      }
    } catch (e) {
      debugPrint('❌ Phone verification error: $e');
      String errorMessage = 'Verification failed. Please try again.';

      if (e.toString().contains('invalid-verification-code')) {
        errorMessage = 'Invalid OTP code. Please check and try again.';
      } else if (e.toString().contains('session-expired')) {
        errorMessage = 'OTP expired. Please request a new one.';
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
      _isLoading = true;
      _error = null;
    });

    String phone = Uri.decodeComponent(widget.phone);
    phone = phone.replaceAll(' ', '');
    if (!phone.startsWith('+')) {
      phone = '+$phone';
    }

    final firebaseAuth = ref.read(firebaseAuthServiceProvider);

    await firebaseAuth.verifyPhoneNumber(
      phoneNumber: phone,
      onCodeSent: (verificationId) {
        ref.read(verificationIdProvider.notifier).state = verificationId;
        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('OTP resent successfully!')),
          );
        }
      },
      onError: (error) {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _error = error;
          });
        }
      },
      onAutoVerified: (credential) async {
        try {
          await firebaseAuth.linkPhoneWithCredential(credential);
          await ref.read(dioProvider).post(
            '/auth/verify-phone',
            data: {'phone': phone},
          );

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Phone verified! Safety score increased.'),
                backgroundColor: AppTheme.success,
              ),
            );
            context.pop();
          }
        } catch (e) {
          if (mounted) {
            setState(() {
              _isLoading = false;
              _error = 'Auto-verification failed.';
            });
          }
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Verify Phone'),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              scheme.surface,
              scheme.surfaceContainerLow,
              scheme.surface
            ],
          ),
        ),
        child: Stack(
          children: [
            Positioned(
                top: -100,
                left: -50,
                child: _buildAura(
                    AppTheme.primaryColor.withValues(alpha: 0.14), 220)),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.success.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.shield,
                              color: AppTheme.success, size: 32),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  '+15 Safety Points',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.success,
                                  ),
                                ),
                                Text(
                                  'Verify your phone to boost your safety score',
                                  style: TextStyle(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurfaceVariant,
                                      fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    Text('PHONE LOCK',
                        style: Theme.of(context).textTheme.labelSmall),
                    const SizedBox(height: 8),
                    Text(
                      'Enter OTP',
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'We sent a verification code to ${widget.phone}',
                      style: TextStyle(
                        fontSize: 14,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 24),

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
                            decoration: const InputDecoration(
                              counterText: '',
                              contentPadding:
                                  EdgeInsets.symmetric(vertical: 12),
                            ),
                            onChanged: (value) {
                              if (value.isNotEmpty && index < 5) {
                                _focusNodes[index + 1].requestFocus();
                              }
                              if (value.isEmpty && index > 0) {
                                _focusNodes[index - 1].requestFocus();
                              }
                              if (_otp.length == 6) {
                                _verifyOtp();
                              }
                            },
                          ),
                        );
                      }),
                    ),

                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.error.withValues(alpha: 0.06),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline,
                                color: AppTheme.error, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _error!,
                                style: const TextStyle(color: AppTheme.error),
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
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _verifyOtp,
                        child: _isLoading
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Verify & Boost Score'),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Resend OTP
                    Center(
                      child: TextButton(
                        onPressed: _isLoading ? null : _resendOtp,
                        child: const Text('Resend OTP'),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Skip button
                    Center(
                      child: TextButton(
                        onPressed: () => context.pop(),
                        child: Text(
                          'Skip for now',
                          style: TextStyle(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAura(Color color, double size) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: [color, color.withValues(alpha: 0)]),
        ),
      ),
    );
  }
}
