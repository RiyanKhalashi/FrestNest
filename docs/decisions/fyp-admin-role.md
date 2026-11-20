---
name: fyp-admin-role
description: FYP agreed admin role — verification of dealers/transporters, product master list, reports & review moderation, multiple admins
metadata:
  type: project
---

Agreed with user on 2026-11-09. Part of [[fyp-project-overview]]; admin also handles [[fyp-delivery-failure]].

- **Verification**: dealers and transport providers must wait for admin approval before using the system (docs proposed: dealer NID + trade license; transporter NID + driving license + vehicle registration per vehicle). Verified badge on approved profiles. Admin can suspend/ban. **Farmers do NOT need verification** — can use the system immediately (agreed).
- **Admin manages the product master list** (name Bangla+English, category, shelf life, storage requirement) — agreed.
- **Cancellation monitoring/flag rule: NOT included for now.**
- **Complaints/reports + review moderation: included.** Every user can report users of the other roles (farmer ↔ dealer ↔ transporter). Admin: warn / suspend / dismiss; can hide abusive/fake reviews.
- **Multiple admins** (agreed structure): **Super Admin** (one) creates/removes admins, assigns permissions, controls system settings, product master list, season calendar, and is the only one who can lift a ban. **Admins** (many) get checkbox permissions: user verification, delivery failures, reports & reviews, announcements, analytics.
- Multi-admin rules (agreed): **lock while working** ("Being handled by X") so two admins can't act on the same request; **suspend/ban always needs a written reason**; **activity log** of every admin action.
- Delivery failure queue sorted by urgency, approve/reject with reason.
- **All nice-to-haves included** (agreed): season calendar management, in-app announcements (all users / one role / one district), system settings (min bidding time, 40% rule, offer window, etc.), analytics dashboard (charts), activity log.

**Accepted 2026-11-16 (all 8 of my proposals, user: "all your recommendations are good, implement them")**: (1) delivery failure unhandled 30 min → urgent alert to all admins with that permission + Super Admin (no auto-approve); (2) case lock auto-releases after 15 min idle, Super Admin can unlock; (3) verification has "Ask for re-upload" with reason dropdown (blurry / expired / name mismatch / wrong document) besides approve/reject; (4) suspension = temporary (7/30 days) or permanent ban; suspended user can't create new listings/bids/offers/trips, active deals continue (admin may cancel a specific one); (5) user-history panel beside every case; (6) auto-alert for all roles (dealer 3+ cancels, transporter 3+ failures/cancels, farmer 3+ cancels in 30 days) — alert only; (7) "Suggested by farmers" custom products → one-click add to master list; (8) "Produce saved by emergency sales" chart.
Admin pages: A1 Overview, A2 Verification, A3 Delivery failures, A4 Cases, A5 Users, A6 Products & seasons, A7 Announcements, A8 Analytics, A9 Admin team & settings (Super Admin). Prototype "Preview as" toggle: Nusrat (Super Admin) / Tanvir (verification + failures) / Mitu (reports, announcements, analytics).
**Analytics for the business model (2026-11-16)**: analysis must work at **upazila (sub-district) level**, not just district: which product sells most where, top product inside each upazila, which farmer sells what quantity, price ups and downs — so agricultural companies can later target their products. User also wants upazila level for product delivery (see [[fyp-transport-section]]).

## Account standing on the profile page (agreed and built 2026-11-20)
- Admin warnings and suspensions were only visible as a notification. Now every non-admin role (farmer, dealer, transporter) has an **"Account standing"** section at the top of **Profile & reviews**.
- **Private:** only the user sees it. Other people viewing a profile see ratings and reviews only, never warnings.
- Top line: Good standing / N warnings in the last 90 days / Suspended until … / Banned, with the reason.
- History table, newest first: Warning, Suspended (N days, until …), Banned, Lifted by admin, Suspension ended (added automatically when a suspension runs out). It shows the admin's written reason and a "New" tag for 7 days. The admin's name is not shown, only "FreshNest admin".
- The notification still goes out as before; the profile section is the permanent record. Data comes from AdminLog (targetUserId), endpoint `GET /api/profile/standing`.

## Simple admin mode for the demo (agreed 2026-11-20)
- Goal: a short, clear admin part in the project demo (about 4 minutes) that still shows the business model.
- **Simple mode (default on):** one admin (Super Admin, all permissions), **6 menu items**: Overview, Verification, Delivery failures, Cases, Users, **Business**.
- **Business page** = the business model in one place: upazila market report (with CSV), agri company subscriptions (৳1,500 per upazila per month), and sending sponsored announcements (opted-in farmers only, "Sponsored" label). The farmer's "Agri partner offers" consent switch stays on the profile.
- **Hidden, not deleted:** admin team & permissions (and case locks, which only matter with several admins), Products & seasons editing, the full Analytics "Platform & operations" charts (key numbers move to Overview), plain announcements page. The Super Admin can switch simple mode off to show everything again, e.g. if an examiner asks about several admins.
- Demo flow: Overview → approve a transporter's documents → approve a delivery failure (emergency sale) → warn a user in Cases and show it on their profile → Business: upazila report, company subscription, sponsored offer seen by a farmer.
