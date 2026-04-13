# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NSW Pattern Book — a React app for evaluating pre-designed housing patterns (architect-vetted building templates) against real properties in NSW, Australia. It runs as an **iframe embedded inside the Giraffe GIS platform** via `@gi-nx/iframe-sdk`, not as a standalone web app.

A "pattern" is a curated housing design (e.g., "Small-Lot Apartments-01", "Terraces-01") with dimensional constraints, dwelling yields, FSR/height limits, and setback rules. The app checks whether patterns are eligible for a given property based on ~15 independent criteria (zoning, lot dimensions, heritage, flood, bushfire, contamination, aircraft noise, FSR/HOB compliance, etc.).

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck (`tsc -b`) then build with Vite
- `npx eslint src/` — lint
- `npx prettier --check src/` — format check
- `npx prettier --write src/` — auto-format

No test framework is configured.

## Architecture

### Embedding & Platform Communication

The app communicates with the host Giraffe platform via typed RPC calls (`rpc.invoke(...)` from `@gi-nx/iframe-sdk`). The typed wrapper is in `src/services/iframeSDK.ts`. Map manipulation, feature selection, layer management, and UI layout control all go through this RPC bridge.

### Source Layout

- `src/apps/patternBook/` — the main (and only) app module, containing all domain logic
  - `components/` — UI split into `map/`, `placement/`, `selection/`, `results/`
  - `hooks/` — React hooks for eligibility, placement, map layers, shortlist analysis
  - `services/` — domain services (placement algorithms, batch analysis, export, flow DAG)
  - `utils/` — spatial fitting, eligibility checks, block catalogue, frontage detection, site classification
  - `types/` — domain types (`patternBook.ts`, `shortlistAnalysis.ts`, `placement.ts`)
  - `constants/` — endpoints, envelope setbacks, map styles, pattern-to-block mappings
- `src/components/ui/landiq/` — shared design system (buttons, badges, cards, alerts, tooltips, progress) following Land iQ/NSW branding with `theme.ts`
- `src/services/` — platform-level services (iframe SDK, ArcGIS geometry, error logging, LMR, property boundaries)
- `src/lib/` — `logger.ts` (structured logging with sensitive-key sanitization), `posthog.ts` (analytics), `utils.ts` (CSS helpers via clsx + tailwind-merge)
- `src/utils/` — shared utilities for geometry, config, formatting, type guards
- `src/constants/` — zone colors, map styles, feature property mappings, analytics events, UI layout
- `_legacy/` — old v1 code kept for reference; not imported by current app

### Path Alias

`@/` maps to `./src/` (configured in both `vite.config.ts` and `tsconfig.json`).

### Two Selection Modes

1. **Single** — analyze one property; shows eligible patterns with variant cards ranked by fit score
2. **Shortlist** — batch analyze multiple properties from a saved shortlist; produces eligibility matrix, summary statistics, and per-pattern/per-property grouped views

### Spatial Fitting Pipeline

Blocks are pre-authored CAD elements in a Giraffe project. `blockCatalogue.ts` parses block names to extract dimensions. `validPatternsForSitePlacement.ts` does geometric prefiltering (rotating site edges, checking if variant dimensions fit). `patternBookPlacementService.ts` handles actual placement on the map.

### API Proxy

All external API calls go through a Cloudflare Worker proxy (`VITE_PROXY_BASE_URL` in `.env`) to handle CORS. The proxy whitelists ~30 NSW/ACT spatial service domains. Configuration is in `src/utils/config/proxyConfig.ts`.

### Key External Data Sources

- NSW ArcGIS spatial services (contours, aircraft noise, contamination, heritage, flood)
- LMR (Low and Mid-Rise) housing policy catchments
- LEP (Local Environmental Plan) density controls (FSR/HOB)
- Giraffe project bundles containing block definitions

## Styling

- Tailwind CSS v4 via `@tailwindcss/vite` plugin (not PostCSS)
- Custom theme tokens defined in `src/index.css` under `@theme` (Land iQ/NSW brand colors, Public Sans font)
- Prettier configured with `printWidth: 120`

## ESLint Configuration

- `@typescript-eslint/no-explicit-any` is **off**
- `@typescript-eslint/ban-ts-comment` is **off**
- Unused vars are warnings (with `_` prefix ignored)

## Environment Variables

- `VITE_PROXY_BASE_URL` — Cloudflare Worker proxy URL for API calls
- `VITE_PATTERN_BOOK_PROJECT_ID` — Giraffe master pattern project ID (default: 70951)
