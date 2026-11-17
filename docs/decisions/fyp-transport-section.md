---
name: fyp-transport-section
description: FYP agreed transport stage — matching, district search, per-vehicle offers, dealer confirms, OTP pickup/delivery, cost-saving tag (no self-arranged, no late pickup)
metadata:
  type: project
---

Agreed with user on 2026-11-09. Part of [[fyp-project-overview]]; vehicles defined in [[fyp-transport-and-listing]]; weather in [[fyp-seasonal-weather]].

- Matching: Primary Deal shown only to transporters with a vehicle whose **facility** meets the storage requirement and **capacity** >= deal quantity.
- District: transporter **searches/filters deals by the farmer's (pickup) district** — they choose which districts to look at (not a hard auto-restriction by operating district).
- Transporter picks **a specific vehicle** per offer; enters price, pickup date/time, estimated delivery, optional note. Vehicle already booked at that time cannot be offered again.
- One active offer per transporter per deal; edit/withdraw until dealer confirms. Offer window (~6–12h).
- Farmer and dealer both see offers; **dealer confirms** and **dealer pays**. Others notified; vehicle marked booked.
- Tags on offers: **💰 Cost-saving** (normal vehicle in suitable weather — agreed) and ⚠️ weather risk (normal vehicle in summer/monsoon).
- Status: Transport Confirmed → Picked Up → In Transit → Delivered → Completed (dealer confirms receipt).
- **OTP**: farmer gives code at pickup, dealer gives code at delivery — include if implementation is feasible.
- **Payment: skipped for now** (no payment recording yet).
- No offers in window → dealer can extend the window once. **Self-arranged transport REMOVED** (user, 2026-11-09: not included for now).
- Transporter cancels after confirmation → deal reopens for transport.
- **No late-pickup functionality** (user removed it 2026-11-09).

Next topic the user wants: **alternative delivery** — they see it as the main unique, real-problem-solving, interactive section of the project.
