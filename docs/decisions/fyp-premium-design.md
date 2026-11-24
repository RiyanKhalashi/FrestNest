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
- 2026-11-21: a mix with Design 2.0 (ivory background, Lora italic accents, bigger hand-drawn crops, mint glow) was previewed (docs/design/freshnest-mix-preview.html) and **rejected**: keep the premium design as built.

## Soft tints instead of plain white (2026-11-21, final — built)
- Cultural touches (six seasons, alpona, kantha stitch, truck art) were previewed and **not wanted**.
- Kept premium v1, but plain white surfaces now use a light role shade:
  farmer mint-cream `#F8FBF4` on `#EAF2E7`, dealer blue-white `#F6F9FC` on `#E7EEF5`,
  transporter warm cream `#FFFAF3` on `#F5EBDF`, admin grey-green `#F7FAF8` on `#E8EEEA`.
- Landing page background `#F6F9F1`, feature cards warm sand, log-in card `#FCFDF9`. Form inputs stay white.

**Home page account menu (2026-11-25):** a signed-in visitor sees their name + role chip in the top-right with a menu: Open dashboard, Switch account (log out → /login), Log out (stays on home). The "Bangladesh's farm-gate marketplace" pill above the hero heading was removed.
