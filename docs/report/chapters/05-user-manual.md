# CHAPTER 5 | USER MANUAL

## 5.1 Introduction

This chapter is a step by step guide for each type of user: farmers, dealers, transport providers and admins. It provides an explanation of how to register and log in and how each role accomplishes its main tasks, and includes matching screens of the live system at https://freshnest-bd.vercel.app. The screenshots were taken with the demo accounts and demo data on 27 November 2026. All the pages also work on the phone, and the same pages are displayed in the Android app.

## 5.2 Project Functionalities

### 5.2.1 Registration and Login

1. Open up the site, or install the Android app (FreshNest.apk from the project's GitHub Releases) and open it. Then click on Join free or Start selling, free.
2. On Create your account, select Farmer, Dealer or Transporter. Type in your full name, phone number, password (a minimum of 8 characters), district and upazila. Farmers can add their village, dealers add a shop or business name and transport providers a company name.
3. Click on Create farmer account (or dealer/transporter account). Farmers are allowed to sell immediately.
4. The documents dealers and transport providers put up on the Profile & reviews page include: dealer NID and trade licence; transport provider NID, driving licence and registration of each vehicle. These are checked by an admin typically within a day. Until then, they're able to look around, but not bid or offer or take trips.
5. Later, log in on the Welcome back page of the website using your phone number and password. The session will last for 7 days and Sign out will end the session.

### 5.2.2 Farmer Tasks

1. Open Create listing. Select the category and product in What are you selling. In Quantity, price and harvest select whether to sell by kg, mon or ton, and enter the quantity, base price and harvest date. A description and up to 4 photos are optional.
2. In Who can see this listing, keep the suggested reach or change it: your upazila, your district with other chosen districts, or the whole country. The recommendation is based on the shelf life of the product. You can also ask for a better vehicle than the product needs.
3. In How do you want to sell, select Open bidding, with the time bidding ends and an optional Buy Now price, or Own price, with the minimum order and the time dealers must give you to reply. Review the Summary and then click Publish listing. The listing may be edited or withdrawn until the first bid/first offer is submitted.
4. Follow your listings on My Sales. In open bidding, when the bidding period ends, the highest bid wins automatically, and if there's no bidding, then you can relist 1 time. For an own-price listing, accept, reject or counter every offer. You can counter an offer one time only.
5. After a deal, the dealer books a transport provider. Once the transport is confirmed, you will be able to see your four-digit pickup code on My Sales. Give it to the driver only after the produce has been loaded and weighed.
6. Should a deal have to be cancelled, provide a reason. Before transport is booked, the deal is cancelled immediately; after that, the request is sent to an admin.
7. At the end of the delivery, give stars and comments to the dealer and transport provider. If an issue has occurred, use Report a problem and select the reason from the list.
8. If the vehicle breaks down and the admin approves the driver's report, click Start emergency sale to sell the produce to dealers around the vehicle at the suggested reduced price for the suggested duration, and then click Widen now to increase the range of dealers. On the deal, you can choose beforehand whether the sale should start by itself if you don't respond within 30 minutes.

### 5.2.3 Dealer Tasks

1. Open Marketplace. It displays listings in your area, listings that target your area and nationwide listings, closest first. Filter them according to product, district or upazila of the farmer, selling mode and harvest time.
2. To view details of a listing, click on the listing. For open bidding, enter your price under Your bid and click Place bid. A bid has to be at least the highest bid + the minimum increment; bidders are only identified as "Dealer #1", "Dealer #2". If the listing has a Buy Now price, then the entire lot can be purchased at once.
3. For an own-price listing, complete Make an offer: the quantity, your offer price, the time the farmer has to respond and an optional note. You can have one active offer for each listing. If the farmer counters, accept or reject the counter.
4. Monitor all deals, bids or offers in My Purchases. For every new deal, specify how long transport providers have to send offers: 3, 6, 12 or 24 hrs. However, lengths that would cause spoilage of the produce cannot be chosen.
5. Compare the transport offers. Each displays the vehicle, price, pickup and delivery times and a season tag like cost-saving. Choose one, or Counter once at a lower price, which the provider can accept within two hours. If no offers are received in time, extend the window once.
6. On arrival of the produce, inspect it and provide the driver with the four digit delivery code. Then rate both the farmer and the transport provider.

### 5.2.4 Transport Provider Tasks

1. Open My vehicles and click Add vehicle. Type, registration number, load capacity (in kg) and the facility (normal, ventilated or refrigerated) should be entered, and a photo of the registration document should be included. Before the vehicles can be offered, they are approved by an admin.
2. Open Find deals and choose the pickup districts and upazila you work in. If one of your approved vehicles has the appropriate facility and can transport the entire amount, a deal will be shown.
3. Choose a deal and send Your offer: the vehicle, your price and the times of pickup & delivery. You may only send one offer for any given deal, and can edit or withdraw it as long as the dealer hasn't confirmed. If the dealer sends a lower counter-price, click Accept and book the trip, or reject it, within 2 hours.
4. Follow your work on My trips, under Offers, Confirmed, On the road and Completed & closed. At the farm, after loading and weighing, enter the pickup code of the farmer and hit the Confirm pickup button.
5. At the dealer, type the dealer's delivery code and click the Confirm delivery button. If someone puts in the wrong code 5 times, it is locked and cannot be used until an admin resets it.
6. Click Report delivery failure if the vehicle breaks down en route. Include the reason, location, picture, condition of the produce, amount usable and the vehicle's ability to move. If it is not checked by an admin within 30 minutes, then each admin who handles deals receives an urgent alert.
7. In case you can't perform a confirmed trip, you can click on Cancel trip and provide a reason. The deal is then available for other providers to put offers forward.

### 5.2.5 Admin Tasks

1. Log in via the same login page with an administrator's account. What is awaiting (verifications, delivery failures and open cases) and automatic alerts are shown in the Overview.
2. Open Verification, choose a dealer, transport provider and/or vehicle and verify the documents. Click Approve, Ask for re-upload or Reject with a reason. Other admins are able to see that you are working on a case.
3. Open Delivery failures, check the driver's report and picture, and approve it, or reject it with a reason. Reports that wait 30 minutes are marked as urgent.
4. Open Cases for cancellation requests, reports between users, reported reviews and locked handover codes. All decisions must be associated with a written reason: Approve cancellation, Warn, Suspend or ban, Dismiss, Hide review, Keep review or Reset tries.
5. Use Users to search for anyone by name, shop or phone, filter by role, district, upazila or status and open a user's history.
6. Open Business for the upazila market report, which can be exported as a CSV company report, the company subscriptions and the sponsored offers to farmers.
7. The Super Admin can click Show all admin tools to display the complete list of pages: Products & seasons (the product list, shelf lives, vehicle needs and the season calendar), Announcements, Analytics and Admin team & settings (admins and their permissions, system settings and the activity log).

## 5.3 Screens of the System

**Common pages**

The home page provides information about FreshNest and offers links for registration and login.

![Figure 5.1: Home page](screenshots/landing.jpg)

Users log in with their phone number and password.

![Figure 5.2: Login page](screenshots/login.jpg)

Each role sees the fields it needs. Dealers and transport providers also give a business name.

![Figure 5.3: Registration page (dealer selected)](screenshots/register.jpg)

**Farmer**

The farmer's home page contains information about open listings, offers waiting for an answer, active deals and the sales of the month.

![Figure 5.4: Farmer home](screenshots/farmer-home.jpg)

A listing is made in 4 steps, with a summary beside the form.

![Figure 5.5: Create listing](screenshots/farmer-create.jpg)

My Sales displays all the listings with their offers, bids and deals; on the right is the selected listing.

![Figure 5.6: My Sales](screenshots/farmer-sales.jpg)

A sold listing displays the deal, the booked vehicle and the farmer's pickup code.

![Figure 5.7: Deal with the pickup code](screenshots/farmer-deal.jpg)

The profile page contains the particulars of the farmer, the private account standing and the reviews from dealers.

![Figure 5.8: Profile & reviews](screenshots/farmer-profile.jpg)

**Dealer**

On the dealer's home page, the market in the vicinity, leading bids, active deals and counter-offers are displayed.

![Figure 5.9: Dealer home](screenshots/dealer-home.jpg)

You can filter and sort the listings with the closest listings shown first. An own-price listing has the offer form.

![Figure 5.10: Marketplace and an offer](screenshots/dealer-market.jpg)

A bidding listing shows the highest bid and the bid form. Bidders stay anonymous.

![Figure 5.11: Bidding on a listing](screenshots/dealer-listing.jpg)

For a new deal, the dealer selects how long transport providers can send offers.

![Figure 5.12: My Purchases: transport offer window](screenshots/dealer-purchases.jpg)

Transport offers show the vehicle, price, times and a season tag, with Counter and Choose buttons.

![Figure 5.13: Choosing a transport offer](screenshots/dealer-transport-offers.jpg)

**Transport provider**

The home page lists trips on the road, confirmed pickups, offers waiting, earnings for the month and a season tip.

![Figure 5.14: Transport provider home](screenshots/transporter-home.jpg)

Find deals lists all deals the provider's vehicles can transport, filtered by pickup district, with the provider's own offer.

![Figure 5.15: Find deals](screenshots/transporter-deals.jpg)

A confirmed trip awaits the farmer's pickup code.

![Figure 5.16: My trips: pickup code](screenshots/transporter-trips.jpg)

Trips on the road wait for the dealer's delivery code, and a delivery failure can be reported here.

![Figure 5.17: On the road: delivery code and failure report](screenshots/transporter-trips-road.jpg)

Each vehicle is shown with its facility, capacity, approval and bookings.

![Figure 5.18: My vehicles](screenshots/transporter-vehicles.jpg)

**Admin**

The overview shows the queues, platform figures, actions to be taken now and automatic alerts.

![Figure 5.19: Admin overview](screenshots/admin-overview.jpg)

The documents are checked next to the user's history before a decision.

![Figure 5.20: Verification](screenshots/admin-verification.jpg)

Delivery failures are displayed with the most urgent at the top, and the driver's report is displayed.

![Figure 5.21: Delivery failures](screenshots/admin-failures.jpg)

In a report between users, the person's history and the decision buttons are displayed.

![Figure 5.22: Cases (reports)](screenshots/admin-cases.jpg)

Everyone on FreshNest can be found by name or phone and filtered down to the upazila.

![Figure 5.23: Users](screenshots/admin-users.jpg)

The upazila market report for agricultural companies is available for export in CSV format.

![Figure 5.24: Business](screenshots/admin-business.jpg)

The product list contains the Bangla names of products, their shelf lives and vehicle requirements, as well as the products suggested by farmers.

![Figure 5.25: Products & seasons](screenshots/admin-products.jpg)

The Super Admin manages the admins and their permissions, the system settings and the activity log.

![Figure 5.26: Admin team & settings](screenshots/admin-team.jpg)

**Mobile view**

All pages can be displayed on a phone screen, and the same pages are also displayed in the Android app.

![Figure 5.27: Farmer home and Marketplace on a phone](screenshots/phone-views.jpg)

## 5.4 Summary

In this user manual, each role is described in how it registers, logs in and performs its core activities, with screenshots of the live system. There is a separate dashboard for each role that shows only the tasks of that role, pages have a common design and everything is available on a phone and in the Android app, so new users need little training. This project is summarised in the next chapter.
