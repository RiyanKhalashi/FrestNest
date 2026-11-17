---
name: fyp-delivery-failure
description: FYP agreed delivery failure case — vehicle stuck mid-route, admin approval, emergency bid to dealers in the stuck district
metadata:
  type: project
---

Agreed with user on 2026-11-09. Part of [[fyp-project-overview]]; builds on [[fyp-transport-section]] and [[fyp-deal-bidding]].

Flow: vehicle stuck mid-route → **driver sends Delivery Failure request from the current district** → **admin approves/rejects** → farmer notified (after approval) → farmer sets **emergency bid** → all dealers in the stuck district notified and bid.

- Driver request fields (proposed, user did not object): current district, reason (Breakdown/Accident/Road blocked/Flood/Strike/Other), photo proof, product condition, usable quantity. System adds remaining shelf life.
- Admin: approve → emergency process; reject (with reason) → driver continues, status back to In Transit. Requests show urgency by remaining shelf life.
- Original dealer notified; original Primary Deal marked "Failed: Released for emergency sale" (proposed, user did not object).
- Farmer sets **duration + price drop**; system **suggests** values from remaining shelf life; **farmer can override**.
- Emergency bidding: open + anonymous; **highest bid wins automatically** (confirmed by user 2026-11-15, same as normal bidding). Pickup point = vehicle's current location.
- Delivery after emergency sale (**option c**): driver states in the failure request whether the vehicle can still move → if yes, same vehicle delivers to the new dealer; if no, a new transport stage opens for local transporters. OTP handover still applies.
- No bids → farmer can extend once / drop price further / **widen to neighbouring districts** of the stuck location (agreed).
- **Failures affect transporter rating** (agreed). My extra idea (admin-approved failures weigh less than rejected ones) not confirmed.
- Status: In Transit → Failure Requested → Admin Approved → Emergency Bidding → New Primary Deal → Delivered → Completed.

**Buy Now is included in emergency bids** (agreed 2026-11-13).
- **Emergency fallback preference** (confirmed 2026-11-13): once a Primary Deal exists, the farmer chooses in advance what happens if delivery fails and they don't respond quickly — system **auto-starts the emergency bid with suggested duration/price drop**, or **waits for the farmer**.

Not decided: whether this is the "alternative delivery" section the user mentioned or a separate one.
