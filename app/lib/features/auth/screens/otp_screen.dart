import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/services/firebase_auth_service.dart';

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
      
      // Verify OTP with Firebase
      debugPrint('🔐 Verifying OTP: $_otp');
      await firebaseAuth.verifyOtp(_otp);
      
      // Get Firebase ID token
      final idToken = await firebaseAuth.getIdToken();
      if (idToken == null) {
        throw Exception('Failed to get Firebase token');
      }
      
      debugPrint('✅ Firebase verification successful');
      
      // Exchange Firebase token for app tokens
      final response = await ref.read(dioProvider).post(
        '/auth/firebase/verify',
        data: {'idToken': idToken},
      );

      final accessToken = response.data['accessToken'];
      final refreshToken = response.data['refreshToken'];
      final isNewUser = response.data['isNewUser'] ?? false;

      debugPrint('✅ Backend token received. Is new user: $isNewUser');

      // Save tokens
      final storage = ref.read(secureStorageProvider);
      await storage.write(key: 'access_token', value: accessToken);
      await storage.write(key: 'refresh_token', value: refreshToken);

      ref.read(authTokenProvider.notifier).state = accessToken;

      if (mounted) {
        if (isNewUser) {
          debugPrint('Navigating to onboarding...');
          context.go('/auth/onboarding');
        } else {
          debugPrint('Navigating to discovery...');
          context.go('/discovery');
        }
      }
    } catch (e) {
      debugPrint('❌ OTP Verification Error: $e');
      String errorMessage = 'Invalid OTP. Please try again.';
      
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
          await firebaseAuth.signInWithCredential(credential);
          final idToken = await firebaseAuth.getIdToken();
          if (idToken != null) {
            final response = await ref.read(dioProvider).post(
              '/auth/firebase/verify',
              data: {'idToken': idToken},
            );
            
            final accessToken = response.data['accessToken'];
            final refreshToken = response.data['refreshToken'];
            final isNewUser = response.data['isNewUser'] ?? false;
            
            final storage = ref.read(secureStorageProvider);
            await storage.write(key: 'access_token', value: accessToken);
            await storage.write(key: 'refresh_token', value: refreshToken);
            ref.read(authTokenProvider.notifier).state = accessToken;
            
            if (mounted) {
              context.go(isNewUser ? '/auth/onboarding' : '/discovery');
            }
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
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/auth/login'),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Enter OTP',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'We sent a verification code to ${widget.phone}',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey[600],
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
                Text(
                  _error!,
                  style: const TextStyle(color: Colors.red),
                ),
              ],

              const SizedBox(height: 32),

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
                      : const Text('Verify'),
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
            ],
          ),
        ),
      ),
    );
  }
}
