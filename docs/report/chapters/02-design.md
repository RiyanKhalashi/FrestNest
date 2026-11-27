# CHAPTER 2 | DESIGN AND IMPLEMENTATION

## 2.1 Introduction

In this chapter, the process and design of building FreshNest will be explained. It first transforms the needs identified in Chapter 1 into functional and non-functional requirements. Next, it models the system using UML: first a use case diagram, then use case descriptions, an activity diagram for each role and a sequence diagram for each of the main functions of the system, and lastly, the entity relationship diagram of the database. The final section has to do with architecture, the technology used and with significant implementation choices and some actual code snippets.

## 2.2 Functional Requirements

The purpose of giving functional requirements is to state what the system is required to do. Table 2.1 is a list of the 22 functional requirements of FreshNest and to whom they are relevant.

Table 2.1: Functional requirements

| ID | Requirement | Description | Stakeholder |
|---|---|---|---|
| FR01 | Registration | Farmers, dealers and transport providers register with name, Bangladeshi mobile number, password, district and upazila. Dealers and transport providers also give a business name. | Farmer, Dealer, Transport Provider |
| FR02 | Login and logout | Users log in with phone number and password. The session lasts seven days and can be ended with logout. | All users |
| FR03 | Password reset | A user who forgot the password receives a one-time code by SMS through BulkSMSBD and sets a new password. | All users |
| FR04 | Profile and standing | Users edit their profile and photo, change the password, and see their reviews and their private account standing. | All users |
| FR05 | Verification | Dealers and transport providers upload an NID and a trade or driving licence. An admin approves, rejects or asks for a clearer document, with a reason. | Admin, Dealer, Transport Provider |
| FR06 | Create listing | A farmer lists a product with quantity, unit (kg, mon or ton), price, harvest date and photos. The system suggests the visibility scope and a safe deadline from the shelf life. | Farmer |
| FR07 | Visibility | A listing is shown only to dealers in its scope: the farmer's upazila, the farmer's district with chosen districts, or the whole country. Nearest listings come first. | Dealer, System |
| FR08 | Open bidding | Dealers bid for the whole lot. A bid must beat the highest bid by the minimum increment. Bidders appear to each other as "Dealer #1", "Dealer #2". An optional Buy Now price ends the bidding at once. | Dealer |
| FR09 | Close bidding | When the deadline passes, the highest bid wins automatically and a deal is created. Without bids, the farmer may relist once. | System |
| FR10 | Own-price offers | Dealers offer a quantity, a price and a reply time. The farmer accepts, rejects or counters once. Each accepted offer becomes a deal and the remaining quantity goes down. | Farmer, Dealer |
| FR11 | Cancel a deal | The farmer or the dealer cancels with a reason. Before transport is booked the deal is cancelled at once; after that only with admin approval. | Farmer, Dealer, Admin |
| FR12 | Vehicles | Transport providers add vehicles with type, capacity, facility and registration paper. An admin approves each vehicle. | Transport Provider, Admin |
| FR13 | Transport offers | Transport providers find deals by pickup district and upazila and offer one vehicle with a price, pickup time and delivery time. Only a vehicle with enough capacity and the right facility, and free at that time, can be offered. | Transport Provider |
| FR14 | Choose or counter | The dealer chooses an offer or sends one lower counter-price, which the transport provider can accept within two hours. Booking makes the pickup and delivery codes. | Dealer, Transport Provider |
| FR15 | Handover codes | The driver enters the farmer's four-digit pickup code at loading and the dealer's delivery code on arrival. Five wrong tries lock the code until an admin resets it. | Transport Provider, Farmer, Dealer |
| FR16 | Delivery failure | A driver reports a stuck vehicle with reason, photo, produce condition and usable quantity. An admin approves or rejects the report. | Transport Provider, Admin |
| FR17 | Emergency sale | After approval, an emergency bidding offers the produce to dealers near the vehicle and widens from the upazila to the district and then to neighbouring districts. | Farmer, Dealer, System |
| FR18 | Ratings and reviews | After a completed deal, the farmer rates the dealer and the transport provider, and the dealer rates the farmer, with stars and a comment. | Farmer, Dealer |
| FR19 | Reports | Users report another user with a reason from a list, linked to the deal. An admin warns, suspends, dismisses or hides a review. | All users, Admin |
| FR20 | Notifications and live updates | Users get in-app notifications in a bell menu, and open pages update without refreshing. | All users |
| FR21 | Admin team and settings | The Super Admin adds admins with permissions. Admins manage the product list, season months and other settings; every admin action is logged. | Admin |
| FR22 | Analytics and business | Admins see market analytics by upazila (with CSV export) and platform charts, manage company subscriptions and send announcements, including sponsored offers to farmers who agreed to receive them. | Admin |

## 2.3 Non-Functional Requirements

Non-functional requirements state how successfully the system can work. Reliability of timed rules and fairness of bidding is vital for a marketplace of perishable produce, along with security and ease of use for people with different levels of digital skill.

### 2.3.1 Performance

- Database indexes are used on the columns that filter lists, such as listing status and scope, user role and upazila, and deal status.
- When live updates are used, only a small "changed" signal is sent and later the user's page is refreshed only with the data that it shows.
- The photos are made smaller in the browser before uploading and cannot exceed a maximum size of 5 MB.
- Every timed rule is processed every 5 seconds by one background job, and a run is skipped if the previous one is still working.

### 2.3.2 Reliability

- All timed state is stored in the database, and each step of the background job can safely be executed again, so nothing is lost when the server restarts.
- Bidding, Buy Now, offer acceptance and transport booking run in database transactions with row locks. No two dealers can win the same lot and a vehicle may not be booked twice.
- When a delivery failure waits 30 minutes without an admin decision, it brings an urgent alert to all admins dealing with deals.
- The website displays a "Starting the server" notice instead of failing when the free server is waking up.

### 2.3.3 Security

- The user's password is stored in hashes using bcrypt and not sent to the browser.
- Sessions are signed tokens and are in an httpOnly cookie which page scripts are unable to read.
- All routes verify the user's role, verification status and, for admins, their permission.
- All input is checked with a schema prior to use.
- Verification documents and failure pictures are private to their owner and the admins.

### 2.3.4 Usability

- Each role has its own dashboard showing only their workflows.
- Warnings inform the user but do not obstruct him/her, e.g. a deadline close to the end of shelf life or an open vehicle in the monsoon.
- The layout responds from phone size to large-size devices, along with a slide-in menu on small screens.
- The quantities are displayed in the unit that the farmer selected: kg, mon or ton.

### 2.3.5 Portability

- The website functions on latest browsers on Windows, macOS and Linux, as well as Android and iOS operating systems and the Android app loads the identical website.
- Everything that is configured (addresses, keys, etc.) is specified through environment variables, and this means that the same code is used on a laptop and in the cloud.

### 2.3.6 Maintainability

- Backend is divided into routes, shared services, small libraries and the background job. In the frontend, it's grouped by feature.
- Both the front-end and back-end are built with TypeScript and migrations using Prisma ensure database structure is version controlled.
- Automated API testing verifies crucial business rules on each update.

## 2.4 System Design

### 2.4.1 Use Case Diagram

The use case diagram is shown in Figure 2.1. Farmer, Dealer, Transport Provider and Admin all are types of User, hence all use cases that every user has, like Register, Log in and Reset password by SMS, are connected once to User. System Timer is an independent actor through which the rules are timed. Creating a listing always includes the scope and deadline suggestion, sending a transport offer always includes the vehicle check, and choosing transport always includes generating the handover codes.

![Figure 2.1: Use case diagram](diagrams/use-case.png)

### 2.4.2 Use Case Descriptions

Below are descriptions of the six most important use cases.

Table 2.2: UC-01: Create a listing

| Use case | Create a listing |
|---|---|
| **Goal** | A farmer puts produce on sale with a safe deadline and the right visibility. |
| **Preconditions** | The farmer is logged in. The product is in the product list, or the farmer gives its shelf life and storage need. |
| **Success end condition** | The listing is open and dealers in the chosen area can see it. |
| **Failed end condition** | Nothing is saved and the form shows what to fix. |
| **Primary actor** | Farmer |
| **Secondary actors** | None |
| **Trigger** | The farmer clicks "Create listing". |
| **Main success scenario** | 1. The farmer chooses the product, quantity, unit and price.<br>2. The farmer gives the harvest date and adds photos.<br>3. The system suggests the visibility scope and a safe deadline from the shelf life.<br>4. The farmer chooses open bidding (deadline, minimum increment, optional Buy Now) or own price (minimum order, minimum reply time).<br>5. The system saves the listing and shows it to dealers in the scope. |
| **Alternative flows** | 3a. The chosen deadline is later than the safe range: the system warns, and the farmer may continue.<br>5a. Fields are missing or invalid: nothing is saved. |
| **Quality requirements** | A listing can be created in a few minutes on a phone. |

Table 2.3: UC-02: Bid on a listing

| Use case | Bid on a listing |
|---|---|
| **Goal** | A dealer buys a whole lot through open bidding. |
| **Preconditions** | The dealer is verified. The listing is open, in open bidding, and in the dealer's area. |
| **Success end condition** | The dealer holds the highest bid; at the deadline the system creates the deal automatically. |
| **Failed end condition** | The bid is refused and the highest bid does not change. |
| **Primary actor** | Dealer |
| **Secondary actors** | Farmer, System Timer |
| **Trigger** | The dealer opens a listing in the market and enters a price. |
| **Main success scenario** | 1. The dealer opens the listing; other bidders are shown as "Dealer #1", "Dealer #2".<br>2. The dealer enters a price.<br>3. The system locks the listing and checks the price against the highest bid plus the minimum increment.<br>4. The system saves the bid, notifies the farmer and the outbid dealer, and updates every open page.<br>5. At the deadline, the timer gives the lot to the highest bid and creates the deal. |
| **Alternative flows** | 2a. The dealer clicks Buy Now: the deal is created at once and bidding closes.<br>3a. The price is too low or bidding has closed: the bid is refused.<br>5a. No bids by the deadline: the listing ends with no sale and the farmer may relist once. |
| **Quality requirements** | A new highest bid appears on other dealers' screens without refreshing. |

Table 2.4: UC-03: Book transport

| Use case | Book transport |
|---|---|
| **Goal** | The dealer gets a suitable vehicle for the deal at an agreed price. |
| **Preconditions** | A deal is waiting for transport. Transport providers are verified and have approved vehicles. |
| **Success end condition** | One offer is accepted, the vehicle is booked, the other offers close, and the pickup and delivery codes are made. |
| **Failed end condition** | No offer is accepted; the dealer may extend the offer window once, or cancel with a reason. |
| **Primary actor** | Dealer |
| **Secondary actors** | Transport Provider, Farmer |
| **Trigger** | A transport provider sends an offer for the deal. |
| **Main success scenario** | 1. The transport provider chooses a vehicle and gives a price, pickup time and delivery time.<br>2. The system checks that the vehicle's capacity and facility fit the load and that it is free at that time.<br>3. The dealer compares the offers, with season tags such as "Cost-saving" or "Weather risk".<br>4. The dealer chooses an offer.<br>5. The system books the vehicle, closes the other offers and makes the two handover codes. |
| **Alternative flows** | 2a. The vehicle does not fit or is busy: the offer is refused.<br>4a. The dealer sends one lower counter-price; if the transport provider accepts it within two hours, the offer is booked at that price.<br>4b. No offer arrives in the window: the dealer may extend it once. |
| **Quality requirements** | A vehicle can never be booked for two trips at the same time. |

Table 2.5: UC-04: Hand over the produce with codes

| Use case | Hand over the produce with codes |
|---|---|
| **Goal** | Pickup and delivery are confirmed by the people who are present. |
| **Preconditions** | Transport is confirmed; the farmer and the dealer see their codes in the app. |
| **Success end condition** | The deal is completed and both sides can leave a review. |
| **Failed end condition** | The code is refused; after five wrong tries it locks until an admin resets it. |
| **Primary actor** | Transport Provider |
| **Secondary actors** | Farmer, Dealer, Admin |
| **Trigger** | The driver arrives to load the produce. |
| **Main success scenario** | 1. After loading, the farmer reads the pickup code to the driver.<br>2. The driver enters it; the system checks it and marks the deal in transit.<br>3. On arrival, the dealer reads the delivery code to the driver.<br>4. The driver enters it; the system marks the deal completed.<br>5. The system notifies everyone and opens the reviews. |
| **Alternative flows** | 2a, 4a. Wrong code: the system shows how many tries are left.<br>2b, 4b. Five wrong tries: the code locks and an admin can reset it. |
| **Quality requirements** | Codes are random four-digit numbers made by the server when transport is booked. |

Table 2.6: UC-05: Report a delivery failure

| Use case | Report a delivery failure |
|---|---|
| **Goal** | Save the produce when a vehicle cannot finish the trip. |
| **Preconditions** | The deal is in transit. |
| **Success end condition** | An admin approves the report, the original deal is marked failed, and an emergency sale starts near the vehicle. |
| **Failed end condition** | The admin rejects the report and the driver continues the trip. |
| **Primary actor** | Transport Provider |
| **Secondary actors** | Admin, Farmer, dealers near the vehicle |
| **Trigger** | The vehicle breaks down, has an accident, or the road is blocked. |
| **Main success scenario** | 1. The driver reports the upazila, reason, photo, produce condition, usable quantity and whether the vehicle can still move.<br>2. The system saves the report and alerts the admins.<br>3. An admin approves the report.<br>4. The farmer sets the emergency sale's duration and price drop, starting from suggested values.<br>5. The system offers the produce to dealers in the stuck upazila, then in the whole district, then in neighbouring districts.<br>6. The highest bid wins and a new deal is made. |
| **Alternative flows** | 3a. No admin decision for 30 minutes: an urgent alert goes to every admin who handles deals.<br>4a. The farmer chose automatic start: the sale starts 30 minutes after approval with the suggested values.<br>5a. No bids for an hour: the sale widens to the next area. |
| **Quality requirements** | The admin queue shows the remaining shelf life of each case, so the most urgent is handled first. |

Table 2.7: UC-06: Verify a dealer or transport provider

| Use case | Verify a dealer or transport provider |
|---|---|
| **Goal** | Only real traders and transport providers can do business. |
| **Preconditions** | The admin has the verification permission; the user has uploaded documents. |
| **Success end condition** | The account becomes active, or is rejected or asked for a clearer document, with the reason recorded. |
| **Failed end condition** | The application stays pending. |
| **Primary actor** | Admin |
| **Secondary actors** | Dealer or Transport Provider |
| **Trigger** | The admin opens the Verification page. |
| **Main success scenario** | 1. The system lists pending users and vehicles.<br>2. The admin takes the case, so other admins see that it is being handled.<br>3. The admin checks the NID and the trade or driving licence.<br>4. The admin approves the account.<br>5. The system activates it, records the action and notifies the user. |
| **Alternative flows** | 4a. A document is unclear: the admin asks for a re-upload with a reason.<br>4b. The documents are not valid: the admin rejects the account with a reason. |
| **Quality requirements** | Documents are private: only the owner and the admins can open them. |

### 2.4.3 Activity Diagrams

The activity diagrams depict the actions of each role and the actions done by the system in a different swimlane. Decisions show the outcome of a check that was not successful, such as an invalid or rejected document or an incorrect handover code.

![Figure 2.2: Farmer activity: listing, selling and delivery](diagrams/activity-farmer.png)

![Figure 2.3: Dealer activity: verification, buying and receiving](diagrams/activity-dealer.png)

![Figure 2.4: Transport provider activity: vehicles, offers and delivery](diagrams/activity-transporter.png)

![Figure 2.5: Admin activity: verification, delivery failures and cases](diagrams/activity-admin.png)

### 2.4.4 Sequence Diagrams

The sequence diagrams illustrate how the web app, server, database and external services work together through eight main functions. Solid arrows are calls and dashed arrows are replies; "alt" frames show the different outcomes.

![Figure 2.6: Sequence diagram: Login](diagrams/seq-login.png)

![Figure 2.7: Sequence diagram: Registration and verification](diagrams/seq-registration.png)

![Figure 2.8: Sequence diagram: Password reset by SMS](diagrams/seq-password-reset.png)

![Figure 2.9: Sequence diagram: Open bidding to deal](diagrams/seq-bidding.png)

![Figure 2.10: Sequence diagram: Fixed-price offer to deal](diagrams/seq-offer.png)

![Figure 2.11: Sequence diagram: Transport booking](diagrams/seq-transport.png)

![Figure 2.12: Sequence diagram: Pickup and delivery](diagrams/seq-handover.png)

![Figure 2.13: Sequence diagram: Delivery failure and emergency sale](diagrams/seq-failure.png)

### 2.4.5 ER Diagram

The schema of Prisma is displayed as an entity relationship diagram in Figure 2.14. There are 21 tables and 227 columns in the database. All the accounts are stored in a single User table, and the account's role determines whether it is a farmer, dealer, transport provider or admin. Solid line means foreign keys with crow's feet indicating the many side, dashed line means many-to-many relationship like neighbouring districts and upazilas and the districts a listing is directed towards. Each table is used for a particular purpose as defined in Table 2.8.

![Figure 2.14: Entity relationship diagram](diagrams/er-diagram.png "fullpage")

Table 2.8: Database tables

| Table | Purpose |
|---|---|
| District, Upazila | All 64 districts and 495 upazilas, with Bangla names and their neighbours |
| User | Every account: role, phone, password hash, status, location; admin permissions |
| Product | The product list, with shelf life, storage need and default unit |
| Listing | Produce on sale: quantity, price, harvest date, scope, selling mode and emergency sale fields |
| Bid | Bids in open bidding |
| Offer | Dealer offers in own-price mode, with the farmer's counter-offer |
| Deal | Primary deals: quantity, price, status, transport window and handover codes |
| Vehicle | Transport providers' vehicles, with capacity, facility and approval |
| TransportOffer | Transport offers for a deal, with the dealer's counter-price |
| CancelRequest | Cancellations after transport is booked, waiting for an admin |
| Review | Stars and comments after a completed deal |
| DeliveryFailure | Reports of stuck vehicles and the admin's decision |
| VerificationDoc | NID, trade licence and driving licence files |
| Report | Reports against users and the admin's decision |
| Notification | In-app notifications |
| AdminLog | A record of every admin action |
| Announcement | Messages to users, including sponsored offers |
| Company | Agri companies and their upazila report subscriptions |
| CaseLock | Shows which admin is handling a case |
| Setting | Settings such as the season months and time limits |

## 2.5 Implementation

### 2.5.1 System Architecture

FreshNest is based on a 3 tier architecture. The presentation tier is rendered by Vercel through a Next.js web application, and the Android app is a Capacitor shell that loads the same website. The application tier is a REST API written with Express and hosted on Render. The data tier consists of a PostgreSQL database on Neon, while Cloudinary is used for storing photos and documents.

All requests go through the same pipeline. The session cookie is read and the user is loaded from the database, so a suspension and/or ban takes effect at that moment. Then the role is verified by the route guards, as well as the verification status and, for admins, the permission. Once the input is validated by a Zod schema, the work is done through Prisma, and changes by two people made at the same moment will execute as part of a transaction with a row lock. Finally, notifications are written by the server and it sends a live "changed" signal via Socket.IO, and the open pages will update this information from the API, with a renewed permission check. No private information is transferred via the live connection.

### 2.5.2 Technology Stack

Table 2.9: Technology stack

| Layer | Technology | Reason for the choice |
|---|---|---|
| Frontend | Next.js 16, React 19, TypeScript | Pages for each role, fast navigation and type safety |
| Styling | CSS with design tokens, Plus Jakarta Sans | One consistent look across roles, light and responsive |
| Live updates | Socket.IO 4.8 | Pushes "something changed" signals to open pages |
| Backend | Node.js, Express 5, TypeScript | A simple REST API in the same language as the frontend |
| Database | PostgreSQL with Prisma 7 | Relations, transactions and row locks; type-safe queries and migrations |
| Validation | Zod 4 | One schema checks the input of each route |
| Security | jsonwebtoken, bcryptjs, httpOnly cookie | Signed sessions and hashed passwords |
| Files | Multer, Cloudinary | Upload limits, cloud storage and private documents |
| SMS | BulkSMSBD | Password reset codes |
| Mobile | Capacitor 8 | An Android app that loads the live website |
| Hosting | Vercel, Render, Neon, GitHub Actions | Free plans, automatic deployment and the Android build |

### 2.5.3 Backend Modules

Table 2.10: Backend modules

| Module | Responsibility |
|---|---|
| auth | Register, log in, log out, and a short ticket for the live connection |
| meta | Districts, upazilas and the product list |
| profile | Profile, photo, password change, documents, reviews and account standing |
| listings | Create, preview (scope and deadline), edit, withdraw and relist listings |
| market | The dealers' market, bids and Buy Now |
| offers | Own-price offers and counter-offers |
| deals | Deals, transport choice and counter-price, offer window, cancel and review |
| vehicles | Transport providers' vehicles |
| transport | Deals for transport providers, transport offers, trips, handover codes and failure reports |
| emergency | Emergency sale: start, widen and the automatic preference |
| notifications | Bell notifications |
| reports | Reports against users |
| admin | Overview, verification, cases, users, products, seasons, announcements, companies, team, settings, log, analytics and delivery failures |
| jobs | The timed rules that run every five seconds |
| services | Shared rules: scope and deadline, visibility, vehicle fit, seasons, booking, cancellation and emergency sale |

### 2.5.4 Security Implementation

- **Passwords:** securely hashed using bcrypt and the hash of the password never leaves the server.
- **Sessions:** 7 day signed JSON Web Token [10] in an httpOnly, SameSite cookie, only sent over HTTPS in production.
- **Access Control:** Different guards are used to check whether the person is signed in, has a particular role and is verified to trade, and whether the person is an admin and has a particular permission (verification, deals, reports, announcements or analytics). There are some actions which are only allowed for the Super Admin.
- **Input validation:** All routes are validated for their input, including validation for the Bangladeshi mobile number format using Zod.
- **Private files:** verification documents and failure pictures are only shown to the owner and the admins, and from the Cloudinary side the links last for a maximum of 5 minutes.
- **Fair bidding:** When bidding, using Buy Now, accepting an offer or booking the transport, the current row will be locked, and two requests cannot be successful at the same time.
- **Codes for handover:** random, four digit codes generated with a secure random number generator – maximum of 5 attempts.
- **Privacy:** The dealer only sees the other bidders as "Dealer #1", "Dealer #2" and phone numbers of farmers are never displayed to agri companies.
- **Web origin:** Only the FreshNest website can make browser requests to the API.

### 2.5.5 Live Updates and Timed Rules

Live updates are performed with Socket.IO [9]. Upon page opening, the browser gets a two minute ticket from the API and connects with it, and the server then puts that connection into the user's own room. When a page displays a listing, it is also added into the listing's room. If something changes (including a new bid), a short signal is sent to the room by the server, and the page refreshes its information via the regular API (Appendix A.5).

Within the API, one background task executes the time based rules every 5 seconds (Appendix A.3). Each run completes finished bidding, removes unanswered offers and counter-prices, informs dealers of the close of a transport window, escalates delivery failures that remain outstanding too long, triggers automatic emergency sales and expands quiet ones; approximately once every minute it also hides listings past their shelf life. Each step does a read of the current state from the database, and also locks the row that it updates, meaning that a step never repeats an action even if it runs twice. Initially a job queue service was envisioned, but this more streamlined version is not dependent on a separate service on the free hosting.

### 2.5.6 Frontend Implementation

Next.js App Router is used on the front end. The farmer has 4 pages: Home, Create listing, Sales and Profile; the dealer has 4 pages: Home, Market, Purchases and Profile; the transport provider has 5 pages: Home, Deals, Trips, Vehicles and Profile; and admin has 10 pages: Overview, Verification, Cases, Delivery failures, Users, Products, Announcements, Analytics, Business and Team. The landing, login and register pages are shared.

The components are divided into feature groups: common, layout, landing, marketplace, transport, admin and account. All API requests are forwarded by the website to the Express server, so the browser talks to one address and the session cookie is equally valid on both the website and the API. A "Starting the server" notice is provided for requests that take more than four seconds to complete. The design adjusts to tablets and phones with a slide-in menu and a single column, while the Android app introduces a retry screen for when there is no internet connection and access to the camera to take photos.

## 2.6 Coding: Appendix A

In this section short samples of the real source code will be displayed. Some long lines are cut back to provide page space.

### A.1 Session Cookie and Role Guards (Express)

```
export function setSession(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax",
    secure: process.env.NODE_ENV === "production", maxAge: WEEK, path: "/" });
}

export const requireRole = (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Please sign in." });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: "Not allowed for your role." });
    next();
  };

// Dealers and transporters must be verified (ACTIVE) to trade.
export function requireActive(req: Request, res: Response,
                              next: NextFunction) {
  if (req.user?.status === "ACTIVE") return next();
  res.status(403)
    .json({ error: "Your account is waiting for admin verification." });
}
```

### A.2 Placing a Bid inside a Transaction

```
marketRouter.post("/:id/bid", requireActive, async (req, res) => {
  const p = z.object({ pricePerKg: z.coerce.number().positive() })
    .safeParse(req.body);
  if (!p.success)
    return res.status(400).json({ error: "Enter a valid price per kg." });
  const me = req.user!, id = String(req.params.id);
  const price = Math.round(p.data.pricePerKg * 100) / 100;
  const r = await prisma.$transaction(async (tx) => {
    await lock(tx, id); // SELECT ... FOR UPDATE: one bid at a time
    const l = await tx.listing.findFirst({
      where: { AND: [{ id }, visibleTo(me)] },
      include: { bids: { orderBy: { pricePerKg: "desc" }, take: 1 } } });
    if (!l) return { ok: false, status: 404, error: "Not in your area." };
    if (l.mode !== "BID" || l.status !== "OPEN" || l.bidEndsAt! <= new Date())
      return { ok: false, status: 409, error: "Bidding is closed." };
    const top = l.bids[0];
    const min = top
      ? Number(top.pricePerKg) + Number(l.minIncrement ?? 0.5)
      : Number(l.pricePerKg);
    if (price < min)
      return { ok: false, status: 400, error: `Bid at least ${min}.` };
    await tx.bid.create({
      data: { listingId: id, dealerId: me.id, pricePerKg: price } });
    return { ok: true, l, prevTop: top };
  });
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  pingListing(id); // live update to every page watching this listing
  res.json({ ok: true });
});
```

### A.3 Closing Bidding Automatically (Background Job)

```
// Bidding ended: the highest bid wins automatically; no bids: NO_SALE.
async function closeBidding() {
  const due = await prisma.listing.findMany({
    where: { status: "OPEN", mode: "BID", bidEndsAt: { lte: new Date() } } });
  for (const { id } of due) {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${id} FOR UPDATE`;
      const l = await tx.listing.findUniqueOrThrow({ where: { id },
        include: { bids: {
          orderBy: [{ pricePerKg: "desc" }, { createdAt: "asc" }] } } });
      if (l.status !== "OPEN") return; // already handled by an earlier run
      const top = l.bids[0];
      if (!top) return tx.listing.update({ where: { id },
        data: { status: "NO_SALE", closedAt: new Date() } });
      await tx.listing.update({ where: { id },
        data: { status: "SOLD", remainingKg: 0, closedAt: new Date() } });
      await tx.deal.create({ data: { listingId: id, farmerId: l.farmerId,
        dealerId: top.dealerId, quantityKg: l.quantityKg,
        pricePerKg: top.pricePerKg, source: "BID" } });
    });
  }
}

export function startJobs() {
  setInterval(async () => {
    if (running) return; // never two runs at once
    running = true;
    try {
      await closeBidding(); await expireOffers(); await expireCounters();
      await transportWindows(); await failures();
    } finally { running = false; }
  }, 5000);
}
```

### A.4 Prisma Model (Deal)

```
model Deal {
  id           String     @id @default(cuid())
  code         Int        @unique @default(autoincrement()) // FN-1001
  listingId    String
  listing      Listing    @relation(fields: [listingId], references: [id])
  farmerId     String
  farmer       User       @relation("farmerDeals", fields: [farmerId],
                                    references: [id])
  dealerId     String
  dealer       User       @relation("dealerDeals", fields: [dealerId],
                                    references: [id])
  quantityKg   Int
  pricePerKg   Decimal    @db.Decimal(10, 2)
  source       DealSource // BID, BUY_NOW, OFFER or EMERGENCY
  status       DealStatus @default(AWAITING_TRANSPORT)
  pickupCode   String?    // the farmer gives it to the driver at pickup
  deliveryCode String?    // the dealer gives it to the driver on arrival
  codeAttempts Int        @default(0)
  transportOffers TransportOffer[]
  @@index([status])
}
```

### A.5 React Code (Live Updates)

```
// The socket only says "something changed"; pages then reload their data.
export function useListingLive(ids: string[], fn: (id: string) => void) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  const key = ids.join(",");
  useEffect(() => {
    const s = getSocket();
    const list = key ? key.split(",") : [];
    const watch = () => list.forEach((id) => s.emit("watch", id));
    watch();
    s.on("connect", watch);
    const on = (m: { id: string }) => {
      if (list.includes(m.id)) ref.current(m.id);
    };
    s.on("listing", on);
    return () => { s.off("listing", on); s.off("connect", watch); };
  }, [key]);
}
```

## Summary

This chapter defined 22 functional requirements and the quality requirements for performance, reliability, security, usability, portability and maintainability. A use case diagram, 6 use case descriptions, an activity diagram for each role, 8 sequence diagrams and an ER diagram of 21 tables were created to model the system. The three-tier architecture and technology decisions were described in the implementation section, as were the backend modules; security, live updates and timed rules; and frontend, followed by snippets of the actual code. The next chapter discusses the testing process of the system.
