---
name: fyp-premium-design
description: Premium redesign chosen 2026-11-20 — HealthNexus-style landing with all FreshNest features + business model, new log-in/register, premium dashboards; old-repo greens + Plus Jakarta Sans
metadata:
  type: project
---

Agreed with the user on 2026-11-20, building the same day. Replaces the earlier role-look ideas in [[fyp-prototype-plan]] for the real app.

- Reference: the user's old project (github maishamoon/FreshNest: ivory/forest/mint greens, rounded cards, sidebar with icons, colour per role, a public home page) + the structure of healthnexus-bd.vercel.app (dark hero with grid, product card with floating notification chips, bento feature grid with mini UI, numbered steps, role tabs, dark numbers band, gradient CTA band, dark footer; centred log-in/register card with a gradient top edge).
- The user compared two previews and chose **version 1** ("premium", busier) over a cleaner version 2. v2 is kept only as docs/design/freshnest-premium-v2-rejected.html.
- Fonts: **Plus Jakarta Sans** everywhere (800 for big headlines, tight tracking), IBM Plex Mono for codes/plates.
- Palette: night #06170F, green #157347 (buttons), soft green #E4F2E9, lime gradient #8FE6B4→#D7EF7F for one highlighted phrase; red #B42318, blue #2B5C8C, amber #E8912D.
- Role accents: farmer green #157347, dealer blue #2B5C8C, transporter orange #BF5B0E, admin deep green #0E3B2A. Each role's welcome card is a dark gradient in its colour.
- Public home page at `/`: hero "From the field to the dealer, before it spoils." + live listing card; nine feature cards (sell your way, codes, right vehicle, transport bargaining, season advice, emergency sale tiers, fair play, live updates, upazila reach); 4 steps; role tabs; **business model section** (upazila reports ৳1,500/upazila/month, sponsored offers with consent); trust numbers; about quote; CTA; footer. Logged-in users see "Open dashboard".
- Log in / Register: centred card, gradient top edge, grid + field-line background; Register has a Farmer/Dealer/Transporter switch in the role's colour; same fields and rules as before.
- Dashboards: white sidebar with logo, the user's card, icon menu, active item as a dark pill; top bar; dark gradient welcome card; KPI cards; rounded panels and pill tags. Every screen and feature stays the same; only the look changes.
