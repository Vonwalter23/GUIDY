# GUIDY - AI Audio Tourist Companion

<div align="center">

![Guidy Logo](https://img.shields.io/badge/GUIDY-Audio%20Tourist%20Companion-blue?style=for-the-badge)

**An intelligent Android app that guides you through cities with audio narration.**

</div>

---

## 🎯 About

**Guidy** is an AI-powered audio tourist companion for Android that provides hands-free, voice-guided tours. Using your phone's GPS, it detects nearby points of interest and narrates engaging descriptions using text-to-speech technology.

### Key Features

- 🎧 **Audio-First**: Hands-free audio narration of tourist sites
- 📍 **Smart Location**: Precise GPS tracking with proximity detection
- 🗺️ **Open Data**: Uses OpenStreetMap, Wikipedia, and Wikidata
- 🤖 **AI Enhanced**: Groq-powered intelligent descriptions
- 🔋 **Offline Ready**: Cached POIs and descriptions work without internet
- 🚫 **No Registration**: Works immediately, no account needed

---

## 📱 Current Status

### Stage 1.5: Hardening + Branding ✅

| Feature | Status |
|---------|--------|
| Project Setup | ✅ Complete |
| TypeScript | ✅ Configured |
| Navigation | ✅ Complete |
| State Management | ✅ Complete |
| Design System | ✅ Complete |
| Brand Assets | ✅ Complete |
| Launcher Icons | ✅ Complete |
| Splash Screen | ✅ Complete |
| Release Signing | ✅ Complete |

### Stage 1: Base Interface ✅

| Feature | Status |
|---------|--------|
| Splash Screen | ✅ Complete |
| Home Screen | ✅ Complete |
| Configuracion Screen | ✅ Complete |
| Recorrido Screen | ✅ Complete |
| React Navigation | ✅ Complete |
| Theme System | ✅ Complete |

### Roadmap

**Roadmap**: [STAGE_PLAN.md](./docs/STAGE_PLAN.md)

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native 0.86 |
| Language | TypeScript |
| Navigation | React Navigation |
| State | Zustand |
| UI | React Native Paper |
| Maps | OpenStreetMap |
| Location | Fused Location Provider |
| AI | Groq API |
| TTS | Android Text-to-Speech |
| Cache | SQLite |

---

## 📁 Project Structure



---

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- npm or yarn
- Android Studio
- Android SDK
- Physical Android device (recommended for testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/Vonwalter23/GUIDY.git

# Navigate to project
cd GUIDY

# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android
npm run android
```

### Build APK

```bash
# Debug APK
cd android && ./gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [PROJECT_CONTEXT.md](./docs/PROJECT_CONTEXT.md) | Project vision and goals |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Technical architecture |
| [STAGE_PLAN.md](./docs/STAGE_PLAN.md) | Development roadmap |
| [CHANGELOG.md](./docs/CHANGELOG.md) | Version history |
| [BRANDING.md](./docs/BRANDING.md) | Brand guidelines and design tokens |

---

## 👥 Team

Development team roles:
- Software Architect
- React Native Developer
- Android Native (Kotlin) Engineer
- QA Engineer
- DevOps Engineer
- Technical Writer

---

## 📄 License

Private project. All rights reserved.

---

## 🙏 Acknowledgments

- OpenStreetMap contributors
- Wikipedia and Wikidata
- Groq AI
- React Native community

---

<div align="center">

**Made with ❤️ for tourists everywhere**

</div>
