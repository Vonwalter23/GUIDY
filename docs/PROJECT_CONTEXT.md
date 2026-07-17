# GUIDY - Project Context

## Overview

**Guidy** is an intelligent audio tourist companion for Android that guides users while walking through a city using precise geolocation, open maps, public data, and on-demand AI.

## Mission

Provide tourists and locals with an accessible, hands-free way to discover and learn about places of interest through audio narration, without requiring registration or internet connectivity for cached content.

## Core Problem

Tourists often miss interesting points while navigating cities. Traditional audio guides require advance planning and are not context-aware. Mobile internet can be unreliable or expensive abroad.

## Solution

An Android app that:
1. Uses GPS to detect user location
2. Identifies nearby points of interest (POIs)
3. Retrieves information from open data sources (OpenStreetMap, Wikipedia, Wikidata)
4. Generates concise audio descriptions using AI (Groq API)
5. Narrates content using Android Text-to-Speech
6. Works offline with cached data

## Target Users

- **Tourists** exploring unfamiliar cities
- **Locals** wanting to rediscover their hometown
- **Accessibility-focused users** preferring audio content

## Key Features

- **No registration required** - Works immediately
- **Audio-first interaction** - Hands-free experience
- **Offline capable** - Cached POI data and descriptions
- **Open data** - Uses public APIs (no vendor lock-in)
- **AI-enhanced** - Groq API for natural language descriptions

## City Scope

Initial deployment: **Trelew, Argentina**

Architecture supports adding new cities through configuration without code changes.

## Development Model

Incremental development using stages (STAGE 0-10). Each stage must:
1. Compile successfully
2. Generate working APK
3. Be physically tested before advancement

## Technology Philosophy

- **Open Source First**: Use free technologies unless explicitly approved
- **Simplicity**: Minimal viable features per stage
- **Quality**: Code reviews and automated testing
- **Documentation**: Comprehensive docs at every stage

## References

- Architecture Document: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Stage Plan: [STAGE_PLAN.md](./STAGE_PLAN.md)
- Changelog: [CHANGELOG.md](./CHANGELOG.md)
