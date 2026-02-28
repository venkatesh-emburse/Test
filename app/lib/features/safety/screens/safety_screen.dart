import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/models/models.dart';
import '../../../core/services/upload_service.dart';
import '../../../core/utils/app_theme.dart';
import 'video_verification_screen.dart';

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
            .map((json) =>
                SafetyScoreLog.fromJson(json as Map<String, dynamic>))
            .toList();
      } else if (historyData is List) {
        history = historyData
            .map((json) =>
                SafetyScoreLog.fromJson(json as Map<String, dynamic>))
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
      final response =
          await ref.read(dioProvider).post('/safety/selfie/start');
      final sessionId = response.data['sessionId'];
      final challengeCode = response.data['challengeCode'];

      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
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
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () async {
                  Navigator.pop(context);

                  final uploadService = ref.read(uploadServiceProvider);
                  final selfieResult =
                      await uploadService.takeAndUploadPhoto();
                  if (selfieResult == null || !selfieResult.success) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content:
                                Text('Selfie upload failed. Please try again.')),
                      );
                    }
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

                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Selfie submitted for review.')),
                    );
                    _loadSafetyData();
                  }
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

  Future<void> _startVideoVerification() async {
    try {
      final response =
          await ref.read(dioProvider).post('/safety/verification/start');
      final sessionId = response.data['sessionId'];
      final code = response.data['phrase'];

      if (mounted) {
        final submitted = await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => VideoVerificationScreen(
              sessionId: sessionId,
              code: code,
            ),
          ),
        );

        if (submitted == true) {
          _loadSafetyData();
        }
      }
    } catch (e) {
      // Handle error
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trust & Verification'),
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
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Safety Score Card
                  _buildScoreCard(),
                  const SizedBox(height: 24),

                  // Verification Section
                  const Text(
                    'Verification',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildVerificationCard(),
                  const SizedBox(height: 8),
                  _buildVideoVerificationCard(),
                  const SizedBox(height: 24),

                  // Score Breakdown
                  const Text(
                    'Score Breakdown',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildBreakdownCards(),
                  const SizedBox(height: 24),

                  // Score History
                  if (_scoreHistory.isNotEmpty) ...[
                    const Text(
                      'Score History',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildScoreHistory(),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildScoreCard() {
    final totalScore = (_safetyScore?['totalScore'] ?? 0).toDouble();
    final color = _getSafetyColor(totalScore);

    // Always use a dark background so white text is visible in both themes
    final cardColor = Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF1C1C1E) // elevated dark surface
        : const Color(0xFF111827); // dark navy from light theme

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Icon(Icons.shield_rounded, size: 40, color: color),
          const SizedBox(height: 12),
          Text(
            '${totalScore.toInt()}',
            style: const TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.w700,
              color: Colors.white,
              letterSpacing: -1,
            ),
          ),
          Text(
            'Trust Score',
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
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

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isVerified
                    ? AppTheme.success.withValues(alpha: 0.08)
                    : Theme.of(context).colorScheme.outline.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                isVerified ? Icons.verified : Icons.videocam,
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
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
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
                onPressed: isPending || !canResubmit
                    ? null
                    : _startSelfieVerification,
                child: Text(isFailed ? 'Retry' : 'Verify'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildVideoVerificationCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.outline.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.videocam,
                color: Theme.of(context).colorScheme.outline,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Video Verification',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    'Record a video with the number shown',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: _startVideoVerification,
              child: const Text('Record'),
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
        'tip': 'Complete selfie or video verification to earn up to 30 points',
      },
      {
        'label': 'Profile Quality',
        'score': breakdown['profileQuality'] ?? 0,
        'max': 25,
        'icon': Icons.person,
        'tip':
            'Add photos, a detailed bio, interests, occupation & education',
      },
      {
        'label': 'Identity Verification',
        'score': breakdown['identityVerification'] ?? 0,
        'max': 15,
        'icon': Icons.verified_user,
        'tip': 'Verify your phone number and email address',
      },
      {
        'label': 'Account Age',
        'score': breakdown['accountAge'] ?? 0,
        'max': 10,
        'icon': Icons.calendar_today,
        'tip': 'Your score grows as your account ages (1 pt per 2 weeks)',
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
      {
        'label': 'Report Penalties',
        'score': breakdown['reportPenalty'] ?? 0,
        'max': 0,
        'icon': Icons.warning_amber_rounded,
        'tip': null,
      },
    ];

    return Column(
      children: items.map((item) {
        final score = (item['score'] as num).toDouble();
        final max = (item['max'] as num).toDouble();
        final progress = max > 0 ? (score / max).clamp(0.0, 1.0) : 0.0;
        final tip = item['tip'] as String?;

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
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
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
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
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor: Theme.of(context)
                          .colorScheme
                          .surfaceContainerHighest,
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

        return Card(
          margin: const EdgeInsets.only(bottom: 6),
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
                    borderRadius: BorderRadius.circular(8),
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
                          color: Theme.of(context)
                              .colorScheme
                              .onSurfaceVariant,
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
                        color: Theme.of(context)
                            .colorScheme
                            .onSurfaceVariant,
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
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
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
}
