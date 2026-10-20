---
name: Warm Nostalgia
colors:
  surface: '#fff8f5'
  surface-dim: '#e1d8d4'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf2ed'
  surface-container: '#f5ece7'
  surface-container-high: '#efe6e2'
  surface-container-highest: '#e9e1dc'
  on-surface: '#1e1b18'
  on-surface-variant: '#4d4639'
  inverse-surface: '#34302c'
  inverse-on-surface: '#f8efea'
  outline: '#7f7668'
  outline-variant: '#d1c5b5'
  surface-tint: '#755a21'
  primary: '#755a21'
  on-primary: '#ffffff'
  primary-container: '#b89758'
  on-primary-container: '#443000'
  inverse-primary: '#e6c27e'
  secondary: '#725b38'
  on-secondary: '#ffffff'
  secondary-container: '#fedeb2'
  on-secondary-container: '#78603e'
  tertiary: '#735c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cca72f'
  on-tertiary-container: '#4e3d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdea4'
  primary-fixed-dim: '#e6c27e'
  on-primary-fixed: '#261900'
  on-primary-fixed-variant: '#5b430a'
  secondary-fixed: '#fedeb2'
  secondary-fixed-dim: '#e0c298'
  on-secondary-fixed: '#281800'
  on-secondary-fixed-variant: '#584323'
  tertiary-fixed: '#ffe088'
  tertiary-fixed-dim: '#e9c349'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#574500'
  background: '#fff8f5'
  on-background: '#1e1b18'
  surface-variant: '#e9e1dc'
typography:
  display-hero:
    fontFamily: Playfair Display
    fontSize: 56px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  hud-counter:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: 0.08em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1.25rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system channels an editorial, warm romantic aesthetic married with modern digital minimalism. Designed for transient celebratory moments, it turns guests' smartphones into digital disposable cameras that evoke vintage film photography while retaining effortless clarity.

The emotional tone balances intimacy and celebration: it feels like a high-end linen wedding program paired with the tactile simplicity of a classic single-use Kodak or Fujifilm camera.

Key design tenants:
- **Quiet Editorial Elegance:** Generous negative space, refined serif headline typography, and understated gold accents create a sense of timeless ceremony.
- **Tactile Camera Mechanics:** Shutter buttons, film winders, exposure counters, and viewfinder overlays possess crisp, satisfying physical affordances without visual skeuomorphic clutter.
- **Subtle Film Framing:** Polaroid-like cream card mounts, delicate borders, and clean square-to-4:5 aspect ratio viewports echo physical prints rather than noisy retro gimmickry.

## Colors

The palette is rooted in soft wedding stationery tones, punctuated by metallic champagne golds and anchored by deep charcoal rather than pure black.

- **Canvas & Backgrounds:**
  - Base Page Canvas: `#FDFBF7` (Ivory)
  - Card & Viewfinder Housing: `#F4EFEB` (Warm Beige)
  - Surface Subdued & Well Backgrounds: `#EFE8DD` (Cream)
- **Primary & Accent Roles:**
  - Primary Accent: `#B89758` (Burnished Gold) – Primary interactive states, focus rings, primary action fills.
  - Secondary Accent: `#C5A880` (Champagne Gold) – Subtle borders, badges, film counter highlights.
  - Tertiary / Shimmer: `#D4AF37` (Bright Gold) – Flash indicator icons, celebratory badges, VIP event markers.
- **Text & Structure:**
  - Primary Text: `#2D2926` (Deep Charcoal) – High-contrast readability on ivory and beige.
  - Secondary Text / Camera HUD: `#78716C` (Muted Warm Gray) – Metadata, remaining roll counts, helper labels.
  - Delicate Lines / Frame Borders: `#E6DDD2` – Ghost dividing rules and film card outlines.

## Typography

The pairing creates immediate tension between classic editorial romance and utilitarian clarity:

- **Playfair Display** serves exclusively as the editorial voice: wedding titles, couple monograms, celebration headers, and retrospective modal prompts. Keep it set with generous line heights and tight tracking in large titles.
- **Plus Jakarta Sans** provides a warm, modern, and friendly counterweight for all operational needs: the camera viewport HUD, exposure remaining counter (`hud-counter`), guestbook inputs, settings, and photo grid curation.
- Use `all-caps` tracking (`0.06em` to `0.08em`) exclusively on small camera labels (e.g., `EXP. REMAINING`, `FLASH AUTO`, `ROLL NO. 03`) to mimic stamped single-use plastic camera housings.

## Layout & Spacing

The web app functions primarily as a mobile-first handheld viewfinder, scaling outward into an editorial photo book album on desktop viewports.

- **Mobile Viewport (Viewport Handheld):** Uses a centered fixed-ratio viewport container bounded by safe areas. Margins are kept at `1.25rem` (`margin`) with `space-sm` to `space-md` element stacking to guarantee camera controls sit comfortably within thumb reach.
- **Desktop & Gallery Grid:** A fluid grid capped at `1120px` max-width. In photo review/guest gallery modes, uses an asymmetrical or classic 3-column layout mimicking printed contact sheets with `gutter-desktop` spacing.
- Spacing relies on clear breathing space: avoid cramped utility buttons. Give the central shutter button an exclusive vertical exclusion zone of at least `space-xl` (`2.5rem`) on both sides.

## Elevation & Depth

Visual hierarchy uses physical paper layering and delicate ambient depth instead of heavy shadows:

- **Surface Tiers:**
  - Base: Ivory background (`#FDFBF7`).
  - Level 1 (Card Mount): Warm Beige (`#F4EFEB`) bounded by a subtle `1px` border (`#E6DDD2`).
  - Level 2 (Floating Controls / Shutter Housing): Pure Ivory (`#FDFBF7`) elevated with an ambient shadow tinted with warm charcoal: `0 8px 24px -4px rgba(45, 41, 38, 0.08), 0 2px 6px -1px rgba(45, 41, 38, 0.04)`.
- **Camera Viewfinder Depth:**
  - Inset viewport uses a delicate inner shadow: `inset 0 1px 4px rgba(45, 41, 38, 0.06)` with a thin hairline gold accent border (`#C5A880`).
- **Tactile Shutter & Physical Switches:**
  - Concentric rings with subtle ambient diffusion give buttons a pressable, mechanical feel without skeuomorphic gradients or heavy bevels.

## Shapes

The shape system blends structured film borders with soft, inviting consumer tactile controls:

- **Cards & Viewport Frames:** Use `roundedness: 2` (base `0.5rem`, container `1rem`, card frame `1.5rem`). This provides the signature rounded-corner feel of paper photo mounts and vintage plastic disposable chassis.
- **Interactive Buttons & Shutter:** The shutter release button is always perfectly circular (`border-radius: 9999px`). Auxiliary switches (flash toggle, lens flip) use pill shapes (`border-radius: 9999px`) to maintain immediate tap ergonomics.
- **Film Perforations & Badges:** Micro tags and film status pills use `0.375rem` to `0.5rem` for neat, stamp-like containment.

## Components

### Shutter Button (Hero Control)
- **Structure:** Concentric double-ring layout.
  - Outer ring: 80px diameter, 2px solid `#C5A880`, with 4px inner gap in `#F4EFEB`.
  - Inner button: 64px diameter, solid `#B89758` fill, smooth hover transition to `#A68548`.
- **Active State:** Physical compression feel: scale to `0.94` with an immediate subtle haptic click animation and a soft ivory flash overlay.

### Camera Viewfinder & HUD Overlay
- **Aspect Ratio:** Default 4:5 or 1:1 format bounded inside `#F4EFEB` frame.
- **Corner Guides:** Thin L-shaped reticle marks in `#C5A880` at four corners.
- **HUD Counters:**
  - Exposure counter styled like mechanical film counter: a small pill card with `#EFE8DD` background, displaying `REMAINING: 12` in `hud-counter` styling with deep charcoal text.

### Buttons & Quick Toggles
- **Primary Action (e.g., "Develop Roll", "Enter Wedding"):** Solid `#B89758` background, `#FDFBF7` crisp text, 48px height, `0.75rem` radius, subtle warm shadow.
- **Secondary / Ghost Button:** Transparent background, 1px solid `#C5A880`, text `#2D2926`. On hover: surface transitions to `#F4EFEB`.
- **Camera Flash / Switch Lens Toggles:** 44px circular or pill icon buttons, surface `#FDFBF7`, 1px solid `#E6DDD2`, warm gray icon (`#78716C`) turning to champagne gold (`#D4AF37`) when active.

### Photo Gallery & Film Strip Cards
- **Polaroid / Mount Card:** `#FDFBF7` body, 1px border `#E6DDD2`, `1rem` padding at top/sides, `1.75rem` padding at bottom for captions or guest signatures in italic serif typography.
- **Photo Grid:** Clean masonry or 3-column contact-sheet layout with `space-md` gaps. Hover state elevates card slightly (`translateY(-2px)`) with warm ambient shadow.

### Input Fields & Guest Signatures
- **Style:** Clean underline or inset box using `#FDFBF7` fill, 1px border `#E6DDD2`, focus border `#B89758` with no harsh default browser glow.
- **Labels:** `label-md` in `#78716C`, resting gracefully above the input field.

### Status Chips & Badges
- **Event Status (e.g., "Roll Complete", "Developing in 24h"):** Warm beige `#F4EFEB` background, 1px solid `#C5A880`, text `#2D2926` in `label-sm` uppercase.