# TasseiGō Member + Business MVP — Proposed Plan

**Status:** Approved by the user; implementation authorized.

## Product scope and implementation decisions

Keep the approved TasseiGō marketing homepage at `/` and add the working product under `/app`. Build the first real multi-user release with the existing React, Wouter, Express, tRPC, Drizzle, and MySQL starter. Reuse its Manus OAuth flow; no separate email/password system or third-party identity provider is planned. This means app users will need a Manus account to sign in. Public visitors can browse without signing in.

The member marketplace will support public browsing of published gyms, yoga studios, pools, and wellness centers; filtering by activity type, city/area, and fee range/currency; and optional “near me” sorting when the visitor and listing have location coordinates. The browser will request location only after the visitor chooses that action. A visitor’s precise location will be used for the search and not stored. A business owner can optionally save their facility’s coordinates using browser geolocation or leave them blank and use text location. There will be no map-provider dependency or currency conversion.

Each public facility page will show owner-entered details and fees, structured community reviews, and a transparent TasseiScore calculated from published review ratings; facilities without reviews will show “Not rated yet,” never a fabricated score. A signed-in member can save a facility, create or edit their own review, manage personal fitness milestones, and join or update progress in a challenge. Digital badges may indicate challenge completion but have no monetary value.

A signed-in user can create and manage one or more facility profiles and use the business workspace to maintain private member records, log attendance, create facility challenges, and see attendance history plus upcoming membership expiries. Expiry reminders will appear in the workspace based on stored dates; they will not be email or push messages. Member records may include an optional contact email, but those details and attendance records will only be returned to the owning facility’s authorized users.

Each user can act as both a member and a facility owner. Facility ownership is derived from the authenticated user ID, not from a client-supplied role. Every business read or mutation will check ownership server-side. Public queries will return only published facility details and review summaries; they will never expose a business’s member directory or contact data. Members can only change their own favorites, reviews, milestones, and challenge participation.

Do not add live bookings, payments, business subscriptions, email reminders, sponsored placement, external map services, webinars/courses, or advanced AI/equipment-demand predictions in this MVP. Attendance reporting will summarize actual check-ins only; it will not present a forecast as AI. No demo facilities, testimonials, members, reviews, or other fictional records will be seeded. Empty states will guide the owner to create the first listing and the member to explore available spaces.

## Architecture and data flow

1. Preserve `client/index.html` and its marketing content. Add a separate Vite HTML entry at `client/app/index.html`; use React/Wouter for `/app` and nested product routes. Update the development and production history fallbacks so `/app/*` serves the app shell rather than the marketing homepage. Keep `/api/*` routes ahead of these fallbacks.
2. Use the existing typed tRPC client and split domain procedures into marketplace, member, and business routers. Public listing/search procedures remain public. Reviews, favorites, milestones, challenges, facilities, member records, and attendance mutations require a validated Manus-authenticated user.
3. Keep Manus OAuth/session validation from the starter, preserve the `webdev_app_session` cookie and `SameSite=None; Secure` Preview behavior, and return successful app login to `/app`. Do not introduce a development-only fake user or bypass authentication.
4. Extend the existing `users` schema additively with facility profiles, structured reviews, favorites, private facility-member records, attendance entries, member milestones, challenges, and challenge participation. Use foreign keys, unique constraints, indexes for public filters and owner-scoped lookups, and explicit ownership checks in server procedures. Keep migrations committed and additive; do not insert sample rows because development and production share the managed database.
5. Enable the already-authorized Manus server and managed database capabilities. Serve the built frontend from the existing Express container, retain the unauthenticated `/api/health` readiness path, and configure deployment against the existing Dockerfile. Use the project’s existing dependencies; no new package is expected for the core MVP.
6. Update `client/public/manus-routes.json` for the marketing and app pages. The route set will include `/`, `/app`, `/app/discover`, `/app/facilities/:id`, `/app/member`, `/app/business`, `/app/business/members`, `/app/business/attendance`, and `/app/business/challenges`; APIs and assets are excluded.

## Project structure

- `client/index.html`: existing public marketing homepage, retained.
- `client/app/index.html`: Vite entry for the product app shell.
- `client/src/App.tsx`: Wouter routes and shared application providers.
- `client/src/pages/`: marketplace, facility detail, member workspace, and business workspace screens.
- `client/src/components/AppShell.tsx` and existing UI components: responsive navigation, search/filter controls, facility cards, forms, tables, empty states, and confirmation/toast components.
- `client/src/lib/trpc.ts`: existing typed API client; extend only where needed.
- `client/src/app.css`: app-specific layout and component rules, using the approved TasseiGō palette and typography.
- `server/_core/`: retain the supplied OAuth, session, request-context, health, tRPC, and server startup contracts; adapt only the safe redirect/fallback needed for `/app`.
- `server/features/`: marketplace, member, and business tRPC procedures and ownership-aware queries.
- `shared/`: shared input schemas and domain types.
- `drizzle/schema.ts`, `drizzle/relations.ts`, and additive numbered migrations: persistent app entities and relationships.
- `client/public/manus-routes.json`: synchronized page route declaration.
- `Dockerfile`: preserve the supplied production build and startup contract, updating only if the selected container flow requires it.

## Design direction

Reuse the existing user-approved editorial fitness-tech identity rather than redesigning the brand.

- **Design movement:** Scandinavian editorial fitness-tech, balanced with a clear utility-first product interface.
- **Core principles:** make the member and business paths obvious; keep sensitive records visually and technically separate; use calm, scannable hierarchy; make all controls keyboard- and mobile-friendly.
- **Color philosophy:** retain warm paper and deep forest as the stable canvas, with the ownable lime accent reserved for active states, progress, and meaningful calls to action. Preserve the existing user-controlled light/dark theme.
- **Layout paradigm:** use a horizontal discovery workspace with filters alongside results on wide screens, and a persistent compact role-aware navigation for app pages. Business tools use a clear sidebar-to-workspace composition with readable tables and summaries instead of dense dashboard tiles. Collapse naturally to a single column on mobile.
- **Signature elements:** the existing TasseiGō circular mark; restrained lime status/progress accents; forest-green panels and soft rounded facility cards.
- **Interaction philosophy:** browsing is open; save/review/business actions explain when sign-in is needed. Forms validate inline, mutations confirm success or failure, and empty states offer the next real action. Never represent a static number or sample record as live data.
- **Animation:** reuse brief 160–220 ms transitions for navigation, dialogs, and feedback; avoid motion that obscures data; respect `prefers-reduced-motion`.
- **Typography system:** DM Sans for interface copy and forms; Manrope for page titles and section headings. Use compact labels and larger page headings, maintaining the existing hierarchy.
- **Brand essence:** a fitness discovery and operations platform connecting members with places to move and helping local providers run stronger businesses; **clear, energetic, dependable**.
- **Brand voice:** direct and encouraging, never overclaiming. Example lines: “Find a place that fits your routine.” and “Keep every member visit in view.”
- **Wordmark & logo:** retain the existing custom TasseiGō wordmark and circular movement mark; do not substitute a generic dashboard logo.
- **Signature brand color:** TasseiGō lime `#C8F06C`, used as a focused accent rather than a large text background.
