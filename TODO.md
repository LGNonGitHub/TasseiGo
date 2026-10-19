# TasseiGō Website + Functional MVP — To Do

## Public positioning and inquiry paths
- [x] Create a public-facing English marketing website with a clear hero and positioning section presenting TasseiGō as “The Operating System for Fitness.” Provide separate inquiry-oriented calls to action for fitness businesses and prospective members; do not imply live booking or account creation.

## Industry problems
- [x] Explain the industry problems from the pitch deck: difficulty selecting a suitable fitness center; outdated gym administration; inconsistent member habits; weak long-term engagement; unpredictable crowding; and limited visibility for smaller or niche fitness businesses.

## Discovery marketplace
- [x] Present a fitness marketplace for gyms, yoga studios, pools, and wellness centers. Explain discovery by distance, fees, TasseiScore, structured reviews, and testimonials without fabricating listings or presenting live booking.

## Business operations and flexible participation
- [x] Explain digitized member records, automated renewal and expiry reminders, flexible session-based participation, and improved attendance forecasting.

## Member engagement and fitness intelligence
- [x] Present personalized milestones, rewards, challenges, community competitions, and peer benchmarking as tools for sustained participation.
- [x] Explain attendance and equipment-demand prediction, crowd-awareness benefits, and schedule recommendations without claiming capabilities beyond the pitch deck.

## Growth and product principles
- [x] Cover fitness-business discoverability, sponsored discovery, digital courses, webinars, and additional revenue channels.
- [x] Highlight intuitive use, customization, mobile-friendly access, workflow automation, compliance monitoring, and real-time data access.

## Motion and theme preferences
- [x] Add polished UI animations and interactive visual components that enhance the existing fitness-tech design without reducing readability or usability.
- [x] Add a user-controlled dark mode that remains accessible, works responsively, and remembers the visitor’s chosen theme.
- [x] Respect reduced-motion preferences for animated content.

## Reference comparison and guided onboarding
- [x] Compare the supplied CarbonZero site’s navigation, content hierarchy, interactive experience, and guided tour with TasseiGō; adapt relevant interaction patterns to TasseiGō without copying its brand, climate data, or product-specific tools.
- [x] Add a keyboard-accessible four-step TasseiGō tour for Discover, Operate, Engage, and Grow, with links to the corresponding page sections and no implication of live booking or account creation.
- [x] Preserve a concise comparison note with the reference URL and the adopted/non-adopted patterns.

## Commercial model, market context, timing, and roadmap
- [x] Explain the subscription-based model, modular add-ons, and integration support without inventing pricing.
- [x] Present the pitch deck’s market-opportunity themes—focused industry segments, high switching demand, and low digital penetration—without inventing market-size figures or statistics.
- [x] Explain the relevance of cloud infrastructure, mobile access, and remote work.
- [x] Show the Q1–Q4 roadmap: Q1 platform foundation and pilots; Q2 optional add-ons, system improvements, speed, and scalability; Q3 integrations, data sync, and automation; Q4 team workspaces, sharing controls, reporting, and scenario planning.

## App shell and authentication
- [x] Keep the marketing site available at `/` and add the functional product app at `/app` with nested marketplace, member, and business pages.
- [x] Allow unauthenticated visitors to browse published fitness-space listings. Require Manus OAuth for account-backed actions; use the starter’s validated session flow, preserve the `webdev_app_session` cookie and its embedded Preview behavior, redirect successful sign-in into `/app`, and do not use fake development users or a separate email/password system.

## Member marketplace
- [x] Let visitors discover published gyms, yoga studios, pools, and wellness centers and filter by activity type, city/area, fee range, and currency. Provide optional “near me” sorting only after the visitor explicitly requests browser geolocation; do not store the visitor’s precise location. Do not add a map provider or currency conversion.
- [x] Show owner-entered public facility details and fees, structured community reviews, and a transparent TasseiScore derived from published review ratings. Show “Not rated yet” when no ratings exist and do not invent listings, reviews, testimonials, customers, or scores.
- [x] Let a signed-in member save a facility and create or edit only their own review; prefill the member’s existing review in edit mode using a protected, member-scoped query.

## Member workspace and engagement
- [x] Let a signed-in member create and manage personal fitness milestones, join challenges, and update their own challenge progress. Digital completion badges must have no monetary value. Members can read or change only their own private workspace records.

## Business workspace and operations
- [x] Let a signed-in user create, edit, publish, and manage one or more facility profiles they own; users may act as members and facility owners at the same time.
- [x] Let a facility owner maintain private member records, including an optional contact email, and log attendance for those records. Enforce facility ownership server-side for every business read and mutation; never expose business member directories, contact details, or attendance records through public marketplace queries.
- [x] Show attendance history based on actual check-ins and upcoming membership expiries in the owning facility’s dashboard. Expiry reminders are in-app only, computed from stored dates; do not send email or push reminders.
- [x] Let a facility owner create and manage challenges for that facility. Do not present attendance history as AI prediction or equipment-demand forecasting.

## Data and capability boundaries
- [x] Keep the database free of seeded or fabricated demo facilities, members, reviews, challenges, or attendance. Preserve useful empty states until owners or members enter real data. Apply committed, additive migrations only; development and publication share the managed database.
- [x] Do not add live bookings, payments, business subscriptions, email/push notifications, sponsored placement, external maps, courses/webinars, or advanced AI/equipment-demand predictions in this MVP.

## Evidence and claim boundaries
- [x] Use the supplied pitch deck as the source of product information. Do not invent market-size figures, adoption statistics, testimonials, customers, pricing, launch dates, or product capabilities not present in the deck.
