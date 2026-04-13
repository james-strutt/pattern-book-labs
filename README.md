# Land iQ Labs

A multi-app platform for property analysis and assessment tools, embedded as an iframe within the [Giraffe](https://giraffe.build) platform using the `@gi-nx/iframe-sdk`. Built with React 18, TypeScript 5.9, and Vite 7.

## Quick Start

```bash
npm install
npm run dev          # http://localhost:5173
```

### Prerequisites

- Node.js 22+
- A `.env` file with required environment variables (see [Environment Variables](#environment-variables))
- Access to the Giraffe platform (for full iframe integration)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Type-check (`tsc --noEmit`) and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Lint source files with ESLint |
| `npm run type-check` | TypeScript type checking (no emit) |
| `npm run test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage report |
| `npm run test:coverage:ui` | Coverage report with interactive UI |

## Architecture

### Platform Integration

Land iQ Labs runs as an **iframe-embedded application** within the Giraffe platform, using the Giraffe SDK (`@gi-nx/iframe-sdk`) for map layer manipulation, feature selection, and cross-iframe communication. Routing is state-based via `currentView` in `App.tsx` (not React Router).

### Application Pattern

Each app follows a consistent architecture:

1. **Self-Contained** — Own components, hooks, services, utilities, and types under `src/apps/[app-name]/`
2. **View-Based Routing** — Client-side view switching via React state
3. **Consistent Navigation** — Shared `AppNavigation` component across all apps
4. **Isolated State** — No cross-app dependencies; apps communicate via the Giraffe SDK

### Core Data Flow

```
User Input --> Component --> Service Layer --> External API / Giraffe SDK
                 |               |                    |
               State <----  Response  <-----------  Data
                 |
             Re-render
```

## Applications (32 apps)

### Analysis

| App | Description |
|-----|-------------|
| **Historical Imagery** | Explore historical aerial imagery dating back to the 1940s with timeline navigation, comparison mode, and bulk download |
| **Amenity Analysis** | Analyse amenities and points of interest within custom or predefined boundaries with interactive charts and map layers |
| **Development** | Search and map State Significant Developments and Development Applications from the NSW Planning Portal |
| **Climate Analysis** | Analyse projected temperature, rainfall, and fire weather trends under multiple emissions scenarios |
| **Isochrone** | Generate multi-modal isochrones (driving, transit, cycling, walking) with GeoJSON export and layer saving |
| **Slope Analysis** | Analyse elevation data and calculate slope percentages with spatial heatmap visualisation |
| **Wiki** | Discover Wikipedia articles related to selected properties for area context and history |
| **Compare** | Compare properties side by side across planning, value, environment, and amenity metrics |

### Assessment

| App | Description |
|-----|-------------|
| **Assess** | Comprehensive site evaluation with configurable criteria, status tracking, bulk operations, and detailed reporting |
| **Site Suitability** | Analyse suitability across planning, environmental, and infrastructure factors for single sites or shortlists |
| **Residential Feasibility** | Calculate residual land value with real-time construction costs, sales data, and LMR/TOD analysis |
| **Value** | Estimate property values using comparable sales analysis with automated enrichment and scoring |
| **Buy to Rent** | Compare long-term vs short-term rental strategies with comprehensive tax and cashflow analysis |
| **Triage** | Rapidly assess and prioritise government property portfolios with workflow management and analytics |
| **Scenario** | Model urban development scenarios integrating suitability, feasibility, and community services analysis |
| **Pattern Book** | Check site eligibility against NSW Housing Pattern Book designs with GFA, dwelling, and storey filtering |
| **Battery Storage** | Analyse financial viability of battery energy storage projects with 10-year return projections |
| **Shortlist** | Compare shortlisted properties with dashboard widgets for hazards, planning, heritage, and values |
| **Haystack** | Identify the greatest housing opportunities from a shortlist of sites with ranking and scoring |

### Reporting

| App | Description |
|-----|-------------|
| **PowerPoint Reports** | Generate professional property due diligence reports with automated map captures and planning data |
| **Exhibit** | Create interactive multi-step showcases with content blocks, map animations, and layer configurations |

### Tools

| App | Description |
|-----|-------------|
| **Spatialise** | Upload CSV files with lot identifiers to fetch geometry from NSW Land Parcel Property database |
| **GIS Utilities** | Merge and analyse GIS data with spatial/attribute joins and distance analysis |
| **Address Geocoder** | Batch geocode addresses from CSV/Excel to NSW coordinates with lot and property enrichment |
| **Developable Area** | Calculate developable area by excluding biodiversity, heritage, bushfire, and other constraints |
| **Site Screenshots** | Generate high-quality aerial imagery exports with customisable boundary overlays |
| **Chat** | Real-time team communication with channels, direct messages, threading, and property context |
| **SiteGen** | Generate enriched site features from map boundaries with automated planning and hazard data |
| **Merge Features** | Combine multiple property features into a single merged boundary with dissolved geometry |
| **Historical Lots** | Find lots no longer in the current NSW cadastre and retrieve historical boundaries |
| **Diagnostics** | Test service endpoints and SDK layers to verify availability and performance (admin only) |

## Project Structure

```
src/
├── apps/                        # Individual applications (32 apps)
│   ├── amenity/                 # Example app structure:
│   │   ├── components/          #   App-specific UI components
│   │   ├── hooks/               #   Custom React hooks
│   │   ├── services/            #   Business logic & API calls
│   │   ├── utils/               #   Helper functions
│   │   ├── constants/           #   App configuration
│   │   ├── types/               #   App-specific TypeScript types
│   │   └── index.ts             #   Barrel export
│   ├── addressgeocoder/
│   ├── assess/
│   ├── batterystorage/
│   ├── buytorent/
│   ├── chat/
│   ├── climate/
│   ├── compare/
│   ├── developablearea/
│   ├── development/
│   ├── diagnostics/
│   ├── exhibit/
│   ├── feasibility/
│   ├── gis/
│   ├── haystack/
│   ├── historicallots/
│   ├── imagery/
│   ├── isochrone/
│   ├── merge/
│   ├── patternBook/
│   ├── powerpoint/
│   ├── scenario/
│   ├── screenshot/
│   ├── shortlist/
│   ├── sitegen/
│   ├── slope/
│   ├── spatialise/
│   ├── suitability/
│   ├── triage/
│   ├── valuation/
│   └── wiki/
│
├── components/                  # Shared components
│   ├── ui/landiq/               #   Land iQ Design System
│   ├── shared/                  #   Common UI (ErrorState, LoadingState, modals)
│   ├── LandingPage/             #   App launcher homepage
│   ├── Navigation/              #   Top navigation bar
│   ├── AddressLotSearch/        #   Shared property search
│   └── PropertySelector/        #   Property selection component
│
├── services/                    # Global API services
│   ├── arcgisService/           #   ArcGIS REST API (boundaries, planning, sales, hazards)
│   ├── secureApiService.ts      #   Cloudflare Worker proxy integration
│   ├── shortlistService.ts      #   Shortlist persistence
│   ├── feedbackService.ts       #   User feedback
│   └── ...
│
├── utils/                       # Shared utilities
│   ├── geometry/                #   Turf.js wrappers & spatial ops
│   ├── formatters/              #   Data formatting (currency, area, date, address)
│   ├── auth/                    #   Authentication & admin utilities
│   ├── cache/                   #   Client-side caching
│   ├── services/                #   Proxy service utilities
│   └── map/                     #   Map-related utilities
│
├── constants/                   # Global constants
│   ├── featureProps.ts          #   Feature property field mappings (CRITICAL: never hardcode)
│   ├── analyticsEvents.ts       #   PostHog event constants
│   ├── uiLayout.ts              #   UI layout constants
│   └── appColors.ts             #   App colour configuration
│
├── hooks/                       # Shared React hooks
│   └── analytics/               #   PostHog analytics hooks
│
├── types/                       # Shared TypeScript type definitions
│   ├── geometry.ts
│   └── api/
│
├── lib/                         # Core library integrations
│   ├── logger.ts                #   Structured logging (replaces console.*)
│   ├── posthog.ts               #   PostHog analytics
│   ├── sentry.ts                #   Sentry error monitoring
│   └── supabaseClient.ts        #   Supabase client
│
├── config/                      # Configuration
│   └── appConfig.ts             #   App registry, categories & access control
│
├── workers/                     # Web workers
├── styles/                      # Global styles
├── App.tsx                      # Root component & state-based routing
├── main.tsx                     # React entry point
└── index.css                    # Global CSS
```

## Technology Stack

### Core

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18 | UI framework |
| TypeScript | 5.9 | Type-safe development (strict mode) |
| Vite | 7 | Build tool and dev server |

### Styling & UI

| Technology | Purpose |
|-----------|---------|
| Tailwind CSS 3 | Utility-first CSS framework |
| Land iQ Design System | Custom component library (`@/components/ui/landiq`) |
| Radix UI | Headless UI primitives (Accordion, Checkbox, Select, Tabs, Tooltip, etc.) |
| Lucide React | Icon library |
| Framer Motion | Animation library |

### Geospatial & Mapping

| Technology | Purpose |
|-----------|---------|
| Mapbox GL JS | Interactive map rendering |
| Turf.js | Geospatial analysis (buffer, intersection, area, centroid) |
| proj4 | Coordinate system transformations (GDA94 <> WGS84) |
| Giraffe SDK | Map integration and iframe communication |

### Data & Visualisation

| Technology | Purpose |
|-----------|---------|
| Chart.js 4 + React-ChartJS-2 | Chart rendering with data labels |
| Recharts | Additional charting |
| Axios | HTTP client |
| PapaParse | CSV parsing |
| ExcelJS | Excel file generation |
| PptxGenJS | PowerPoint generation |
| JSZip | ZIP file creation for bulk downloads |
| TipTap | Rich text editing |

### Observability & Auth

| Technology | Purpose |
|-----------|---------|
| PostHog | Product analytics (`@/lib/posthog`) |
| Sentry | Error monitoring (`@/lib/sentry`) |
| Supabase | Authentication and data persistence |

### Testing & Quality

| Technology | Purpose |
|-----------|---------|
| Vitest | Unit testing |
| Testing Library | React component testing |
| Playwright | End-to-end testing |
| ESLint 9 | Code linting with TypeScript rules |
| MSW | API mocking for tests |

## Environment Variables

Create a `.env` file in the project root:

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_POSTHOG_KEY` | Yes | PostHog API key |
| `VITE_POSTHOG_HOST` | No | PostHog host (defaults to `https://us.i.posthog.com`) |
| `VITE_SENTRY_DSN` | No | Sentry DSN for error monitoring |
| `VITE_PROXY_BASE_URL` | No | Cloudflare Worker proxy base URL |
| `VITE_BATTERY_STORAGE_ALLOWED_EMAILS` | No | Comma-separated emails for Battery Storage app access |
| `VITE_RELEASE_NOTES_AUTHOR_EMAIL` | No | Release notes author email |
| `VITE_AI_MODEL` | No | AI model identifier (defaults to `gpt-4.1-nano`) |
| `VITE_AI_MAX_TOKENS` | No | AI max tokens (defaults to `2000`) |

## Key Integrations

### ArcGIS REST Services

All NSW Government spatial data is accessed via `@/services/arcgisService`:

```typescript
import { queryPropertyBoundary, queryComparableSales } from "@/services/arcgisService";

const features = await queryPropertyBoundary(geometry);
const sales = await queryComparableSales(centroid, radiusMeters);
```

Available query domains: boundaries, planning controls (zoning, FSR, HOB), comparable sales, hazards (flood, bushfire, biodiversity, heritage).

### Secure API Proxy

API calls requiring secrets are routed through a Cloudflare Worker:

```typescript
import secureApiService from "@/services/secureApiService";

const data = await secureApiService.mapboxIsochrone(origin, intervals, profile);
const elevation = await secureApiService.googleElevation(locations);
```

In development, Vite proxies `/api/secure-api/*` to the Cloudflare Worker. In production, requests go directly over HTTPS.

### Feature Property Access

Feature properties are accessed via centralised constants (never hardcoded):

```typescript
import { FEATURE_PROP, getProp } from "@/constants/featureProps";

const address = getProp(feature, FEATURE_PROP.PROPERTY.ADDRESS);
```

## State Management

1. **Component state** — `useState`, `useReducer`
2. **App-scoped context** — Context API for shared state within app boundaries
3. **Persistent preferences** — `sessionStorage` / `localStorage`
4. **Giraffe SDK state** — Map layers and feature selection via `rpc.invoke()`

## Proxy Configuration

Development proxies in `vite.config.ts`:

| Route | Target | Purpose |
|-------|--------|---------|
| `/api/secure-api/*` | Cloudflare Worker | API key injection for third-party services |
| `/api/auth/*` | Cloudflare Worker | Authentication endpoints |
| `/api/nsw-spatial/*` | NSW Spatial Portal | NSW Government spatial data |
| `/api/proxy/*` | Cloudflare Worker | General purpose proxy (CORS bypass) |

## Performance

- **Code splitting** — Dynamic imports for large libraries (Chart.js, PptxGenJS)
- **Virtual scrolling** — `react-window` for large datasets
- **Client-side caching** — Via `@/utils/cache`
- **Debouncing** — Search inputs and filters (`lodash.debounce`)
- **Lazy loading** — Components loaded on-demand per app route

## Deployment

Production builds deploy via AWS, served at `labs.landiq.wspdigital.com`. API calls requiring secrets route through a Cloudflare Worker proxy in both development and production.

```bash
npm run build    # tsc --noEmit && vite build
```
