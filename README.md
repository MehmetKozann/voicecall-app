# VoiceCall - Production-Grade Private Real-Time Messaging

A scalable, secure real-time messaging application with a **NestJS + PostgreSQL + Prisma + Socket.IO** backend and a **React Native CLI (TypeScript, iOS & Android)** native mobile client.

---

## 🌟 Key Features

- ⚡ **Real-Time Messaging**: Instant bi-directional communication via Socket.IO.
- 🕒 **Optimistic Updates & Reconnection**: Smooth UI responsiveness with temporary message IDs and automatic socket reconnection.
- 🔐 **Enterprise Security**:
  - Argon2id password hashing.
  - JWT Access Tokens (15m) + Secure Refresh Token Rotation (30d) with reuse detection.
  - Native iOS Keychain & Android KeyStore token protection (`react-native-keychain`).
  - Strict input validation pipes and IDOR prevention guards on conversations.
  - Forward-compatible architecture ready for the Signal Protocol (Double Ratchet + X3DH).
- 📷 **Rich Media Sharing**: High-resolution image capture and gallery attachment support.
- 📄 **Document Sharing**: Seamless file attachment and download handling.
- 🎤 **Voice Messaging**: Native audio recording with live timer and in-chat audio playback.
- 🟢 **Presence & Typing Indicators**: Real-time online/offline indicators and animated typing bubbles.
- 📬 **Delivery & Read Receipts**: Distinct Sent (✓), Delivered (✓✓), and Read (✓✓ highlighted) tracking.

---

## 🏗 System Architecture

```
+-------------------------------------------------------------------------------+
|                             CLIENT APPLICATION                                |
|  React Native CLI (iOS / Android)                                             |
|  - Presentation Layer: Clean Dark UI with Reusable Components                 |
|  - State Management: Zustand (AuthStore, ChatStore)                           |
|  - Network Layer: Axios with Automatic Refresh Token Interceptors             |
|  - Real-Time Layer: Socket.IO Client with Auto-Reconnect                      |
|  - Hardware Security: react-native-keychain                                   |
+-----------------------+-------------------------------+-----------------------+
                        | HTTPS (REST API)              | WSS (Socket.IO)
                        v                               v
+-------------------------------------------------------------------------------+
|                             BACKEND API SERVER                                |
|  NestJS Architecture                                                          |
|  - Helmet Security Headers & CORS                                             |
|  - Throttler Rate Limiting Guard                                              |
|  - AuthModule (Argon2id + JWT + Refresh Token Rotation)                       |
|  - ConversationsModule & MessagesModule (Prisma Transactions & Cursor Paging) |
|  - UploadsModule (Abstract Storage Service: Local / AWS S3 / Cloudflare R2)  |
|  - WebSocketGateway (Room Multiplexing & Handshake Verification)              |
|  - NotificationsModule (APNs / FCM Push Notification Dispatcher)              |
+-----------------------+-------------------------------+-----------------------+
                        | Prisma Client Queries
                        v
+-------------------------------------------------------------------------------+
|                             DATABASE LAYER                                    |
|  PostgreSQL 16                                                                |
|  - Users, RefreshTokens, Conversations, ConversationMembers, Messages, Attachments
|  - Compound Indexes: (conversationId, createdAt DESC), (conversationId, userId)
+-------------------------------------------------------------------------------+
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v18+` or `v20+`
- **PostgreSQL**: PostgreSQL 15+ running locally OR Docker Desktop
- **Mobile Development**:
  - **iOS**: macOS, Xcode 15+, CocoaPods (`sudo gem install cocoapods`)
  - **Android**: Android Studio, JDK 17, Android SDK & Platform Tools

---

### 1. Backend Setup & Run

#### Option A: Local Development (Recommended)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *Ensure `DATABASE_URL` matches your local PostgreSQL instance.*

4. Push database schema & generate Prisma client:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Start the backend in development mode:
   ```bash
   npm run start:dev
   ```
   The backend will start at: `http://localhost:3000/api/v1`

#### Option B: Docker Compose

```bash
cd backend
docker compose up --build -d
```

---

### 2. Running Automated Backend & Real-Time Tests

To verify user registration, login, direct conversation creation, Socket.IO handshake, typing indicators, real-time message exchange, and read/delivery receipts:

```bash
cd backend
node test-e2e.js
```

---

### 3. Mobile Application Setup

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `mobile/src/api/client.ts` or `.env`:
   - **iOS Simulator**: `http://localhost:3000`
   - **Android Emulator**: `http://10.0.2.2:3000`
   - **Physical Devices**: `http://<YOUR_LOCAL_NETWORK_IP>:3000` (e.g. `http://192.168.1.50:3000`)

---

### 4. Running on iOS

1. Install CocoaPods dependencies:
   ```bash
   cd mobile/ios
   pod install
   cd ..
   ```

2. Launch on iOS Simulator:
   ```bash
   npx react-native run-ios
   ```

3. **Running on a Physical iPhone**:
   - Open `mobile/ios/VoiceCall.xcworkspace` in Xcode.
   - Select the `VoiceCall` target -> **Signing & Capabilities**.
   - Select your **Apple Developer Team**.
   - Connect your iPhone via USB / Wi-Fi, select it as the build destination, and click **Run**.

---

### 5. Running on Android

1. Start an Android Virtual Device (AVD) from Android Studio.
2. Enable port forwarding for local backend (optional if using 10.0.2.2):
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```
3. Run the Android app:
   ```bash
   npx react-native run-android
   ```

---

## 📱 Testing Between Two Physical Devices

To test real-time communication between two people on physical phones:

1. **Host Backend on Local Network**:
   - Ensure your computer and both phones are connected to the same Wi-Fi network.
   - Find your computer's local IP address (e.g. `192.168.1.50` on macOS: `ipconfig getifaddr en0`).
   - In `mobile/src/api/client.ts`, set:
     ```typescript
     const DEFAULT_HOST = 'http://192.168.1.50:3000';
     ```
2. **Launch App on Device 1**:
   - Register User 1 (e.g., `alice` / `alice@example.com`).
3. **Launch App on Device 2**:
   - Register User 2 (e.g., `bob` / `bob@example.com`).
4. **Initiate Conversation**:
   - On Device 1, tap the **✏️ (New Chat)** button, search for `bob`, and tap Bob's name.
   - Send text, voice notes (tap 🎤), images (tap + -> Gallery/Camera), and documents.
   - Observe live typing indicators, instant message arrival, and real-time checkmarks (✓ -> ✓✓).

---

## 🔒 Security Architecture

- **Password Storage**: Argon2id with 64MB memory cost, 3 iterations, 2 parallelism threads.
- **Session Tokens**: JWT with RS256/HS512 signatures (15 min access, 30 days refresh).
- **Refresh Token Rotation**: Each refresh token is single-use; the database stores cryptographic SHA-256 hashes of refresh tokens to detect replay and compromise attempts.
- **Hardware Storage**: Tokens are stored using iOS Keychain Services and Android KeyStore via `react-native-keychain`.
- **Validation**: Strict NestJS `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`.
- **Authorization**: Conversation-member authorization guards on every REST route and Socket.IO event handler to prevent IDOR.
