---
name: fyp-units
description: Farmer chooses the listing unit (kg, mon, ton); stored in kg internally; dealers see and bid in the farmer's unit
metadata:
  type: project
---

Agreed with the user on 2026-11-25. **Built the same day.**

**Units:** a farmer picks the unit for each listing: **kg**, **mon** (= 40 kg) or **ton** (= 1,000 kg). Count units (piece, hali, dozen) were considered and left out.

**Storage:** everything stays in kg in the database (quantityKg, pricePerKg, bids, offers, deals). The listing also saves its display unit. So bidding rules, Buy Now, vehicle capacity, transport offers, small-pickup limits and analytics do not change.

**Display:** the farmer's unit is used everywhere the listing appears, e.g. "25 mon · ৳1,400/mon": the listing form, the dealer marketplace, bids, dealer offers (quantity + price), deal cards and notifications.

**Dealers:** they see and bid in the farmer's unit (a mon listing gets bids per mon). The system converts to per-kg internally.

**Defaults Claude will use when building (the user can change them):**
- Each product gets a suggested default unit (e.g. potato → mon); the farmer can switch it.
- Prices per mon/ton are whole taka; quantities allow up to 2 decimals (e.g. 2.5 ton).
- The bid increment is shown in the listing's unit.
- Transport screens and admin analytics keep showing kg, because trucks and reports need one common measure.

**How it is built:** Prisma enum `Unit` (KG/MON/TON), `Listing.unit`, `Product.defaultUnit` (Potato and Mango → MON in the seed). Server `src/units.ts` (qtyText/priceText) is used for notifications and dealer error messages; web `lib/units.ts` (qty, per, toKg, toPerKg, fromKg, fromPerKg, fromPerKgUp) does the input conversion on the listing form, relist, farmer counter-offer, dealer bid and offer forms. Switching the unit on the form converts the numbers already typed. The dealer's minimum bid is rounded up in mon/ton so it still meets the per-kg minimum. Deal cards show "50 mon (2,000 kg)". Test: phase2 "listing unit".

