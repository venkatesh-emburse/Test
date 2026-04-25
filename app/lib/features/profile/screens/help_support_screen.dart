import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/api/api_client.dart';
import '../../../core/utils/app_theme.dart';

class HelpSupportScreen extends ConsumerStatefulWidget {
  const HelpSupportScreen({super.key});

  @override
  ConsumerState<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

class _HelpSupportScreenState extends ConsumerState<HelpSupportScreen> {
  String _feedbackType = 'Bug Report';
  final _descriptionController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('SUPPORT GRID', style: Theme.of(context).textTheme.labelSmall),
            Text('Help & Support',
                style: Theme.of(context).textTheme.headlineMedium),
          ],
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
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.symmetric(vertical: 8),
            children: [
              // ==================== FAQ ====================
              _buildSectionHeader(
                  context, Icons.quiz_outlined, 'Frequently Asked Questions'),
              const SizedBox(height: 4),

              _buildFaqItem(
                'What is the Safety Score?',
                'The Safety Score is a 0-100 rating that helps you identify trustworthy profiles. '
                    'It\'s calculated based on selfie/video verification (35 pts), profile completeness (30 pts), '
                    'identity verification like phone & email (15 pts), account age (10 pts), and report history. '
                    'A higher score means a more trustworthy profile.',
              ),
              _buildFaqItem(
                'How does matching work?',
                'LiveConnect matches you based on your dating intent (marriage, long-term, short-term, or companionship) '
                    'and compatibility — not just proximity. You can send signals like Wave or Interested before matching. '
                    'Once both users like each other, you\'re matched! Complete a fun Micro-Date conversation game to unlock chat.',
              ),
              _buildFaqItem(
                'How do I verify my profile?',
                'Go to Profile → Safety & Verification → Start Verification. You\'ll receive a 6-digit challenge code. '
                    'For selfie verification, write the code on paper and take a photo holding it next to your face. '
                    'For video verification, record yourself showing and speaking the code. '
                    'Our team reviews submissions and updates your Safety Score accordingly.',
              ),
              _buildFaqItem(
                'How do I block or report someone?',
                'Open the user\'s profile and tap the report/block button. You can choose a reason for reporting '
                    '(fake profile, inappropriate content, harassment, scam, etc.). Blocking immediately hides the user '
                    'from your discovery, map, and chat. Our safety team reviews all reports.',
              ),
              _buildFaqItem(
                'Is LiveConnect free?',
                'Yes! LiveConnect is completely free to use. All features including discovery, matching, chat, '
                    'map radar, signals, and verification are available to everyone. '
                    'We believe safety and genuine connections should be accessible to all.',
              ),
              _buildFaqItem(
                'How do I delete my account?',
                'Go to Profile → Privacy Settings → scroll to the bottom and tap "Delete Account". '
                    'This action is permanent and will remove all your data including matches, messages, and photos. '
                    'You can also contact us at support@liveconnect.app for account deletion requests.',
              ),
              _buildFaqItem(
                'Why can\'t I see anyone on the map?',
                'The map shows users within 1.5 km who were active in the last 24 hours. '
                    'Make sure your location services are enabled and you\'ve granted location permission. '
                    'Profiles also need to have "Show on Map" enabled in their privacy settings to appear on the radar.',
              ),

              const SizedBox(height: 24),

              // ==================== CONTACT US ====================
              _buildSectionHeader(
                  context, Icons.support_agent_outlined, 'Contact Us'),
              const SizedBox(height: 4),

              _buildContactItem(
                context,
                icon: Icons.email_outlined,
                title: 'Email Support',
                subtitle: 'support@liveconnect.app',
                onTap: () => _launchUrl('mailto:support@liveconnect.app'),
              ),
              _buildContactItem(
                context,
                icon: Icons.phone_outlined,
                title: 'Call Support',
                subtitle: '+91 9876 543 210',
                onTap: () => _launchUrl('tel:+919876543210'),
              ),
              _buildContactItem(
                context,
                icon: Icons.access_time_outlined,
                title: 'Support Hours',
                subtitle: 'Mon–Sat, 9 AM – 6 PM IST',
                onTap: null,
              ),

              const SizedBox(height: 24),

              // ==================== REPORT A BUG / FEEDBACK ====================
              _buildSectionHeader(context, Icons.bug_report_outlined,
                  'Report a Bug / Feedback'),
              const SizedBox(height: 12),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Feedback type dropdown
                    DropdownButtonFormField<String>(
                      initialValue: _feedbackType,
                      decoration: InputDecoration(
                        labelText: 'Type',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 14),
                      ),
                      items: const [
                        DropdownMenuItem(
                            value: 'Bug Report', child: Text('Bug Report')),
                        DropdownMenuItem(
                            value: 'Feature Request',
                            child: Text('Feature Request')),
                        DropdownMenuItem(
                            value: 'General Feedback',
                            child: Text('General Feedback')),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _feedbackType = value);
                        }
                      },
                    ),

                    const SizedBox(height: 16),

                    // Description field
                    TextField(
                      controller: _descriptionController,
                      maxLines: 5,
                      maxLength: 500,
                      decoration: InputDecoration(
                        labelText: 'Description',
                        hintText:
                            'Tell us what happened or what you\'d like to see...',
                        alignLabelWithHint: true,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        contentPadding: const EdgeInsets.all(16),
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Submit button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: FilledButton.icon(
                        onPressed: _isSubmitting ? null : _submitFeedback,
                        icon: _isSubmitting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.send_rounded, size: 18),
                        label: Text(_isSubmitting ? 'Submitting...' : 'Submit'),
                      ),
                    ),

                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ==================== WIDGETS ====================

  Widget _buildSectionHeader(
      BuildContext context, IconData icon, String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Row(
        children: [
          Icon(icon, size: 22, color: Theme.of(context).primaryColor),
          const SizedBox(width: 10),
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildFaqItem(String question, String answer) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(4),
      ),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 16),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        shape: const Border(),
        collapsedShape: const Border(),
        title: Text(
          question,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
        children: [
          Text(
            answer,
            style: TextStyle(
              fontSize: 13,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback? onTap,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Theme.of(context).primaryColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Icon(icon, color: Theme.of(context).primaryColor, size: 20),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle),
      trailing: onTap != null
          ? Icon(Icons.arrow_forward_ios,
              size: 14, color: Theme.of(context).colorScheme.outline)
          : null,
      onTap: onTap,
    );
  }

  // ==================== ACTIONS ====================

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open the link')),
        );
      }
    }
  }

  /// Map display label → backend enum value
  String _feedbackTypeToEnum(String label) {
    switch (label) {
      case 'Bug Report':
        return 'bug_report';
      case 'Feature Request':
        return 'feature_request';
      default:
        return 'general_feedback';
    }
  }

  Future<void> _submitFeedback() async {
    final description = _descriptionController.text.trim();
    if (description.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a description')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      await ref.read(dioProvider).post('/feedback', data: {
        'type': _feedbackTypeToEnum(_feedbackType),
        'description': description,
      });

      if (mounted) {
        _descriptionController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Text('$_feedbackType submitted! Thank you.'),
              ],
            ),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Failed to submit feedback. Please try again.'),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }
}
