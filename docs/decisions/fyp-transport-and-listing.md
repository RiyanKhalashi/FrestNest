---
name: fyp-transport-and-listing
description: FYP agreed design for transport provider vehicles and farmer product listing with shelf-life based suggestions and visibility scope
metadata:
  node_type: memory
  type: project
  originSessionId: cb4587f6-fb4f-4047-ba33-165ff67be311
  modified: 2026-11-12T19:33:40.332Z
---

Agreed with user on 2026-11-07 (Step 2). Part of [[fyp-project-overview]].

**Transport provider**
- At registration selects: vehicle type, load capacity, facilities, operating districts (multi-select). Can update later.
- One provider can have **multiple vehicles**, each with its own type/capacity/facilities. Matching is per vehicle.
- Suggested dropdowns: type (Pickup / Mini truck / Truck / Covered van), facilities (Normal / Ventilated / Refrigerated).

**Farmer product listing**
- Farmer selects category (Vegetable / Fruit) then the specific product from a dropdown.
- System knows each product's shelf life + storage requirement (product master list — who manages it is not decided yet).
- System suggests visibility scope: same district with normal vehicle, or nationwide only with a vehicle that has the required facility (e.g. strawberry → refrigerated). Long-shelf-life items (potato) → nationwide with normal vehicle.
- Farmer **can override** the suggestion.
- If the product is **not in the list**, the farmer types the name and **sets the shelf life (days) and the vehicle needed themselves** (corrected 2026-11-13). The system then uses those values for suggestions, deadlines and matching (my reading; without the values there is no automatic suggestion).
- Farmer can manually choose **targeted districts** for visibility.
- Transport offers come only from vehicles matching storage requirement, capacity, and operating district.

**Harvest date & urgency (agreed 2026-11-07)**
- Only ONE listing type (no separate pre-harvest/post-harvest types). Farmer can list before harvesting by giving a harvest date (e.g. "I'll harvest on the 15th").
- Farmer must always give **exact quantity and price**, even before harvest.
- Shelf-life countdown + urgency badge start only **after the harvest date**, and only if the product isn't sold by then.
- After harvest, as shelf life runs down, system can suggest: narrow scope nationwide → within district, and reduce price.
- Farmer can pick **targeted nearby districts**; these count as "within district" scope (treated as local, e.g. normal vehicle OK).

- **Neighbouring districts as quick-select** checkboxes when farmer chooses within-district scope (agreed).
- **Auto-expire**: listing hides automatically when harvest date + shelf life has passed (agreed).

User said to keep the Admin role aside for now (2026-11-07) — do not assume admin features until they bring it up.

**Listing extras (agreed 2026-11-13)**
- Farmer can upload **multiple photos** per listing.
- Price unit is **per kg only** (no mon).
- **Edit listing**: free before the first bid/offer, locked after.
- **Withdraw listing**: allowed only before the first bid/offer; after that the bidding must finish (or cancel later at Primary Deal stage).
- Farmer profile fields: name, phone, photo, district, upazila, village, crops usually grown (optional).
