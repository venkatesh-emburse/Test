import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/models/models.dart';
import '../../../core/services/firebase_auth_service.dart';
import '../../../core/services/upload_service.dart';
import '../../../core/utils/app_theme.dart';

class SafetyScreen extends ConsumerStatefulWidget {
  const SafetyScreen({super.key});

  @override
  ConsumerState<SafetyScreen> createState() => _SafetyScreenState();
}

class _SafetyScreenState extends ConsumerState<SafetyScreen> {
  Map<String, dynamic>? _safetyScore;
  Map<String, dynamic>? _verificationStatus;
  List<SafetyScoreLog> _scoreHistory = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSafetyData();
  }

  Future<void> _loadSafetyData() async {
    Map<String, dynamic>? safetyData;
    Map<String, dynamic>? statusData;
    List<SafetyScoreLog> history = [];

    try {
      final response = await ref.read(dioProvider).get('/safety/score');
      safetyData = response.data;
    } catch (_) {}

    try {
      final statusResponse =
          await ref.read(dioProvider).get('/safety/verification/status');
      statusData = statusResponse.data;
    } catch (_) {}

    try {
      final historyResponse =
          await ref.read(dioProvider).get('/safety/score/history?limit=20');
      final historyData = historyResponse.data;
      if (historyData is Map && historyData['history'] != null) {
        history = (historyData['history'] as List)
            .map(
                (json) => SafetyScoreLog.fromJson(json as Map<String, dynamic>))
            .toList();
      } else if (historyData is List) {
        history = historyData
            .map(
                (json) => SafetyScoreLog.fromJson(json as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    if (mounted) {
      setState(() {
        _safetyScore = safetyData;
        _verificationStatus = statusData;
        _scoreHistory = history;
        _isLoading = false;
      });
    }
  }

  Future<void> _startSelfieVerification() async {
    try {
      final response = await ref.read(dioProvider).post('/safety/selfie/start');
      final sessionId = response.data['sessionId'];
      final challengeCode = response.data['challengeCode'];

      if (mounted) {
        showDialog(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Selfie Verification'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                    'Write this code on paper and hold it next to your face.'),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).inputDecorationTheme.fillColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    challengeCode,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Make sure your face and the code are both clearly visible.',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () async {
                  Navigator.pop(dialogContext);

                  final uploadService = ref.read(uploadServiceProvider);
                  final selfieResult = await uploadService.takeAndUploadPhoto();
                  if (selfieResult == null || !selfieResult.success) {
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content:
                              Text('Selfie upload failed. Please try again.')),
                    );
                    return;
                  }

                  await ref.read(dioProvider).post(
                    '/safety/selfie/submit',
                    data: {
                      'sessionId': sessionId,
                      'selfieUrl': selfieResult.secureUrl,
                      'challengeCodeShown': challengeCode,
                    },
                  );

                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text('Selfie submitted for review.')),
                  );
                  _loadSafetyData();
                },
                child: const Text('Take Selfie'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      // Handle error
    }
  }

  Future<void> _connectGoogleAccount() async {
    try {
      final googleTokens =
          await ref.read(firebaseAuthServiceProvider).connectGoogleAccount();

      await ref.read(dioProvider).post(
        '/auth/google/connect',
        data: {
          'accessToken': googleTokens.googleAccessToken,
          'idToken': googleTokens.googleIdToken,
        },
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Google account connected successfully.')),
      );
      _loadSafetyData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not connect Google account: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('TRUST LAYER', style: Theme.of(context).textTheme.labelSmall),
            Text(
              'Trust & Verification',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/profile');
            }
          },
        ),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(context).colorScheme.surface,
              Theme.of(context).colorScheme.surfaceContainerLow,
              Theme.of(context).colorScheme.surface,
            ],
          ),
        ),
        child: Stack(
          children: [
            Positioned(
              top: -110,
              left: -50,
              child: _buildAura(
                  AppTheme.primaryColor.withValues(alpha: 0.12), 240),
            ),
            Positioned(
              bottom: -90,
              right: -40,
              child: _buildAura(
                  AppTheme.secondaryColor.withValues(alpha: 0.1), 220),
            ),
            SafeArea(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildScoreCard(),
                          const SizedBox(height: 24),
                          _buildSectionHeader(
                            'Verification',
                            'Secure the profile and raise the trust layer.',
                          ),
                          const SizedBox(height: 12),
                          _buildVerificationCard(),
                          if ((_safetyScore?['canIncreaseWithGoogle'] ??
                                  false) ==
                              true) ...[
                            const SizedBox(height: 8),
                            _buildConnectGoogleCard(),
                          ],
                          const SizedBox(height: 24),
                          _buildSectionHeader(
                            'Score Breakdown',
                            'See how each signal shapes your reputation.',
                          ),
                          const SizedBox(height: 12),
                          _buildBreakdownCards(),
                          const SizedBox(height: 24),
                          if (_scoreHistory.isNotEmpty) ...[
                            _buildSectionHeader(
                              'Score History',
                              'Recent trust updates and system changes.',
                            ),
                            const SizedBox(height: 12),
                            _buildScoreHistory(),
                          ],
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScoreCard() {
    final totalScore = (_safetyScore?['totalScore'] ?? 0).toDouble();
    final color = _getSafetyColor(totalScore);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Theme.of(context).colorScheme.surfaceContainerHigh,
            Theme.of(context).colorScheme.surfaceContainerHighest,
          ],
        ),
        borderRadius: BorderRadius.circular(4),
        boxShadow: AppTheme.neonGlow(color, blur: 24, opacity: 0.14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('REPUTATION CORE',
              style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Icon(Icons.shield_rounded, size: 34, color: color),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${totalScore.toInt()}',
                    style: Theme.of(context)
                        .textTheme
                        .displayLarge
                        ?.copyWith(fontSize: 52),
                  ),
                  Text(
                    'Trust Score',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              _getScoreLabel(totalScore),
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVerificationCard() {
    final isVerified = _safetyScore?['isVerified'] ?? false;
    final status = _verificationStatus?['status'];
    final canResubmit = _verificationStatus?['canResubmit'] ?? true;

    final isPending = status == 'pending';
    final isFailed = status == 'failed';

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context)
            .colorScheme
            .surfaceContainerHigh
            .withValues(alpha: 0.84),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isVerified
                    ? AppTheme.success.withValues(alpha: 0.08)
                    : Theme.of(context)
                        .colorScheme
                        .outline
                        .withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Icon(
                isVerified ? Icons.verified : Icons.photo_camera_front,
                color: isVerified
                    ? AppTheme.success
                    : Theme.of(context).colorScheme.outline,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isVerified
                        ? 'Verified'
                        : isPending
                            ? 'Verification Pending'
                            : 'Get Verified',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  Text(
                    isVerified
                        ? 'Your identity is verified'
                        : isPending
                            ? 'Your selfie is under review'
                            : 'Verify to earn +30 points',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            if (!isVerified)
              ElevatedButton(
                onPressed:
                    isPending || !canResubmit ? null : _startSelfieVerification,
                child: Text(isFailed ? 'Retry' : 'Verify'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildConnectGoogleCard() {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context)
            .colorScheme
            .surfaceContainerHigh
            .withValues(alpha: 0.84),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context)
                    .colorScheme
                    .outline
                    .withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Icon(
                Icons.link,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Connect Google Account',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  Text(
                    'Manual signups can unlock hidden trust boosts by connecting Google.',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: _connectGoogleAccount,
              child: const Text('Connect'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBreakdownCards() {
    final breakdown = _safetyScore?['breakdown'] ?? {};

    final items = [
      {
        'label': 'Selfie Verification',
        'score': breakdown['selfieVerification'] ?? 0,
        'max': 30,
        'icon': Icons.photo_camera_front,
        'tip': 'Complete selfie verification to earn up to 30 points',
      },
      {
        'label': 'Profile Quality',
        'score': breakdown['profileQuality'] ?? 0,
        'max': 20,
        'icon': Icons.person,
        'tip': 'Add photos, a detailed bio, interests, occupation & education',
      },
      {
        'label': 'Account Age',
        'score': breakdown['accountAge'] ?? 0,
        'max': 10,
        'icon': Icons.calendar_today,
        'tip': 'Your score grows as your account ages over time',
      },
      {
        'label': 'Behavioral Score',
        'score': breakdown['behavioralScore'] ?? 0,
        'max': 15,
        'icon': Icons.psychology,
        'tip':
            'Reply to matches, complete micro-dates, and be a good community member',
      },
      {
        'label': 'Activity Bonus',
        'score': breakdown['activityBonus'] ?? 0,
        'max': 5,
        'icon': Icons.bolt,
        'tip': 'Stay active on the app to maintain your activity bonus',
      },
    ];

    return Column(
      children: items.map((item) {
        final score = (item['score'] as num).toDouble();
        final max = (item['max'] as num).toDouble();
        final progress = max > 0 ? (score / max).clamp(0.0, 1.0) : 0.0;
        final tip = item['tip'] as String?;
        final detail = item['detail'] as String?;

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: Theme.of(context)
                .colorScheme
                .surfaceContainerHigh
                .withValues(alpha: 0.84),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(item['icon'] as IconData, size: 22),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        item['label'] as String,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    Text(
                      max > 0
                          ? '${score.toInt()}/${max.toInt()}'
                          : '${score.toInt()}',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: score < 0 ? AppTheme.error : null,
                      ),
                    ),
                  ],
                ),
                if (max > 0) ...[
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(2),
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor:
                          Theme.of(context).colorScheme.surfaceContainerHighest,
                      minHeight: 6,
                    ),
                  ),
                ],
                if (tip != null && score < max) ...[
                  const SizedBox(height: 6),
                  Text(
                    tip,
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
                if (detail != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    detail,
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildScoreHistory() {
    return Column(
      children: _scoreHistory.map((log) {
        final isPositive = log.changeAmount > 0;
        final isNegative = log.changeAmount < 0;
        final changeColor = isPositive
            ? AppTheme.safetyHigh
            : isNegative
                ? AppTheme.error
                : Theme.of(context).colorScheme.onSurfaceVariant;

        final changeText = isPositive
            ? '+${log.changeAmount.toInt()}'
            : '${log.changeAmount.toInt()}';

        return Container(
          margin: const EdgeInsets.only(bottom: 6),
          decoration: BoxDecoration(
            color: Theme.of(context)
                .colorScheme
                .surfaceContainerHigh
                .withValues(alpha: 0.84),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                // Category icon
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: changeColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Icon(
                    _getCategoryIcon(log.category),
                    size: 18,
                    color: changeColor,
                  ),
                ),
                const SizedBox(width: 12),
                // Reason and date
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        log.reason,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(
                        _formatDate(log.createdAt),
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                // Change amount
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      changeText,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: changeColor,
                      ),
                    ),
                    Text(
                      '${log.newScore.toInt()}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'verification':
        return Icons.verified_user;
      case 'profile':
        return Icons.person;
      case 'behavioral':
        return Icons.psychology;
      case 'activity':
        return Icons.bolt;
      case 'report_penalty':
        return Icons.warning_amber_rounded;
      case 'admin_action':
        return Icons.admin_panel_settings;
      default:
        return Icons.info_outline;
    }
  }

  String _formatDate(DateTime date) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  Color _getSafetyColor(double score) {
    if (score >= 70) return AppTheme.safetyHigh;
    if (score >= 40) return AppTheme.safetyMedium;
    return AppTheme.safetyLow;
  }

  String _getScoreLabel(double score) {
    if (score >= 70) return 'Excellent';
    if (score >= 50) return 'Good';
    if (score >= 30) return 'Fair';
    return 'Needs Improvement';
  }

  Widget _buildSectionHeader(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
      ],
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
