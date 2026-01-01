# LiveConnect Developer Guide

Complete guide for setting up and running the LiveConnect dating app locally.

## 📋 Prerequisites

- **Node.js** 20+ and npm
- **Docker** and Docker Compose
- **Flutter** SDK 3.38+
- **Android Studio** (for Android emulator) or **Xcode** (for iOS simulator)

## 🚀 Quick Start

### 1. Backend Setup

#### Start Docker Services
```bash
cd backend

# Start PostgreSQL and Redis
docker compose up -d

# Verify containers are running
docker ps
```

#### Install Dependencies
```bash
npm install
```

#### Configure Environment
The `.env` file is already configured for local development. Key settings:
- Database: `localhost:5433` (PostgreSQL)
- Redis: `localhost:6381`
- Backend: `localhost:6700`

#### Run Backend
```bash
npm run start:dev
```

Backend will be available at:
- API: http://localhost:6700
- Swagger Docs: http://localhost:6700/api

### 2. Mobile Testing Setup

#### Start Tunnel (Required for Mobile Testing)
In a new terminal:
```bash
cd backend
npx -y localtunnel --port 6700
```

**Important**: Copy the tunnel URL (e.g., `https://xyz-abc-123.loca.lt`)

#### Update Flutter App Configuration
Edit `app/lib/core/api/api_client.dart`:
```dart
const String baseUrl = 'https://YOUR-TUNNEL-URL.loca.lt/api/v1';
const String wsUrl = 'wss://YOUR-TUNNEL-URL.loca.lt';
```

### 3. Flutter App Setup

#### Install Dependencies
```bash
cd app
flutter pub get
```

#### Run on Android Emulator
```bash
# Start Android emulator from Android Studio
# OR use command line:
flutter emulators --launch <emulator-id>

# Run app
flutter run
```

#### Run on iOS Simulator (Mac only)
```bash
# Start simulator
open -a Simulator

# Run app
flutter run
```

## 🗄️ Database Management

### Auto-Sync (Development)
TypeORM is configured with `synchronize: true` in development mode. The database schema automatically updates when you start the backend.

**No manual migrations needed for development!**

### Verify Database Schema
```bash
# Connect to database
docker exec -it liveconnect_db psql -U liveconnect -d liveconnect

# List tables
\dt

# Describe a table
\d otp_codes

# Exit
\q
```

### Reset Database (Fresh Start)
```bash
cd backend

# Stop and remove all data
docker compose down -v

# Start fresh
docker compose up -d

# Backend will auto-create schema on next start
npm run start:dev
```

## 🔧 Development Features

### Dev-Mode OTP System

In development, OTPs are **not sent via SMS/Email**. Instead:

1. **Console Logging**: OTPs are logged to backend console
   ```
   📱 [DEV MODE] OTP for +911234567890: 123456
   ```

2. **Dev API Endpoint**: Retrieve OTPs programmatically
   ```bash
   curl https://YOUR-TUNNEL-URL.loca.lt/api/v1/auth/dev/otp/+911234567890
   ```

3. **Database Storage**: Plain OTPs stored in `otp_codes.plain_code` column (dev only)

### Hot Reload

**Flutter**: Press `r` in terminal for hot reload, `R` for hot restart

**Backend**: Auto-reloads on file changes (watch mode enabled)

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 6700
lsof -ti:6700 | xargs kill -9

# Restart backend
npm run start:dev
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker ps | grep liveconnect_db

# View database logs
docker logs liveconnect_db

# If password error, reset database
docker compose down -v
docker compose up -d
```

### Tunnel URL Changed
Localtunnel generates a new URL each time it starts. Update Flutter app:

1. Copy new tunnel URL from terminal
2. Update `app/lib/core/api/api_client.dart`
3. Hot restart Flutter app (press `R`)

### Flutter Build Errors

**Android v1 Embedding Error**:
```bash
cd app
flutter create --platforms=android,ios .
flutter pub get
flutter run
```

**Corrupted NDK**:
```bash
rm -rf ~/Library/Android/sdk/ndk/28.2.13676358
flutter run  # Will re-download
```

## 📱 Testing OTP Flow

1. **Start Backend**: `npm run start:dev`
2. **Start Tunnel**: `npx -y localtunnel --port 6700`
3. **Update Flutter Config**: Use tunnel URL
4. **Run Flutter App**: `flutter run`
5. **Enter Phone Number**: In app login screen
6. **Check Backend Console**: OTP will be logged
7. **Enter OTP**: In app verification screen

## 🔐 Environment Variables

### Backend (.env)
```bash
NODE_ENV=development          # Enables dev features
DB_SYNCHRONIZE=true          # Auto-sync database schema
DB_LOGGING=true              # Log SQL queries
OTP_EXPIRY_MINUTES=10        # OTP validity duration
```

### Production Notes
- Set `NODE_ENV=production`
- Set `DB_SYNCHRONIZE=false` (use migrations)
- Configure SMS/Email services
- Use proper secrets for JWT keys

## 📚 Useful Commands

```bash
# Backend
npm run start:dev              # Start with hot reload
npm run build                  # Build for production
npm run start:prod             # Run production build

# Docker
docker compose up -d           # Start services
docker compose down            # Stop services
docker compose down -v         # Stop and remove volumes
docker compose logs -f         # View logs

# Flutter
flutter devices                # List available devices
flutter run -d <device-id>     # Run on specific device
flutter clean                  # Clean build cache
flutter doctor                 # Check setup

# Database
docker exec -it liveconnect_db psql -U liveconnect -d liveconnect
```

## 🎯 Development Workflow

1. **Start Docker**: `docker compose up -d`
2. **Start Backend**: `npm run start:dev`
3. **Start Tunnel**: `npx -y localtunnel --port 6700`
4. **Update Flutter**: Copy tunnel URL to `api_client.dart`
5. **Run Flutter**: `flutter run`
6. **Develop**: Make changes, hot reload automatically applies
7. **Test**: OTPs logged to console, no SMS needed

## 🔗 Important URLs

- **Backend API**: http://localhost:6700
- **Swagger Docs**: http://localhost:6700/api
- **PostgreSQL**: localhost:5433
- **Redis**: localhost:6381
- **Tunnel**: Changes each restart (check terminal)

## 💡 Tips

- Keep tunnel terminal open while testing mobile
- Use `flutter doctor -v` to diagnose Flutter issues
- Check backend console for OTP codes during testing
- Use Swagger docs to test API endpoints directly
- Database auto-syncs in dev - no migrations needed
