import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/models/models.dart';
import '../../../core/utils/app_theme.dart';
import 'profile_screen.dart'; // For currentUserProvider

/// Fetches interest tag suggestions from the backend.
final interestSuggestionsProvider = FutureProvider<List<String>>((ref) async {
  final response =
      await ref.read(dioProvider).get('/profile/interests/suggestions');
  return List<String>.from(response.data ?? []);
});

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isSaving = false;
  bool _isInitialized = false;

  // Section 1: Basic Info
  late TextEditingController _nameController;
  DateTime? _dateOfBirth;
  String _gender = '';

  // Section 2: About Me
  late TextEditingController _bioController;
  late TextEditingController _lookingForController;
  int? _height;
  late TextEditingController _occupationController;
  late TextEditingController _educationController;
  List<String> _selectedInterests = [];

  // Section 3: Intent
  String _intent = '';
  String _originalIntent = '';

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _bioController = TextEditingController();
    _lookingForController = TextEditingController();
    _occupationController = TextEditingController();
    _educationController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _bioController.dispose();
    _lookingForController.dispose();
    _occupationController.dispose();
    _educationController.dispose();
    super.dispose();
  }

  /// Populate form state from the loaded user (only once).
  void _initializeFromUser(User user) {
    if (_isInitialized) return;
    _isInitialized = true;

    _nameController.text = user.name ?? '';
    _dateOfBirth = user.dateOfBirth;
    _gender = user.gender;
    _bioController.text = user.profile?.bio ?? '';
    _lookingForController.text = user.profile?.lookingFor ?? '';
    _height = user.profile?.height;
    _occupationController.text = user.profile?.occupation ?? '';
    _educationController.text = user.profile?.education ?? '';
    _selectedInterests = List<String>.from(user.profile?.interests ?? []);
    _intent = user.intent;
    _originalIntent = user.intent;
  }

  // ── Save actions ──

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      // 1. Update profile fields
      await ref.read(dioProvider).put('/profile', data: {
        'name': _nameController.text.trim(),
        'bio': _bioController.text.trim(),
        'lookingFor': _lookingForController.text.trim(),
        'height': _height,
        'occupation': _occupationController.text.trim(),
        'education': _educationController.text.trim(),
        'interests': _selectedInterests,
      });

      // 2. If intent changed, update it
      if (_intent != _originalIntent) {
        await ref.read(dioProvider).post('/auth/onboarding/intent', data: {
          'intent': _intent,
        });
      }

      // 3. Refresh cached user data
      ref.invalidate(currentUserProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully!'),
            backgroundColor: AppTheme.success,
          ),
        );
        context.pop();
      }
    } catch (e) {
      debugPrint('Profile save error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  // ══════════════════════════════════════════════
  //  BUILD
  // ══════════════════════════════════════════════

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(currentUserProvider);

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('PROFILE EDITOR',
                style: Theme.of(context).textTheme.labelSmall),
            Text('Edit Profile',
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
          child: userAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Error loading profile: $e')),
            data: (user) {
              _initializeFromUser(user);
              return _buildForm(context);
            },
          ),
        ),
      ),
    );
  }

  Widget _buildForm(BuildContext context) {
    return Stack(
      children: [
        SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Section 1: Basic Info ──
                _sectionHeader('Basic Info'),
                const SizedBox(height: 12),
                _buildNameField(),
                const SizedBox(height: 16),
                _buildDateOfBirthField(),
                const SizedBox(height: 16),
                _buildGenderField(),
                const SizedBox(height: 32),

                // ── Section 2: About Me ──
                _sectionHeader('About Me'),
                const SizedBox(height: 12),
                _buildBioField(),
                const SizedBox(height: 16),
                _buildLookingForField(),
                const SizedBox(height: 16),
                _buildHeightField(),
                const SizedBox(height: 16),
                _buildOccupationField(),
                const SizedBox(height: 16),
                _buildEducationField(),
                const SizedBox(height: 16),
                _buildInterestsField(),
                const SizedBox(height: 32),

                // ── Section 3: Dating Intent ──
                _sectionHeader('Dating Intent'),
                const SizedBox(height: 12),
                _buildIntentSection(),
                const SizedBox(height: 32),

                // ── Save Button ──
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isSaving ? null : _saveProfile,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: _isSaving
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Save Changes',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
        // Overlay during save
        if (_isSaving)
          Container(
            color: Colors.black26,
            child: const Center(child: CircularProgressIndicator()),
          ),
      ],
    );
  }

  // ══════════════════════════════════════════════
  //  SECTION HEADER
  // ══════════════════════════════════════════════

  Widget _sectionHeader(String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.headlineMedium,
    );
  }

  // ══════════════════════════════════════════════
  //  SECTION 1: BASIC INFO
  // ══════════════════════════════════════════════

  Widget _buildNameField() {
    return _fieldLabel(
      label: 'Name',
      child: TextFormField(
        controller: _nameController,
        maxLength: 100,
        decoration: const InputDecoration(hintText: 'Your name'),
        validator: (value) {
          if (value == null || value.trim().isEmpty) return 'Name is required';
          return null;
        },
      ),
    );
  }

  Widget _buildDateOfBirthField() {
    return _fieldLabel(
      label: 'Date of Birth',
      locked: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context)
              .colorScheme
              .surfaceContainerHigh
              .withValues(alpha: 0.82),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(
          _dateOfBirth != null
              ? '${_dateOfBirth!.day}/${_dateOfBirth!.month}/${_dateOfBirth!.year}'
              : 'Not set',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
      ),
    );
  }

  Widget _buildGenderField() {
    const genders = ['male', 'female', 'non_binary', 'other'];
    return _fieldLabel(
      label: 'Gender',
      locked: true,
      child: Wrap(
        spacing: 12,
        children: genders.map((g) {
          return ChoiceChip(
            label: Text(g.replaceAll('_', ' ').toUpperCase()),
            selected: _gender == g,
            onSelected: null, // Disabled — read-only
          );
        }).toList(),
      ),
    );
  }

  // ══════════════════════════════════════════════
  //  SECTION 2: ABOUT ME
  // ══════════════════════════════════════════════

  Widget _buildBioField() {
    return _fieldLabel(
      label: 'Bio',
      child: TextFormField(
        controller: _bioController,
        maxLines: 4,
        maxLength: 500,
        decoration: const InputDecoration(
          hintText: 'Tell potential matches about yourself...',
        ),
      ),
    );
  }

  Widget _buildLookingForField() {
    return _fieldLabel(
      label: 'Looking For',
      child: TextFormField(
        controller: _lookingForController,
        maxLength: 200,
        decoration: const InputDecoration(
          hintText: 'What are you looking for in a partner?',
        ),
      ),
    );
  }

  Widget _buildHeightField() {
    return _fieldLabel(
      label: 'Height',
      child: InkWell(
        onTap: _showHeightPicker,
        borderRadius: BorderRadius.circular(4),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context)
                .colorScheme
                .surfaceContainerHigh
                .withValues(alpha: 0.82),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            _height != null ? '$_height cm' : 'Select height',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: _height != null
                      ? Theme.of(context).colorScheme.onSurface
                      : Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        ),
      ),
    );
  }

  void _showHeightPicker() {
    int tempHeight = _height ?? 170;
    showModalBottomSheet(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return SizedBox(
              height: 300,
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Cancel'),
                        ),
                        Text(
                          '$tempHeight cm',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        TextButton(
                          onPressed: () {
                            setState(() => _height = tempHeight);
                            Navigator.pop(ctx);
                          },
                          child: const Text('Done'),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: ListWheelScrollView.useDelegate(
                      itemExtent: 40,
                      controller: FixedExtentScrollController(
                        initialItem: tempHeight - 100,
                      ),
                      onSelectedItemChanged: (index) {
                        setModalState(() => tempHeight = index + 100);
                      },
                      physics: const FixedExtentScrollPhysics(),
                      childDelegate: ListWheelChildBuilderDelegate(
                        childCount: 151, // 100 to 250
                        builder: (ctx, index) {
                          final h = index + 100;
                          final isSelected = h == tempHeight;
                          return Center(
                            child: Text(
                              '$h cm',
                              style: (isSelected
                                      ? Theme.of(context).textTheme.titleLarge
                                      : Theme.of(context).textTheme.bodyLarge)
                                  ?.copyWith(
                                color: isSelected
                                    ? Theme.of(context).primaryColor
                                    : Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildOccupationField() {
    return _fieldLabel(
      label: 'Occupation',
      child: TextFormField(
        controller: _occupationController,
        maxLength: 100,
        decoration: const InputDecoration(hintText: 'e.g. Software Engineer'),
      ),
    );
  }

  Widget _buildEducationField() {
    return _fieldLabel(
      label: 'Education',
      child: TextFormField(
        controller: _educationController,
        maxLength: 100,
        decoration: const InputDecoration(hintText: 'e.g. IIT Delhi'),
      ),
    );
  }

  Widget _buildInterestsField() {
    final suggestionsAsync = ref.watch(interestSuggestionsProvider);

    return _fieldLabel(
      label: 'Interests (${_selectedInterests.length}/10)',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Selected interests
          if (_selectedInterests.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _selectedInterests.map((interest) {
                return Chip(
                  label: Text(interest),
                  deleteIcon: const Icon(Icons.close, size: 16),
                  onDeleted: () {
                    setState(() => _selectedInterests.remove(interest));
                  },
                );
              }).toList(),
            ),

          if (_selectedInterests.isNotEmpty) const SizedBox(height: 12),

          // Suggestions + Add custom button
          suggestionsAsync.when(
            loading: () => const SizedBox(
              height: 32,
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            ),
            error: (_, __) => const Text('Could not load suggestions'),
            data: (suggestions) {
              final available = suggestions
                  .where((s) => !_selectedInterests.contains(s))
                  .toList();
              return Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ...available.map((suggestion) {
                    return ActionChip(
                      label: Text(suggestion),
                      onPressed: _selectedInterests.length >= 10
                          ? null
                          : () {
                              setState(
                                  () => _selectedInterests.add(suggestion));
                            },
                    );
                  }),
                  // "Add your own" chip
                  if (_selectedInterests.length < 10)
                    ActionChip(
                      avatar: const Icon(Icons.add, size: 18),
                      label: const Text('Add your own'),
                      onPressed: _showAddCustomInterestDialog,
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  void _showAddCustomInterestDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Add Custom Interest'),
          content: TextField(
            controller: controller,
            autofocus: true,
            maxLength: 30,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              hintText: 'e.g. Pottery, Anime, Hiking',
            ),
            onSubmitted: (value) {
              _addCustomInterest(value, ctx);
              controller.dispose();
            },
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                controller.dispose();
              },
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                _addCustomInterest(controller.text, ctx);
                controller.dispose();
              },
              child: const Text('Add'),
            ),
          ],
        );
      },
    );
  }

  void _addCustomInterest(String value, BuildContext dialogContext) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return;
    if (_selectedInterests.length >= 10) return;

    // Avoid duplicates (case-insensitive)
    final alreadyExists =
        _selectedInterests.any((i) => i.toLowerCase() == trimmed.toLowerCase());
    if (alreadyExists) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This interest is already added')),
      );
      Navigator.pop(dialogContext);
      return;
    }

    setState(() => _selectedInterests.add(trimmed));
    Navigator.pop(dialogContext);
  }

  // ══════════════════════════════════════════════
  //  SECTION 3: DATING INTENT
  // ══════════════════════════════════════════════

  Widget _buildIntentSection() {
    const intentLabels = {
      'marriage': 'Marriage',
      'long_term': 'Long-term Relationship',
      'short_term': 'Short-term Dating',
      'companionship': 'Companionship',
    };

    const intentIcons = {
      'marriage': Icons.diamond_outlined,
      'long_term': Icons.favorite,
      'short_term': Icons.local_fire_department,
      'companionship': Icons.people,
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Trust score warning
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.warning.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline,
                      color: AppTheme.warning, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Changing your intent frequently will reduce 1 point from your trust score each day.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Intent options — always visible
            ...['marriage', 'long_term', 'short_term', 'companionship']
                .map((intent) {
              final isSelected = _intent == intent;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  onTap: () => setState(() => _intent = intent),
                  borderRadius: BorderRadius.circular(4),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(4),
                      color: isSelected
                          ? Theme.of(context)
                              .primaryColor
                              .withValues(alpha: 0.1)
                          : Theme.of(context)
                              .colorScheme
                              .surfaceContainerHigh
                              .withValues(alpha: 0.74),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          intentIcons[intent] ?? Icons.help,
                          size: 20,
                          color: isSelected
                              ? Theme.of(context).primaryColor
                              : Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 12),
                        Text(
                          intentLabels[intent] ?? intent,
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(
                                fontWeight: isSelected
                                    ? FontWeight.w600
                                    : FontWeight.w400,
                                color: isSelected
                                    ? Theme.of(context).primaryColor
                                    : Theme.of(context).colorScheme.onSurface,
                              ),
                        ),
                        const Spacer(),
                        if (isSelected)
                          Icon(
                            Icons.check_circle,
                            color: Theme.of(context).primaryColor,
                            size: 20,
                          ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  // ══════════════════════════════════════════════
  //  SECTION 4: PRIVACY & VISIBILITY
  // ══════════════════════════════════════════════

  // ══════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════

  /// Standard field wrapper with label (and optional lock icon).
  Widget _fieldLabel({
    required String label,
    required Widget child,
    bool locked = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(label, style: Theme.of(context).textTheme.titleMedium),
            if (locked) ...[
              const SizedBox(width: 6),
              Icon(
                Icons.lock,
                size: 14,
                color: Theme.of(context).colorScheme.outline,
              ),
            ],
          ],
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}
