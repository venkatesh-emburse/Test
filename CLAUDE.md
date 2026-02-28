# LiveConnect - Safety-First Dating App

## Project Overview

LiveConnect is a location-based dating app built for the Indian market. The core differentiator is a **Trust/Safety Score** system (0-100) that combats fake profiles, scammers, and gold diggers — a major problem in Indian dating apps. Users are matched by **intent** (marriage, long-term, short-term, companionship) and **compatibility**, not proximity.

**V1 is a free launch** — no premium plans, no payment processing. All features are available to all users with configurable daily limits.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | Flutter (Dart) — `app/` |
| Backend API | NestJS (TypeScript) — `backend/` |
| Landing Site + Admin | Next.js (TypeScript + Tailwind) — `web/` |
| Database | PostgreSQL + PostGIS (spatial queries) |
| ORM | TypeORM (synchronize: true in dev) |
| State Mgmt | Riverpod (Flutter) |
| Navigation | Go Router (Flutter) |
| HTTP Client | Dio with JWT interceptor |
| Real-time | Socket.io (chat) |
| Auth | Firebase Auth (Google Sign-In) + custom OTP + JWT |
| File Storage | Cloudinary (photos + verification videos) |
| Maps | OpenStreetMap via flutter_map |

## Project Structure

```
live-chat/
├── app/                              # Flutter mobile app
│   ├── lib/
│   │   ├── main.dart                 # Entry point (Firebase + Riverpod)
│   │   ├── core/
│   │   │   ├── api/api_client.dart   # Dio HTTP client, base URL config
│   │   │   ├── services/             # Firebase auth, upload service
│   │   │   ├── providers/            # Riverpod providers, Go Router
│   │   │   ├── models/               # Data models
│   │   │   └── utils/                # Theme, helpers
│   │   └── features/
│   │       ├── auth/screens/         # Login, OTP, onboarding
│   │       ├── discovery/screens/    # Swipe cards, profile details
│   │       ├── location/screens/     # Map radar
│   │       ├── chat/screens/         # Conversations, messages
│   │       ├── profile/screens/      # User profile, photo management
│   │       └── safety/screens/       # Safety score, video verification
│   └── pubspec.yaml
├── backend/                          # NestJS API
│   ├── src/
│   │   ├── app.module.ts             # Root module registration
│   │   ├── config/configuration.ts   # All config (DB, JWT, features)
│   │   ├── database/entities/        # TypeORM entities + enums
│   │   └── modules/
│   │       ├── auth/                 # OTP, Firebase, JWT tokens
│   │       ├── profile/              # User profiles, photos, interests
│   │       ├── discovery/            # Swipe, matching, compatibility
│   │       ├── location/             # PostGIS queries, nearby users
│   │       ├── chat/                 # Messages, Socket.io gateway
│   │       ├── signals/              # Wave, interested, viewed
│   │       ├── micro-dates/          # Conversation starter games
│   │       ├── safety/               # Verification, reports, blocks, admin review
│   │       └── upload/               # Cloudinary service
│   ├── docker-compose.yml
│   └── .env.example
├── web/                              # Next.js landing site + admin dashboard
│   └── src/app/
│       ├── page.tsx                  # Landing page
│       └── admin/                    # Admin dashboard
│           ├── layout.tsx            # Admin sidebar layout
│           ├── page.tsx              # Dashboard overview
│           ├── verifications/        # Review selfie/video verifications
│           ├── reports/              # Handle user reports
│           └── users/                # User management
├── PROJECT_SPEC.md                   # Full feature specification
└── DEVELOPER.md                      # Setup & development guide
```

## Trust/Safety Score System (Core Feature)

The safety score is a composite 0-100 score calculated in `backend/src/modules/safety/safety.service.ts` via `calculateSafetyScoreBreakdown()`.

### Components & Weights

| Component | Max Points | How It Works |
|-----------|-----------|--------------|
| **Selfie/Video Verification** | 35 | Manual admin review. User submits selfie with challenge code or records video. |
| **Profile Quality** | 30 | Photos (4 pts each, max 20) + bio length (5-10 pts) + interest tags (1 pt each, max 5) |
| **Identity Verification** | 15 | Phone verified (+10) + email verified (+5) |
| **Account Age** | 10 | 1 pt per 2 weeks, capped at 10 |
| **Report Penalty** | -30 to 0 | -10 per confirmed malicious report |

### Verification Flow (Manual)
1. User initiates verification -> backend generates 6-digit challenge code
2. **Selfie**: User writes code on paper, holds next to face, takes selfie
3. **Video**: User records video showing code + speaking it aloud
4. Submission goes to PENDING status -> admin reviews via admin dashboard
5. Admin approves/rejects -> safety score updated accordingly

## Key Design Decisions

- **V1 is free**: No premium plans, no payment gating. All features available with daily limits.
- **Manual verification**: No Agora.io or AI — admin team reviews all verifications manually via the web admin dashboard.
- **Soft signals before messaging**: Wave/Interested/Viewed signals — no direct messaging from discovery.
- **Micro-dates unlock chat**: After matching, both users complete a conversation game before chat opens.
- **Location privacy**: Exact coords stored in DB but responses always add ±200 random jitter. Women have map visibility OFF by default.
- **Blocks stored as reports**: Blocking a user creates a Report entity with reason=OTHER, description="BLOCKED".

## Database Entities

All entities in `backend/src/database/entities/`:

- **User** — core user (phone, email, firebaseUid, intent, safetyScore, location, visibility flags, daily counters)
- **Profile** — one-to-one with User (bio, photos array, interests array, preferences)
- **Swipe** — like/pass/super_like actions (unique constraint on swiper+swiped)
- **Match** — mutual likes (includes micro-date game state, chat unlock status)
- **Message** — chat messages (soft delete, indexed by matchId+createdAt)
- **Signal** — wave/interested/viewed (unique constraint on sender+receiver+type)
- **SafetyVerification** — verification attempts with scores and status
- **Report** — user reports AND blocks
- **OtpCode** — temporary OTP storage (plain_code stored only in dev mode)
- **RefreshToken** — JWT refresh token tracking

Enums are in `backend/src/database/entities/enums.ts`.

## API Structure

Backend runs on port 6700, prefix `/api/v1`. All modules in `backend/src/modules/`:

| Module | Path | Key Functionality |
|--------|------|-------------------|
| auth | `/auth` | OTP send/verify, Firebase Google Sign-In, JWT refresh, intent setting, onboarding profile |
| profile | `/profile` | CRUD profile, photos (max 6), interests, location update, visibility toggle |
| discovery | `/discovery` | Get swipeable profiles, swipe actions, match management |
| location | `/location` | Nearby users (PostGIS ST_DWithin), map bounds query, config |
| signals | `/signals` | Send/receive wave/interested/viewed, who-viewed-me |
| safety | `/safety` | Start/submit verification, score breakdown, report/block users, admin review endpoints |
| chat | `/chat` | Conversations list, messages (paginated), send/read/delete, Socket.io gateway |
| micro-dates | `/micro-dates` | Game list, submit answers |
| upload | `/upload` | Photo/video upload to Cloudinary, delete |

## Development Setup

### Prerequisites
- Node.js 20+, Docker, Flutter SDK 3.38+

### Backend
```bash
cd backend
docker compose up -d          # PostgreSQL (port 5433) + Redis (port 6381)
npm install
npm run start:dev             # Runs on :6700, Swagger at /api
```

### Flutter App
```bash
cd app
flutter pub get
flutter run
```

### Web (Landing + Admin)
```bash
cd web
npm install
npm run dev                   # Runs on :3000
```

### Mobile Testing
```bash
cd backend
npx -y localtunnel --port 6700    # Get tunnel URL
# Update app/lib/core/api/api_client.dart with tunnel URL
```

### Dev OTP
OTPs are logged to backend console in dev mode. Also retrievable via:
`GET /api/v1/auth/dev/otp/:identifier`

## Conventions

### Backend (NestJS)
- One module per feature domain under `src/modules/`
- Each module has: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/*.dto.ts`
- DTOs use `class-validator` decorators
- Guards in `guards/` subdirectories (e.g., admin API key guard)
- TypeORM entities use decorators, relations defined with `@ManyToOne`, `@OneToOne`, etc.
- Config accessed via NestJS `ConfigService`

### Flutter App
- Feature-based folder structure under `lib/features/`
- Each feature has `screens/` and `widgets/` subdirectories
- State management via Riverpod providers in `core/providers/`
- API calls go through `ApiClient` (Dio-based) in `core/api/`
- Secure token storage via `flutter_secure_storage`
- Navigation via Go Router with named routes

### Web (Next.js)
- App Router with TypeScript + Tailwind CSS
- Landing page at `/`
- Admin dashboard at `/admin/*` with sidebar layout
- Admin pages: dashboard, verifications, reports, users

### General
- UUID primary keys everywhere
- Timestamps: `createdAt`, `updatedAt` on all entities
- Soft deletes where applicable (isDeleted flag, not physical deletion)
- Pagination via `page` + `limit` query params
- JWT auth: access token (7d) + refresh token (30d)

## Important Notes

- **V1 is completely free** — no subscription/premium/payment code exists in the codebase.
- **Verification is manual** — no Agora.io or AI services. Admin reviews via web dashboard.
- `DB_SYNCHRONIZE=true` in dev — no migrations needed. For production, use migrations.
- PostGIS extension required for location queries (auto-enabled in docker-compose).
- Cloudinary is used for ALL media storage (not AWS S3).
- Android emulator uses `10.0.2.2` to reach host localhost.
- The app package identifier is `com.liveconnect.app`.
- Firebase is configured for both Android and iOS (google-services.json / GoogleService-Info.plist).
- Daily limits (swipes, super likes) are configurable via environment variables, not plan-gated.
