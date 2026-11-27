# FreshNest report — humanized draft

Confirmed humanized parts, collected one by one. The chapters in `chapters/` are not changed until the user says to move these in.

## ABSTRACT (confirmed 2026-11-27)

In the country of Bangladesh, the farmers typically sell fresh vegetables and fruits along a long chain of intermediaries, engage only the traders who visit their local markets, and arrange transport through phone calls. Owing to the perishability of produce, there has been a high loss rate from slow sales combined with unsuitable vehicles. This is an online agricultural marketplace, in the form of an Android app and a responsive website, that connects four roles of this project, FreshNest: Farmer, Dealer, Transport Provider and Admin.

A farmer lists produce with its harvest date, quantity and price, and sells it in one of two ways: open bidding, where the highest bid wins automatically when bidding closes, or a fixed price, where dealers send quantity and price offers. The system relies on every product's shelf life to set safe deadlines, suggest who should see the listing and determine what type of vehicle to use. Once an agreement has been reached, verified providers offer a specific vehicle, the dealer chooses or counters an offer, and four-digit pickup and delivery codes confirm every handover. If a vehicle breaks down on the way, an admin-approved emergency sale offers the produce to dealers near the stuck vehicle. Admins verify dealers and transport providers, process reports and cancellation requests, and monitor market analytics.

FreshNest is built with Next.js, Express, PostgreSQL with Prisma and Socket.IO, and is deployed online for free on Vercel, Render and Neon. All 61 automated tests of its business rules pass when run against the real API and database.

## CHAPTER 1: 1.1 to 1.3.2 (confirmed 2026-11-27)

1.1 Background
1.1.1 Context and Relevance
In Bangladesh Agriculture is the major source of employment. About 45 percent of the total working population is engaged in agricultural activities, but the agriculture sector accounts for only around 11.7 percent of GDP of the country in FY22 [1] according to the Labour Force Survey 2022 of the Bangladesh Bureau of Statistics. Much of this activity involves crop cultivation, and vegetables and fruits do not hold up on the market and tend to experience rapid reductions in value after they are picked.
The bulk of this produce is sold through a distribution chain which acts as a chain of intermediates between the grower and purchaser. Typically a farmer sells the produce to a trader who visits the village or the nearest village market. The produce is then bought by wholesale traders or commission agents, and sold to retailers in towns and cities. All transport for each stage is organised over the telephone, much of the time at short notice. As such, the prices, buyers and vehicles being used are determined by whoever the farmer can reach, rather than the market.
Through the use of mobile phones and mobile Internet, it is possible to bring this market online. The agricultural marketplace, FreshNest, is a web-based platform that brings together four roles under one roof and is also accessible as an Android app. Farmers post their produce on the platform, dealers (wholesale buyers) bid or put offers, transport providers provide suitable vehicles for transport and admins verify users and fix issues. System is built around the facts which matter during storage of fresh produce in Bangladesh, including, shelf life, time of harvest, distance between Upazilas and Districts, transportation type required by the product and season.
1.1.2 Problem Identification
In the present pattern of selling and transshipment of fresh produce the following problems exist:
Long supply chains: Every link along the chain makes a margin. A study in 2025, by the Centre for Policy Dialogue revealed farm-to-retail price markups in the case of green chillies as high as 116 per cent, onions as high as 87 per cent and brinjal as high as 72 per cent [2]. Only a small proportion of the consumer's price goes to the farmer.
Narrow market access: A farmer may only be able to sell to the traders visiting the local market. As the produce is not available for viewing by the dealers in other upazilas/districts, the competition is very low.
Perishability and post harvest loss: According to a study by the Bangladesh Agricultural University, 23.6 to 43.5 percent of 13 major fruits and vegetables is lost after harvest, worth about 3,442 crore Tk annually [3]. This loss can also be caused by poor sales and by poor transport.
Unplanned transport: Vehicles are tracked down by telephone. Matching load with capacity and facility requirements of the vehicle is a complicated process, e.g. strawberries need a refrigerated vehicle, and a covered vehicle is needed during the rainy season.
Limited trust at handover: Lack of record of who took the produce and when it was delivered. Disagreements at the pick up or delivery time are difficult to resolve and there are no ratings to see which buyers and drivers are reliable.
No plans for breakdowns: When a vehicle breaks down en route, or when there is a road blockage, the produce can spoil before a solution is found.
FreshNest solves these issues by bringing farmers, dealers and transport providers into a single marketplace, utilising "shelf life" and "location" in every decision and assigning a clear "owner", a set "time" and a "record" to each aspect of a deal.
1.1.3 Purpose and Justification
FreshNest aims to achieve the following: quick sales of fresh produce at a fair price for farmers; and safe delivery of the produce. The project will:
Allow farmers to access verified dealers outside their local market and be able to decide how they sell the product – through open bidding or their own fixed price.
Utilize each product's shelf life to determine safe dates, to recommend who should view a listing and to decide which vehicle is required to reduce spoilages.
Make transport open and fair, including offers for specific vehicles, a counter offer from the dealer, and pickup and delivery codes which confirm each handover.
Provide an easy out when a delivery fails, via an admin-approved emergency sale to dealers close to the stuck vehicle.
Provide Admins with means to verify users, manage reports and cancellation requests, and learn more about the market through analytics.
Show full-stack software engineering: modern web frontend, REST API with live updates, relational database, cloud deployment and an Android app.
Justification is given because the sorts of problems outlined above impact many members of the nation's work force, while the technology required to address these problems (smartphones, mobile internet, cheap cloud computing) is now ubiquitous.
1.1.4 Scope
Included in scope:
Registration and login with phone number and password for four roles. The dealer/transport provider accounts undergo verification by an admin prior to trading, by sending the relevant documents. Farmers do not have to be verified.
One time password reset code sent through SMS to the user's mobile phone via the gateway BulkSMSBD.
A product list is provided for each product listing, which contains information on the shelf life and storage requirement of each product, the harvest date of the product, a picture of the product and the selling unit selected by the farmer (kg, mon or ton).
Listing visibility chosen by the farmer – only the farmer's upazila, the farmer's district with chosen nearby districts, or the entire country. The system suggests a scope based on the product's shelf life.
Two selling modes. Open bidding is a bidding format in which all dealers make a bid for the entire lot, the bidders are anonymous to one another and when the bidding closes the highest bid is the automatic winner. An optional Buy Now price will end the bidding once it's reached. Dealers in the fixed-price mode make offers to the farmer with their own quantities and price; the farmer either accepts or rejects/counters each offer only once.
A primary deal has clear cancellation rules – the cancellation can be made at any time before transport is booked, and can only be done with admin approval after this.
Specific transport offers in accordance to facility (normal, ventilated or refrigerated) and transport capacity with season advice on open vehicles. The dealer chooses one offer or makes one lower price counter-offer, and four-digit pickup and delivery codes confirm the handover.
Delivery failure reports from transport providers, admin clearance and emergency sale – beginning with the upazila of the vehicle and expanding to the district and then to neighbouring districts.
In-app display of rating and reviews after each completed deal, live updates without refresh or page change and notifications.
Report that has a reason list attached to the deal that it is related to.
Admin panel (verify, cases, users, products, announcements, analytics, business tools, a team of admins, separate permissions, a private account standing (warnings & suspensions) for every user).
A business model for agri companies: monthly upazila market report subscription and sponsored offers to those farmers who agree to receive offers from the companies.
Responsive website for phone, tablet and computer, and an Android app (APK).
Excluded from scope:
Online payment, payment records. Outside the platform, the dealer pays the farmer, and the transport provider.
Marketplace events notification via SMS, email and push. They will be displayed in the platform, and SMS will only be used for resetting password codes.
Live weather forecasts. Advice is seasonal and follows a set calendar.
GPS live tracking of vehicles.
An iPhone app and publishing on Google Play.
A Bengali oriented interface. The interface is in English at this time.
Transport organised by farmer/dealer outside the platform.
1.2 Feasibility Study
The project was vetted on five fronts prior to development, with the aim of making sure one developer could finish it in the allotted time.
1.2.1 Technical Feasibility
Assessment: Highly feasible
Mature and well-documented technologies with open availability that are used in the project:
Frontend: Next.js 16 with React 19 and TypeScript [4], [5].
Backend: Express 5 on Node.js with TypeScript, exposing a REST API [6].
Database: PostgreSQL [7] through the Prisma ORM [8] that also handles schema migrations.
Live updates: Socket.IO pushes changes, such as a new bid, to open pages [9].
Security: JSON Web Tokens [10] stored within an httpOnly cookie, passwords are always hashed using bcrypt, and, all input is verified with Zod schemas.
Files: Cloudinary for listing photos, verification documents and delivery failure photos [11].
Mobile: Capacitor, which packages the website as an Android software program [12].
Hosting: Vercel [13] for the website, Render [14] for the API and Neon [15] for the database.
SMS: One time codes that can be sent out through SMS gateway (BulkSMSBD) [16].
Rules that are based on time, like closing bidding, expiring offers and making an emergency sale more widely are executed as a background job within the API every five seconds. The job never repeats an action, since it reads the current state from the database every time the job is run. This eliminated the requirement of any type of separate job queue service. The developer had the necessary skills, including TypeScript, React, and SQL, so the project was a good fit.
1.2.2 Operational Feasibility
Assessment: Feasible
The system is intended to be user friendly and readily accessible:
A few pages and side menus exist on each role's own dashboard. The main actions involve listing produce, bidding, selecting transport and inputting a handover code, and are just a few steps away.
Login is by phone number and password, available to all users. There is no email required and if the password is lost, it will be reset using a code sent via SMS.
Changes to website are immediately reflected in the app as the website is what is loaded in the app and also works on phones, tablets and computers.
All parties are kept updated throughout via in-app notifications or live updates, without having to refresh the page.
Warnings, like a deadline close to the end of shelf life or an open vehicle in the monsoon, help the user but never block them.
Admin can operate in a simple mode consisting of 6 pages for daily activities, or can choose to operate in full mode with all of the tools available.
All changes pushed to GitHub are automatically deployed to the website and the API.
1.2.3 Economic Feasibility
Assessment: Highly feasible
Development cost: The main cost is the developer's time. All the development tools used are free.
Infrastructure cost: The system is hosted on the free plans of Vercel, Render, Neon and Cloudinary. The Android app is built for free for a public repository, with GitHub Actions.
The cost of SMS text messages: BulkSMSBD charges for the text messages sent via SMS. This cost remains low, as SMS is only used to send password reset codes.
Licence cost: None. All libraries are open source and permissively licensed.
Real cost: With the free plan the API server will go to sleep when it is idle and will take time to wake. For a real launch there would be paid plans for the API and the database, but no physical server would be needed.
Revenue model: FreshNest is free of charge for farmers, dealers and transport providers. Revenue comes from agri companies (like seed and fertiliser companies) by monthly subscription to the upazila market report (Tk 1,500 per upazila per month in the current design) and sponsored offers labelled and sent only to farmers signed up for it.
1.2.4 Schedule Feasibility
Assessment: Feasible
The entire project was designed in line with the university timeline. The proposal was accepted on 23 March 2026, the mid defence was held on 22 July 2026 and the final report was produced in November 2026. It was broken down into stages, with a deliverable for each stage, which would be displayed and tested. Requirements were set first and tested by clicking on a prototype before any real code was written. The components of the system were then implemented one by one, deployed online and packaged as an Android application. The detailed schedule is given in Section 1.6.
1.2.5 Legal Feasibility
Assessment: Feasible
All libraries used are open source under permissive licences, such as MIT and Apache 2.0, which allow their use in this project.
All the district and upazila names and co-ordinates are taken from public bangladesh-geocode dataset [17].
Personal information is safeguarded by design. Verification documents and pictures for delivery failures are only visible to the owner and admins. No phone numbers are ever passed on to agri companies. Only upazila level information is available to the companies and the name of a farmer is displayed to companies only if the farmer turns on "Receive offers from verified agri companies".
This version is a non-monetary platform, and does not require a payment licence.
Only dealers and transport providers who can be verified with documents are allowed to trade, hence minimizing the risk of fraud.
1.3 Target User Profile and Elicitation Process
1.3.1 Target Users
Primary users:
Farmers: Individuals engaged in farming activities who sell vegetables and fruits in bulk; small farmers to large agri entrepreneurs etc.
Dealers: Wholesale buyers—traders, wholesalers/suppliers to retailers and supermarkets who buy in bulk.
Transport providers: Owners of pickups, mini trucks, trucks and covered vans (ventilated, refrigerated).
Secondary users:
Admins: FreshNest staff. The team is run by a Super Admin that delegates the permissions others have, such as verification, deals and/or reports, announcements and analytics.
Agri companies: Upazila market report subscribers who also send sponsored offers to farmers. They do not log in – the admin controls their subscriptions.
1.3.2 User Profile
Designed for an audience with the following profile:
Location: in all 64 districts of Bangladesh. Farmers mainly reside in upazilas in rural areas, the dealers in towns/cities and the transport providers along common trade routes.
Devices: Principally Android smart phones. Typically a computer is the tool used by admins.
Digital skills: Basic – probably for many farmers, good – for dealers and admins. It is important that the interface is therefore based on simple screens, simple words, clear status labels and warnings instead of hard blocks.
Typical language(s): Most are Bangla speakers. The present interface is written in simple English language, future work involves Bangla interface.

## CHAPTER 1: Table 1.1 to end, and CHAPTER 2: 2.1 to 2.4.2 (confirmed 2026-11-27)

Table 1.1 provides a summary of the roles' wishes for the system and their top concerns.
Table 1.1: Goals and concerns of each user role
Role | Primary Objective | Primary Concern
Farmer | Sell the harvest quickly at a fair price | Spoilage, a low price and finding a suitable vehicle
Dealer | Buy the required quantity and quality of product timely | Trust in the seller, delivery time and transport cost
Transport provider | Find loads for their vehicles | Empty trips, unclear handovers and breakdowns on the way
Admin | Keep the marketplace safe and running | Fake accounts, disputes and stuck deliveries
1.3.3 Elicitation Process
The requirements were gathered and refined in the following ways:
Supervisor meetings: The idea, scope and main design choices were discussed. For instance, many real users are not only small farmers, but also agri-entrepreneurs, the supervisor indicated. For clarity, the role name "Farmer" was maintained and the design considers both small and large sellers.
Scenario walkthroughs: Two scenarios were developed, one covering the journey of a farmer, dealer and transport provider throughout one harvest season and one covering a day in the admin office. A step-by-step walk-through ensured that each role understood what was expected of them with each step of a deal.
Prototyping: Clickable HTML prototypes of each role's dashboard were developed and reviewed page by page before the real development. After the review, the design was altered, for instance, the farmer's 'My listings' and 'Deals and delivery' pages were consolidated into a single page.
Study of problem domain: Farm to retail markups and post-harvest losses in the produce value chain were studied from published literature [2], [3] pertaining to the markets.
Use-case analysis: All the critical scenarios like listing, bidding, making an offer, arranging transport, handing over produce, reporting a delivery failure, and verification of a user were written as use cases. They are detailed in Chapter 2.
1.4 Project Block Diagram
The blocks of FreshNest are illustrated in Figure 1.1. Each of the four user roles access the system via the Android app (which loads the same website) or a web browser. The Next.js front end deployed on Vercel renders each page for each role, and calls the Express REST API hosted on Render. The API uses the business rules, stores data in a PostgreSQL database via Prisma on top of Neon, stores photos and documents in Cloudinary, sends password reset codes via SMS through BulkSMSBD gateway, and sends live updates to open pages via Socket.IO. A background job inside the API runs every 5 seconds to close bidding, expire offers and widen emergency sales on time.
1.5 System Requirements
1.5.1 Hardware Requirements
Development computer (recommended):
Processor: 64-bit dual-core processor or better. The project was built on an Apple silicon Mac.
Memory: 8 GB (as the Next.js development server, database and API are all running concurrently).
Storage: approximately 5 GB free storage for code, packages and local DB.
Internet: A broadband connection for installing packages and deployment.
Production server:
There is no requirement for a physical server. The system uses managed cloud services:
Website: Vercel, which serves the Next.js pages.
API: A Render web service in Singapore. The free instance has 512 MB of RAM and 0.1 CPU.
Database: serverless PostgreSQL in Singapore (Neon).
Files: Cloudinary.
User devices:
For the app, any Android smartphone (version 7.0 or later) or any phone, tablet or computer with a modern web browser.
A cell phone connection or a Wi-Fi network.
A camera (optional) for listing photos and documents.
1.5.2 Software Requirements
The software that was used to build and run FreshNest is shown in Table 1.2.
Table 1.2: Software requirements
Layer | Software | Version
Runtime | Node.js | 22 or later
Backend | Express with TypeScript | 5.3
Database | PostgreSQL (on the development computer and on Neon online) | 18 (development)
Data access | Prisma ORM | 7.10
Live updates | Socket.IO (server and client) | 4.8
Validation and security | Zod, jsonwebtoken, bcryptjs | 4, 9, 3
Upload files | Multer and Cloudinary SDK | 2, 2
SMS | BulkSMSBD SMS gateway, through its HTTP API | Online service
Frontend | Next.js with React and TypeScript | 16.4, 19.3, 5
Mobile app | Capacitor, Android SDK, Java (on GitHub Actions) | 8.6, 36, 21
Development tools | Visual Studio Code, Git and GitHub, Prisma Studio, npm, draw.io | Current versions
User side | Chrome, Edge, Firefox or Safari with JavaScript and cookies enabled | Recent versions
1.5.3 Constraints and Dependencies
Technical constraints:
System requires internet access. No offline mode - a "No internet, retry" screen is shown.
On the free plan, the API server goes to sleep when it is idle, meaning that the first request may take as long as a minute or so after it's been idle. While the server is waking up, a "Starting the server" notice appears on the website.
Time-based rules run in one background job inside the API, so the API itself is executed as a single instance.
Each uploaded photo or document can be at most 5 MB. Images are scaled down in the browser before uploading.
Password reset codes rely on the SMS gateway being accessible and on the SMS account having balance.
The calculation of "Nearest" is performed using stored lists of neighbouring upazilas and districts based on their coordinates, not current GPS.
Business constraints:
Online payment is not available. The dealers pay the farmer and the transport service provider off the platform.
Before dealers and transport providers can trade, they need to be verified by an admin.
The interface is in English only.
Environmental constraints:
Mobile network coverage in rural areas varies.
Season advice is based on a fixed season calendar and not a live weather system.
Dependencies:
Cloud services: Vercel, Render, Neon, Cloudinary and GitHub, which holds the code, runs GitHub Actions [18] and hosts the Android app download.
SMS gateway: BulkSMSBD requires an account with an API key, as well as an approved SMS sender ID [16].
The open-source packages that are listed in Table 1.2.
Location data: 64 districts and 495 upazilas with Bangla names and coordinates, from the bangladesh-geocode data set [17].
1.6 Project Scheduling
1.6.1 Development Timeline
The project timetable from the moment of the proposal's acceptance to the final report is given in Table 1.3.
Table 1.3: Development timeline
Phase | Duration | Activities | Deliverables
Planning | 23 Mar – 30 Apr 2026 | Feasibility study, scope and project plan following acceptance of the proposal | Project plan
Requirement analysis | 1 May – 12 Jul 2026 | Study of the problem and user scenarios, use cases, functional and non-functional requirements | Requirements, use case and activity diagrams
Mid-defense | 13 – 22 Jul 2026 | Presentation and design review | Mid-defense slides
Design & prototype | 23 Jul – 31 Aug 2026 | Database design, system architecture, clickable HTML prototype for all four roles | ER diagram and clickable prototype
Marketplace development | 1 Sep – 10 Oct 2026 | Registration and login, listings, bidding, offers, deals, notifications, live updates | Working marketplace
Transport and admin development | 11 Oct – 10 Nov 2026 | Vehicles, transport offers, handover codes, delivery failure, emergency sale, admin panel, analytics and responsive design | Complete deal lifecycle
Deployment and Android app | 11 – 26 Nov 2026 | Vercel, Render, Neon and Cloudinary setup, SMS password reset with BulkSMSBD, APK built with GitHub Actions | Live system and APK
Report | 20 – 30 Nov 2026 | Testing, diagrams, screenshots and project report | This report
1.6.2 Milestones
M1 (23 March 2026): Project proposal accepted.
M2 (12 July 2026): All requirements completed.
M3 (22 July 2026): Mid-defense completed.
M4 (31 August 2026): Design and prototype completed.
M5 (10 October 2026): Marketplace working (from listing to deal).
M6 (10 November 2026): All transport, delivery failure and admin features completed.
M7 (26 November 2026): System online and release of the Android application.
M8 (30 November 2026): Report submitted.
Summary
This chapter presented the online marketplace named FreshNest which is aimed to connect farmers, dealers, transport providers and administrators (admin) in Bangladesh. It explained the situation in fresh produce trading, the long middlemen chain, limited coverage, post harvest loss, unplanned transportation, lack of trust and breakdowns, and the purpose and scope of the project. The feasibility study has indicated the technical, operational, economic, schedule and legal feasibility of the project. The chapter also outlined the target users and the process of collecting the requirements, presented the block diagram, listed the hardware and software requirements along with their constraints and also provided the project schedule. The design and implementation of the system is described in Chapter 2.
CHAPTER 2 | DESIGN AND IMPLEMENTATION
2.1 Introduction
In this chapter, the process and design of building FreshNest will be explained. It first transforms the needs identified in Chapter 1 into functional and non-functional requirements. Next, it models the system using UML: first a use case diagram, then use case descriptions, an activity diagram for each role and a sequence diagram for each of the main functions of the system, and lastly, the entity relationship diagram of the database. The final section has to do with architecture, the technology used and with significant implementation choices and some actual code snippets.
2.2 Functional Requirements
The purpose of giving functional requirements is to state what the system is required to do. Table 2.1 is a list of the 22 functional requirements of FreshNest and to whom they are relevant.
Table 2.1: Functional requirements
ID | Requirement | Description | Stakeholder
FR01 | Registration | Farmers, dealers and transport providers register with their name, Bangladeshi mobile number, password, district and upazila. Dealers and transport providers also provide a business name. | Farmer, Dealer, Transport Provider
FR02 | Login and logout | Users log in with their phone number and password. The session lasts seven days, and users can log out of it. | All users
FR03 | Password reset | When the user forgets the password, he/she gets a one-time code via SMS with BulkSMSBD and sets a new password. | All users
FR04 | Profile and standing | Users are able to edit their profile and photo, change password and view their reviews and their own account standing (private). | All users
FR05 | Verification | Dealers and transport providers upload an NID and a trade/driving licence. Admin approves/rejects or requests a clearer document, and gives a reason. | Admin, Dealer, Transport Provider
FR06 | Create listing | A farmer can post a product with its quantity, unit (kg, mon or ton), price, harvest date and photos. From the shelf life, the system suggests the scope of visibility and a safe deadline. | Farmer
FR07 | Visibility | A listing is only visible to dealers in its scope: the farmer's upazila, the farmer's district with selected districts, or the entire country. The nearest listings come first. | Dealer, System
FR08 | Open bidding | Dealers bid on the entire lot. A bid must be at least the highest bid + the minimum increment. Bidders appear to each other as "Dealer #1" and "Dealer #2". An optional Buy Now price puts an end to the bidding in one fell swoop. | Dealer
FR09 | Close bidding | Once the deadline expires, the highest bid wins automatically, thus creating a deal. The farmer may relist one time if there are no bids. | System
FR10 | Own-price offers | Dealers provide a quantity, a price and a reply time. The farmer accepts, rejects or counters once. Every accepted offer is a deal and the remaining quantity decreases. | Farmer, Dealer
FR11 | Cancel a deal | The farmer or dealer cancels a deal with a reason. The deal is cancelled immediately if transport is not booked; after that, it can only be cancelled with admin approval. | Farmer, Dealer, Admin
FR12 | Vehicles | Transport providers add type, capacity and facility and registration paper of vehicles. Each vehicle is approved by an admin. | Transport Provider, Admin
FR13 | Transport offers | Transport providers find deals by pickup district and upazila and offer 1 vehicle with a price, pickup time and delivery time. Only a vehicle with enough capacity and the right facility, and available at that time, can be offered. | Transport Provider
FR14 | Choose or counter | Dealer selects an offer or makes one lower counter-price, which the transport provider has 2 hours to accept. Booking makes the pickup and delivery codes. | Dealer, Transport Provider
FR15 | Handover codes | Driver inputs the farmer's 4-digit pickup code at loading and the dealer's delivery code on arrival. 5 incorrect tries lock the code until an admin resets it. | Transport Provider, Farmer, Dealer
FR16 | Delivery failure | A driver provides details on the stuck vehicle such as reason, photo, produce condition and usable quantity. An admin approves or rejects the report. | Transport Provider, Admin
FR17 | Emergency sale | After admin approval, an emergency bidding offers the produce to dealers around the vehicle, and is extended from the upazila level to the district level and then to neighbouring districts. | Farmer, Dealer, System
FR18 | Ratings and reviews | At the completion of a deal, the farmer rates the dealer and the transport provider, and the dealer rates the farmer, both with stars and a comment. | Farmer, Dealer
FR19 | Reports | Users report another user with a reason from a list, linked to the deal. An admin can warn, suspend, dismiss or hide a review. | All users, Admin
FR20 | Notifications and live updates | Users get in-app notifications in a bell menu and live updates are displayed without requiring a refresh. | All users
FR21 | Admin team and settings | The Super Admin adds admins with permissions. Admins manage the product list, season months and other settings, and all admin actions are logged. | Admin
FR22 | Analytics and business | Admins have access to market analytics by upazila (including CSV export) and platform charts, manage company subscriptions and send announcements, including sponsored offers to farmers who opted in. | Admin
2.3 Non-Functional Requirements
Non-functional requirements state how successfully the system can work. Reliability of timed rules and fairness of bidding is vital for a marketplace of perishable produce, along with security and ease of use for people with different levels of digital skill.
2.3.1 Performance
Database indexes are used on the columns that filter lists, such as listing status and scope, user role and upazila, and deal status.
When live updates are used, only a small "changed" signal is sent and later the user's page is refreshed only with the data that it shows.
The photos are made smaller in the browser before uploading and cannot exceed a maximum size of 5 MB.
Every timed rule is processed every 5 seconds by one background job, and a run is skipped if the previous one is still working.
2.3.2 Reliability
All timed state is stored in the database, and each step of the background job can safely be executed again, so nothing is lost when the server restarts.
Bidding, Buy Now, offer acceptance and transport booking run in database transactions with row locks. No two dealers can win the same lot and a vehicle may not be booked twice.
When a delivery failure waits 30 minutes without an admin decision, it brings an urgent alert to all admins dealing with deals.
The website displays a "Starting the server" notice instead of failing when the free server is waking up.
2.3.3 Security
The user's password is stored in hashes using bcrypt and not sent to the browser.
Sessions are signed tokens and are in an httpOnly cookie which page scripts are unable to read.
All routes verify the user's role, verification status and, for admins, their permission.
All input is checked with a schema prior to use.
Verification documents and failure pictures are private to their owner and the admins.
2.3.4 Usability
Each role has its own dashboard showing only their workflows.
Warnings inform the user but do not obstruct him/her, e.g. a deadline close to the end of shelf life or an open vehicle in the monsoon.
The layout responds from phone size to large-size devices, along with a slide-in menu on small screens.
The quantities are displayed in the unit that the farmer selected: kg, mon or ton.
2.3.5 Portability
The website functions on latest browsers on Windows, macOS and Linux, as well as Android and iOS operating systems and the Android app loads the identical website.
Everything that is configured (addresses, keys, etc.) is specified through environment variables, and this means that the same code is used on a laptop and in the cloud.
2.3.6 Maintainability
Backend is divided into routes, shared services, small libraries and the background job. In the frontend, it's grouped by feature.
Both the front-end and back-end are built with TypeScript and migrations using Prisma ensure database structure is version controlled.
Automated API testing verifies crucial business rules on each update.
2.4 System Design
2.4.1 Use Case Diagram
The use case diagram is shown in Figure 2.1. Farmer, Dealer, Transport Provider and Admin all are types of User, hence all use cases that every user has, like Register, Log in and Reset password by SMS, are connected once to User. System Timer is an independent actor through which the rules are timed. Creating a listing always includes the scope and deadline suggestion, sending a transport offer always includes the vehicle check, and choosing transport always includes generating the handover codes.
2.4.2 Use Case Descriptions
Below are descriptions of the six most important use cases.
Table 2.2: UC-01: Create a listing
Use case | Create a listing
Goal | A farmer sells a product with a safe deadline and the right visibility.
Preconditions | The farmer is signed in. The product is in the product list, or the farmer provides the shelf life and storage requirement.
Success end condition | Listing is open and dealers in the chosen area can view it.
Failed end condition | Nothing is saved and the form displays an indication of what to change.
Primary actor | Farmer
Secondary actors | None
Trigger | The farmer selects "Create listing".
Main success scenario | 1. The farmer decides the product, quantity, unit and price. 2. Farmer provides harvest date and photographs. 3. The system recommends the visibility scope and a safe deadline from the shelf life. 4. The farmer decides on open bidding (deadline, minimum increment, optional Buy Now) or own price (minimum order, minimum reply time). 5. The listing is saved and displayed to dealers in the scope.
Alternative flows | 3a. The selected deadline is past the safe interval: a warning is issued and the farmer can go on. 5a. Nothing is saved because some fields are unfilled or are improperly filled.
Quality requirements | A listing can be created in a matter of minutes on a phone.
Table 2.3: UC-02: Bid on a listing
Use case | Bid on a listing
Goal | A dealer buys a full lot through open bidding.
Preconditions | The dealer has been verified. The listing is open, in open bidding, and in the dealer's area.
Success end condition | The dealer holds the highest bid; when the deadline comes, the system automatically sets up the deal.
Failed end condition | The bid is not accepted and the highest bid remains unchanged.
Primary actor | Dealer
Secondary actors | Farmer, System Timer
Trigger | The dealer opens a listing in the market and enters a price.
Main success scenario | 1. The dealer opens the listing; other bidders show up as "Dealer #1", "Dealer #2". 2. The dealer puts in a price. 3. The system locks the listing and compares the price with the highest bid + minimum increment. 4. The system records the bid, tells the farmer and the outbid dealer, and updates all open pages. 5. The timer gives the lot to the highest bid at the deadline and makes the deal.
Alternative flows | 2a. The dealer clicks the Buy Now button: the deal is created at once and bidding is closed. 3a. The bid is not accepted because the price is too low and/or bidding has closed. 5a. No bids by the deadline: the listing finishes with no sale and the farmer can relist once.
Quality requirements | Other dealers can see a new highest bid without refreshing.
Table 2.4: UC-03: Book transport
Use case | Book transport
Goal | The dealer gets a suitable vehicle for the deal at an agreed price.
Preconditions | A deal is waiting for transport. Transport providers are verified and have approved vehicles.
Success end condition | One offer is accepted, vehicle is booked, other offers are closed and pick-up and delivery codes generated.
Failed end condition | No offer is accepted; the dealer can extend the offer window once, or cancel with a reason.
Primary actor | Dealer
Secondary actors | Transport Provider, Farmer
Trigger | Transport provider sends an offer for the deal.
Main success scenario | 1. The transport provider selects a vehicle and quotes a price, pickup time and delivery time. 2. The system evaluates if the vehicle is free at the time and able to accommodate the load by checking the capacity and facility of the vehicle. 3. The dealer compares the offers, which have season tags such as "Cost-saving" or "Weather risk". 4. Dealer makes a selection. 5. The system books the vehicle, closes the other offers and generates the two handover codes.
Alternative flows | 2a. The vehicle does not fit or it is occupied: the offer is rejected. 4a. The dealer sends 1 lower counter-price; if the provider accepts it within 2 hours, the offer is booked at that price. 4b. No offer comes in the window: the dealer can extend it once.
Quality requirements | A vehicle may never be booked for two trips at the same time.
Table 2.5: UC-04: Hand over the produce with codes
Use case | Hand over the produce with codes
Goal | Pickup and delivery are confirmed by the persons involved.
Preconditions | Transport is confirmed; the farmer and the dealer view their codes in the application.
Success end condition | The deal is completed and both parties are able to leave a review.
Failed end condition | The code is denied; after 5 wrong attempts it is locked until reset by an admin.
Primary actor | Transport Provider
Secondary actors | Farmer, Dealer, Admin
Trigger | When the driver comes to load the produce.
Main success scenario | 1. After loading, the farmer reads the pickup code to the driver. 2. It is entered by the driver, verified by the system, and the deal is flagged as in transit. 3. On arrival, the dealer reads the delivery code to the driver. 4. It is then inputted by the driver and the system marks the deal completed. 5. The system notifies everyone and reviews are opened.
Alternative flows | 2a, 4a. Wrong code: states the number of attempts remaining. 2b, 4b. Five incorrect tries: the code locks and an admin can reset it.
Quality requirements | Codes are random four-digit numbers made by the server when transport is booked.
Table 2.6: UC-05: Report a delivery failure
Use case | Report a delivery failure
Goal | Save the produce when a vehicle is unable to complete the journey.
Preconditions | Deal is in transit.
Success end condition | An admin approves the report, the original deal is marked failed and an emergency sale begins close to the vehicle.
Failed end condition | The administrator denies the report and the driver continues the trip.
Primary actor | Transport Provider
Secondary actors | Admin, Farmer, dealers close to the vehicle
Trigger | Vehicle breaks down, has an accident, or the road is blocked.
Main success scenario | 1. Driver informs upazila, reason, photo, produce condition, usable quantity and if the vehicle is still mobile. 2. The report is saved to the system and notifications are sent to admins. 3. Report is approved by an admin. 4. The farmer sets the duration and price drop of the emergency sale, starting from suggested values. 5. The system offers the produce to dealers in the stuck upazila, then in the whole district, and then in neighbouring districts. 6. The highest bid wins and a new deal is made.
Alternative flows | 3a. No admin decision for 30 minutes: an urgent alert goes to all admins involved with deals. 4a. The farmer chose automatic start: the sale starts 30 minutes after approval with the suggested values. 5a. No bids for an hour: the sale moves on to the next area.
Quality requirements | The admin queue shows the remaining shelf life of each case, so the most urgent case is served first.
Table 2.7: UC-06: Verify a dealer or transport provider
Use case | Verify a dealer or transport provider
Goal | Solely actual traders and transport suppliers are able to do business.
Preconditions | The admin has the verification permission, and the user has uploaded documents.
Success end condition | The account becomes active, or is rejected or asked for a clearer document, with the reason recorded.
Failed end condition | The application remains pending.
Primary actor | Admin
Secondary actors | Dealer or Transport Provider
Trigger | The admin accesses the Verification page.
Main success scenario | 1. Pending users & vehicles are listed in the system. 2. The admin takes the case, so other admins see that it is being handled. 3. The admin verifies the NID and trade/driving licence. 4. Account is approved by the admin. 5. The system activates it, records the action and communicates this to the user.
Alternative flows | 4a. Document was not understandable: admin requests a re-upload with an explanation. 4b. The documents are not valid: the admin rejects the account with a reason.
Quality requirements | Documents are private: they can only be opened by the owner and admins.

## CHAPTER 2: 2.4.3 to end, and CHAPTER 3 (confirmed 2026-11-27)

2.4.3 Activity Diagrams
The activity diagrams depict the actions of each role and the actions done by the system in a different swimlane. Decisions show the outcome of a check that was not successful, such as an invalid or rejected document or an incorrect handover code.
2.4.4 Sequence Diagrams
The sequence diagrams illustrate how the web app, server, database and external services work together through eight main functions. Solid arrows are calls and dashed arrows are replies; "alt" frames show the different outcomes.
2.4.5 ER Diagram
The schema of Prisma is displayed as an entity relationship diagram in Figure 2.14. There are 21 tables and 227 columns in the database. All the accounts are stored in a single User table, and the account's role determines whether it is a farmer, dealer, transport provider or admin. Solid line means foreign keys with crow's feet indicating the many side, dashed line means many-to-many relationship like neighbouring districts and upazilas and the districts a listing is directed towards. Each table is used for a particular purpose as defined in Table 2.8.
Table 2.8: Database tables
Table | Purpose
District, Upazila | All 64 districts and 495 upazilas, with Bangla names and their neighbours
User | Every account: role, phone, password hash, status, location; admin permissions
Product | The product list, with shelf life, storage need and default unit
Listing | Produce on sale: quantity, price, harvest date, scope, selling mode and emergency sale fields
Bid | Bids in open bidding
Offer | Dealer offers in own-price mode, with the farmer's counter-offer
Deal | Primary deals: quantity, price, status, transport window and handover codes
Vehicle | Transport providers' vehicles, with capacity, facility and approval
TransportOffer | Transport offers for a deal, with the dealer's counter-price
CancelRequest | Cancellations after transport is booked, waiting for an admin
Review | Stars and comments after a completed deal
DeliveryFailure | Reports of stuck vehicles and the admin's decision
VerificationDoc | NID, trade licence and driving licence files
Report | Reports against users and the admin's decision
Notification | In-app notifications
AdminLog | A record of every admin action
Announcement | Messages to users, including sponsored offers
Company | Agri companies and their upazila report subscriptions
CaseLock | Shows which admin is handling a case
Setting | Settings such as the season months and time limits
2.5 Implementation
2.5.1 System Architecture
FreshNest is based on a 3 tier architecture. The presentation tier is rendered by Vercel through a Next.js web application, and the Android app is a Capacitor shell that loads the same website. The application tier is a REST API written with Express and hosted on Render. The data tier consists of a PostgreSQL database on Neon, while Cloudinary is used for storing photos and documents.
All requests go through the same pipeline. The session cookie is read and the user is loaded from the database, so a suspension and/or ban takes effect at that moment. Then the role is verified by the route guards, as well as the verification status and, for admins, the permission. Once the input is validated by a Zod schema, the work is done through Prisma, and changes by two people made at the same moment will execute as part of a transaction with a row lock. Finally, notifications are written by the server and it sends a live "changed" signal via Socket.IO, and the open pages will update this information from the API, with a renewed permission check. No private information is transferred via the live connection.
2.5.2 Technology Stack
Table 2.9: Technology stack
Layer | Technology | Reason for the choice
Frontend | Next.js 16, React 19, TypeScript | Pages for each role, fast navigation and type safety
Styling | CSS with design tokens, Plus Jakarta Sans | One consistent look across roles, light and responsive
Live updates | Socket.IO 4.8 | Pushes "something changed" signals to open pages
Backend | Node.js, Express 5, TypeScript | A simple REST API in the same language as the frontend
Database | PostgreSQL with Prisma 7 | Relations, transactions and row locks; type-safe queries and migrations
Validation | Zod 4 | One schema checks the input of each route
Security | jsonwebtoken, bcryptjs, httpOnly cookie | Signed sessions and hashed passwords
Files | Multer, Cloudinary | Upload limits, cloud storage and private documents
SMS | BulkSMSBD | Password reset codes
Mobile | Capacitor 8 | An Android app that loads the live website
Hosting | Vercel, Render, Neon, GitHub Actions | Free plans, automatic deployment and the Android build
2.5.3 Backend Modules
Table 2.10: Backend modules
Module | Responsibility
auth | Register, log in, log out, and a short ticket for the live connection
meta | Districts, upazilas and the product list
profile | Profile, photo, password change, documents, reviews and account standing
listings | Create, preview (scope and deadline), edit, withdraw and relist listings
market | The dealers' market, bids and Buy Now
offers | Own-price offers and counter-offers
deals | Deals, transport choice and counter-price, offer window, cancel and review
vehicles | Transport providers' vehicles
transport | Deals for transport providers, transport offers, trips, handover codes and failure reports
emergency | Emergency sale: start, widen and the automatic preference
notifications | Bell notifications
reports | Reports against users
admin | Overview, verification, cases, users, products, seasons, announcements, companies, team, settings, log, analytics and delivery failures
jobs | The timed rules that run every five seconds
services | Shared rules: scope and deadline, visibility, vehicle fit, seasons, booking, cancellation and emergency sale
2.5.4 Security Implementation
Passwords: securely hashed using bcrypt and the hash of the password never leaves the server.
Sessions: 7 day signed JSON Web Token [10] in an httpOnly, SameSite cookie, only sent over HTTPS in production.
Access Control: Different guards are used to check whether the person is signed in, has a particular role and is verified to trade, and whether the person is an admin and has a particular permission (verification, deals, reports, announcements or analytics). There are some actions which are only allowed for the Super Admin.
Input validation: All routes are validated for their input, including validation for the Bangladeshi mobile number format using Zod.
Private files: verification documents and failure pictures are only shown to the owner and the admins, and from the Cloudinary side the links last for a maximum of 5 minutes.
Fair bidding: When bidding, using Buy Now, accepting an offer or booking the transport, the current row will be locked, and two requests cannot be successful at the same time.
Codes for handover: random, four digit codes generated with a secure random number generator – maximum of 5 attempts.
Privacy: The dealer only sees the other bidders as "Dealer #1", "Dealer #2" and phone numbers of farmers are never displayed to agri companies.
Web origin: Only the FreshNest website can make browser requests to the API.
2.5.5 Live Updates and Timed Rules
Live updates are performed with Socket.IO [9]. Upon page opening, the browser gets a two minute ticket from the API and connects with it, and the server then puts that connection into the user's own room. When a page displays a listing, it is also added into the listing's room. If something changes (including a new bid), a short signal is sent to the room by the server, and the page refreshes its information via the regular API (Appendix A.5).
Within the API, one background task executes the time based rules every 5 seconds (Appendix A.3). Each run completes finished bidding, removes unanswered offers and counter-prices, informs dealers of the close of a transport window, escalates delivery failures that remain outstanding too long, triggers automatic emergency sales and expands quiet ones; approximately once every minute it also hides listings past their shelf life. Each step does a read of the current state from the database, and also locks the row that it updates, meaning that a step never repeats an action even if it runs twice. Initially a job queue service was envisioned, but this more streamlined version is not dependent on a separate service on the free hosting.
2.5.6 Frontend Implementation
Next.js App Router is used on the front end. The farmer has 4 pages: Home, Create listing, Sales and Profile; the dealer has 4 pages: Home, Market, Purchases and Profile; the transport provider has 5 pages: Home, Deals, Trips, Vehicles and Profile; and admin has 10 pages: Overview, Verification, Cases, Delivery failures, Users, Products, Announcements, Analytics, Business and Team. The landing, login and register pages are shared.
The components are divided into feature groups: common, layout, landing, marketplace, transport, admin and account. All API requests are forwarded by the website to the Express server, so the browser talks to one address and the session cookie is equally valid on both the website and the API. A "Starting the server" notice is provided for requests that take more than four seconds to complete. The design adjusts to tablets and phones with a slide-in menu and a single column, while the Android app introduces a retry screen for when there is no internet connection and access to the camera to take photos.
2.6 Coding: Appendix A
In this section short samples of the real source code will be displayed. Some long lines are cut back to provide page space.
A.1 Session Cookie and Role Guards (Express)
A.2 Placing a Bid inside a Transaction
A.3 Automatic Closing of Bidding (Background Job)
A.4 Prisma Model (Deal)
A.5 React Code (Live Updates)
Summary
This chapter defined 22 functional requirements and the quality requirements for performance, reliability, security, usability, portability and maintainability. A use case diagram, 6 use case descriptions, an activity diagram for each role, 8 sequence diagrams and an ER diagram of 21 tables were created to model the system. The three-tier architecture and technology decisions were described in the implementation section, as were the backend modules; security, live updates and timed rules; and frontend, followed by snippets of the actual code. The next chapter discusses the testing process of the system.
CHAPTER 3 | SOFTWARE TESTING
3.1 Introduction
Deals in fresh produce are made on FreshNest between four types of users, so a mistake in the rules has an immediate price: a truck that is booked for two different trips, a winning bid that is ignored, a lot sold to two dealers or a deadline that passes the shelf life of the produce. To this end, every build phase was accompanied by testing, rather than leaving it to the end. Automated testing of its business rules was performed at the end of each phase; and one single command was used to run the tests of all phases, and therefore a change in one phase was also tested with the rules of the others. The features tested, the methodology and the passing and failing criteria are discussed in this chapter followed by the test cases and their outcomes.
3.2 Testing Features
3.2.1 Features to Be Tested
Critical features:
The visibility of the listing, in relation to the farmer's upazila, in relation to the district and districts (chosen) and in relation to the whole country.
Open bidding: base price, minimum increment, anonymous bidders, Buy Now and a single winner if two dealers act at the same time.
Automatic closing of bidding and relisting a lot that was not bid on.
Own-price offers: reply duration, minimal order, quantity available, one counter offer and expiration.
Transport matching and booking: vehicle capacity, facility, small-pickup rule, offer window, counter-prices and no double booking of a vehicle.
Pickup and delivery codes, with the limit on wrong tries.
Delivery failure, the admin decision and the emergency sale.
Access control: role, verification status and admin permission on all the routes, private documents and photos.
Important features:
Registration and verification of dealers.
Cancelling deals, with admin approval after transport is booked.
Reviews, reports, warnings, suspensions and bans.
Notifications for events such as being outbid or a failed delivery.
Amounts shown in the farmer's unit: kg, mon or ton.
Admin office: Products, Season calendar, settings and team permissions, case locks and announcements, activity log.
3.2.2 Features Not Tested Automatically
Appearance and action of the pages, such as their layout on phones and live updating via Socket.IO. These were verified by hand in the browser.
Profile editing, adding vehicles using the form, logging out and failed logins – none of these have automated testing of their own. Each test script does log in at the beginning.
Market analytics, the CSV export and company subscriptions (FR22).
Uploads to Cloudinary, which are only used by the online version. The tests run with the local file storage of the development server.
Load and stress testing with multiple users at the same time.
3.3 Testing Strategies
3.3.1 Test Approach
Integration (API) testing:
Tools: 4 TypeScript scripts in backend/test, one for each build phase from Phase 2 to Phase 5, using tsx. They utilise the assert module and fetch that come with Node.js - no external test frameworks required.
Method: each script logs in as demo accounts and sends HTTP requests to the real Express API using real session cookies, in the same way as the website. After each step it checks the status code as well as the response, and then fetches the data from the database using Prisma to verify the data stored.
Accounts: ten demo accounts – 1 farmer, 3 dealers (Bogura, Joypurhat, Dhaka), 3 transport providers (with different types of vehicles) and 3 admins with different permissions (including the Super Admin).
Data: All listings and deals created by each script will be destroyed at the end of the scripts to keep the demo data intact, so the scripts can be run again.
Command: npm test will run the four scripts in sequence. A failed check aborts the current run and sets the test case's result to failure.
Timed rules:
It is not feasible to wait hours for a real deadline. Instead, a script moves a deadline into the past in the DB and waits for 6.5 seconds, so the real background job, which runs every 5 seconds (Section 2.5.5), works on it. This includes: end of bidding; expiry of offers and counter-prices; end of the transport offer window; the automatic emergency sale and the urgent alert for admins.
Concurrency testing:
Two dealers using Buy Now for the same lot at the same time, and the test checks that only one deal is created.
Security testing:
Requests are made as the wrong user: a farmer on admin routes, an admin without permission, a transport provider on another provider's trip/offer, and a pending/suspended or banned user. Private documents and photos are accessed by other users, and without logging in.
Static testing:
When invoking the TypeScript compiler against the backend and the frontend, type errors are checked (npm run typecheck).
Manual testing:
While it was being built, each page was hand-browsed in full screen and at phone width in the Google Chrome browser.
The tests were conducted in the environment as indicated in Table 3.1.
[Table 3.1 unchanged from chapters/03-testing.md]
3.3.2 Pass/Fail Criteria
Pass criteria:
Each test step should return the expected status code, while the response and the database should show the expected result.
100% of the 61 test cases pass in one run.
TypeScript check succeeds with no errors.
Fail criteria:
Any status code that is incorrect, crash or unhandled error.
If a user observes or alters something he/she has no right to observe or alter.
A timed rule that does not act after its deadline.
3.4 System Testing (Test Cases with Report)
The system test cases are given in Table 3.2. They are supported by the automated tests in the backend/test folder that contain 61 test cases in total (Table 3.3). Numbers of the requirements refer to Table 2.1. The status codes are: done – 200, created – 201, invalid input – 400, not allowed – 403, not found/not visible to this user – 404, not possible in the current state – 409, locked by another admin – 423. The final run on 27th November 2026 passed all cases.
[Table 3.2 unchanged from chapters/03-testing.md]
3.4.1 Test Summary
The last run was made on the development computer on 27 November 2026. The four scripts executed 61 test cases containing 310 assertions in 58 seconds with all test cases passing (Table 3.3). Eight waits of 6.5 seconds each are for the background job, which takes up most of this time. The TypeScript compiler found no errors in the backend or the frontend.
[Table 3.3 unchanged from chapters/03-testing.md]
A defect was also uncovered in the testing which was resolved. Table 3.4 describes it.
[Table 3.4 unchanged from chapters/03-testing.md]
3.5 Summary
The testing primarily employed 61 automated test cases which test the real API and real database. All of them passed in the last run, and there were no TypeScript errors. The test cases include each role together with the rules that are most pertinent for a marketplace of perishable produce: fair bidding, where a single dealer wins; offers and counter offers; transport matching, where no vehicle is double booked; as well as handover codes and the delivery failure process. All the rules are tested with good and bad data. The timed rules were successfully tested with the real background job, and access control for each of the roles was tested. One problem was identified and resolved and the pages were verified manually using the browser. How the tested system was released is described in the following chapter, as well as a description of how it is maintained.

## CHAPTERS 4, 5 and 6 (confirmed 2026-11-27)

CHAPTER 4 | DEPLOYMENT AND MAINTENANCE
4.1 Introduction
The marketplace is just useful when it's online and dependable. This chapter covers how FreshNest progressed from the development machine to the internet through the stages of the software release life cycle, the production system's organization and configuration, and how the system is kept healthy and up to date.
4.2 Adhering to the Software Release Life Cycle (SRLC)
4.2.1 Alpha Release
Purpose: internal testing by the system's developer during the construction of the system (Phases 5 & 6 in Table 1.3).
The system was installed to run on the development computer with a local PostgreSQL database, demo accounts for all roles, and a demo market containing listings, deals and 12 months worth of history.
Every browser tab can be logged in as a different role, and a complete deal (from farmer to dealer to transport provider to admin) can be followed on one computer.
All build stages ended with automated API testing of their rules (Chapter 3), and every new page was checked in the browser.
4.2.2 Beta Release
Purpose: running the full system in the real cloud (Phase 7 in Table 1.3).
The website was deployed on Vercel, the API on Render and the database on Neon, in addition to the photos and documents on Cloudinary. The online database was loaded with the locations, products, demo accounts, demo market and history.
Live system testing was carried out using the demo accounts of all four roles – signing in, the data appearing on each of the dashboards, and the live connection for updates.
A problem that was identified at this stage was addressed prior to the release. When there are no visitors for 15 minutes, the free Render server stops, and the first request has to wait until the server has started again. The site now shows a "Starting the server…" notice whenever a request takes longer than four seconds, instead of seeming broken.
4.2.3 Release Candidate
Purpose: final tests of the completed system prior to the production release.
There were no issues found by the TypeScript check and all automated API tests passed (Table 3.3).
The security settings were reviewed. Secrets are defined only in Render/Vercel's environment variables, not in the code, and not in Git. A long random signing key was created by Render. SameSite=Lax, Secure and httpOnly are all set in the session cookie. Only the website's address can make API requests or open a live connection (CORS). Private files are handed out only after a permission check, as Cloudinary links that expire after five minutes.
The Android app was built and signed with GitHub Actions using a fixed signing key, which means that the next releases install over the existing app.
4.2.4 Production Release
The release of FreshNest (M7 in Chapter 1) was on 26 November 2026. Table 4.1 gives the details of the release.
[Table 4.1 stays as in the original]
4.3 Deployment Architecture
The deployment of FreshNest is shown in Figure 4.1. Users open the website in a browser (or in the Android app, which displays the same website). Vercel serves the Next.js pages using HTTPS. Pages make API calls using the website's own address (/api), and Vercel passes these calls to the Express server on Render, which means that the session cookie remains with the website. Live updates are from a direct Socket.IO connection with Render. Since the cookie is not sent to another address, the page first asks the API for a two-minute ticket and then opens the connection with it.
The closest Render region to Bangladesh is Singapore, which is where the Render service is situated. It runs the API, the live updates and the background job. It uses the Neon PostgreSQL database in the same region through Prisma over an encrypted (SSL) connection, stores photos and documents in Cloudinary and sends SMS codes via BulkSMSBD. With the free plan, Render shuts down the server after 15 minutes of no visits. It restarts in less than a minute the next time someone visits the site, meanwhile displaying the "Starting the server…" notice on the site.
When pushed to the main branch on GitHub, the website on Vercel is rebuilt, and if the backend folder has been changed, the API on Render is deployed, applying any new database migrations on start. When changes are made to the mobile folder, the Android app is built, signed and published as a GitHub Release with a GitHub Actions workflow. Since the app opens the live website, updates to the website reach phones without having to download a new version of the application.
4.3.1 Configuration
All secrets and settings are given to the services as environment variables in the Render and Vercel dashboards, and are never written in the code. There are no secrets in the repository, as the .env files of the development computer are not in the Git repository. The main variables are listed in Table 4.2.
[Table 4.2 stays as in the original]
4.3.2 Deployment Steps
In the Singapore region create a Neon project and then copy the connection string, but disable the connection pooling as the migrations require a direct connection.
Create a Cloudinary account, and copy its CLOUDINARY_URL.
On Render, deploy the API using the render.yaml blueprint found in the repository: root folder backend, build command npm install and npm run build (Prisma client and TypeScript), start command npm start (run the migrations, then start the server) and health check /api/health. Set DATABASE_URL, WEB_ORIGIN and CLOUDINARY_URL; Render creates JWT_SECRET.
Import the repository into Vercel with the "frontend" root folder and set API_URL and NEXT_PUBLIC_SOCKET_URL to the Render address.
Set WEB_ORIGIN on Render to the Vercel address.
Use scripts/seed-production.sh to load the following data into Neon: migrations, 64 districts, 495 upazilas, products, admin and demo accounts, demo market, 12 months of history.
Verify /api/health is ok, then log in as 2 different roles in 2 separate windows and make sure a bid shows up on the other page without refreshing.
Put the app signing key in a GitHub secret and trigger the Android workflow, which will publish FreshNest.apk as a GitHub Release.
4.4 Maintenance Procedures
Daily:
Open the website, check for the /api/health response, and view the Render logs for any errors.
Process admin queues – dealers, transport providers & vehicles awaiting verification, delivery failures (urgent alert after 30 mins), reports, requests for cancellation & locked handover codes.
Weekly:
Read the admin activity log for suspicious activity and check the account standing of users who have multiple reports.
Check the free-plan limits: the database size on Neon, the storage on Cloudinary and the SMS credit in BulkSMSBD.
Address reported bugs; make an automated test for each bug; run npm test and npm run typecheck before pushing.
Monthly:
Before deploying, update npm packages, test and type check.
Look at the product list, the shelf-life values and the season calendar in the admin office. They can be changed without any code changes.
Create a backup of the database and check that it can be restored.
Keep a backup of the Android signing key, as users otherwise would be forced to uninstall the app to install the next update. Change any secrets that might have been compromised.
Releasing an update:
On every push to the main branch deploying takes place, and new migrations to the database run when the server starts on Render.
In the event that a deployment causes issues, the previous deployment can be restored on the Vercel and Render dashboards.
A new APK will not be required if nothing changes in the app itself, e.g. if the app keeps the same name and icon and the same permissions are required.
4.5 Summary
FreshNest has been through the Alpha, Beta and Release Candidate stages leading up to its production launch on 26 November 2026. The web app is hosted on Vercel, the API and the DB are hosted in Singapore on Render & Neon, files are kept on Cloudinary and SMS is sent through BulkSMSBD. New pushes are deployed automatically, the Android app follows the website with no new downloads, and all secrets are kept in environment variables. Daily, weekly and monthly routines keep the system running, secure and up to date. The next chapter is a user manual for each of the roles.
CHAPTER 5 | USER MANUAL
5.1 Introduction
This chapter is a step by step guide for each type of user: farmers, dealers, transport providers and admins. It provides an explanation of how to register and log in and how each role accomplishes its main tasks, and includes matching screens of the live system at https://freshnest-bd.vercel.app. The screenshots were taken with the demo accounts and demo data on 27 November 2026. All the pages also work on the phone, and the same pages are displayed in the Android app.
5.2 Project Functionalities
5.2.1 Registration and Login
Open up the site, or install the Android app (FreshNest.apk from the project's GitHub Releases) and open it. Then click on Join free or Start selling, free.
On Create your account, select Farmer, Dealer or Transporter. Type in your full name, phone number, password (a minimum of 8 characters), district and upazila. Farmers can add their village, dealers add a shop or business name and transport providers a company name.
Click on Create farmer account (or dealer/transporter account). Farmers are allowed to sell immediately.
The documents dealers and transport providers put up on the Profile & reviews page include: dealer NID and trade licence; transport provider NID, driving licence and registration of each vehicle. These are checked by an admin typically within a day. Until then, they're able to look around, but not bid or offer or take trips.
Later, log in on the Welcome back page of the website using your phone number and password. The session will last for 7 days and Sign out will end the session.
5.2.2 Farmer Tasks
Open Create listing. Select the category and product in What are you selling. In Quantity, price and harvest select whether to sell by kg, mon or ton, and enter the quantity, base price and harvest date. A description and up to 4 photos are optional.
In Who can see this listing, keep the suggested reach or change it: your upazila, your district with other chosen districts, or the whole country. The recommendation is based on the shelf life of the product. You can also ask for a better vehicle than the product needs.
In How do you want to sell, select Open bidding, with the time bidding ends and an optional Buy Now price, or Own price, with the minimum order and the time dealers must give you to reply. Review the Summary and then click Publish listing. The listing may be edited or withdrawn until the first bid/first offer is submitted.
Follow your listings on My Sales. In open bidding, when the bidding period ends, the highest bid wins automatically, and if there's no bidding, then you can relist 1 time. For an own-price listing, accept, reject or counter every offer. You can counter an offer one time only.
After a deal, the dealer books a transport provider. Once the transport is confirmed, you will be able to see your four-digit pickup code on My Sales. Give it to the driver only after the produce has been loaded and weighed.
Should a deal have to be cancelled, provide a reason. Before transport is booked, the deal is cancelled immediately; after that, the request is sent to an admin.
At the end of the delivery, give stars and comments to the dealer and transport provider. If an issue has occurred, use Report a problem and select the reason from the list.
If the vehicle breaks down and the admin approves the driver's report, click Start emergency sale to sell the produce to dealers around the vehicle at the suggested reduced price for the suggested duration, and then click Widen now to increase the range of dealers. On the deal, you can choose beforehand whether the sale should start by itself if you don't respond within 30 minutes.
5.2.3 Dealer Tasks
Open Marketplace. It displays listings in your area, listings that target your area and nationwide listings, closest first. Filter them according to product, district or upazila of the farmer, selling mode and harvest time.
To view details of a listing, click on the listing. For open bidding, enter your price under Your bid and click Place bid. A bid has to be at least the highest bid + the minimum increment; bidders are only identified as "Dealer #1", "Dealer #2". If the listing has a Buy Now price, then the entire lot can be purchased at once.
For an own-price listing, complete Make an offer: the quantity, your offer price, the time the farmer has to respond and an optional note. You can have one active offer for each listing. If the farmer counters, accept or reject the counter.
Monitor all deals, bids or offers in My Purchases. For every new deal, specify how long transport providers have to send offers: 3, 6, 12 or 24 hrs. However, lengths that would cause spoilage of the produce cannot be chosen.
Compare the transport offers. Each displays the vehicle, price, pickup and delivery times and a season tag like cost-saving. Choose one, or Counter once at a lower price, which the provider can accept within two hours. If no offers are received in time, extend the window once.
On arrival of the produce, inspect it and provide the driver with the four digit delivery code. Then rate both the farmer and the transport provider.
5.2.4 Transport Provider Tasks
Open My vehicles and click Add vehicle. Type, registration number, load capacity (in kg) and the facility (normal, ventilated or refrigerated) should be entered, and a photo of the registration document should be included. Before the vehicles can be offered, they are approved by an admin.
Open Find deals and choose the pickup districts and upazila you work in. If one of your approved vehicles has the appropriate facility and can transport the entire amount, a deal will be shown.
Choose a deal and send Your offer: the vehicle, your price and the times of pickup & delivery. You may only send one offer for any given deal, and can edit or withdraw it as long as the dealer hasn't confirmed. If the dealer sends a lower counter-price, click Accept and book the trip, or reject it, within 2 hours.
Follow your work on My trips, under Offers, Confirmed, On the road and Completed & closed. At the farm, after loading and weighing, enter the pickup code of the farmer and hit the Confirm pickup button.
At the dealer, type the dealer's delivery code and click the Confirm delivery button. If someone puts in the wrong code 5 times, it is locked and cannot be used until an admin resets it.
Click Report delivery failure if the vehicle breaks down en route. Include the reason, location, picture, condition of the produce, amount usable and the vehicle's ability to move. If it is not checked by an admin within 30 minutes, then each admin who handles deals receives an urgent alert.
In case you can't perform a confirmed trip, you can click on Cancel trip and provide a reason. The deal is then available for other providers to put offers forward.
5.2.5 Admin Tasks
Log in via the same login page with an administrator's account. What is awaiting (verifications, delivery failures and open cases) and automatic alerts are shown in the Overview.
Open Verification, choose a dealer, transport provider and/or vehicle and verify the documents. Click Approve, Ask for re-upload or Reject with a reason. Other admins are able to see that you are working on a case.
Open Delivery failures, check the driver's report and picture, and approve it, or reject it with a reason. Reports that wait 30 minutes are marked as urgent.
Open Cases for cancellation requests, reports between users, reported reviews and locked handover codes. All decisions must be associated with a written reason: Approve cancellation, Warn, Suspend or ban, Dismiss, Hide review, Keep review or Reset tries.
Use Users to search for anyone by name, shop or phone, filter by role, district, upazila or status and open a user's history.
Open Business for the upazila market report, which can be exported as a CSV company report, the company subscriptions and the sponsored offers to farmers.
The Super Admin can click Show all admin tools to display the complete list of pages: Products & seasons (the product list, shelf lives, vehicle needs and the season calendar), Announcements, Analytics and Admin team & settings (admins and their permissions, system settings and the activity log).
5.3 Screens of the System
Common pages
The home page provides information about FreshNest and offers links for registration and login.
Users log in with their phone number and password.
Each role sees the fields it needs. Dealers and transport providers also give a business name.
Farmer
The farmer's home page contains information about open listings, offers waiting for an answer, active deals and the sales of the month.
A listing is made in 4 steps, with a summary beside the form.
My Sales displays all the listings with their offers, bids and deals; on the right is the selected listing.
A sold listing displays the deal, the booked vehicle and the farmer's pickup code.
The profile page contains the particulars of the farmer, the private account standing and the reviews from dealers.
Dealer
On the dealer's home page, the market in the vicinity, leading bids, active deals and counter-offers are displayed.
You can filter and sort the listings with the closest listings shown first. An own-price listing has the offer form.
A bidding listing shows the highest bid and the bid form. Bidders stay anonymous.
For a new deal, the dealer selects how long transport providers can send offers.
Transport offers show the vehicle, price, times and a season tag, with Counter and Choose buttons.
Transport provider
The home page lists trips on the road, confirmed pickups, offers waiting, earnings for the month and a season tip.
Find deals lists all deals the provider's vehicles can transport, filtered by pickup district, with the provider's own offer.
A confirmed trip awaits the farmer's pickup code.
Trips on the road wait for the dealer's delivery code, and a delivery failure can be reported here.
Each vehicle is shown with its facility, capacity, approval and bookings.
Admin
The overview shows the queues, platform figures, actions to be taken now and automatic alerts.
The documents are checked next to the user's history before a decision.
Delivery failures are displayed with the most urgent at the top, and the driver's report is displayed.
In a report between users, the person's history and the decision buttons are displayed.
Everyone on FreshNest can be found by name or phone and filtered down to the upazila.
The upazila market report for agricultural companies is available for export in CSV format.
The product list contains the Bangla names of products, their shelf lives and vehicle requirements, as well as the products suggested by farmers.
The Super Admin manages the admins and their permissions, the system settings and the activity log.
Mobile view
All pages can be displayed on a phone screen, and the same pages are also displayed in the Android app.
5.4 Summary
In this user manual, each role is described in how it registers, logs in and performs its core activities, with screenshots of the live system. There is a separate dashboard for each role that shows only the tasks of that role, pages have a common design and everything is available on a phone and in the Android app, so new users need little training. This project is summarised in the next chapter.
CHAPTER 6 | PROJECT SUMMARY
6.1 Introduction
Finally, this chapter reflects upon the project as a whole: what has been accomplished, where the current iteration is lacking and how FreshNest can continue.
6.2 Project Achievements
FreshNest was designed, built, tested and deployed as a fully operational system. It has the following major accomplishments:
An online marketplace (at https://freshnest-bd.vercel.app) and an Android app for 4 roles: farmer, dealer, transport provider and admin.
Fair selling: open bidding where the highest bid wins automatically and bidders stay anonymous, an optional Buy Now price, and own price offers with one counter offer, all in the farmer's own units (kg, mon, ton).
Freshness-aware rules: each product's shelf life is used to establish safe deadlines, propose to whom the listing should be shown and determine which vehicle to use.
Reach by location: a listing is published in the farmer's upazila, in the farmer's district with chosen districts, or throughout the country, encompassing 495 upazilas and 64 districts of Bangladesh with their neighbours.
Safe transport: verified providers offer specific vehicles matched by capacity and facility, the dealer selects or counters an offer, no vehicle can be booked twice and four-digit pickup and delivery codes confirm each handover.
Less loss on the road: if a vehicle breaks down, an admin approved emergency sale offers the produce to dealers around the vehicle, widening step by step, and it can start by itself.
A complete admin office: verification of documents with case locks; reports, warnings, suspensions and bans; cancellation requests; products and seasons; a group of admins with particular permissions; activity log; analytics and a business model for agricultural companies.
Reliable timed rules and live updates: one background job closes bidding, expires offers and creates alerts, and open pages update without refreshing.
61 automated API tests that all pass, and a deployment on Vercel, Render, Neon and Cloudinary, which updates itself from GitHub, with the Android app built by GitHub Actions.
6.3 Project Limitations
The current version has the following restrictions:
No online payment: payment to the farmer and transport provider is made off the platform, and FreshNest has no confirmation of payment.
In-app notifications only: users can see new bids, deals and codes, but must visit the website or the app to view them. These events do not send SMS/push messages.
English interface only – farmers who do not understand English may need assistance, although Bangla names are already stored in the product list.
Approximate distances and no vehicle tracking – "nearest first" and the widening of an emergency sale are based on lists of neighbouring upazilas and districts, not road distances.
Season advice from a calendar: warnings for open vehicles follow fixed months and not real time meteorological data.
Free hosting: the API is hosted on one free server which goes to sleep after 15 minutes without visitors, and the system has not been load tested.
Manual verification: admins have to verify photos of NIDs and licences manually, not connected with official databases.
Android only and online only: there is no iPhone app, no Google Play listing and no offline mode.
Limited field testing – testing was done with demo data and automated tests, but not with actual farmers, dealers and transport providers.
6.4 Scope for Future Work
Short term:
Mobile payments via bKash or Nagad, where the dealer's money is held until the delivery code is entered.
SMS and push notifications for the most important events, such as a new deal, a booked vehicle and the pickup code.
A Bangla interface along with a language switch.
Live weather forecasts for the season advice.
An always-on server, load testing and automated tests for the pages.
Long term:
Real-time GPS tracking of vehicles, and actual distances on the road using a map service.
An iPhone app and publication on Google Play.
Price guidance from the platform's own deal history, by product & upazila.
Automatic NID verification through an official verification service.
A field trial with farmers, dealers and transport providers in one district, to enhance the system based on their suggestions.
6.5 Conclusion
With current technologies, it is possible to have a fair and timely route from the field to the dealer in Bangladesh, as illustrated by FreshNest. It seeks to answer the issues highlighted in Chapter 1, such as the high number of middlemen, limited coverage, post harvest losses, unplanned transport, trust issues and breakdowns on the road. It enables farmers to sell directly to verified dealers in the designated area, times every listing to the shelf life of the produce, and makes transport part of the deal, with matching vehicles, handover codes and, if there's a breakdown, an emergency sale process.
It's also a project proving that it's possible to provide fairness and simplicity together. Anonymous bidding, automatic winners, clear cancellation rules and a private account standing protect all sides of a deal, and each role gets a simple dashboard of only its own tasks, on a computer or on a phone.
Building the system alone was a challenge, from the initial concept and a clickable prototype to a tested and deployed system with an Android app. I gained real world experience in requirements engineering, UML modelling, real-time API design, database design, automated testing and cloud deployment. With online payments, a Bangla user interface and a field trial, FreshNest can become a valuable instrument for farmers and traders in Bangladesh.
