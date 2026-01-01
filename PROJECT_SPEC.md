# 💕 LiveConnect - Dating App with Safety-First Design

> A cross-platform dating application focused on genuine connections, user safety, and intent-based matching. Built with Flutter, NestJS, and advanced safety verification.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [MVP Features](#mvp-features)
4. [Safety Score System](#safety-score-system)
5. [Intent-First Matching](#intent-first-matching)
6. [Location-Based Discovery](#location-based-discovery)
7. [Match Quality Logic](#match-quality-logic)
8. [Free vs Premium Features](#free-vs-premium-features)
9. [Database Schema](#database-schema)
10. [API Endpoints](#api-endpoints)
11. [Progress Tracker](#progress-tracker)

---

## 🎯 Project Overview

**LiveConnect** is a safety-first dating application designed specifically for the Indian market, addressing key pain points:
- Fake profiles and scammers
- Mismatched intentions between users
- Safety concerns, especially for women
- Low-quality conversations ("Hey/Hi" culture)

### Core Philosophy
- **Safety First**: AI-verified profiles, safety scores, anti-stalking measures
- **Intent Clarity**: No cross-intent matching, reducing 70% of frustration
- **Quality over Quantity**: Compatibility-first discovery, not proximity-first
- **Respectful Interactions**: Soft signals before messaging, no spam

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Mobile** | Flutter | Cross-platform iOS/Android |
| **Backend** | NestJS (Node.js + TypeScript) | API server |
| **Database** | PostgreSQL | Primary data store |
| **Cache** | Redis | Sessions, real-time data, rate limiting |
| **Real-time** | Socket.io | Chat & notifications |
| **Video Verification** | Agora.io | Safety score video verification |
| **Payments** | RevenueCat | In-app purchases |
| **Maps** | Google Maps / Mapbox | Location-based discovery |
| **Storage** | AWS S3 / CloudFlare R2 | Profile photos |
| **Push Notifications** | Firebase Cloud Messaging | Alerts |

---

## ✨ MVP Features

### 1. 🔐 Authentication & Onboarding

| Feature | Description | Priority |
|---------|-------------|----------|
| Phone/Email signup | OTP-based verification | P0 |
| Intent selection | Mandatory before profile creation | P0 |
| Profile creation | Photos, bio, interests | P0 |
| Safety verification | AI video verification for safety score | P0 |

---

### 2. 👤 User Profiles

| Feature | Description | Priority |
|---------|-------------|----------|
| Profile photos | Up to 6 photos | P0 |
| Bio section | About me, looking for | P0 |
| Interest tags | Hobbies, preferences | P0 |
| Intent badge | Clearly displayed intent | P0 |
| Safety score | Verified badge with score | P0 |
| Last active | Configurable visibility | P1 |

---

### 3. 👆 Swipe & Match System

| Feature | Description | Priority |
|---------|-------------|----------|
| Swipe right | Like a profile | P0 |
| Swipe left | Pass on a profile | P0 |
| Super like | Premium feature | P1 |
| Mutual match | Both liked = match | P0 |
| Match notification | Push + in-app | P0 |
| Undo swipe | Premium feature | P1 |

---

### 4. 🔍 Profile Filtering

| Filter | Free Users | Premium Users |
|--------|------------|---------------|
| Age range | ✅ | ✅ |
| Distance | Up to 30km | 1-100km configurable |
| Intent | ✅ (same intent only) | ✅ |
| Safety score | Minimum 70% only | Any minimum |
| Last active | ❌ | ✅ |
| Interests | Basic | Advanced |

---

### 5. 💬 Chat System (Text Only for MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| Text messaging | Basic text chat | P0 |
| Read receipts | Seen indicators | P1 |
| Typing indicator | Real-time typing status | P1 |
| Message timestamps | When sent | P0 |
| Chat history | Persistent storage | P0 |
| Block user | Safety feature | P0 |
| Report user | Safety feature | P0 |

> **MVP Scope**: No photos, videos, or voice/video calls in chat.

---

### 6. 🎮 Micro-Dates (Conversation Starters)

Instead of awkward "Hey/Hi", the app starts conversations with guided mini-experiences:

| Game | Description |
|------|-------------|
| **2 Truths & a Lie** | Each person shares 3 statements, guess the lie |
| **Would You Rather (Deep)** | Meaningful choice questions |
| **Perfect Sunday** | Describe your ideal day |
| **Travel Dreams** | Share bucket list destinations |
| **Food Wars** | Debate food preferences |

**How it works:**
1. Match is made
2. App presents random micro-date game
3. Both users complete their answers
4. Answers revealed simultaneously
5. Chat unlocks after completing first game

---

## 🛡️ Safety Score System

### Real Safety Score (0-100%)

**Problem Solved:** Fake profiles, married people, scammers are rampant in India.

### Safety Score Components

| Component | Weight | Description |
|-----------|--------|-------------|
| **AI Video Verification** | 40% | Real-time pronunciation test |
| **Profile Completeness** | 15% | Photos, bio, interests |
| **Past Reports** | 20% | Negative reports reduce score |
| **Chat Behavior** | 15% | Long-term interaction patterns |
| **Account Age** | 10% | Older verified accounts score higher |

---

### � AI Video Verification Process

```
┌─────────────────────────────────────────────────────┐
│               VIDEO VERIFICATION FLOW               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. User clicks "Verify My Profile"                 │
│                        ↓                            │
│  2. App displays random text phrase                 │
│     Example: "Today is Saturday December 28"        │
│                        ↓                            │
│  3. User turns on camera (Agora.io)                 │
│                        ↓                            │
│  4. User reads the phrase aloud                     │
│                        ↓                            │
│  5. AI verification checks:                         │
│     ├── Speech-to-text matches displayed phrase     │
│     ├── Face is visible and consistent              │
│     ├── Liveness detection (blinking, head turn)    │
│     └── Face matches profile photos                 │
│                        ↓                            │
│  6. Score assigned + "Verified" badge               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Technical Implementation

| Component | Service | Purpose |
|-----------|---------|---------|
| Video capture | Agora.io SDK | Real-time video stream |
| Speech-to-text | Google Speech API / Whisper | Convert speech to text |
| Liveness detection | Google ML Kit / AWS Rekognition | Ensure real person |
| Face matching | AWS Rekognition / FaceNet | Match with profile photos |

### Verification Phrases (Examples)
- Dynamic: "Today is [day] [date] [month]"
- Random words: "Purple elephant dancing slowly"
- Numbers: "My verification code is 7 4 2 9"

---

## 🎯 Intent-First Matching

### Problem Solved
People are tired of matching with someone who wants something completely different.

### Available Intents

| Intent | Icon | Description |
|--------|------|-------------|
| 💍 Marriage | Ring | Looking for life partner |
| ❤️ Long-term | Heart | Serious relationship |
| 🌸 Short-term | Flower | Casual dating |
| 🤝 Companionship | Handshake | Emotional support, friendship |

### Rules

| Rule | Description |
|------|-------------|
| **Mandatory Selection** | Must pick intent before profile creation |
| **No Cross-Intent** | Only match with same intent users |
| **Change Limit** | Can change intent once every 30 days |
| **Visibility** | Intent shown prominently on profile |

### Monetization
- **Paid Intent Switch**: ₹99 for immediate intent change (bypass 30-day limit)
- **Serious Intent Badge**: ₹299/month verified badge for marriage/long-term intents

---

## 🗺️ Location-Based Discovery (Map Radar)

### Map Discovery Feature

```
┌─────────────────────────────────────────────────────┐
│                    MAP RADAR VIEW                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│         ●        ○                                  │
│              ●                  ○                   │
│     ○                    ●                          │
│                  👤                                 │
│              (You)           ●                      │
│         ●              ○                            │
│                   ●                                 │
│     ○                        ●                      │
│                                                     │
│  ● = High compatibility   ○ = Medium compatibility │
│                                                     │
│  Tap on profile dot to see quick preview           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🆓 Free vs Premium Features

### 🆓 Free Users

| Feature | Limitation |
|---------|------------|
| Map radius | Up to 30 km |
| Profiles shown | Max 5 on map |
| Compatibility shown | Only up to 70% |
| Profile info | First name initial, age range |
| Interest tags | Blurred |
| Swipes per day | 10 |
| Messages | Unlimited to matches |

### 💎 Premium Users (₹499/month or ₹2,999/year)

| Feature | Access |
|---------|--------|
| Map radius | 1-100 km configurable |
| Profiles shown | Unlimited |
| Compatibility | Full percentage |
| Profile info | Full details |
| Filters | Intent, last active, safety score |
| Ping nearby | Non-intrusive signal |
| Swipes per day | Unlimited |
| Super likes | 5 per day |
| Undo swipes | ✅ |
| See who liked you | ✅ |
| Read receipts control | ✅ |

---

## �‍🦰 Safety-First Features (Especially for Women)

### Default Settings for Women

| Setting | Default | Changeable |
|---------|---------|------------|
| Show on map | **OFF** | Yes, explicit enable required |
| Location sharing | Approximate only | Cannot share exact |
| Distance shown | "X km away" | Not exact address |

### Anti-Stalking Measures

| Measure | Description |
|---------|-------------|
| **No live tracking** | Location never updates in real-time |
| **Update interval** | Location refreshes every 15-30 minutes |
| **Random jitter** | ±200-500 meters offset added |
| **Map throttling** | Too frequent map opens = temporary block |
| **App closed location** | Shows last known location only |

### Stealth/Invisible Mode

| Mode | Description |
|------|-------------|
| **Go Invisible** | Disappear from all discovery |
| **App-only visibility** | Visible only while app is open |
| **Auto-disable timers** | Turn off after 30min / 1hr / app background |
| **Quick toggle** | One tap to go dark |

---

## 🧠 Match Quality Logic

### Discovery Priority (NOT proximity-first)

```
Priority Order:
1. Compatibility Score (interests, preferences)
2. Intent Match (same intent)
3. Safety Score (minimum threshold)
4. Distance (last factor)
```

### Why This Order?
- Avoids creepy "who is closest" behavior
- Prevents pickup-artist misuse
- Prioritizes meaningful connections
- Distance is convenience, not compatibility

---

## 🔔 Interaction Flow (Non-Creepy)

### Soft Signals System

❌ **NO direct messaging from map/discovery**
✅ **Use soft signals first:**

| Signal | Meaning | Action |
|--------|---------|--------|
| 👋 Wave | "I noticed you" | Soft interest |
| ❤️ Interested | "I'd like to connect" | Strong interest |
| 👀 Viewed | Auto-sent when profile viewed | Passive |

### Flow to Chat

```
User A sends 👋 Wave
         ↓
User B sees "Someone waved at you"
         ↓
User B can:
├── Wave back 👋 → Mutual signal, chat opens
├── Send ❤️ Interested → Chat opens
└── Ignore → Nothing happens
         ↓
Only mutual signals open chat
         ↓
Micro-date game starts first conversation
```

---

## � Database Schema (Core Tables)

```sql
-- Core Tables Overview

users
├── id (UUID)
├── phone / email
├── name
├── date_of_birth
├── gender
├── intent (enum: marriage, long_term, short_term, companionship)
├── intent_changed_at
├── safety_score (0-100)
├── is_verified
├── last_active_at
├── location (PostGIS POINT)
├── location_updated_at
├── show_on_map (boolean)
├── is_invisible (boolean)
├── invisible_until
└── created_at

profiles
├── user_id (FK)
├── bio
├── looking_for
├── height
├── occupation
├── education
└── photos (array)

interests
├── user_id (FK)
└── interest_tags (array)

swipes
├── swiper_id (FK)
├── swiped_id (FK)
├── action (like, pass, super_like)
└── created_at

matches
├── user1_id (FK)
├── user2_id (FK)
├── matched_at
├── micro_date_completed (boolean)
└── chat_unlocked (boolean)

messages
├── match_id (FK)
├── sender_id (FK)
├── content (text)
├── read_at
└── created_at

signals
├── sender_id (FK)
├── receiver_id (FK)
├── signal_type (wave, interested, viewed)
└── created_at

reports
├── reporter_id (FK)
├── reported_id (FK)
├── reason
├── description
└── created_at

safety_verifications
├── user_id (FK)
├── video_url
├── phrase_shown
├── phrase_detected
├── face_match_score
├── liveness_score
├── verified_at
└── verification_status

subscriptions
├── user_id (FK)
├── plan (free, premium)
├── started_at
├── expires_at
└── revenue_cat_id
```

---

## 🔌 API Endpoints (MVP)

### Authentication
```
POST /auth/send-otp
POST /auth/verify-otp
POST /auth/refresh-token
```

### Onboarding
```
POST /onboarding/intent          # Set intent
POST /onboarding/profile         # Create profile
POST /onboarding/photos          # Upload photos
POST /onboarding/interests       # Set interests
```

### Discovery
```
GET  /discovery/profiles         # Get swipeable profiles
GET  /discovery/map              # Get map radar profiles
POST /discovery/swipe            # Swipe action
POST /discovery/signal           # Send soft signal
```

### Matches
```
GET  /matches                    # Get all matches
GET  /matches/:id                # Get match details
POST /matches/:id/micro-date     # Submit micro-date answers
```

### Chat
```
GET  /chat/:matchId/messages     # Get messages
POST /chat/:matchId/messages     # Send message
```

### Profile
```
GET  /profile                    # Get own profile
PUT  /profile                    # Update profile
PUT  /profile/location           # Update location
PUT  /profile/visibility         # Update visibility settings
```

### Safety
```
POST /safety/start-verification  # Start video verification
POST /safety/complete-verification
GET  /safety/score               # Get safety score breakdown
POST /safety/report              # Report a user
```

### Subscription
```
GET  /subscription               # Get current plan
POST /subscription/verify        # Verify RevenueCat purchase
```

---

## ✅ Progress Tracker

### MVP Phases

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | 🟡 In Progress | Project setup & documentation |
| Phase 2 | ⬜ Pending | Backend setup (NestJS, PostgreSQL) |
| Phase 3 | ⬜ Pending | Authentication & onboarding |
| Phase 4 | ⬜ Pending | User profiles & interests |
| Phase 5 | ⬜ Pending | Swipe & matching system |
| Phase 6 | ⬜ Pending | Safety score & verification |
| Phase 7 | ⬜ Pending | Location & map radar |
| Phase 8 | ⬜ Pending | Chat system |
| Phase 9 | ⬜ Pending | Micro-dates |
| Phase 10 | ⬜ Pending | Premium & RevenueCat |
| Phase 11 | ⬜ Pending | Flutter mobile app |
| Phase 12 | ⬜ Pending | Testing & polish |

### Completed
- [x] Project specification document
- [x] Feature requirements defined
- [x] Safety system designed
- [x] Database schema drafted
- [x] API endpoints planned

### Technology Decisions Made
- ✅ **Mobile**: Flutter
- ✅ **Backend**: NestJS
- ✅ **Database**: PostgreSQL
- ✅ **Video**: Agora.io
- ✅ **Payments**: RevenueCat
- ✅ **Real-time**: Socket.io

---

## 📝 Key Design Decisions

### Why Flutter over React Native?
- Better performance for animations (swipe gestures, map interactions)
- Consistent UI across platforms
- Strong support for custom UI components
- Better for GPU-intensive features (map, animations)

### Why Intent-First?
- Eliminates 70% of user frustration
- Creates focused user pools
- Enables clearer monetization
- Builds trust and credibility

### Why Safety Score?
- Critical for Indian market (fake profiles epidemic)
- Differentiator from competitors
- Builds user trust
- Enables quality-based matching

### Why Soft Signals?
- Reduces spam and harassment
- Makes interactions feel respectful
- Especially important for women's safety
- Creates anticipation and excitement

---

*Last Updated: December 28, 2024*
