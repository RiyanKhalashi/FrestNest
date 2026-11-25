---
name: fyp-responsive
description: Real web app works on tablet and phone; desktop look unchanged; slide-in menu at ≤1024px, single column at ≤640px
metadata:
  type: project
---

Agreed and built on 2026-11-18. Updates the "desktop-first" rule in [[fyp-prototype-plan]] for the real app (`frontend/`). The static `prototype/` stays desktop-only.

- **Root cause:** `body { min-width: 1180px }`, copied from the prototype, forced desktop width on every screen. It has been removed.
- **Desktop (>1024px):** looks exactly as before.
- **Tablet (≤1024px):** the sidebar becomes a **slide-in menu** opened by a ☰ button in the top bar, with a dimmed backdrop. It closes on tap-outside or navigation. (We planned an icon-only rail, but the nav items have no icons, so the slide-in menu is used here too.) Stats show 2 per row. The `g-main`, master/detail (`md`) and admin case splits stack. Filter forms show 2 per row. Transporter fleet shows 2 per row. The admin month grids show 6 per row, and the season calendar scrolls sideways.
- **Phone (≤640px):** everything is one column (grids, form rows, choices, offers, key-value lists, waybill ticket). The top bar shows only ☰, bell, avatar and Sign out. Tables with a header row scroll sideways inside their panel; short lists without a header fill the width and wrap. Notifications and modals use the full width. Month grids show 4 per row. Side padding is 16px.
- Code: `frontend/src/components/Shell.tsx` (menu button + `nav-open` state); the "Responsive" section at the end of `frontend/src/styles/base.css`; small responsive blocks in `transporter.css` and `admin.css`. Inline-style grids in pages are overridden with `[style*="grid-template-columns"]` selectors, so pages did not need edits.
- Checked with headless Chrome at 390px and 820px on all 4 roles: no sideways page scroll.
