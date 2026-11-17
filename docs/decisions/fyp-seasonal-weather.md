---
name: fyp-seasonal-weather
description: "FYP agreed seasonal weather recommendation for normal (open) vehicles — season calendar first, weather API later, warnings only"
metadata:
  node_type: memory
  type: project
  originSessionId: cb4587f6-fb4f-4047-ba33-165ff67be311
  modified: 2026-11-07T18:10:56.678Z
---

Agreed with user on 2026-11-08. Part of [[fyp-project-overview]]; relates to [[fyp-transport-and-listing]] and [[fyp-deal-bidding]].

- Season calendar (Bangladesh): Summer Mar–May (heat → ventilated vehicle / night or early-morning travel), Monsoon Jun–Oct (rain/humidity → covered vehicle or tarpaulin), Winter Nov–Feb (low risk; fog → allow extra travel time).
- Build order: **fixed season calendar first** (rules stored in the system); **weather API (e.g. OpenWeatherMap) later as bonus** for the actual forecast in the pickup district on pickup day.
- Applies **only to normal vehicles** (not ventilated/refrigerated).
- **Two-way**: in risky seasons it warns; in suitable weather (e.g. winter) it **recommends the farmer use a normal vehicle** (cheaper).
- **Advice only**: never blocks a choice, and does NOT reduce effective shelf life or change deadlines/suggestions automatically.
- Warning shown to: farmer when listing, transporter when sending an offer, dealer when confirming a normal vehicle in a risky season.
