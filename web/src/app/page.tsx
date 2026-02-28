import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="text-2xl font-bold text-rose-600">LiveConnect</div>
        <div className="flex items-center gap-6">
          <Link href="#features" className="text-gray-600 hover:text-rose-600 transition">
            Features
          </Link>
          <Link href="#safety" className="text-gray-600 hover:text-rose-600 transition">
            Safety
          </Link>
          <Link href="#how-it-works" className="text-gray-600 hover:text-rose-600 transition">
            How It Works
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
          >
            Admin
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Real People. Real Connections.
          <br />
          <span className="text-rose-600">Real Trust.</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          LiveConnect uses verified profiles and trust scores to help you find
          genuine connections. No fake profiles, no games — just real people
          looking for the same things you are.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="#"
            className="px-8 py-4 bg-rose-600 text-white rounded-xl text-lg font-semibold hover:bg-rose-700 transition shadow-lg"
          >
            Download for Android
          </a>
          <a
            href="#"
            className="px-8 py-4 bg-gray-900 text-white rounded-xl text-lg font-semibold hover:bg-gray-800 transition shadow-lg"
          >
            Download for iOS
          </a>
        </div>
      </section>

      {/* Trust Score Section */}
      <section id="safety" className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          Trust Score: Your Safety Shield
        </h2>
        <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
          Every profile gets a transparent trust score (0-100) so you know who
          you&apos;re talking to. No more guessing if someone is real.
        </p>
        <div className="grid md:grid-cols-5 gap-6">
          {[
            { label: "Video Verification", points: "35 pts", desc: "Face + liveness check" },
            { label: "Profile Quality", points: "30 pts", desc: "Photos, bio, interests" },
            { label: "Identity Check", points: "15 pts", desc: "Phone & email verified" },
            { label: "Account Age", points: "10 pts", desc: "Time builds trust" },
            { label: "Community Trust", points: "-30 pts", desc: "Reports reduce score" },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl p-6 shadow-sm text-center">
              <div className="text-2xl font-bold text-rose-600 mb-2">{item.points}</div>
              <div className="font-semibold text-gray-900 mb-1">{item.label}</div>
              <div className="text-sm text-gray-500">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why LiveConnect?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Intent-Based Matching",
                desc: "Only match with people who want the same thing — marriage, long-term, short-term, or companionship.",
              },
              {
                title: "Compatibility First",
                desc: "Profiles are shown based on compatibility, not proximity. The right person matters more than the nearest one.",
              },
              {
                title: "Soft Signals",
                desc: "Wave or show interest before messaging. No unsolicited messages — just respectful, mutual connections.",
              },
              {
                title: "Micro-Dates",
                desc: "Skip the awkward 'Hey'. Start conversations with fun games like Two Truths & a Lie.",
              },
              {
                title: "Location Privacy",
                desc: "Your exact location is never shared. We add random offsets and let you control your map visibility.",
              },
              {
                title: "Manual Verification",
                desc: "Every verification is reviewed by our team. Real humans checking for real people.",
              },
            ].map((feature) => (
              <div key={feature.title} className="p-6 rounded-xl border border-gray-100 hover:shadow-md transition">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: "1", title: "Sign Up & Verify", desc: "Create your account and verify your identity to build trust." },
            { step: "2", title: "Set Your Intent", desc: "Tell us what you're looking for — we'll only show matching intents." },
            { step: "3", title: "Discover & Connect", desc: "Swipe, wave, or explore the map to find compatible people." },
            { step: "4", title: "Play & Chat", desc: "Complete a fun micro-date game, then start chatting for real." },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-rose-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-xl font-bold text-white mb-4">LiveConnect</div>
              <p className="text-sm">Safety-first dating for genuine connections.</p>
            </div>
            <div>
              <div className="font-semibold text-white mb-4">Links</div>
              <div className="space-y-2 text-sm">
                <div><Link href="#" className="hover:text-white transition">Privacy Policy</Link></div>
                <div><Link href="#" className="hover:text-white transition">Terms of Service</Link></div>
                <div><Link href="#" className="hover:text-white transition">Contact Us</Link></div>
              </div>
            </div>
            <div>
              <div className="font-semibold text-white mb-4">Download</div>
              <div className="space-y-2 text-sm">
                <div><Link href="#" className="hover:text-white transition">Google Play Store</Link></div>
                <div><Link href="#" className="hover:text-white transition">Apple App Store</Link></div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            &copy; 2025 LiveConnect. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
