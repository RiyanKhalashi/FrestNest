---
name: fyp-report-dropdown
description: FYP agreed report form — reason dropdown, auto-linked to deal; same pattern all roles; dealer cancel count, admin alert, one-click relist
metadata:
  type: project
---

Agreed with user on 2026-11-15. Part of [[fyp-admin-role]] (cross-role reports); cancel rules in [[fyp-project-overview]].

Trigger example: dealer cancels a Primary Deal → farmer reports the dealer to admin.

- **"Report dealer" button** on the cancelled deal (F3 My Sales).
- Report is **auto-linked to the deal**: deal ID, product, qty, price, cancel time, dealer's cancel reason are attached automatically — farmer does not need to describe what happened.
- **Reason dropdown** (pick one): Cancelled without a valid reason / Cancelled after transport was booked / Did not receive the product at delivery / Asked for a lower price after the deal / Rude or abusive behaviour / Fake or misleading information / Other.
- **Comment box optional**; required only when "Other" is picked. Optional photo/screenshot proof.
- Admin sees reports grouped by reason (easy analysis) → warn / suspend / dismiss.

Also confirmed by user (2026-11-15):
- Same dropdown pattern for every report direction (each role gets its own reason list).
- Dealer cancellation count shown on dealer profile ("3 cancellations in 30 days").
- Automatic admin alert when a dealer cancels often (e.g. 3+ in 30 days).
- After a dealer cancels, farmer can relist the same listing in one click or switch selling mode.
