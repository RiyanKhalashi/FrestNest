---
name: fyp-prototype-plan
description: FYP prototype approach — clickable HTML dashboards per role, desktop-first, English, non-generic earthy green style, folder ~/freshnest
metadata:
  type: project
---

Agreed with user on 2026-11-09. Part of [[fyp-project-overview]].

- Project folder: **/Users/Apple/freshnest** (user chose the name "freshnest" — likely the project name FreshNest).
- Approach: **clickable static HTML prototype** with dummy data from the agreed scenario (Karim, Selina, Jalal, Hasan Traders, Joypurhat Fresh, Kawran Bazar Agro, Rangpur Mart, Bogura Logistics, Cold Line BD, Mintu Pickup). No backend/login yet.
- Role switcher at top; every screen has a code (F1.., D1.., T1.., A1..) so the user can give feedback like "F2: change X".
- Review order, one role at a time: **Farmer → Dealer → Transport Provider → Admin**. Build Farmer first, wait for review before next role.
- **Desktop-first**, **English only** for now.
- Style: green + earthy tones, but it must **NOT look like a typical AI-generated design** (avoid generic gradients/cards/emoji-heavy look; aim for a distinctive, human-designed feel).
- **No private link** — keep files local in the folder (user, 2026-11-09).
- Farmer pages agreed: F1 Home, F2 Create listing, F3 = **F3 (My listings) + F4 (Deals & delivery) merged into one page named "My Sales"** (agreed 2026-11-13), F4 Profile & reviews.
- **Do NOT start building until the user explicitly says to build.** User will tell when they have time.

**Progress (2026-11-13)**: Farmer dashboard BUILT and awaiting user review — `/Users/Apple/freshnest/prototype/farmer.html` + `css/base.css` (shared styles for all roles) + `js/farmer.js`. Screens F1 Home, F2 Create listing, F3 My Sales, F4 Profile & reviews. Style (revised 2026-11-13 at user's request: whiter tone, more minimal, farming graphics): near-white background, white cards and white sidebar, soft green accents, Fraunces serif headings + IBM Plex Sans, 4–6px corners, thin light borders, no emoji. Farm line-art as inline SVG: sprout logo, field scene in the Home banner and sidebar, small crop icons (tomato, potato, cauliflower, chili, brinjal) defined as <symbol>s at the top of farmer.html — reuse the same graphics for other roles. Second revision same day (user: "not that minimum", wants faded green + slight golden accent): faded sage-green page background and sidebar, white cards with faint green header bands, gold (#b98a1e) used sparingly — active menu marker, short underline under page titles, top line of the stats strip, step numbers, wheat stalks in the illustrations. Keep this palette for the other role dashboards. Prototype "today" is fixed at Fri 13 Nov 2026 10:50 AM. Next after farmer review: Dealer dashboard (dealer.html) reusing base.css.

**Status as of 2026-11-15 (handoff for a fresh session)**: Farmer dashboard is complete with all corrections (custom product shelf life/vehicle, cancel rules, highest-bid-wins-automatically in normal and emergency bidding, role name stays "Farmer"). **Next step: propose the Dealer dashboard pages (D1…) for the user to confirm, then build dealer.html reusing css/base.css and the SVG graphics.** User is on a usage-limited plan and wants to save tokens: keep replies focused, don't re-read whole files when a grep or a small range is enough, don't take screenshots unless checking a visual change.

**Scenario doc (2026-11-15)**: `docs/scenario-farmer-dealer.md` — "Karim and Hasan, One Winter Season", 8-part demo walkthrough of all Farmer + Dealer functions with a coverage table. Numbers aligned to the prototype data (not the other way round); prototype unchanged.

**Transporter dashboard BUILT (2026-11-15), awaiting review**: `prototype/transporter.html` + `js/transporter.js` + `css/transporter.css` (loaded after base.css, scoped to body.tp). Pages T1 Home, T2 Find deals, T3 My trips (tabs Offers/Confirmed/On the road/Completed), T4 My vehicles, T5 Profile & reviews. User chose the "Road & waybill" look: dark forest sidebar, rust accent (#a5532c) instead of gold, trips as waybill tickets with dashed tear line, route lines A→B, truck/van line art. Transporter = Bogura Logistics (owner Rafiq Islam), 3 vehicles: trucks Bogura-Ta 14-0932 / 14-1177 (normal 3 t), covered van Bogura-Ma 11-2245 (ventilated 2 t). Data ties to farmer/dealer: offers on FN-1042 and FN-1047, FN-1036 in transit (dealer code 7390), FN-1045 confirmed, emergency chili FN-1031 in Sirajganj. Prototype toggles: not-verified, May (summer) weather warning. Role switcher on all pages now links Transporter. Next: Admin dashboard (A1…) after review.

**Admin dashboard BUILT (2026-11-16), awaiting review**: `prototype/admin.html` + `js/admin.js` + `css/admin.css` (body.ad, "office ledger" look: light sidebar, slate-blue accent #2f5568). A1–A9 as agreed, all 8 proposals implemented, "Preview as" Nusrat/Tanvir/Mitu hides pages by permission. Permission "deals" = delivery failures + cancellation requests (my grouping). Analytics A8 is upazila-level (41 upazilas in Bogura, Gaibandha, Joypurhat, Rangpur, Sirajganj): filters period/district/upazila/product; KPIs; area×product heatmap (click to drill down); top products bars; weekly price lines (≤4 products); farmers by quantity with company-contact consent; coming supply 30 days; trade flows upazila→buyer district; product×month seasonality; produce saved chart; company insights; CSV company report. Charts use the dataviz reference palette (product = fixed categorical slot). Upazila-level changes for Farmer/Dealer/Transporter pages were only SUGGESTED, not built yet.
