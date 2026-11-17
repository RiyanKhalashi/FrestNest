# Scenario: "A day in the FreshNest admin office" (Fri 13 Nov 2026)

Cast: **Nusrat** (Super Admin), **Tanvir** (verification + delivery failures/cancellations), **Mitu** (reports & reviews, announcements, analytics). [P1–P8] = the 8 proposals, all accepted 2026-11-16.

1. **Setup (A9, A6)** — Nusrat adds Mitu with checkbox permissions; checks settings (bidding 12/24 h, 40% rule, offer window 6–12 h, alert 3 in 30 days, escalate 30 min [P1], lock release 15 min [P2]); checks the season calendar; adds farmer-typed "Lal shak" to the master list in one click [P7].
2. **Verification (A2, Tanvir)** — approve Sirajganj Sabji Ghar (Verified badge); blurry vehicle paper → "Ask for re-upload" [P3]; name mismatch → reject with reason; changed vehicle re-checked. Farmers never appear here.
3. **Delivery failures (A3)** — queue by urgency (shelf life); lock "Being handled by X"; history panel [P5]; approve → emergency sale starts; unhandled 30 min → urgent alert to all [P1]; fake "road blocked" → reject, back to In transit; idle lock auto-releases [P2].
4. **Cancellation requests (A4)** — after transport booked: warehouse fire → approve (vehicle freed, farmer relists); "price seems high" → reject.
5. **Reports & reviews (A4, A5, Mitu)** — reports grouped by reason with deal auto-attached; Hasan Traders 3 cancels → warn; Bhuiyan Traders 4 reports → 30-day suspend, active deal continues [P4]; later permanent ban, only Super Admin can lift; alerts for all roles [P6]; reported review dismissed, abusive review hidden.
6. **Announcements (A7)** — to one district/upazila, one role, or everyone.
7. **Analytics (A8)** — upazila level: where each product sells, top product per upazila, farmers by quantity, weekly prices, coming supply, trade flows, seasonality, produce saved by emergency sales [P8], company insights + CSV report.
8. **Activity log (A9)** + **permission preview** (Tanvir sees A1–A4; Mitu A1, A4, A5, A7, A8; Nusrat all).

Open items: see `docs/decisions/fyp-admin-open-items.md`.
