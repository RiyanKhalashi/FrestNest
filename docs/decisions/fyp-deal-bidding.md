---
name: fyp-deal-bidding
description: "FYP agreed design for how the primary deal is made — two selling modes: open bidding (whole lot) or farmer's price with dealer quantity+price offers"
metadata:
  node_type: memory
  type: project
  originSessionId: cb4587f6-fb4f-4047-ba33-165ff67be311
  modified: 2026-11-12T19:56:47.208Z
---

Agreed with user on 2026-11-07. Part of [[fyp-project-overview]]; visibility rules come from [[fyp-transport-and-listing]].

Farmer chooses a selling mode when listing:

**Mode 1 — Open bidding**
- Open bidding: dealers can see the current highest bid. Bidders are **anonymous** to other dealers (e.g. "Dealer #1"); farmer sees real identities.
- Visibility scope applies: if the listing is within-district (incl. targeted nearby districts), only dealers in those areas can see it and bid.
- Farmer's listed price = base price (bids can't go below it).
- Bid is for the **whole quantity** only.
- **Farmer sets the bidding deadline**; system **warns** the farmer if the deadline is too close to the end of shelf life.
- **Highest bid wins automatically** (final, 2026-11-15 — user wants bidding simple): when bidding closes the highest bidder wins and the Primary Deal is created automatically. No farmer choice of winner, no per-listing winner rule. Accepted bid → Primary Deal → transport offers.

**Mode 2 — Farmer's own price (outside bidding)**
- Farmer sets an asking price; dealers send offers with their own **quantity and price**.
- Farmer accepts/rejects each offer.
- Remaining quantity is tracked; listing closes when all sold.
- Each accepted offer becomes its own Primary Deal with its own transport offers.
- Optional minimum order quantity set by farmer.
- Offers expire automatically if the farmer doesn't respond in time.
- Dealer offer = quantity + price per kg (total auto-calculated) + **response timer** set by dealer (quick options e.g. 2h/6h/12h/24h). **Minimum response time is set by the farmer** on the listing; max cannot exceed the listing's shelf-life safe time.
- Farmer sees countdown + notification.
- One active offer per dealer per listing; dealer can withdraw/edit before acceptance, locked after.
- Offer cannot exceed remaining quantity; conflicting offers auto-cancelled (dealers notified) when quantity runs out.
- Farmer may make ONE counter-offer; dealer accepts/rejects before their timer ends. (All agreed 2026-11-07)

**Bidding deadline (agreed 2026-11-07, user: "bidding part is perfect now")**
- System calculates a safe range; farmer picks inside it (later than safe = warning, still allowed).
- Minimum bidding time: 12 hrs (within-district), 24 hrs (nationwide).
- Latest safe deadline = harvest date + shelf life − (transport offer time ~6–12h + travel time + dealer resale time). Dealer resale rule: product reaches dealer with >= 40% shelf life left.
- Recommended deadline: ~1 day before harvest date, so pickup happens on harvest day.
- If no acceptable bid by deadline: farmer can extend once (within safe range); system suggests price reduction or switching to Mode 2.

**Mode 1 extras (agreed 2026-11-08)**
- **Minimum bid increment is set by the farmer.**
- **Buy Now price included** (optional, must be > base price, whole lot): dealer clicks Buy Now → confirm popup → **instant Primary Deal, no farmer approval** (agreed). Bidding closes, other bidders + farmer notified, transport stage starts. First click wins if simultaneous.
- **Buy Now disappears once the highest bid reaches the Buy Now price** (agreed); bidding then continues normally.
- Farmer can edit/remove Buy Now price freely until the first bid; **locked after the first bid** (agreed 2026-11-08).
- Anti-sniping and runner-up fallback: NOT included (user said not necessary).
