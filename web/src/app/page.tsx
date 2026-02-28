"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/* ───── animation helpers ───── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const fadeLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0 },
};

const fadeRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1 },
};

/* ───── section wrapper ───── */
function AnimatedSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ================================================================
   LANDING PAGE
   ================================================================ */
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 overflow-x-hidden">
      {/* ────────── NAVIGATION ────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto"
      >
        <div className="text-2xl font-bold text-rose-600">LiveConnect</div>
        <div className="flex items-center gap-6">
          <Link
            href="#problem"
            className="hidden md:inline text-gray-600 hover:text-rose-600 transition"
          >
            Why Us
          </Link>
          <Link
            href="#safety"
            className="hidden md:inline text-gray-600 hover:text-rose-600 transition"
          >
            Trust Score
          </Link>
          <Link
            href="#features"
            className="hidden md:inline text-gray-600 hover:text-rose-600 transition"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="hidden md:inline text-gray-600 hover:text-rose-600 transition"
          >
            How It Works
          </Link>
          <a
            href="#download"
            className="px-5 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition text-sm font-medium"
          >
            Download App
          </a>
        </div>
      </motion.nav>

      {/* ────────── HERO ────────── */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-24 text-center overflow-hidden">
        {/* floating decorative elements */}
        <div className="floating-element absolute top-12 left-[10%] text-4xl select-none pointer-events-none opacity-20">
          💛
        </div>
        <div className="floating-element-slow absolute top-32 right-[12%] text-3xl select-none pointer-events-none opacity-20">
          🛡️
        </div>
        <div className="floating-element absolute bottom-20 left-[20%] text-3xl select-none pointer-events-none opacity-15">
          ✓
        </div>
        <div className="floating-element-slow absolute top-48 left-[70%] text-2xl select-none pointer-events-none opacity-15">
          💕
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight"
        >
          Find Someone Real.
          <br />
          <span className="text-rose-600">Not Another Catfish.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10"
        >
          India&apos;s first safety-first dating app. Every profile carries a
          transparent trust score so you never have to wonder if the person
          behind the screen is real.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <a
            href="#download"
            className="px-8 py-4 bg-rose-600 text-white rounded-xl text-lg font-semibold hover:bg-rose-700 transition shadow-lg hover:shadow-xl"
          >
            Download for Android
          </a>
          <a
            href="#download"
            className="px-8 py-4 bg-gray-900 text-white rounded-xl text-lg font-semibold hover:bg-gray-800 transition shadow-lg hover:shadow-xl"
          >
            Download for iOS
          </a>
        </motion.div>

        {/* stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="flex flex-wrap justify-center gap-8 mt-16 text-gray-500 text-sm font-medium"
        >
          <span>
            <strong className="text-gray-900 text-xl">10K+</strong>{" "}
            Verified Users
          </span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span>
            <strong className="text-gray-900 text-xl">50K+</strong>{" "}
            Matches Made
          </span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span>
            <strong className="text-gray-900 text-xl">99%</strong>{" "}
            Fake-Free
          </span>
        </motion.div>
      </section>

      {/* ────────── THE PROBLEM ────────── */}
      <AnimatedSection
        className="bg-gray-900 py-24 text-white"
      >
        <div id="problem" className="max-w-6xl mx-auto px-6">
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-center mb-4"
          >
            The Problem with Dating Apps in India
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-gray-400 text-center max-w-2xl mx-auto mb-14"
          >
            Every day, millions of Indians swipe through profiles that
            aren&apos;t real. The result? Wasted time, broken trust, and real
            financial damage.
          </motion.p>

          <motion.div
            variants={stagger}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: "🚫",
                title: "77% Fake Profiles",
                desc: "Most dating apps are plagued with fake accounts, catfish profiles, and stolen photos that waste your time.",
                color: "from-red-500/20 to-red-600/10",
              },
              {
                icon: "💸",
                title: "Romance Scams",
                desc: "1 in 7 Indians have lost money to online romance scams, with an average loss that can devastate families.",
                color: "from-amber-500/20 to-amber-600/10",
              },
              {
                icon: "👻",
                title: "Ghost Profiles",
                desc: "Matching with dead profiles and bots that never respond. A broken experience that erodes trust in online dating.",
                color: "from-purple-500/20 to-purple-600/10",
              },
            ].map((card) => (
              <motion.div
                key={card.title}
                variants={fadeLeft}
                whileHover={{ y: -6 }}
                className={`bg-gradient-to-br ${card.color} border border-white/10 rounded-2xl p-8 backdrop-blur-sm`}
              >
                <span className="text-4xl mb-4 block">{card.icon}</span>
                <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {card.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ────────── TRUST SCORE ────────── */}
      <AnimatedSection
        className="max-w-7xl mx-auto px-6 py-24"
      >
        <div id="safety">
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4"
          >
            Our Solution: The Trust Score
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-gray-600 text-center max-w-2xl mx-auto mb-14"
          >
            Every profile carries a transparent 0-100 score. You can see
            exactly how trustworthy someone is — and so can they see yours.
          </motion.p>

          {/* animated score circle */}
          <motion.div
            variants={scaleIn}
            className="flex justify-center mb-14"
          >
            <div className="trust-score-circle relative w-36 h-36 rounded-full flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600 shadow-xl">
              <div className="absolute inset-1 bg-white rounded-full" />
              <span className="relative text-4xl font-extrabold text-rose-600">
                85
              </span>
            </div>
          </motion.div>

          <motion.div
            variants={stagger}
            className="grid md:grid-cols-3 lg:grid-cols-5 gap-6"
          >
            {[
              {
                label: "Video Verification",
                points: "35 pts",
                desc: "Face + liveness check by our team",
                emoji: "🎥",
              },
              {
                label: "Profile Quality",
                points: "30 pts",
                desc: "Photos, bio, and interests",
                emoji: "✨",
              },
              {
                label: "Identity Check",
                points: "15 pts",
                desc: "Phone & email verified",
                emoji: "🔐",
              },
              {
                label: "Account Age",
                points: "10 pts",
                desc: "Time builds trust naturally",
                emoji: "📅",
              },
              {
                label: "Community Trust",
                points: "-30 pts",
                desc: "Reports reduce your score",
                emoji: "🤝",
              },
            ].map((item) => (
              <motion.div
                key={item.label}
                variants={fadeUp}
                whileHover={{ y: -4, boxShadow: "0 12px 24px rgba(0,0,0,0.08)" }}
                className="bg-white rounded-2xl p-6 shadow-sm text-center border border-gray-100 transition-shadow"
              >
                <span className="text-3xl block mb-3">{item.emoji}</span>
                <div className="text-2xl font-bold text-rose-600 mb-1">
                  {item.points}
                </div>
                <div className="font-semibold text-gray-900 mb-1 text-sm">
                  {item.label}
                </div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ────────── FEATURES ────────── */}
      <AnimatedSection className="bg-white py-24">
        <div id="features" className="max-w-7xl mx-auto px-6">
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4"
          >
            Why LiveConnect?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-gray-600 text-center max-w-2xl mx-auto mb-14"
          >
            Designed from the ground up for the Indian dating experience.
            Every feature puts your safety and genuine connection first.
          </motion.p>

          <motion.div
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              {
                title: "Intent-Based Matching",
                desc: "Only match with people who want the same thing — marriage, long-term, short-term, or companionship.",
                emoji: "🎯",
                dir: fadeLeft,
              },
              {
                title: "Compatibility First",
                desc: "Profiles shown based on compatibility, not proximity. The right person matters more than the nearest one.",
                emoji: "💫",
                dir: fadeUp,
              },
              {
                title: "Soft Signals",
                desc: "Wave or show interest before messaging. No unsolicited messages — just respectful, mutual connections.",
                emoji: "👋",
                dir: fadeRight,
              },
              {
                title: "Micro-Dates",
                desc: "Skip the awkward 'Hey'. Start conversations with fun games like Two Truths & a Lie.",
                emoji: "🎮",
                dir: fadeLeft,
              },
              {
                title: "Location Privacy",
                desc: "Your exact location is never shared. We add random offsets and let you control map visibility.",
                emoji: "📍",
                dir: fadeUp,
              },
              {
                title: "Human Verification",
                desc: "Every verification is reviewed by our team. Real humans checking for real people — no AI shortcuts.",
                emoji: "🧑‍💼",
                dir: fadeRight,
              },
            ].map((f) => (
              <motion.div
                key={f.title}
                variants={f.dir}
                whileHover={{ y: -6, boxShadow: "0 16px 32px rgba(0,0,0,0.06)" }}
                className="p-7 rounded-2xl border border-gray-100 bg-white hover:border-rose-100 transition-all"
              >
                <span className="text-3xl block mb-4">{f.emoji}</span>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ────────── HOW IT WORKS ────────── */}
      <AnimatedSection className="max-w-7xl mx-auto px-6 py-24">
        <div id="how-it-works">
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4"
          >
            How It Works
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-gray-600 text-center max-w-xl mx-auto mb-16"
          >
            Four simple steps to finding real connections.
          </motion.p>

          <motion.div
            variants={stagger}
            className="grid md:grid-cols-4 gap-8 relative"
          >
            {/* connecting line (desktop only) */}
            <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-rose-200 via-rose-400 to-rose-200" />

            {[
              {
                step: "1",
                title: "Sign Up & Verify",
                desc: "Create your account and verify your identity to start building trust.",
              },
              {
                step: "2",
                title: "Set Your Intent",
                desc: "Tell us what you're looking for — we'll only show people with matching intents.",
              },
              {
                step: "3",
                title: "Discover & Connect",
                desc: "Swipe through compatible profiles, wave, or explore the live map to find people near you.",
              },
              {
                step: "4",
                title: "Play & Chat",
                desc: "Complete a fun micro-date game together, then start chatting for real.",
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                className="text-center relative z-10"
              >
                <div className="step-pulse w-14 h-14 bg-rose-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-5 shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ────────── TESTIMONIALS ────────── */}
      <AnimatedSection className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4"
          >
            Real Stories, Real People
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-gray-600 text-center max-w-xl mx-auto mb-14"
          >
            Hear from people who found genuine connections on LiveConnect.
          </motion.p>

          <motion.div
            variants={stagger}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                quote:
                  "Finally an app where I feel safe. The trust score changed everything for me — I know who I'm talking to.",
                name: "Priya S.",
                location: "Mumbai",
                initials: "PS",
                color: "bg-rose-100 text-rose-600",
              },
              {
                quote:
                  "I was tired of fake profiles on other apps. LiveConnect's verification process made all the difference.",
                name: "Arjun K.",
                location: "Bangalore",
                initials: "AK",
                color: "bg-blue-100 text-blue-600",
              },
              {
                quote:
                  "The micro-dates feature is genius. No more awkward 'hey' — our first conversation was actually fun!",
                name: "Meera R.",
                location: "Delhi",
                initials: "MR",
                color: "bg-amber-100 text-amber-600",
              },
            ].map((t) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
              >
                <p className="text-gray-700 mb-6 leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-sm font-bold`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {t.name}
                    </div>
                    <div className="text-xs text-gray-500">{t.location}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ────────── CTA ────────── */}
      <AnimatedSection className="relative overflow-hidden">
        <div
          id="download"
          className="relative bg-gradient-to-br from-rose-600 to-pink-600 py-24 text-center"
        >
          {/* decorative particles */}
          <div className="floating-element absolute top-8 left-[8%] w-3 h-3 bg-white/20 rounded-full" />
          <div className="floating-element-slow absolute top-16 right-[15%] w-4 h-4 bg-white/15 rounded-full" />
          <div className="floating-element absolute bottom-12 left-[30%] w-2 h-2 bg-white/20 rounded-full" />
          <div className="floating-element-slow absolute bottom-20 right-[25%] w-3 h-3 bg-white/10 rounded-full" />

          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-5xl font-extrabold text-white mb-4 relative z-10"
          >
            Ready to Find Real Connections?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-rose-100 text-lg max-w-xl mx-auto mb-10 relative z-10"
          >
            Join thousands of verified Indians who chose trust over guesswork.
            Download LiveConnect today — it&apos;s completely free.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-4 justify-center relative z-10"
          >
            <a
              href="#"
              className="px-8 py-4 bg-white text-rose-600 rounded-xl text-lg font-bold hover:bg-gray-50 transition shadow-lg hover:shadow-xl"
            >
              Google Play Store
            </a>
            <a
              href="#"
              className="px-8 py-4 bg-gray-900 text-white rounded-xl text-lg font-bold hover:bg-gray-800 transition shadow-lg hover:shadow-xl"
            >
              Apple App Store
            </a>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ────────── FOOTER ────────── */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="bg-gray-900 text-gray-400 py-12"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-xl font-bold text-white mb-4">
                LiveConnect
              </div>
              <p className="text-sm leading-relaxed">
                India&apos;s safety-first dating app. Real people, real
                connections, real trust.
              </p>
            </div>
            <div>
              <div className="font-semibold text-white mb-4">Links</div>
              <div className="space-y-2 text-sm">
                <div>
                  <Link href="#" className="hover:text-white transition">
                    Privacy Policy
                  </Link>
                </div>
                <div>
                  <Link href="#" className="hover:text-white transition">
                    Terms of Service
                  </Link>
                </div>
                <div>
                  <Link href="#" className="hover:text-white transition">
                    Contact Us
                  </Link>
                </div>
              </div>
            </div>
            <div>
              <div className="font-semibold text-white mb-4">Download</div>
              <div className="space-y-2 text-sm">
                <div>
                  <Link href="#" className="hover:text-white transition">
                    Google Play Store
                  </Link>
                </div>
                <div>
                  <Link href="#" className="hover:text-white transition">
                    Apple App Store
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            &copy; 2025 LiveConnect. All rights reserved.
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
