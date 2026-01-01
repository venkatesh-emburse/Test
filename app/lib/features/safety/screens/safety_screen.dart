import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/utils/app_theme.dart';

class SafetyScreen extends ConsumerStatefulWidget {
  const SafetyScreen({super.key});

  @override
  ConsumerState<SafetyScreen> createState() => _SafetyScreenState();
}

class _SafetyScreenState extends ConsumerState<SafetyScreen> {
  Map<String, dynamic>? _safetyScore;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSafetyScore();
  }

  Future<void> _loadSafetyScore() async {
    try {
      final response = await ref.read(dioProvider).get('/safety/score');
      setState(() {
        _safetyScore = response.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _startVerification() async {
    try {
      final response = await ref.read(dioProvider).post('/safety/verification/start');
      final phrase = response.data['phrase'];
      
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Video Verification'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Record a video saying:'),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '"$phrase"',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  // Open camera for video recording
                },
                child: const Text('Record Video'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      // Handle error
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Safety & Verification'),
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
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color, color.withOpacity(0.7)],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          const Icon(Icons.shield, size: 48, color: Colors.white),
          const SizedBox(height: 12),
          Text(
            '${totalScore.toInt()}',
            style: const TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const Text(
            'Safety Score',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _getScoreLabel(totalScore),
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVerificationCard() {
    final isVerified = _safetyScore?['isVerified'] ?? false;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isVerified ? Colors.green.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                isVerified ? Icons.verified : Icons.videocam,
                color: isVerified ? Colors.green : Colors.grey,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isVerified ? 'Verified ✓' : 'Get Verified',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    isVerified
                        ? 'Your identity is verified'
                        : 'Verify to earn +40 points',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            if (!isVerified)
              ElevatedButton(
                onPressed: _startVerification,
                child: const Text('Verify'),
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
        'label': 'Video Verification',
        'score': breakdown['videoVerification'] ?? 0,
        'max': 40,
        'icon': Icons.videocam,
      },
      {
        'label': 'Profile Completeness',
        'score': breakdown['profileCompleteness'] ?? 0,
        'max': 20,
        'icon': Icons.person,
      },
      {
        'label': 'Account Age',
        'score': breakdown['accountAge'] ?? 0,
        'max': 15,
        'icon': Icons.calendar_today,
      },
      {
        'label': 'Chat Behavior',
        'score': breakdown['chatBehavior'] ?? 0,
        'max': 15,
        'icon': Icons.chat,
      },
      {
        'label': 'Report Penalties',
        'score': breakdown['reportPenalties'] ?? 0,
        'max': 0,
        'icon': Icons.warning,
      },
    ];

    return Column(
      children: items.map((item) {
        final score = (item['score'] as num).toDouble();
        final max = (item['max'] as num).toDouble();
        final progress = max > 0 ? (score / max).clamp(0.0, 1.0) : 0.0;

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Icon(item['icon'] as IconData),
            title: Text(item['label'] as String),
            subtitle: max > 0
                ? LinearProgressIndicator(
                    value: progress,
                    backgroundColor: Colors.grey[200],
                  )
                : null,
            trailing: Text(
              '${score.toInt()}/${max.toInt()}',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: score < 0 ? Colors.red : null,
              ),
            ),
          ),
        );
      }).toList(),
    );
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
