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
        // Header
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
                    Theme.of(context).primaryColor,
                    Colors.purple,
                  ],
                ),
              ),
              child: SafeArea(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.workspace_premium,
                      size: 60,
                      color: Colors.white,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      status.canUpgrade ? 'Upgrade to Premium' : 'You\'re Premium! 👑',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),

        // Current Plan
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Current Plan Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle, color: Colors.green),
                      const SizedBox(width: 12),
                      Text(
                        'Current Plan: ${status.currentPlan.toUpperCase()}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (status.daysRemaining != null) ...[
                        const Spacer(),
                        Text(
                          '${status.daysRemaining} days left',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // Features Comparison
                const Text(
                  'Premium Features',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),

                ..._buildFeaturesList(status.features),

                const SizedBox(height: 32),

                // Pricing
                if (status.canUpgrade) ...[
                  const Text(
                    'Choose Your Plan',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildPricingCards(context, ref),
                ],
              ],
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
        'title': 'Unlimited Swipes',
        'subtitle': 'vs ${features.swipesPerDay}/day for free',
        'isPremium': features.swipesPerDay > 100,
      },
      {
        'icon': Icons.star,
        'title': '5 Super Likes/Day',
        'subtitle': 'vs ${features.superLikesPerDay}/day for free',
        'isPremium': features.superLikesPerDay > 1,
      },
      {
        'icon': Icons.visibility,
        'title': 'See Who Liked You',
        'subtitle': 'Know who\'s interested',
        'isPremium': features.seeWhoLiked,
      },
      {
        'icon': Icons.undo,
        'title': 'Undo Last Swipe',
        'subtitle': 'Made a mistake? Fix it!',
        'isPremium': features.undoSwipe,
      },
      {
        'icon': Icons.done_all,
        'title': 'Read Receipts',
        'subtitle': 'Know when messages are read',
        'isPremium': features.readReceipts,
      },
      {
        'icon': Icons.bolt,
        'title': 'Priority in Discovery',
        'subtitle': 'Get seen by more people',
        'isPremium': features.priorityDiscovery,
      },
      {
        'icon': Icons.block,
        'title': 'No Ads',
        'subtitle': 'Ad-free experience',
        'isPremium': features.noAds,
      },
    ];

    return featureItems.map((item) {
      return ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: (item['isPremium'] as bool)
                ? Colors.green.withOpacity(0.1)
                : Colors.grey.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            item['icon'] as IconData,
            color: (item['isPremium'] as bool) ? Colors.green : Colors.grey,
          ),
        ),
        title: Text(item['title'] as String),
        subtitle: Text(item['subtitle'] as String),
        trailing: Icon(
          (item['isPremium'] as bool) ? Icons.check : Icons.lock,
          color: (item['isPremium'] as bool) ? Colors.green : Colors.grey,
        ),
      );
    }).toList();
  }

  Widget _buildPricingCards(BuildContext context, WidgetRef ref) {
    return Column(
      children: [
        // Monthly
        _buildPlanCard(
          context,
          title: 'Monthly',
          price: '₹499',
          period: '/month',
          isPopular: false,
          onTap: () => _subscribe(context, ref, 'monthly'),
        ),
        const SizedBox(height: 12),
        // Yearly (Popular)
        _buildPlanCard(
          context,
          title: 'Yearly',
          price: '₹2,999',
          period: '/year',
          savings: 'Save 50%',
          isPopular: true,
          onTap: () => _subscribe(context, ref, 'yearly'),
        ),
      ],
    );
  }

  Widget _buildPlanCard(
    BuildContext context, {
    required String title,
    required String price,
    required String period,
    String? savings,
    required bool isPopular,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          border: Border.all(
            color: isPopular ? Theme.of(context).primaryColor : Colors.grey[300]!,
            width: isPopular ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (isPopular)
                        Container(
                          margin: const EdgeInsets.only(left: 8),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Theme.of(context).primaryColor,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Text(
                            'POPULAR',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                    ],
                  ),
                  if (savings != null)
                    Text(
                      savings,
                      style: const TextStyle(
                        color: Colors.green,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                ],
              ),
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  price,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  period,
                  style: TextStyle(
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _subscribe(BuildContext context, WidgetRef ref, String plan) async {
    // TODO: Integrate with RevenueCat
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('RevenueCat integration coming soon!'),
      ),
    );
  }
}
