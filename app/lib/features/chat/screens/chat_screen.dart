import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/models/models.dart';
import '../../../core/services/socket_service.dart';
import '../../../core/utils/app_theme.dart';
import '../../discovery/screens/profile_details_screen.dart';
import '../screens/chat_list_screen.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String matchId;

  const ChatScreen({super.key, required this.matchId});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  List<Message> _messages = [];
  bool _isLoading = true;
  String? _errorMessage;
  bool _otherUserTyping = false;
  Timer? _typingTimer;
  String? _currentUserId;
  User? _otherUser;

  @override
  void initState() {
    super.initState();
    _loadCurrentUser();
    _loadMessages();
    _loadOtherUser();
    _connectSocket();
  }

  void _loadCurrentUser() async {
    try {
      final response = await ref.read(dioProvider).get('/auth/me');
      _currentUserId = response.data['user']?['id'];
    } catch (_) {}
  }

  void _loadOtherUser() async {
    try {
      // Look up the match from conversations to get the other user's info
      final response = await ref.read(dioProvider).get('/chat/conversations');
      final matches = (response.data as List)
          .map((json) => Match.fromJson(json as Map<String, dynamic>))
          .toList();
      final match = matches.where((m) => m.id == widget.matchId).firstOrNull;
      if (match != null && mounted) {
        setState(() => _otherUser = match.otherUser);
      }
    } catch (_) {}
  }

  void _connectSocket() {
    final socketService = ref.read(socketServiceProvider);

    // Ensure connected
    socketService.connect();

    void joinCurrentRoom() {
      if (!mounted) return;
      socketService.joinRoom(widget.matchId);
      socketService.markRead(widget.matchId);
    }

    socketService.whenConnected(joinCurrentRoom);

    // Also mark as read via REST (reliable fallback)
    _markReadViaRest();

    // Listen for new messages
    socketService.onNewMessage((data) {
      if (!mounted) return;
      final senderId = data['senderId'] as String?;
      final isMe = senderId == _currentUserId;

      final message = Message(
        id: data['id'] ?? 'ws_${DateTime.now().millisecondsSinceEpoch}',
        senderId: senderId ?? '',
        content: data['content'] ?? '',
        createdAt: data['createdAt'] != null
            ? DateTime.tryParse(data['createdAt'].toString()) ?? DateTime.now()
            : DateTime.now(),
        isMe: isMe,
        warningType: data['warningType'] as String?,
      );

      setState(() {
        // Avoid duplicates (from optimistic add or REST reload)
        _messages.removeWhere(
            (m) => m.id.startsWith('temp_') && m.content == message.content);
        // Only add if not already present
        if (!_messages.any((m) => m.id == message.id)) {
          _messages.insert(0, message);
        }
      });

      // Refresh conversations list so last message + unread counts stay in sync
      ref.invalidate(conversationsProvider);

      if (!isMe) {
        socketService.markRead(widget.matchId);
      }
    });

    // Listen for typing indicator
    socketService.onUserTyping((data) {
      if (!mounted) return;
      final isTyping = data['isTyping'] == true;
      setState(() => _otherUserTyping = isTyping);

      // Auto-clear typing after 3 seconds
      _typingTimer?.cancel();
      if (isTyping) {
        _typingTimer = Timer(const Duration(seconds: 3), () {
          if (mounted) setState(() => _otherUserTyping = false);
        });
      }
    });
  }

  Future<void> _loadMessages() async {
    try {
      final response = await ref.read(dioProvider).get(
            '/chat/${widget.matchId}/messages',
          );

      final data = response.data;
      final List<dynamic> messageList;

      if (data is List) {
        messageList = data;
      } else if (data is Map && data['messages'] != null) {
        messageList = data['messages'] as List;
      } else {
        messageList = [];
      }

      if (mounted) {
        setState(() {
          _messages = messageList
              .map((json) => Message.fromJson(json as Map<String, dynamic>))
              .toList();
          _isLoading = false;
          _errorMessage = null;
        });
      }
    } catch (e) {
      debugPrint('❌ Load messages error: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Failed to load messages';
        });
      }
    }
  }

  // --- Client-side suspicious content detection ---
  static final _phoneRegex = RegExp(
    r'(\+91[\s\-]?\d{10}|\b\d{10}\b|\b\d{5}[\s\-]\d{5}\b)',
  );
  static final _urlRegex = RegExp(
    r'(https?://|www\.)\S+',
    caseSensitive: false,
  );
  static final _socialMediaRegex = RegExp(
    r'\b(whatsapp|telegram|snapchat|instagram|insta|signal|wechat|fb|facebook|live|chat|social|social media|nine|eight|six|zero|})\b',
    caseSensitive: false,
  );
  static final _financialRegex = RegExp(
    r'\b(send money|pay me|upi|gpay|phonepe|paytm|bank account|account number|ifsc|neft|imps|loan|invest|bitcoin|crypto|western union)\b',
    caseSensitive: false,
  );
  static final _vulgarityRegex = RegExp(
    r'\b(sex|fuck|fuck you|naked|nude|boobs|boobie|pussy|ass|dick|vagina|lick)\b',
    caseSensitive: false,
  );

  /// Returns a warning type if the message contains suspicious content, null otherwise.
  String? _detectSuspiciousContent(String content) {
    if (_financialRegex.hasMatch(content)) return 'financial';
    if (_phoneRegex.hasMatch(content)) return 'phone_number';
    if (_urlRegex.hasMatch(content) || _socialMediaRegex.hasMatch(content)) {
      return 'external_link';
    }
    if (_vulgarityRegex.hasMatch(content)) {
      return 'vulgarity';
    }
    return null;
  }

  String _getBlockWarningTitle(String warningType) {
    switch (warningType) {
      case 'financial':
        return 'Financial Content Detected';
      case 'phone_number':
        return 'Phone Number Detected';
      case 'external_link':
        return 'External Link Detected';
      case 'vulgarity':
        return 'Inappropriate Language Detected';
      default:
        return 'Suspicious Content Detected';
    }
  }

  String _getBlockWarningBody(String warningType) {
    switch (warningType) {
      case 'financial':
        return 'For your safety, messages containing financial details (UPI, bank accounts, payment requests) are not allowed. Never send money to someone you haven\'t met in person.';
      case 'phone_number':
        return 'Sharing phone numbers early can put you at risk. Keep the conversation on the app until you\'ve built trust and met in a safe setting.';
      case 'external_link':
        return 'Sharing external links or social media handles early can be risky. Get to know your match on the app first before moving conversations elsewhere.';
      case 'vulgarity':
        return 'Messages containing inappropriate language are not allowed. Please use respectful language.';
      default:
        return 'This message contains content that may put your safety at risk. Please review and edit your message.';
    }
  }

  Future<void> _showBlockedMessageDialog(String warningType) async {
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.shield_rounded,
            color: Color(0xFFE65100), size: 36),
        title: Text(_getBlockWarningTitle(warningType)),
        content: Text(
          _getBlockWarningBody(warningType),
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Edit Message'),
          ),
        ],
      ),
    );
  }

  void _viewProfile() {
    if (_otherUser == null) return;
    final user = _otherUser!;
    final discoveryProfile = DiscoveryProfile(
      id: user.id,
      name: user.displayName,
      age: user.age ?? 0,
      gender: user.gender,
      intent: user.intent,
      safetyScore: user.safetyScore,
      isVerified: user.isVerified,
      compatibilityScore: 0,
      photos: user.profile?.photos ?? [],
      bio: user.profile?.bio,
      interests: user.profile?.interests ?? [],
      createdAt: user.createdAt,
    );
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) =>
            ProfileDetailsScreen(profile: discoveryProfile, isMatched: true),
      ),
    );
  }

  void _showReportDialog() {
    if (_otherUser == null) return;
    final reasons = {
      'fake_profile': 'Fake Profile',
      'inappropriate_content': 'Inappropriate Content',
      'harassment': 'Harassment',
      'spam': 'Spam',
      'scam': 'Scam',
      'underage': 'Underage',
      'other': 'Other',
    };
    String? selectedReason;
    final descriptionController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Report ${_otherUser!.displayName}'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Why are you reporting this user?',
                  style: Theme.of(ctx).textTheme.titleMedium,
                ),
                const SizedBox(height: 12),
                ...reasons.entries.map((entry) {
                  final isSelected = selectedReason == entry.key;
                  return ListTile(
                    title: Text(entry.value,
                        style: Theme.of(ctx).textTheme.bodyMedium?.copyWith(
                              fontWeight: isSelected
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                            )),
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      isSelected ? Icons.check_circle : Icons.circle_outlined,
                      color: isSelected
                          ? Theme.of(ctx).primaryColor
                          : Theme.of(ctx).colorScheme.outline,
                      size: 22,
                    ),
                    onTap: () =>
                        setDialogState(() => selectedReason = entry.key),
                  );
                }),
                const SizedBox(height: 8),
                TextField(
                  controller: descriptionController,
                  maxLines: 3,
                  maxLength: 500,
                  decoration: InputDecoration(
                    hintText: 'Additional details (optional)',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: selectedReason == null
                  ? null
                  : () async {
                      Navigator.pop(ctx);
                      await _submitReport(
                        selectedReason!,
                        descriptionController.text.trim(),
                      );
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.error,
                foregroundColor: Colors.white,
              ),
              child: const Text('Report'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submitReport(String reason, String description) async {
    try {
      await ref.read(dioProvider).post('/safety/report', data: {
        'reportedUserId': _otherUser!.id,
        'reason': reason,
        if (description.isNotEmpty) 'description': description,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text(
                  'Report submitted. Thank you for keeping the community safe.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to submit report: $e')),
        );
      }
    }
  }

  void _sendMessage() {
    if (_messageController.text.trim().isEmpty) return;

    final content = _messageController.text.trim();

    // Client-side safety check — block suspicious content
    final warningType = _detectSuspiciousContent(content);
    if (warningType != null) {
      _showBlockedMessageDialog(warningType);
      return; // Do NOT send the message
    }

    _messageController.clear();

    // Optimistic insert
    final tempMessage = Message(
      id: 'temp_${DateTime.now().millisecondsSinceEpoch}',
      senderId: _currentUserId ?? 'me',
      content: content,
      createdAt: DateTime.now(),
      isMe: true,
    );

    setState(() {
      _messages.insert(0, tempMessage);
    });

    // Send via WebSocket (real-time) — the gateway will broadcast new_message
    // back to the room, including this sender, which we de-dup above
    final socketService = ref.read(socketServiceProvider);
    if (socketService.isConnected) {
      socketService.sendMessage(widget.matchId, content);
    } else {
      // Fallback to REST
      _sendViaRest(content, tempMessage);
    }

    // Stop typing indicator
    socketService.sendTyping(widget.matchId, false);

    // Refresh conversations list so last message updates
    ref.invalidate(conversationsProvider);
  }

  Future<void> _sendViaRest(String content, Message tempMessage) async {
    try {
      await ref.read(dioProvider).post(
        '/chat/send',
        data: {
          'matchId': widget.matchId,
          'content': content,
        },
      );
      _loadMessages();
    } catch (e) {
      debugPrint('❌ Send message error: $e');
      if (mounted) {
        setState(() {
          _messages.remove(tempMessage);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send message')),
        );
      }
    }
  }

  Future<void> _markReadViaRest() async {
    try {
      await ref.read(dioProvider).post('/chat/read', data: {
        'matchId': widget.matchId,
      });
    } catch (e) {
      debugPrint('⚠️ Mark read REST fallback failed: $e');
    }
  }

  void _onTextChanged(String text) {
    final socketService = ref.read(socketServiceProvider);
    if (text.isNotEmpty) {
      socketService.sendTyping(widget.matchId, true);
      _typingTimer?.cancel();
      _typingTimer = Timer(const Duration(seconds: 2), () {
        socketService.sendTyping(widget.matchId, false);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        titleSpacing: 0,
        title: GestureDetector(
          onTap: _otherUser != null ? _viewProfile : null,
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor:
                    Theme.of(context).colorScheme.surfaceContainerHighest,
                backgroundImage: _otherUser?.profile?.photos.isNotEmpty == true
                    ? NetworkImage(_otherUser!.profile!.photos.first)
                    : null,
                child: _otherUser?.profile?.photos.isNotEmpty != true
                    ? Icon(Icons.person,
                        size: 18, color: Theme.of(context).colorScheme.outline)
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _otherUser?.displayName ?? 'Chat',
                      style: Theme.of(context).textTheme.titleLarge,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (_otherUserTyping)
                      Text(
                        'typing...',
                        style:
                            Theme.of(context).textTheme.labelMedium?.copyWith(
                                  color: Theme.of(context).primaryColor,
                                  fontWeight: FontWeight.w400,
                                ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (value) {
              switch (value) {
                case 'profile':
                  _viewProfile();
                  break;
                case 'report':
                  _showReportDialog();
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'profile',
                child: Row(
                  children: [
                    Icon(Icons.person_outline, size: 20),
                    SizedBox(width: 12),
                    Text('View Profile'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'report',
                child: Row(
                  children: [
                    const Icon(Icons.flag_outlined,
                        size: 20, color: AppTheme.error),
                    const SizedBox(width: 12),
                    Text(
                      'Report',
                      style: TextStyle(
                        color: AppTheme.error,
                        fontFamily:
                            Theme.of(context).textTheme.bodyMedium?.fontFamily,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
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
              top: -100,
              left: -40,
              child: _buildAura(
                  AppTheme.primaryColor.withValues(alpha: 0.12), 200),
            ),
            Positioned(
              bottom: -100,
              right: -40,
              child: _buildAura(
                  AppTheme.secondaryColor.withValues(alpha: 0.08), 180),
            ),
            SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: _isLoading
                        ? const Center(child: CircularProgressIndicator())
                        : _errorMessage != null
                            ? _buildError()
                            : _messages.isEmpty
                                ? _buildEmptyChat()
                                : ListView.builder(
                                    controller: _scrollController,
                                    reverse: true,
                                    padding: const EdgeInsets.all(16),
                                    itemCount: _messages.length,
                                    itemBuilder: (context, index) {
                                      return _buildMessageBubble(
                                          _messages[index]);
                                    },
                                  ),
                  ),
                  _buildMessageInput(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline,
              size: 60, color: Theme.of(context).colorScheme.error),
          const SizedBox(height: 16),
          Text(_errorMessage ?? 'Something went wrong'),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () {
              setState(() => _isLoading = true);
              _loadMessages();
            },
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyChat() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.chat_bubble_outline,
                size: 60, color: Theme.of(context).colorScheme.outline),
            const SizedBox(height: 16),
            Text(
              'Start the conversation!',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 20),
            // Safety tip card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context)
                    .colorScheme
                    .primaryContainer
                    .withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(Icons.shield_rounded,
                          size: 20,
                          color: Theme.of(context).colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        'Safety Tips',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Keep conversations on the app. '
                    'Never share financial details or send money to someone you haven\'t met.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          height: 1.4,
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

  Widget _buildMessageBubble(Message message) {
    final isMe = message.isMe;

    return Column(
      crossAxisAlignment:
          isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        // Warning banner for flagged messages (only show for received messages)
        if (message.warningType != null && !isMe)
          Container(
            margin: const EdgeInsets.only(bottom: 4),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.78,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF3CD),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.warning_amber_rounded,
                    size: 16, color: Color(0xFF856404)),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    _getWarningText(message.warningType!),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFF856404),
                        ),
                  ),
                ),
              ],
            ),
          ),
        Align(
          alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: isMe
                  ? Theme.of(context).primaryColor
                  : Theme.of(context).colorScheme.surfaceContainerHigh,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(4),
                topRight: const Radius.circular(4),
                bottomLeft: Radius.circular(isMe ? 4 : 2),
                bottomRight: Radius.circular(isMe ? 2 : 4),
              ),
              boxShadow: isMe
                  ? AppTheme.neonGlow(AppTheme.primaryColor,
                      blur: 14, opacity: 0.12)
                  : null,
            ),
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.75,
            ),
            child: Text(
              message.content,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: isMe
                        ? Colors.white
                        : Theme.of(context).colorScheme.onSurface,
                  ),
            ),
          ),
        ),
      ],
    );
  }

  String _getWarningText(String warningType) {
    switch (warningType) {
      case 'external_link':
        return 'Be cautious \u2014 this message contains an external link';
      case 'phone_number':
        return 'Sharing phone numbers early can be risky';
      case 'financial':
        return 'Never send money to someone you haven\'t met';
      default:
        return 'Be cautious with this message';
    }
  }

  Widget _buildMessageInput() {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 10),
        decoration: BoxDecoration(
          color: Theme.of(context)
              .colorScheme
              .surfaceContainerLow
              .withValues(alpha: 0.92),
        ),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _messageController,
                onChanged: _onTextChanged,
                decoration: const InputDecoration(
                  hintText: 'Type a message...',
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 10,
                  ),
                ),
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendMessage(),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor,
                shape: BoxShape.circle,
                boxShadow: AppTheme.neonGlow(Theme.of(context).primaryColor,
                    blur: 16, opacity: 0.18),
              ),
              child: IconButton(
                icon:
                    const Icon(Icons.arrow_upward_rounded, color: Colors.white),
                onPressed: _sendMessage,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    // Leave room and clean up listeners
    final socketService = ref.read(socketServiceProvider);
    socketService.leaveRoom(widget.matchId);
    socketService.off('new_message');
    socketService.off('user_typing');
    socketService.off('messages_read');
    _typingTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();

    // Refresh conversations list so unread counts update when going back
    ref.invalidate(conversationsProvider);

    super.dispose();
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
