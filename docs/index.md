---
layout: home

hero:
  name: 'Polingo'
  text: 'Universal gettext-powered translations for modern JavaScript'
  tagline: Load .po/.mo catalogs once and translate everywhere — Node.js, browsers, and edge runtimes.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/ragnarok22/polingo

features:
  - title: Standard gettext catalogs
    details: Work with existing .po/.mo files and keep translators in their established tooling.
  - title: One-command onboarding
    details: Scaffold a new app with `pnpm create polingo-app` or upgrade an existing codebase via `npx polingo init`.
  - title: Runtime agnostic core
    details: Share the same translator across Node.js backends, web apps, edge functions, and tests.
  - title: Batteries-included loaders
    details: Use filesystem, fetch, or custom loaders with optional caching and hot reload support.
  - title: Friendly middleware
    details: Plug into Express or Fastify to auto-detect locales and expose translators per request.
  - title: TypeScript first
    details: Strict types, generics for configuration, and ergonomic developer tooling.
  - title: Production ready
    details: In-memory or localStorage caching, graceful fallbacks, and robust pluralization handling.
---
