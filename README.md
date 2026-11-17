# FreshNest

Farm-gate marketplace for Bangladesh: farmers, dealers, transport providers and admins. University final year project.

## Folders

| Folder | What it is |
|---|---|
| `web/` | Website (Next.js + TypeScript). Styles come from the agreed prototype (`web/src/styles`). |
| `server/` | API (Express + TypeScript + Prisma). Database schema: `server/prisma/schema.prisma`. |
| `prototype/` | The clickable HTML prototype everything is built from. |
| `docs/` | Agreed decisions and demo scenarios. |
| `scripts/db.sh` | Starts and stops the local PostgreSQL database. |

## Run it on this Mac

Open a terminal in this folder and run:

```bash
npm run dev
```

This starts the database, the API (http://localhost:4000) and the website. Then open **http://localhost:3000**.

Stop with `Ctrl + C`, then run `npm run db:stop` to stop the database.

### Demo accounts (password `freshnest123`)

| Role | Phone |
|---|---|
| Farmer · Karim Uddin | 01712345678 |
| Dealer · Hasan Traders | 01811000001 |
| Transporter · Bogura Logistics (2 trucks, 1 ventilated van) | 01911000001 |
| Transporter · Mintu Pickup (1 t pickup) | 01911000002 |
| Transporter · Cold Line BD (refrigerated truck) | 01911000003 |
| Farmer · Selina Begum (Gaibandha) | 01712000002 |
| Farmer · Jalal Mia (Rangpur) | 01712000003 |
| Super Admin · Nusrat Jahan | 01700000001 |
| Admin (verification + deals) · Tanvir Ahmed | 01700000002 |
| Admin (reports, announcements, analytics) · Mitu Rahman | 01700000003 |

The sign-in page has one-click buttons for these while developing.

### Useful commands

| Command | What it does |
|---|---|
| `npm run seed` | Adds locations, products and demo users again (safe to repeat) |
| `npm run demo` | **Resets the market** (deletes all listings, bids, offers, deals, notifications) and loads the demo scenario: deals in every transport stage, a delivery failure waiting for an admin, an automatic alert, a farmer product suggestion, plus **12 months of history** (315 farmers, 45 dealers, 16 transporters, ~4,700 deals) for the analytics |
| `npm test` | Runs the 54 rule tests (marketplace, transport, delivery failure, admin office) against the running API (needs `npm run dev`) |
| `npm run typecheck` | Checks the TypeScript code for mistakes |
| `npx -w server prisma studio` | Opens a browser view of the database tables |
| `npx -w server prisma migrate dev --name <change>` | Applies a database schema change (in a normal terminal; it asks questions) |

## Build phases

1. **Foundation** (done): accounts, sign in, roles, admin permissions, locations down to upazila, products, profile with "Agri partner offers".
2. **Marketplace** (done): listings with photos and visibility (upazila / district / nationwide), safe bidding deadline, open bidding with Buy Now (highest bid wins automatically), own-price offers with one counter-offer, deals with cancel + reason, live updates and the notification bell.
3. **Transport** (done): vehicles (admin-checked, private registration photo), matching by facility + capacity, small local pickups, one offer per vehicle with booking clash check, season tags (cost-saving / weather risk), dealer confirms, pickup and delivery codes, transporter cancel reopens the deal, cancel requests for admins, reviews.
4. **Delivery failure + emergency sale** (done): driver reports a stuck vehicle (location, reason, private photo, condition, usable kg, can it move) → admin queue A3 sorted by shelf life, 30-min urgent alert, approve / reject with reason → farmer sets up the emergency sale with suggested price drop and duration (or it starts automatically if they chose that) → dealers told in steps: stuck upazila → district after 1 h → neighbouring districts → highest bid / Buy Now wins → the same vehicle delivers, or a local transporter collects with a handover code.
5. **Admin office** (done): A1 overview with automatic alerts, A2 verification (documents, re-upload, vehicles), A3 failures, A4 cases (cancellation requests, reports, reviews, locked codes), A5 users (warn / suspend 7 or 30 days / ban, lift), A6 products, farmer suggestions and season calendar, A7 announcements incl. sponsored, A8 analytics on real data (market by upazila + platform) with company report CSV and subscriptions, A9 team, permissions, settings and activity log. Case locks ("Being handled by…", 15 min) and a user-history panel beside every case.
6. Online deployment for the defence.
