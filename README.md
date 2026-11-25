# FreshNest

Farm-gate marketplace for Bangladesh: farmers, dealers, transport providers and admins. University final year project.

## Live

| | Address |
|---|---|
| Website | https://freshnest-bd.vercel.app |
| API | https://freshnest-api-lls6.onrender.com |
| Android app (APK) | https://github.com/RiyanKhalashi/FrestNest/releases/latest/download/FreshNest.apk |

Every push to `main` redeploys the website (Vercel) and, once the Render GitHub app is installed, the API (Render). A change in `mobile/` also builds a new APK (GitHub Actions).

## Project structure

```
freshnest/
├── frontend/                 Website: Next.js + TypeScript (Vercel)
│   ├── public/               Pictures, app icons
│   └── src/
│       ├── app/              Pages, one folder per role: farmer/, dealer/, transporter/, admin/, plus login/ and register/
│       ├── components/
│       │   ├── common/       Building blocks: UI (toast, modal), Icon, Avatar, Charts, PlacePicker, Reporting
│       │   ├── layout/       Shell (sidebar), Session, Bell, Welcome, WakeNotice
│       │   ├── landing/      Home page, sign-in frame, illustrations
│       │   ├── marketplace/  Listing form, deal card
│       │   ├── transport/    Transport parts, delivery failure / emergency sale
│       │   ├── admin/        Admin tools, analytics, announcements
│       │   └── account/      Profile page (all roles)
│       ├── lib/              API client, live updates, formatting, units
│       └── styles/           CSS (base, theme, per role)
├── backend/                  API: Express + TypeScript + Prisma (Render)
│   ├── prisma/               Database schema, migrations, seed + demo data
│   ├── src/
│   │   ├── index.ts          Starts the server
│   │   ├── routes/           HTTP endpoints (auth, listings, deals, transport, …)
│   │   │   └── admin/        Admin office, delivery failures, analytics
│   │   ├── services/         Business rules: bidding and transport rules, deals, emergency sale, notifications
│   │   ├── jobs/             Timed jobs (closes bidding, expires offers, widens emergency sales)
│   │   └── lib/              Database, sign-in, uploads, real-time (Socket.io)
│   └── test/                 API rule tests (npm test)
├── mobile/                   Android app: Capacitor shell that opens the live website
├── docs/                     Decisions, deployment guide, design previews, clickable prototype
├── scripts/                  Local database start/stop, production seed
└── .github/workflows/        Builds the Android APK
```

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
6. **Online deployment** (code ready): photos and documents go to Cloudinary when `CLOUDINARY_URL` is set, live updates use short socket tickets so the site (Vercel) and API (Render) can be on different domains, photos are shrunk in the browser, `render.yaml` blueprint. **Step-by-step guide: [docs/DEPLOY.md](docs/DEPLOY.md).**
