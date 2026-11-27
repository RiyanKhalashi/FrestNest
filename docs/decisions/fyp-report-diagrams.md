---
name: fyp-report-diagrams
description: Report diagrams — black and white, styled like the batchmate's HealthNexus BD report; activity per role, sequence per function (8); 16 built 2026-11-26 and the deployment diagram on 2026-11-27, as draw.io + PNG; all done
metadata:
  type: project
---

Agreed on 2026-11-26. **Built on 2026-11-26** (all except the Chapter 4 deployment diagram), after the user agreed to have them drawn with Chapter 2.

**Rule:** make only the diagram types that appear in the sample DIU report ("Demo Project Doc.pdf"). Do not add extra types such as DFD, a state diagram or a separate system architecture diagram. Each diagram type is one diagram, **except sequence diagrams, which are split by functionality** (the user's change, 2026-11-26).

**Look (user, 2026-11-26):** **black and white**, drawn like the diagrams in the batchmate's report "HealthNexus BD" that the user shared:
- Block diagram: labelled group boxes (Users, Web app, Server, Data, External services) with small boxes inside, joined by arrows labelled HTTPS / REST API / Prisma ORM.
- Gantt chart: task rows, month columns, plain bars, milestone diamonds in a row underneath.
- Use case diagram: one system boundary, actors on both sides, `<<include>>` where one use case always includes another; may be rotated to fit the page.
- Activity diagrams: swimlanes for the role and the system, decision diamonds with Yes/No, start and end dots.
- Sequence diagrams: actor, Web app, Server, Database and any outside service as lifelines; solid arrows for calls, dashed for replies, `alt` frames for outcomes.
- ER diagram: every table from the Prisma schema with PK/FK/UK and column types, crow's-foot lines.
- Deployment diagram: boxes for the browser and app, Vercel, Render, Neon, outside services, GitHub and GitHub Actions.

**Format:** `.drawio` files in `docs/report/diagrams/`, editable with the user's VS Code draw.io extension, with a PNG of each for the Word report.

| # | Diagram | Report section | Content |
|---|---|---|---|
| 1 | Block diagram | 1.4 | 4 roles → website / Android app → API → database, Cloudinary, BulkSMSBD (password reset SMS), live updates, timed jobs |
| 2 | Gantt chart | 1.6 | The 8 phases of Table 1.3 in Chapter 1 (23 Mar – 30 Nov 2026) with milestones M1–M8 |
| 3 | Use case diagram | 2.4.1 | One diagram: Farmer, Dealer, Transport Provider, Admin (+ System Timer) |
| 4 | Activity diagrams | 2.4.3 | One per role (user's choice, 2026-11-26): Farmer, Dealer, Transport Provider, Admin, each with a FreshNest swimlane |
| 5 | Sequence: Login | 2.4.4 | Phone + password → Express → DB → JWT cookie |
| 6 | Sequence: Registration and verification | 2.4.4 | Dealer or transporter registers with documents → pending → admin approves or rejects |
| 7 | Sequence: Password reset by SMS | 2.4.4 | Phone → one-time code through BulkSMSBD → new password (feature not built yet, see [[fyp-sms-password-reset]]) |
| 8 | Sequence: Open bidding to deal | 2.4.4 | Bid → API → DB → Socket.IO update → 5-second job picks the highest bid → deal |
| 9 | Sequence: Fixed-price offer to deal | 2.4.4 | Dealer offer (quantity + price) → farmer accepts → deal; remaining quantity updated |
| 10 | Sequence: Transport booking | 2.4.4 | Transport offer → dealer chooses or counters → transporter accepts → booked, codes made |
| 11 | Sequence: Pickup and delivery | 2.4.4 | Farmer's pickup code → in transit → dealer's delivery code → completed |
| 12 | Sequence: Delivery failure and emergency sale | 2.4.4 | Failure report → admin approves → emergency bidding near the stuck vehicle → new deal |
| 13 | ER diagram | 2.4.5 | One diagram, all tables, from `backend/prisma/schema.prisma` |
| 14 | Deployment architecture | 4.3 (Figure 4.1) | User devices → Vercel → Render (Singapore) → Neon, Cloudinary, BulkSMSBD; Socket.IO straight to Render; GitHub row: repository → auto-deploys to Vercel and Render, Actions → signed APK → Releases → app. Built 2026-11-27 |

The list of sequence diagrams (5–12) is my proposal from the project's main functions; the user can change it.

**How they are made (2026-11-26):** `docs/report/drawio.mjs` (helpers: swimlane grid for activity diagrams, sequence layout with alt frames), `make-diagrams.mjs` (every diagram as code; the ER diagram is read from the Prisma schema and its lines are routed through the gaps between table columns or along a bus above/below, so none crosses a table) and `render-diagrams.mjs` (PNG export with draw.io's own viewer from the VS Code extension, offline, in headless Chrome; the ER PNG is turned a quarter turn to fill a portrait page). Files: `block-diagram`, `gantt-chart`, `use-case`, `activity-{farmer,dealer,transporter,admin}`, `seq-{login,registration,password-reset,bidding,offer,transport,handover,failure}`, `er-diagram`. `deployment` (Chapter 4) was added on 2026-11-27 in the same style as the block diagram.

**ER layout (2026-11-27, the user asked for readable print):** 5 columns of similar height, so the diagram matches the page shape when it is turned a quarter turn. The columns are: geo/catalog/settings plus CaseLock; Listing, Bid and Offer; User plus Notification, AdminLog, VerificationDoc and Review; Deal, CancelRequest and Report; TransportOffer, Vehicle and DeliveryFailure. Table widths come from Helvetica font metrics (MARK 34, spare 8), channel widths from the number of lines in each channel (TRACK = 4) and GAP = 16. The text prints about 40% larger than with the old 6-column layout (6.24 × 8.96 in, the figure limit both ways). Re-run with `node make-diagrams.mjs --force er-diagram && npm run diagrams er-diagram`.

See [[fyp-report-writing]], [[fyp-mobile-app]] and [[fyp-build-progress]].
