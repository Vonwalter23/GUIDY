# GUIDY - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Project architecture documentation
- Initial documentation structure

---

## [STAGE 0] - 2024-XX-XX

### Added
- React Native 0.86.0 project initialization
- TypeScript configuration
- Project folder structure:
  - `src/app/` - App entry point
  - `src/components/` - Reusable components
  - `src/screens/` - Screen components
  - `src/navigation/` - Navigation configuration
  - `src/services/` - Service modules (location, maps, poi, wikipedia, ai, voice, database)
  - `src/hooks/` - Custom React hooks
  - `src/store/` - Zustand state management
  - `src/types/` - TypeScript type definitions
  - `src/utils/` - Utility functions
  - `src/assets/` - Static assets (images, icons)
  - `docs/` - Project documentation
  - `tests/` - Test files

### Dependencies Installed
- `@react-navigation/native` - Navigation framework
- `@react-navigation/native-stack` - Native stack navigator
- `react-native-screens` - Native navigation primitives
- `zustand` - State management
- `react-native-paper` - Material Design components
- `react-native-vector-icons` - Icon library

### Documentation Created
- `docs/PROJECT_CONTEXT.md` - Project vision, mission, and goals
- `docs/ARCHITECTURE.md` - Technical architecture and design
- `docs/STAGE_PLAN.md` - Development roadmap (10 stages)
- `docs/CHANGELOG.md` - This file

### Configuration
- ESLint configured
- Prettier configured
- Jest configured

### Initial App Screen
- Logo placeholder (Guidy text)
- Title: "Guidy"
- Subtitle: "AI Audio Tourist Companion"

---

## [STAGE 1] - Planned

- Navigation structure implementation
- Theme configuration
- Base screen templates
- Error boundaries

## [STAGE 2] - Planned

- GPS integration
- Location permissions
- Real-time location updates

## [STAGE 3] - Planned

- OpenStreetMap integration
- Map component
- POI markers

## [STAGE 4] - Planned

- POI search
- Overpass API
- Distance calculations

## [STAGE 5] - Planned

- Wikipedia integration
- Wikidata enrichment
- Content display

## [STAGE 6] - Planned

- Groq API integration
- AI descriptions
- Caching

## [STAGE 7] - Planned

- Text-to-Speech
- Voice controls
- Audio queue

## [STAGE 8] - Planned

- Complete user flow
- Background tracking
- Preferences

## [STAGE 9] - Planned

- Performance optimization
- Battery improvements
- Polish

## [STAGE 10] - Planned

- Beta release for Trelew
- Production-ready APK
