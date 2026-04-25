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
  final _pageController = PageController();
  int _currentPage = 0;
  bool _isLoading = false;

  // Form data
  String _intent = '';
  String _name = '';
  DateTime? _dateOfBirth;
  String _gender = '';
  String _bio = '';

  final List<String> _intents = [
    'marriage',
    'long_term',
    'short_term',
    'companionship',
  ];

  final List<String> _genders = ['male', 'female', 'non_binary', 'other'];

  Future<void> _submitIntent() async {
    if (_intent.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      await ref.read(dioProvider).post(
        '/auth/onboarding/intent',
        data: {'intent': _intent},
      );
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _submitProfile() async {
    if (_name.isEmpty || _dateOfBirth == null || _gender.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      await ref.read(dioProvider).post(
        '/auth/onboarding/profile',
        data: {
          'name': _name,
          'dateOfBirth': _dateOfBirth!.toIso8601String().split('T')[0],
          'gender': _gender,
          'bio': _bio,
        },
      );
      ref.read(profileCompleteProvider.notifier).state = true;
      // Update location in background (non-blocking)
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
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Row(
                      children: List.generate(2, (index) {
                        return Expanded(
                          child: Container(
                            height: 4,
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            decoration: BoxDecoration(
                              color: index <= _currentPage
                                  ? Theme.of(context).primaryColor
                                  : Theme.of(context)
                                      .colorScheme
                                      .surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                  Expanded(
                    child: PageView(
                      controller: _pageController,
                      physics: const NeverScrollableScrollPhysics(),
                      onPageChanged: (page) =>
                          setState(() => _currentPage = page),
                      children: [
                        _buildIntentPage(),
                        _buildProfilePage(),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIntentPage() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('INTENT MATCHING',
              style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(height: 8),
          Text(
            'What are you looking for?',
            style: Theme.of(context).textTheme.headlineLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'This helps us find better matches for you',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 32),
          ..._intents.map((intent) {
            final isSelected = _intent == intent;
            final labels = {
              'marriage': '💍 Marriage',
              'long_term': '❤️ Long-term Relationship',
              'short_term': '💝 Short-term Dating',
              'companionship': '🤝 Companionship',
            };
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: InkWell(
                onTap: () => setState(() => _intent = intent),
                borderRadius: BorderRadius.circular(4),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? Theme.of(context).primaryColor.withValues(alpha: 0.12)
                        : Theme.of(context)
                            .colorScheme
                            .surfaceContainerHigh
                            .withValues(alpha: 0.72),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    labels[intent] ?? intent,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontWeight:
                              isSelected ? FontWeight.w600 : FontWeight.w400,
                        ),
                  ),
                ),
              ),
            );
          }),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _intent.isEmpty || _isLoading ? null : _submitIntent,
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Continue'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfilePage() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('IDENTITY SETUP', style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(height: 8),
          Text(
            'Tell us about yourself',
            style: Theme.of(context).textTheme.headlineLarge,
          ),
          const SizedBox(height: 32),

          // Name
          Text('Name', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          TextField(
            onChanged: (v) => setState(() => _name = v),
            decoration: const InputDecoration(hintText: 'Your name'),
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
          const SizedBox(height: 24),

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

          // Bio
          Text('Bio (optional)',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          TextField(
            onChanged: (v) => setState(() => _bio = v),
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'Tell potential matches about yourself...',
            ),
          ),
          const SizedBox(height: 32),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _name.isEmpty ||
                      _dateOfBirth == null ||
                      _gender.isEmpty ||
                      _isLoading
                  ? null
                  : _submitProfile,
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Complete Setup'),
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
