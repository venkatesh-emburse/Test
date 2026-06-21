import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/services/location_service.dart';
import '../../../core/utils/app_theme.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  bool _isLoading = false;

  DateTime? _dateOfBirth;
  String _gender = '';

  final List<String> _genders = ['male', 'female', 'non_binary', 'other'];

  Future<void> _submitProfile() async {
    if (_dateOfBirth == null || _gender.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      await ref.read(dioProvider).post(
        '/auth/onboarding/profile',
        data: {
          'dateOfBirth': _dateOfBirth!.toIso8601String().split('T')[0],
          'gender': _gender,
        },
      );
      ref.read(profileCompleteProvider.notifier).state = true;
      ref.read(locationServiceProvider).updateLocationInBackground();
      if (mounted) context.go('/discovery');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
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
              right: -40,
              child: _buildAura(
                  AppTheme.primaryColor.withValues(alpha: 0.16), 240),
            ),
            Positioned(
              bottom: -100,
              left: -40,
              child: _buildAura(
                  AppTheme.secondaryColor.withValues(alpha: 0.12), 240),
            ),
            SafeArea(
              child: _buildFormPage(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFormPage() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('QUICK SETUP', style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(height: 8),
          Text(
            'A couple of details to get you started',
            style: Theme.of(context).textTheme.headlineLarge,
          ),
          const SizedBox(height: 32),

          // Gender
          Text('Gender', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            children: _genders.map((g) {
              final isSelected = _gender == g;
              return ChoiceChip(
                label: Text(g.replaceAll('_', ' ').toUpperCase()),
                selected: isSelected,
                onSelected: (_) => setState(() => _gender = g),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),

          // Date of Birth
          Text('Date of Birth', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          InkWell(
            onTap: () async {
              final date = await showDatePicker(
                context: context,
                initialDate:
                    DateTime.now().subtract(const Duration(days: 365 * 25)),
                firstDate: DateTime(1950),
                lastDate:
                    DateTime.now().subtract(const Duration(days: 365 * 18)),
              );
              if (date != null) setState(() => _dateOfBirth = date);
            },
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).inputDecorationTheme.fillColor,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                _dateOfBirth != null
                    ? '${_dateOfBirth!.day}/${_dateOfBirth!.month}/${_dateOfBirth!.year}'
                    : 'Select date',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: _dateOfBirth != null
                          ? Theme.of(context).colorScheme.onSurface
                          : Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ),
          ),
          const SizedBox(height: 32),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _dateOfBirth == null || _gender.isEmpty || _isLoading
                  ? null
                  : _submitProfile,
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Get Started'),
            ),
          ),
        ],
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
