# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [0.0.21] - 2026-07-24 - STAGE 4.4E

### Fixed
- **CRITICAL**: OverpassDatasource was sending JSON instead of raw query to Overpass API
  - Overpass API expects plain text query, not JSON
  - `BaseNetworkClient.post()` was wrapping body in JSON: `{"data":"query"}`
  - Overpass couldn't parse this format and returned empty results
  - Fixed by using `fetch()` directly with raw query string

### Documentation
- `docs/STAGE_4_4E_ROOT_CAUSE.md` - Root cause analysis
- `docs/STAGE_4_4E_FORENSIC.md` - Forensic audit

## [0.0.20] - 2026-07-24 - STAGE 4.4D

### Fixed
- **CRITICAL**: DiscoveryEngine.search() returns empty results immediately
  - Added 500ms wait and getResults() call to get actual POIs
  - Fixed WebView message handler (document.addEventListener → window.addEventListener)
  - Added useEffect to trigger discovery on orchestrator start

## [0.0.19] - 2026-07-24 - STAGE 4.4C

### Added
- **Exhaustive Trace Logging**: Added detailed logs throughout the entire POI pipeline
  - `[PROVIDER]` - POIOrchestratorProvider lifecycle
  - `[ORCHESTRATOR]` - POIOrchestrator lifecycle
  - `[DISCOVERY]` - DiscoveryEngine operations
  - `[REPOSITORY]` - POIRepository operations
  - `[OVERPASS]` - OverpassDatasource operations
  - `[STORE]` - POIStore sync
  - `[MAP]` - OpenStreetMap rendering

### Documentation
- `docs/STAGE_4_4C_PIPELINE_TRACE.md` - Complete pipeline trace documentation
- `docs/STAGE_4_4C_AUDIT.md` - Full audit of all pipeline components
- `docs/STAGE_4_4C_CERTIFICATION.md` - Pipeline certification document

### Verified
- POIOrchestratorProvider initialization flow
- Orchestrator autoStart and autoDiscovery
- DiscoveryEngine search scheduling
- Movement threshold (50m)
- Cooldown (20s)
- Repository datasource registration
- Store synchronization

## [0.0.18] - 2026-07-23 - STAGE 4.4B

### Fixed
- **Critical**: OverpassDatasource registration in POIOrchestrator
  - `POIOrchestrator.initialize()` now registers datasource with repository
  - Previously all searches silently failed

### Added
- Enhanced logging system with structured output
- `[ORCHESTRATOR]` - Orchestrator lifecycle
- `[REPOSITORY]` - Repository queries
- `[OVERPASS]` - HTTP request/response
- `[PARSER]` - Element parsing
- `[RANKING]` - POI scoring
- `[DEDUP]` - Validation/deduplication
- `[SESSION]` - Session management
- `[MAP]` - Marker rendering

### Documentation
- `docs/STAGE_4_4B_PIPELINE_CERTIFICATION.md`
- `docs/STAGE_4_4B_FORENSIC_REPORT.md`
- `docs/STAGE_4_4B_AUDIT.md`

## [0.0.17] - 2026-07-23 - STAGE 4.4A

### Added
- APK Release compilation: `app-release.apk` (~64 MB)
- SHA256: `78505b823837dd0aa9e20288b1e62e3cbb84a8dd2cc137d17a55aba24be201e8`
- GitHub Release: `v0.0.17-STAGE4.4A`

## [0.0.16] - STAGE 4.4

### Added
- POI Engine Orchestration
- POIOrchestratorProvider integration
- OpenStreetMap POI rendering
- POIStore Zustand integration
- Discovery Engine with movement threshold
- Overpass API datasource
- POIRanking and POIDeduplicator

## [0.0.15] - STAGE 3.5

### Added
- Location Engine certification
- Permission flow
- GPS integration

## [0.0.1] - Initial Release

- Basic GUIDY app structure
- React Native setup
- OpenStreetMap integration
