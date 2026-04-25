import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class GoogleAuthTokens {
  final String? firebaseIdToken;
  final String? googleAccessToken;
  final String? googleIdToken;

  const GoogleAuthTokens({
    this.firebaseIdToken,
    this.googleAccessToken,
    this.googleIdToken,
  });
}

/// Firebase Authentication Service with Google Sign-In
class FirebaseAuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: [
      'email',
      'profile',
      'https://www.googleapis.com/auth/user.gender.read',
    ],
  );

  // For optional phone verification
  String? _verificationId;
  int? _resendToken;

  // ==================== GOOGLE SIGN-IN ====================

  /// Sign in with Google
  Future<GoogleAuthTokens> signInWithGoogle() async {
    debugPrint('🔐 Starting Google Sign-In...');

    try {
      // Trigger Google Sign-In flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        throw Exception('Google Sign-In was cancelled');
      }

      debugPrint('✅ Google user: ${googleUser.email}');

      // Get auth details from Google
      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      // Create Firebase credential
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // Sign in to Firebase with the credential
      final userCredential = await _auth.signInWithCredential(credential);
      debugPrint('✅ Firebase sign-in successful: ${userCredential.user?.uid}');

      final firebaseIdToken = await userCredential.user?.getIdToken();

      return GoogleAuthTokens(
        firebaseIdToken: firebaseIdToken,
        googleAccessToken: googleAuth.accessToken,
        googleIdToken: googleAuth.idToken,
      );
    } catch (e) {
      // Handle PigeonUserDetails type casting error (known issue in google_sign_in)
      if (e.toString().contains('PigeonUserDetails')) {
        debugPrint(
            '⚠️ PigeonUserDetails error (known issue), but auth succeeded');
        final currentUser = _auth.currentUser;
        final googleUser = await _googleSignIn.signInSilently();
        final googleAuth = await googleUser?.authentication;
        return GoogleAuthTokens(
          firebaseIdToken: await currentUser?.getIdToken(),
          googleAccessToken: googleAuth?.accessToken,
          googleIdToken: googleAuth?.idToken,
        );
      }
      rethrow;
    }
  }

  Future<GoogleAuthTokens> connectGoogleAccount() async {
    await _googleSignIn.signOut();

    final googleUser = await _googleSignIn.signIn();
    if (googleUser == null) {
      throw Exception('Google account connection was cancelled');
    }

    final googleAuth = await googleUser.authentication;
    return GoogleAuthTokens(
      googleAccessToken: googleAuth.accessToken,
      googleIdToken: googleAuth.idToken,
    );
  }

  /// Get Firebase ID token for backend verification
  Future<String?> getIdToken() async {
    final user = _auth.currentUser;
    if (user == null) return null;
    return await user.getIdToken();
  }

  /// Get current Firebase user
  User? get currentUser => _auth.currentUser;

  /// Sign out from Google and Firebase
  Future<void> signOut() async {
    await _googleSignIn.signOut();
    await _auth.signOut();
    _verificationId = null;
    _resendToken = null;
  }

  // ==================== OPTIONAL PHONE VERIFICATION ====================

  /// Start phone verification (for safety score boost)
  Future<void> verifyPhoneNumber({
    required String phoneNumber,
    required Function(String verificationId) onCodeSent,
    required Function(String error) onError,
    required Function(PhoneAuthCredential credential) onAutoVerified,
  }) async {
    try {
      await _auth.verifyPhoneNumber(
        phoneNumber: phoneNumber,
        timeout: const Duration(seconds: 60),
        verificationCompleted: (PhoneAuthCredential credential) async {
          debugPrint('📱 Firebase: Auto-verification completed');
          onAutoVerified(credential);
        },
        verificationFailed: (FirebaseAuthException e) {
          debugPrint('❌ Firebase: Verification failed - ${e.message}');
          onError(_getErrorMessage(e));
        },
        codeSent: (String verificationId, int? resendToken) {
          debugPrint('📤 Firebase: OTP sent');
          _verificationId = verificationId;
          _resendToken = resendToken;
          onCodeSent(verificationId);
        },
        codeAutoRetrievalTimeout: (String verificationId) {
          _verificationId = verificationId;
        },
        forceResendingToken: _resendToken,
      );
    } catch (e) {
      debugPrint('❌ Firebase: Error - $e');
      onError('Failed to send OTP. Please try again.');
    }
  }

  /// Verify OTP code and link phone to account
  Future<void> verifyOtpAndLinkPhone(String otp) async {
    if (_verificationId == null) {
      throw Exception('No verification in progress');
    }

    final credential = PhoneAuthProvider.credential(
      verificationId: _verificationId!,
      smsCode: otp,
    );

    // Link phone to current user
    final user = _auth.currentUser;
    if (user != null) {
      await user.linkWithCredential(credential);
      debugPrint('✅ Phone linked to account');
    }
  }

  /// Link phone with auto-verified credential
  Future<void> linkPhoneWithCredential(PhoneAuthCredential credential) async {
    final user = _auth.currentUser;
    if (user != null) {
      await user.linkWithCredential(credential);
    }
  }

  /// Get user-friendly error message
  String _getErrorMessage(FirebaseAuthException e) {
    switch (e.code) {
      case 'invalid-phone-number':
        return 'Invalid phone number format';
      case 'too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'quota-exceeded':
        return 'SMS quota exceeded. Please try again later.';
      default:
        return e.message ?? 'Verification failed. Please try again.';
    }
  }
}

/// Provider for Firebase Auth Service
final firebaseAuthServiceProvider = Provider<FirebaseAuthService>((ref) {
  return FirebaseAuthService();
});

/// State for tracking verification in progress
final verificationIdProvider = StateProvider<String?>((ref) => null);
