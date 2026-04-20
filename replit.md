# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

- **MoodWeather** (`artifacts/moodweather`) — React + Vite + Tailwind web app at `/`. The app shows a Chinese “心境气象站” homepage with city buttons, a frosted-glass weather card, weather-based mood advice, OpenWeatherMap-powered realtime weather via `VITE_WEATHER_API_KEY`, and Framer Motion transitions for city/data changes.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/moodweather run dev` — run MoodWeather locally through its configured service

## MoodWeather Configuration

- Development weather API key is read from `artifacts/moodweather/.env.local` as `VITE_WEATHER_API_KEY`.
- The key is intentionally not committed or hardcoded.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
