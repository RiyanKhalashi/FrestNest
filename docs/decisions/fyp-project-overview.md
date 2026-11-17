---
name: fyp-project-overview
description: "Final year project website — agri marketplace connecting farmer, dealer, transport provider, admin; agreed core flow"
metadata:
  node_type: memory
  type: project
  originSessionId: cb4587f6-fb4f-4047-ba33-165ff67be311
  modified: 2026-11-12T19:56:46.130Z
---

University final year project (agreed with user, 2026-11-07). Website connecting 4 roles: Farmer, Dealer, Transport Provider, Admin. Context: Bangladesh (64 districts).

Agreed core flow:
1. Farmer creates profile, then lists products.
2. Dealers (within the listing's visibility scope) see products.
3. Farmer and dealer make a "primary deal".
4. Primary deal becomes visible to matching transport providers, who make offers.
5. Farmer and dealer can both see the transport offers; the **dealer** confirms one (not the farmer).
6. **Dealer pays for transport** (agreed 2026-11-08).
7. **Both farmer and dealer can cancel a Primary Deal** (agreed 2026-11-09). Farmer rule (corrected 2026-11-13): **no transport booked yet → cancels immediately**; **transport already booked → needs admin permission**, requested through a description box; after pickup not possible (delivery-failure process applies). A reason is also required on immediate cancels, for admin analysis (confirmed). **The dealer follows the same cancel rule** (confirmed 2026-11-13). Admin approves/rejects these cancellation requests (see [[fyp-admin-role]]).

Role naming (2026-11-13): the supervisor says the name "Farmer" should change because the real users are agri-entrepreneurs; user is choosing between "Uddokta" and "Krishi Uddokta". I recommended Krishi Uddokta, but the user **decided to keep the original name "Farmer"** (final, 2026-11-13). No rename.

Other agreed (2026-11-09): notifications are **in-app only**; **ratings & reviews are included**: after a completed deal the farmer rates the dealer and the transporter, the dealer rates the farmer; each rating = **stars + written comment**. Notifications UI = **bell icon with dropdown** in the top bar (no separate page). **Login = phone + password** (agreed 2026-11-13). Full walkthrough scenario ("One Harvest Season in Bogura") was confirmed apart from these changes.

Delivery failure case agreed — see [[fyp-delivery-failure]]. Admin role agreed — see [[fyp-admin-role]].

Still open (not yet decided): alternative delivery / delivery failure details, payments, tech stack, deadline, solo/group.

Details: [[fyp-transport-and-listing]], [[fyp-deal-bidding]], [[fyp-seasonal-weather]], [[fyp-transport-section]], [[fyp-delivery-failure]], [[fyp-admin-role]], [[fyp-prototype-plan]]. Workflow: [[fyp-collaboration-workflow]].
