import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../api/api_client.dart';

final socketServiceProvider = Provider<SocketService>((ref) {
  final service = SocketService(ref);
  ref.onDispose(() => service.disconnect());
  return service;
});

class SocketService {
  final Ref _ref;
  io.Socket? _socket;
  bool _isConnected = false;

  SocketService(this._ref);

  bool get isConnected => _isConnected;
  io.Socket? get socket => _socket;

  /// Connect to the chat WebSocket namespace.
  void connect() {
    if (_isConnected && _socket != null) return;

    if (_socket != null && !_isConnected) {
      debugPrint('🔌 Socket: Reusing existing socket for reconnect');
      _socket!.connect();
      return;
    }

    final token = _ref.read(authTokenProvider);
    if (token == null) {
      debugPrint('🔌 Socket: No token, skipping connect');
      return;
    }

    debugPrint('🔌 Socket: Connecting to $wsUrl/chat ...');

    _socket = io.io(
      '$wsUrl/chat',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .disableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(10)
          .setReconnectionDelay(2000)
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
      debugPrint('✅ Socket: Connected');
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      debugPrint('🔌 Socket: Disconnected');
    });

    _socket!.onConnectError((err) {
      _isConnected = false;
      debugPrint('❌ Socket: Connection error: $err');
    });

    _socket!.onError((err) {
      debugPrint('❌ Socket: Error: $err');
    });

    _socket!.connect();
  }

  /// Disconnect from the WebSocket.
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    debugPrint('🔌 Socket: Disposed');
  }

  /// Join a chat room for a specific match.
  void joinRoom(String matchId) {
    _socket?.emit('join_room', {'matchId': matchId});
    debugPrint('📫 Socket: Joining room $matchId');
  }

  /// Run immediately if connected, otherwise once on connect.
  void whenConnected(VoidCallback callback) {
    if (_isConnected) {
      callback();
      return;
    }

    _socket?.once('connected', (_) {
      callback();
    });
  }

  /// Leave a chat room.
  void leaveRoom(String matchId) {
    _socket?.emit('leave_room', {'matchId': matchId});
    debugPrint('📭 Socket: Leaving room $matchId');
  }

  /// Send a message via WebSocket.
  void sendMessage(String matchId, String content) {
    _socket?.emit('send_message', {
      'matchId': matchId,
      'content': content,
    });
  }

  /// Send typing indicator.
  void sendTyping(String matchId, bool isTyping) {
    _socket?.emit('typing', {
      'matchId': matchId,
      'isTyping': isTyping,
    });
  }

  /// Mark messages as read.
  void markRead(String matchId) {
    _socket?.emit('mark_read', {'matchId': matchId});
  }

  /// Listen for new messages.
  void onNewMessage(void Function(Map<String, dynamic> data) callback) {
    _socket?.on('new_message', (data) {
      debugPrint('📩 Socket: new_message received');
      callback(Map<String, dynamic>.from(data));
    });
  }

  /// Listen for typing events.
  void onUserTyping(void Function(Map<String, dynamic> data) callback) {
    _socket?.on('user_typing', (data) {
      callback(Map<String, dynamic>.from(data));
    });
  }

  /// Listen for read receipt events.
  void onMessagesRead(void Function(Map<String, dynamic> data) callback) {
    _socket?.on('messages_read', (data) {
      callback(Map<String, dynamic>.from(data));
    });
  }

  /// Remove all listeners for an event.
  void off(String event) {
    _socket?.off(event);
  }
}
