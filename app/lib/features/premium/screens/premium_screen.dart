import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/models/models.dart';

// Subscription status provider
final subscriptionProvider = FutureProvider<SubscriptionStatus>((ref) async {
  final response = await ref.read(dioProvider).get('/premium/status');
  return SubscriptionStatus.fromJson(response.data);
});

class PremiumScreen extends ConsumerWidget {
  const PremiumScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subscriptionAsync = ref.watch(subscriptionProvider);

    return Scaffold(
      body: subscriptionAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (status) => _buildContent(context, ref, status),
      ),
    );
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, SubscriptionStatus status) {
    return CustomScrollView(
      slivers: [
        // Header - MVP Beta Banner
        SliverAppBar(
          expandedHeight: 200,
          pinned: true,
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.green.shade600,
                    Colors.teal.shade400,
                  ],
                ),
              ),
              child: SafeArea(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'MVP BETA',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Icon(
                      Icons.celebration,
                      size: 60,
                      color: Colors.white,
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'All Features Free! 🎉',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Enjoy premium features during our beta',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withOpacity(0.9),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),

        // Features List
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Daily Limits Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.blue.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.info_outline, color: Colors.blue.shade700),
                          const SizedBox(width: 8),
                          Text(
                            'Daily Limits',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.blue.shade700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildLimitRow(Icons.swipe, 'Swipes', '${status.features.swipesPerDay}/day'),
                      const SizedBox(height: 8),
                      _buildLimitRow(Icons.star, 'Super Likes', '${status.features.superLikesPerDay}/day'),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // Available Features
                const Text(
                  'Your Features',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),

                ..._buildFeaturesList(status.features),

                const SizedBox(height: 32),

                // Premium Coming Soon Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.purple.shade100, Colors.pink.shade100],
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Column(
                    children: [
                      Icon(Icons.workspace_premium, size: 40, color: Colors.purple),
                      SizedBox(height: 12),
                      Text(
                        'Premium Coming Soon',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'We\'re working on premium features with unlimited access. Stay tuned!',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.black87),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLimitRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Colors.blue.shade600),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontSize: 14)),
        const Spacer(),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.blue.shade700,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ),
      ],
    );
  }

  List<Widget> _buildFeaturesList(PlanFeatures features) {
    final featureItems = [
      {
        'icon': Icons.swipe,
        'title': '${features.swipesPerDay} Swipes Daily',
        'subtitle': 'Discover new people every day',
        'isEnabled': true,
      },
      {
        'icon': Icons.star,
        'title': '${features.superLikesPerDay} Super Likes Daily',
        'subtitle': 'Stand out to someone special',
        'isEnabled': true,
      },
      {
        'icon': Icons.visibility,
        'title': 'See Who Liked You',
        'subtitle': 'Know who\'s interested',
        'isEnabled': features.seeWhoLiked,
      },
      {
        'icon': Icons.undo,
        'title': 'Undo Last Swipe',
        'subtitle': 'Made a mistake? Fix it!',
        'isEnabled': features.undoSwipe,
      },
      {
        'icon': Icons.done_all,
        'title': 'Read Receipts',
        'subtitle': 'Know when messages are read',
        'isEnabled': features.readReceipts,
      },
      {
        'icon': Icons.bolt,
        'title': 'Priority in Discovery',
        'subtitle': 'Get seen by more people',
        'isEnabled': features.priorityDiscovery,
      },
      {
        'icon': Icons.block,
        'title': 'No Ads',
        'subtitle': 'Ad-free experience',
        'isEnabled': features.noAds,
      },
    ];

    return featureItems.map((item) {
      final isEnabled = item['isEnabled'] as bool;
      return ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isEnabled
                ? Colors.green.withOpacity(0.1)
                : Colors.grey.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            item['icon'] as IconData,
            color: isEnabled ? Colors.green : Colors.grey,
          ),
        ),
        title: Text(item['title'] as String),
        subtitle: Text(item['subtitle'] as String),
        trailing: Icon(
          isEnabled ? Icons.check_circle : Icons.lock,
          color: isEnabled ? Colors.green : Colors.grey,
        ),
      );
    }).toList();
  }
}

