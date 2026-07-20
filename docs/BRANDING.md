# GUIDY - Branding Guide

## Brand Identity

**App Name:** Guidy  
**Tagline:** AI Audio Tourist Companion  
**Purpose:** Interactive audio guide for tourist sites

---

## Color Palette

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| Verde Principal (Bosque) | `#2E5B3D` | Primary buttons, map pins, indicators |

### Secondary Colors

| Name | Hex | Usage |
|------|-----|-------|
| Marrón Secundario (Tierra) | `#9B724C` | POI icon silhouettes, secondary text |

### Background Colors

| Name | Hex | Usage |
|------|-----|-------|
| Beige de Fondo (Suave) | `#F4EFE6` | Container backgrounds, cards, pin inner circles |

---

## Typography

### Font Family

- **iOS:** System (San Francisco)
- **Android:** Roboto

### Type Scale

| Style | Size | Weight | Line Height |
|-------|------|--------|-------------|
| Display Large | 57px | 400 | 64px |
| Display Medium | 45px | 400 | 52px |
| Display Small | 36px | 400 | 44px |
| Headline Large | 32px | 600 | 40px |
| Headline Medium | 28px | 600 | 36px |
| Headline Small | 24px | 600 | 32px |
| Title Large | 22px | 500 | 28px |
| Title Medium | 16px | 500 | 24px |
| Title Small | 14px | 500 | 20px |
| Body Large | 16px | 400 | 24px |
| Body Medium | 14px | 400 | 20px |
| Body Small | 12px | 400 | 16px |
| Label Large | 14px | 500 | 20px |
| Label Medium | 12px | 500 | 16px |
| Label Small | 11px | 500 | 16px |

---

## Spacing System

| Name | Value |
|------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| xxl | 48px |
| xxxl | 64px |

---

## Border Radius

### Scale

| Name | Value |
|------|-------|
| none | 0px |
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 24px |
| xxl | 32px |
| full | 9999px |

### Component-specific

| Component | Radius |
|-----------|--------|
| Button | 12px |
| Card | 16px |
| Input | 8px |
| Bottom Sheet | 24px |
| Chip | 20px |
| Avatar | full |
| Icon Button | full |

---

## App Icons

### Launcher Icon

- **File:** `Icono.png`
- **Usage:** Official app launcher icon
- **Sizes Generated:**
  - mdpi: 48x48
  - hdpi: 72x72
  - xhdpi: 96x96
  - xxhdpi: 144x144
  - xxxhdpi: 192x192

### Adaptive Icon (Android 8.0+)

- **Background:** `#2E5B3D` (Verde Principal)
- **Foreground:** Icono.png centered
- **Monochrome:** Icono.png in white

### Files

- `ic_launcher.xml` - Adaptive icon config
- `ic_launcher_round.xml` - Round adaptive icon
- `ic_launcher_foreground.png` - Foreground layer
- `ic_launcher_background.png` - Background layer (solid green)
- `ic_launcher_monochrome.png` - Monochrome version

---

## Splash Screen

- **File:** `Splash.png`
- **Background Color:** `#2E5B3D`
- **Content:** Official splash image with Guidy branding

---

## Map Elements

### POI Markers

- **Visual Size:** 40x40 dp
- **Touch Target:** 48x48 dp minimum
- **Background:** `#F4EFE6`
- **Border:** `#9B724C`
- **Icon Color:** `#2E5B3D`

---

## Audio Player

### Bottom Sheet

- **Background:** `#F4EFE6`
- **Border Radius:** 24px
- **Play Button:** 56x56 dp, `#2E5B3D`

---

## Assets Location

All brand assets are stored in:

```
src/assets/images/
├── Icono.png     # Official app icon
└── Splash.png    # Official splash screen
```

Android launcher icons:

```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png
├── mipmap-hdpi/ic_launcher.png
├── mipmap-xhdpi/ic_launcher.png
├── mipmap-xxhdpi/ic_launcher.png
├── mipmap-xxxhdpi/ic_launcher.png
└── mipmap-anydpi-v26/
    ├── ic_launcher.xml
    ├── ic_launcher_round.xml
    ├── ic_launcher_foreground.png
    ├── ic_launcher_background.png
    └── ic_launcher_monochrome.png
```

---

## Dark Mode

Dark mode uses adapted versions of the brand colors:

| Light | Dark |
|-------|------|
| `#F4EFE6` | `#121212` |
| `#2E5B3D` | `#2E5B3D` (same) |
| `#FFFFFF` | `#1A1A1A` |

---

## Usage Guidelines

### Do

- ✅ Use official colors from the palette
- ✅ Use official icons and splash
- ✅ Follow spacing system
- ✅ Use typography scale
- ✅ Apply consistent border radius

### Don't

- ❌ Invent new colors
- ❌ Modify brand colors
- ❌ Use unofficial icons
- ❌ Distort logos or images
- ❌ Apply inconsistent spacing
