# GUIDY - Stage Plan

## Development Stages

Development follows an incremental approach with 10 stages. Each stage must complete before advancing.

---

## Stage 0: Architecture Foundation ✅ (Current)

**Objective**: Prepare professional architecture

**Deliverables**:
- [x] React Native project with TypeScript
- [x] Project structure
- [x] Base documentation
- [x] Development configuration (ESLint, Prettier)
- [x] Test configuration (Jest)
- [x] Base APK compilation
- [x] Initial app screen with logo and subtitle

**Exit Criteria**:
- Project compiles
- APK generates successfully
- App opens and shows initial screen

---

## Stage 1: Project Base and APK

**Objective**: Ensure stable project foundation

**Deliverables**:
- [ ] Working navigation structure
- [ ] Theme configuration (React Native Paper)
- [ ] Base screen templates
- [ ] Error boundary implementation
- [ ] Loading states
- [ ] Debug APK release

**Exit Criteria**:
- APK builds without errors
- Navigation works between screens
- Error handling functional

---

## Stage 2: GPS Integration

**Objective**: Location tracking

**Deliverables**:
- [ ] Fused Location Provider setup
- [ ] Location permissions handling
- [ ] Real-time location updates
- [ ] Location service structure
- [ ] Mock location for testing

**Exit Criteria**:
- App displays current coordinates
- Location updates on map
- Permissions flow works

---

## Stage 3: Map Display

**Objective**: Visual map integration

**Deliverables**:
- [ ] OpenStreetMap integration
- [ ] Map component
- [ ] User location marker
- [ ] Map controls (zoom, pan)
- [ ] POI markers (placeholder)

**Exit Criteria**:
- Map renders correctly
- User location visible
- Map interactions work

---

## Stage 4: POI System

**Objective**: Points of Interest discovery

**Deliverables**:
- [ ] Overpass API integration
- [ ] POI search by radius
- [ ] POI data models
- [ ] POI filtering
- [ ] Distance calculation

**Exit Criteria**:
- POIs appear on map
- Distance to POIs displayed
- POI details accessible

---

## Stage 5: Tourist Information

**Objective**: Enrich POI content

**Deliverables**:
- [ ] Wikipedia integration
- [ ] Wikidata enrichment
- [ ] GeoNames lookup
- [ ] Summary generation
- [ ] Image thumbnails

**Exit Criteria**:
- POIs show descriptions
- Wikipedia content displays
- Images load correctly

---

## Stage 6: AI Integration

**Objective**: Intelligent descriptions

**Deliverables**:
- [ ] Groq API setup
- [ ] API key management
- [ ] Description generation
- [ ] Response caching
- [ ] Error handling

**Exit Criteria**:
- AI generates descriptions
- Responses cached
- Fallback works

---

## Stage 7: Voice Output

**Objective**: Audio narration

**Deliverables**:
- [ ] Android TTS integration
- [ ] Voice configuration
- [ ] Audio queue management
- [ ] Play/pause controls
- [ ] Language selection

**Exit Criteria**:
- Text narrates aloud
- Controls functional
- Audio queues properly

---

## Stage 8: Complete Flow

**Objective**: End-to-end user experience

**Deliverables**:
- [ ] Tour start to finish flow
- [ ] Background location tracking
- [ ] Proximity triggers
- [ ] Seamless transitions
- [ ] User preferences

**Exit Criteria**:
- Complete user journey works
- Background mode functional
- Preferences saved

---

## Stage 9: Optimization

**Objective**: Performance and polish

**Deliverables**:
- [ ] Performance profiling
- [ ] Battery optimization
- [ ] Offline mode enhancement
- [ ] UI/UX polish
- [ ] Memory leak fixes

**Exit Criteria**:
- App performance optimized
- Battery drain minimized
- UI feels responsive

---

## Stage 10: Beta Trelew

**Objective**: Production-ready release

**Deliverables**:
- [ ] Trelew city configuration
- [ ] POI data curated
- [ ] Beta testing
- [ ] Bug fixes
- [ ] Release APK

**Exit Criteria**:
- Beta APK released
- Real-world testing complete
- Feedback incorporated

---

## Stage Dependencies

```
Stage 0 ──► Stage 1 ──► Stage 2 ──► Stage 3 ──► Stage 4 ──► Stage 5 ──► Stage 6 ──► Stage 7 ──► Stage 8 ──► Stage 9 ──► Stage 10
   │           │           │           │           │           │           │           │           │           │
   │           │           │           │           │           │           │           │           │           │
   └───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────► Code Freeze
```

## Testing Requirements

| Stage | Unit Tests | Integration | Manual Test |
|-------|------------|-------------|-------------|
| 0-1   | Config     | N/A         | APK opens   |
| 2-4   | Services   | Location    | GPS works   |
| 5-7   | API mocks  | Data flow   | Features    |
| 8-10  | E2E        | Full flow   | Beta test   |

## Documentation per Stage

Each stage must update:
- `CHANGELOG.md` - What changed
- `README.md` - Current capabilities
- Code comments - Implementation notes
- Test coverage - New test files

## Sign-off Criteria

Before advancing:
1. All tests pass
2. APK generates successfully
3. Physical device testing complete
4. Code reviewed (if applicable)
5. Documentation updated
