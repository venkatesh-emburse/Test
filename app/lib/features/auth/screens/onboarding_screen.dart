import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';

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
      if (mounted) context.go('/discovery');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Progress indicator
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
                            : Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
            ),

            // Pages
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (page) => setState(() => _currentPage = page),
                children: [
                  _buildIntentPage(),
                  _buildProfilePage(),
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
          const Text(
            'What are you looking for?',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'This helps us find better matches for you',
            style: TextStyle(fontSize: 16, color: Colors.grey[600]),
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
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: isSelected
                          ? Theme.of(context).primaryColor
                          : Colors.grey[300]!,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(12),
                    color: isSelected
                        ? Theme.of(context).primaryColor.withOpacity(0.1)
                        : null,
                  ),
                  child: Text(
                    labels[intent] ?? intent,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: isSelected ? FontWeight.w600 : null,
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
          const Text(
            'Tell us about yourself',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 32),

          // Name
          const Text('Name', style: TextStyle(fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          TextField(
            onChanged: (v) => setState(() => _name = v),
            decoration: const InputDecoration(hintText: 'Your name'),
          ),
          const SizedBox(height: 24),

          // Date of Birth
          const Text('Date of Birth', style: TextStyle(fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          InkWell(
            onTap: () async {
              final date = await showDatePicker(
                context: context,
                initialDate: DateTime.now().subtract(const Duration(days: 365 * 25)),
                firstDate: DateTime(1950),
                lastDate: DateTime.now().subtract(const Duration(days: 365 * 18)),
              );
              if (date != null) setState(() => _dateOfBirth = date);
            },
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _dateOfBirth != null
                    ? '${_dateOfBirth!.day}/${_dateOfBirth!.month}/${_dateOfBirth!.year}'
                    : 'Select date',
                style: TextStyle(
                  color: _dateOfBirth != null ? null : Colors.grey[600],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Gender
          const Text('Gender', style: TextStyle(fontWeight: FontWeight.w500)),
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
          const Text('Bio (optional)', style: TextStyle(fontWeight: FontWeight.w500)),
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
              onPressed: _name.isEmpty || _dateOfBirth == null || _gender.isEmpty || _isLoading
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
}
