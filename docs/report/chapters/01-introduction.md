# CHAPTER 1 | INTRODUCTION

## 1.1 Background

### 1.1.1 Context and Relevance

In Bangladesh Agriculture is the major source of employment. About 45 percent of the total working population is engaged in agricultural activities, but the agriculture sector accounts for only around 11.7 percent of GDP of the country in FY22 [1] according to the Labour Force Survey 2022 of the Bangladesh Bureau of Statistics. Much of this activity involves crop cultivation, and vegetables and fruits do not hold up on the market and tend to experience rapid reductions in value after they are picked.

The bulk of this produce is sold through a distribution chain which acts as a chain of intermediates between the grower and purchaser. Typically a farmer sells the produce to a trader who visits the village or the nearest village market. The produce is then bought by wholesale traders or commission agents, and sold to retailers in towns and cities. All transport for each stage is organised over the telephone, much of the time at short notice. As such, the prices, buyers and vehicles being used are determined by whoever the farmer can reach, rather than the market.

Through the use of mobile phones and mobile Internet, it is possible to bring this market online. The agricultural marketplace, FreshNest, is a web-based platform that brings together four roles under one roof and is also accessible as an Android app. Farmers post their produce on the platform, dealers (wholesale buyers) bid or put offers, transport providers provide suitable vehicles for transport and admins verify users and fix issues. System is built around the facts which matter during storage of fresh produce in Bangladesh, including, shelf life, time of harvest, distance between Upazilas and Districts, transportation type required by the product and season.

### 1.1.2 Problem Identification

In the present pattern of selling and transshipment of fresh produce the following problems exist:

1. **Long supply chains:** Every link along the chain makes a margin. A study in 2025, by the Centre for Policy Dialogue revealed farm-to-retail price markups in the case of green chillies as high as 116 per cent, onions as high as 87 per cent and brinjal as high as 72 per cent [2]. Only a small proportion of the consumer's price goes to the farmer.
2. **Narrow market access:** A farmer may only be able to sell to the traders visiting the local market. As the produce is not available for viewing by the dealers in other upazilas/districts, the competition is very low.
3. **Perishability and post harvest loss:** According to a study by the Bangladesh Agricultural University, 23.6 to 43.5 percent of 13 major fruits and vegetables is lost after harvest, worth about 3,442 crore Tk annually [3]. This loss can also be caused by poor sales and by poor transport.
4. **Unplanned transport:** Vehicles are tracked down by telephone. Matching load with capacity and facility requirements of the vehicle is a complicated process, e.g. strawberries need a refrigerated vehicle, and a covered vehicle is needed during the rainy season.
5. **Limited trust at handover:** Lack of record of who took the produce and when it was delivered. Disagreements at the pick up or delivery time are difficult to resolve and there are no ratings to see which buyers and drivers are reliable.
6. **No plans for breakdowns:** When a vehicle breaks down en route, or when there is a road blockage, the produce can spoil before a solution is found.

FreshNest solves these issues by bringing farmers, dealers and transport providers into a single marketplace, utilising "shelf life" and "location" in every decision and assigning a clear "owner", a set "time" and a "record" to each aspect of a deal.

### 1.1.3 Purpose and Justification

FreshNest aims to achieve the following: quick sales of fresh produce at a fair price for farmers; and safe delivery of the produce. The project will:

- Allow farmers to access verified dealers outside their local market and be able to decide how they sell the product – through open bidding or their own fixed price.
- Utilize each product's shelf life to determine safe dates, to recommend who should view a listing and to decide which vehicle is required to reduce spoilages.
- Make transport open and fair, including offers for specific vehicles, a counter offer from the dealer, and pickup and delivery codes which confirm each handover.
- Provide an easy out when a delivery fails, via an admin-approved emergency sale to dealers close to the stuck vehicle.
- Provide Admins with means to verify users, manage reports and cancellation requests, and learn more about the market through analytics.
- Show full-stack software engineering: modern web frontend, REST API with live updates, relational database, cloud deployment and an Android app.

Justification is given because the sorts of problems outlined above impact many members of the nation's work force, while the technology required to address these problems (smartphones, mobile internet, cheap cloud computing) is now ubiquitous.

### 1.1.4 Scope

**Included in scope:**

- Registration and login with phone number and password for four roles. The dealer/transport provider accounts undergo verification by an admin prior to trading, by sending the relevant documents. Farmers do not have to be verified.
- One time password reset code sent through SMS to the user's mobile phone via the gateway BulkSMSBD.
- A product list is provided for each product listing, which contains information on the shelf life and storage requirement of each product, the harvest date of the product, a picture of the product and the selling unit selected by the farmer (kg, mon or ton).
- Listing visibility chosen by the farmer – only the farmer's upazila, the farmer's district with chosen nearby districts, or the entire country. The system suggests a scope based on the product's shelf life.
- Two selling modes. Open bidding is a bidding format in which all dealers make a bid for the entire lot, the bidders are anonymous to one another and when the bidding closes the highest bid is the automatic winner. An optional Buy Now price will end the bidding once it's reached. Dealers in the fixed-price mode make offers to the farmer with their own quantities and price; the farmer either accepts or rejects/counters each offer only once.
- A primary deal has clear cancellation rules – the cancellation can be made at any time before transport is booked, and can only be done with admin approval after this.
- Specific transport offers in accordance to facility (normal, ventilated or refrigerated) and transport capacity with season advice on open vehicles. The dealer chooses one offer or makes one lower price counter-offer, and four-digit pickup and delivery codes confirm the handover.
- Delivery failure reports from transport providers, admin clearance and emergency sale – beginning with the upazila of the vehicle and expanding to the district and then to neighbouring districts.
- In-app display of rating and reviews after each completed deal, live updates without refresh or page change and notifications.
- Report that has a reason list attached to the deal that it is related to.
- Admin panel (verify, cases, users, products, announcements, analytics, business tools, a team of admins, separate permissions, a private account standing (warnings & suspensions) for every user).
- A business model for agri companies: monthly upazila market report subscription and sponsored offers to those farmers who agree to receive offers from the companies.
- Responsive website for phone, tablet and computer, and an Android app (APK).

**Excluded from scope:**

- Online payment, payment records. Outside the platform, the dealer pays the farmer, and the transport provider.
- Marketplace events notification via SMS, email and push. They will be displayed in the platform, and SMS will only be used for resetting password codes.
- Live weather forecasts. Advice is seasonal and follows a set calendar.
- GPS live tracking of vehicles.
- An iPhone app and publishing on Google Play.
- A Bengali oriented interface. The interface is in English at this time.
- Transport organised by farmer/dealer outside the platform.

## 1.2 Feasibility Study

The project was vetted on five fronts prior to development, with the aim of making sure one developer could finish it in the allotted time.

### 1.2.1 Technical Feasibility

**Assessment: Highly feasible**

Mature and well-documented technologies with open availability that are used in the project:

- **Frontend:** Next.js 16 with React 19 and TypeScript [4], [5].
- **Backend:** Express 5 on Node.js with TypeScript, exposing a REST API [6].
- **Database:** PostgreSQL [7] through the Prisma ORM [8] that also handles schema migrations.
- **Live updates:** Socket.IO pushes changes, such as a new bid, to open pages [9].
- **Security:** JSON Web Tokens [10] stored within an httpOnly cookie, passwords are always hashed using bcrypt, and, all input is verified with Zod schemas.
- **Files:** Cloudinary for listing photos, verification documents and delivery failure photos [11].
- **Mobile:** Capacitor, which packages the website as an Android software program [12].
- **Hosting:** Vercel [13] for the website, Render [14] for the API and Neon [15] for the database.
- **SMS:** One time codes that can be sent out through SMS gateway (BulkSMSBD) [16].

Rules that are based on time, like closing bidding, expiring offers and making an emergency sale more widely are executed as a background job within the API every five seconds. The job never repeats an action, since it reads the current state from the database every time the job is run. This eliminated the requirement of any type of separate job queue service. The developer had the necessary skills, including TypeScript, React, and SQL, so the project was a good fit.

### 1.2.2 Operational Feasibility

**Assessment: Feasible**

The system is intended to be user friendly and readily accessible:

- A few pages and side menus exist on each role's own dashboard. The main actions involve listing produce, bidding, selecting transport and inputting a handover code, and are just a few steps away.
- Login is by phone number and password, available to all users. There is no email required and if the password is lost, it will be reset using a code sent via SMS.
- Changes to website are immediately reflected in the app as the website is what is loaded in the app and also works on phones, tablets and computers.
- All parties are kept updated throughout via in-app notifications or live updates, without having to refresh the page.
- Warnings, like a deadline close to the end of shelf life or an open vehicle in the monsoon, help the user but never block them.
- Admin can operate in a simple mode consisting of 6 pages for daily activities, or can choose to operate in full mode with all of the tools available.
- All changes pushed to GitHub are automatically deployed to the website and the API.

### 1.2.3 Economic Feasibility

**Assessment: Highly feasible**

- **Development cost:** The main cost is the developer's time. All the development tools used are free.
- **Infrastructure cost:** The system is hosted on the free plans of Vercel, Render, Neon and Cloudinary. The Android app is built for free for a public repository, with GitHub Actions.
- **The cost of SMS text messages:** BulkSMSBD charges for the text messages sent via SMS. This cost remains low, as SMS is only used to send password reset codes.
- **Licence cost:** None. All libraries are open source and permissively licensed.
- **Real cost:** With the free plan the API server will go to sleep when it is idle and will take time to wake. For a real launch there would be paid plans for the API and the database, but no physical server would be needed.
- **Revenue model:** FreshNest is free of charge for farmers, dealers and transport providers. Revenue comes from agri companies (like seed and fertiliser companies) by monthly subscription to the upazila market report (Tk 1,500 per upazila per month in the current design) and sponsored offers labelled and sent only to farmers signed up for it.

### 1.2.4 Schedule Feasibility

**Assessment: Feasible**

The entire project was designed in line with the university timeline. The proposal was accepted on 23 March 2026, the mid defence was held on 22 July 2026 and the final report was produced in November 2026. It was broken down into stages, with a deliverable for each stage, which would be displayed and tested. Requirements were set first and tested by clicking on a prototype before any real code was written. The components of the system were then implemented one by one, deployed online and packaged as an Android application. The detailed schedule is given in Section 1.6.

### 1.2.5 Legal Feasibility

**Assessment: Feasible**

1. All libraries used are open source under permissive licences, such as MIT and Apache 2.0, which allow their use in this project.
2. All the district and upazila names and co-ordinates are taken from public bangladesh-geocode dataset [17].
3. Personal information is safeguarded by design. Verification documents and pictures for delivery failures are only visible to the owner and admins. No phone numbers are ever passed on to agri companies. Only upazila level information is available to the companies and the name of a farmer is displayed to companies only if the farmer turns on "Receive offers from verified agri companies".
4. This version is a non-monetary platform, and does not require a payment licence.
5. Only dealers and transport providers who can be verified with documents are allowed to trade, hence minimizing the risk of fraud.

## 1.3 Target User Profile and Elicitation Process

### 1.3.1 Target Users

**Primary users:**

1. **Farmers:** Individuals engaged in farming activities who sell vegetables and fruits in bulk; small farmers to large agri entrepreneurs etc.
2. **Dealers:** Wholesale buyers—traders, wholesalers/suppliers to retailers and supermarkets who buy in bulk.
3. **Transport providers:** Owners of pickups, mini trucks, trucks and covered vans (ventilated, refrigerated).

**Secondary users:**

1. **Admins:** FreshNest staff. The team is run by a Super Admin that delegates the permissions others have, such as verification, deals and/or reports, announcements and analytics.
2. **Agri companies:** Upazila market report subscribers who also send sponsored offers to farmers. They do not log in – the admin controls their subscriptions.

### 1.3.2 User Profile

Designed for an audience with the following profile:

- **Location:** in all 64 districts of Bangladesh. Farmers mainly reside in upazilas in rural areas, the dealers in towns/cities and the transport providers along common trade routes.
- **Devices:** Principally Android smart phones. Typically a computer is the tool used by admins.
- **Digital skills:** Basic – probably for many farmers, good – for dealers and admins. It is important that the interface is therefore based on simple screens, simple words, clear status labels and warnings instead of hard blocks.
- **Typical language(s):** Most are Bangla speakers. The present interface is written in simple English language, future work involves Bangla interface.

Table 1.1 provides a summary of the roles' wishes for the system and their top concerns.

Table 1.1: Goals and concerns of each user role

| Role | Main goal | Main concern |
|---|---|---|
| Farmer | Sell the harvest quickly at a fair price | Spoilage, a low price and finding a suitable vehicle |
| Dealer | Buy the right quantity and quality on time | Trust in the seller, delivery time and transport cost |
| Transport provider | Find loads that fit their vehicles | Empty trips, unclear handovers and breakdowns on the way |
| Admin | Keep the marketplace safe and running | Fake accounts, disputes and stuck deliveries |

### 1.3.3 Elicitation Process

The requirements were gathered and refined in the following ways:

1. **Supervisor meetings:** The idea, scope and main design choices were discussed. For instance, many real users are not only small farmers, but also agri-entrepreneurs, the supervisor indicated. For clarity, the role name "Farmer" was maintained and the design considers both small and large sellers.
2. **Scenario walkthroughs:** Two scenarios were developed, one covering the journey of a farmer, dealer and transport provider throughout one harvest season and one covering a day in the admin office. A step-by-step walk-through ensured that each role understood what was expected of them with each step of a deal.
3. **Prototyping:** Clickable HTML prototypes of each role's dashboard were developed and reviewed page by page before the real development. After the review, the design was altered, for instance, the farmer's 'My listings' and 'Deals and delivery' pages were consolidated into a single page.
4. **Study of problem domain:** Farm to retail markups and post-harvest losses in the produce value chain were studied from published literature [2], [3] pertaining to the markets.
5. **Use-case analysis:** All the critical scenarios like listing, bidding, making an offer, arranging transport, handing over produce, reporting a delivery failure, and verification of a user were written as use cases. They are detailed in Chapter 2.

## 1.4 Project Block Diagram

The blocks of FreshNest are illustrated in Figure 1.1. Each of the four user roles access the system via the Android app (which loads the same website) or a web browser. The Next.js front end deployed on Vercel renders each page for each role, and calls the Express REST API hosted on Render. The API uses the business rules, stores data in a PostgreSQL database via Prisma on top of Neon, stores photos and documents in Cloudinary, sends password reset codes via SMS through BulkSMSBD gateway, and sends live updates to open pages via Socket.IO. A background job inside the API runs every 5 seconds to close bidding, expire offers and widen emergency sales on time.

![Figure 1.1: FreshNest block diagram](diagrams/block-diagram.png)

## 1.5 System Requirements

### 1.5.1 Hardware Requirements

**Development computer (recommended):**

- **Processor:** 64-bit dual-core processor or better. The project was built on an Apple silicon Mac.
- **Memory:** 8 GB (as the Next.js development server, database and API are all running concurrently).
- **Storage:** approximately 5 GB free storage for code, packages and local DB.
- **Internet:** A broadband connection for installing packages and deployment.

**Production server:**

There is no requirement for a physical server. The system uses managed cloud services:

- **Website:** Vercel, which serves the Next.js pages.
- **API:** A Render web service in Singapore. The free instance has 512 MB of RAM and 0.1 CPU.
- **Database:** serverless PostgreSQL in Singapore (Neon).
- **Files:** Cloudinary.

**User devices:**

- For the app, any Android smartphone (version 7.0 or later) or any phone, tablet or computer with a modern web browser.
- A cell phone connection or a Wi-Fi network.
- A camera (optional) for listing photos and documents.

### 1.5.2 Software Requirements

The software that was used to build and run FreshNest is shown in Table 1.2.

Table 1.2: Software requirements

| Layer | Software | Version |
|---|---|---|
| Runtime | Node.js | 22 or later |
| Backend | Express with TypeScript | 5.3 |
| Database | PostgreSQL (on the development computer and on Neon online) | 18 (development) |
| Data access | Prisma ORM | 7.10 |
| Live updates | Socket.IO (server and client) | 4.8 |
| Validation and security | Zod, jsonwebtoken, bcryptjs | 4, 9, 3 |
| File uploads | Multer and the Cloudinary SDK | 2, 2 |
| SMS | BulkSMSBD SMS gateway, through its HTTP API | Online service |
| Frontend | Next.js with React and TypeScript | 16.4, 19.3, 5 |
| Mobile app | Capacitor, Android SDK, Java (on GitHub Actions) | 8.6, 36, 21 |
| Development tools | Visual Studio Code, Git and GitHub, Prisma Studio, npm, draw.io | Current versions |
| User side | Chrome, Edge, Firefox or Safari with JavaScript and cookies enabled | Recent versions |

### 1.5.3 Constraints and Dependencies

**Technical constraints:**

- System requires internet access. No offline mode - a "No internet, retry" screen is shown.
- On the free plan, the API server goes to sleep when it is idle, meaning that the first request may take as long as a minute or so after it's been idle. While the server is waking up, a "Starting the server" notice appears on the website.
- Time-based rules run in one background job inside the API, so the API itself is executed as a single instance.
- Each uploaded photo or document can be at most 5 MB. Images are scaled down in the browser before uploading.
- Password reset codes rely on the SMS gateway being accessible and on the SMS account having balance.
- The calculation of "Nearest" is performed using stored lists of neighbouring upazilas and districts based on their coordinates, not current GPS.

**Business constraints:**

- Online payment is not available. The dealers pay the farmer and the transport service provider off the platform.
- Before dealers and transport providers can trade, they need to be verified by an admin.
- The interface is in English only.

**Environmental constraints:**

- Mobile network coverage in rural areas varies.
- Season advice is based on a fixed season calendar and not a live weather system.

**Dependencies:**

- Cloud services: Vercel, Render, Neon, Cloudinary and GitHub, which holds the code, runs GitHub Actions [18] and hosts the Android app download.
- SMS gateway: BulkSMSBD requires an account with an API key, as well as an approved SMS sender ID [16].
- The open-source packages that are listed in Table 1.2.
- Location data: 64 districts and 495 upazilas with Bangla names and coordinates, from the bangladesh-geocode data set [17].

## 1.6 Project Scheduling

### 1.6.1 Development Timeline

The project timetable from the moment of the proposal's acceptance to the final report is given in Table 1.3.

Table 1.3: Development timeline

| Phase | Duration | Activities | Deliverables |
|---|---|---|---|
| 1. Planning | 23 Mar – 30 Apr 2026 | Feasibility study, scope and project plan after the proposal was accepted | Project plan |
| 2. Requirement analysis | 1 May – 12 Jul 2026 | Study of the problem, user scenarios, use cases, functional and non-functional requirements | Requirements, use case and activity diagrams |
| 3. Mid-defense | 13 – 22 Jul 2026 | Presentation and design review | Mid-defense slides |
| 4. Design and prototype | 23 Jul – 31 Aug 2026 | Database design, system architecture, clickable HTML prototype for all four roles | ER diagram and clickable prototype |
| 5. Marketplace development | 1 Sep – 10 Oct 2026 | Registration and login, listings, bidding, offers, deals, notifications, live updates | Working marketplace |
| 6. Transport and admin development | 11 Oct – 10 Nov 2026 | Vehicles, transport offers, handover codes, delivery failure, emergency sale, admin panel, analytics, responsive design | Complete deal life cycle |
| 7. Deployment and Android app | 11 – 26 Nov 2026 | Vercel, Render, Neon and Cloudinary setup, SMS password reset with BulkSMSBD, Android app built by GitHub Actions | Live system and APK |
| 8. Report | 20 – 30 Nov 2026 | Testing, diagrams, screenshots and project report | This report |

### 1.6.2 Milestones

1. **M1 (23 March 2026):** Project proposal accepted.
2. **M2 (12 July 2026):** All requirements completed.
3. **M3 (22 July 2026):** Mid-defense completed.
4. **M4 (31 August 2026):** Design and prototype completed.
5. **M5 (10 October 2026):** Marketplace working (from listing to deal).
6. **M6 (10 November 2026):** All transport, delivery failure and admin features completed.
7. **M7 (26 November 2026):** System online and release of the Android application.
8. **M8 (30 November 2026):** Report submitted.

![Figure 1.2: Project Gantt chart](diagrams/gantt-chart.png)

## Summary

This chapter presented the online marketplace named FreshNest which is aimed to connect farmers, dealers, transport providers and administrators (admin) in Bangladesh. It explained the situation in fresh produce trading, the long middlemen chain, limited coverage, post harvest loss, unplanned transportation, lack of trust and breakdowns, and the purpose and scope of the project. The feasibility study has indicated the technical, operational, economic, schedule and legal feasibility of the project. The chapter also outlined the target users and the process of collecting the requirements, presented the block diagram, listed the hardware and software requirements along with their constraints and also provided the project schedule. The design and implementation of the system is described in Chapter 2.
