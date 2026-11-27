# CHAPTER 6 | PROJECT SUMMARY

## 6.1 Introduction

Finally, this chapter reflects upon the project as a whole: what has been accomplished, where the current iteration is lacking and how FreshNest can continue.

## 6.2 Project Achievements

FreshNest was designed, built, tested and deployed as a fully operational system. It has the following major accomplishments:

- An online marketplace (at https://freshnest-bd.vercel.app) and an Android app for 4 roles: farmer, dealer, transport provider and admin.
- Fair selling: open bidding where the highest bid wins automatically and bidders stay anonymous, an optional Buy Now price, and own price offers with one counter offer, all in the farmer's own units (kg, mon, ton).
- Freshness-aware rules: each product's shelf life is used to establish safe deadlines, propose to whom the listing should be shown and determine which vehicle to use.
- Reach by location: a listing is published in the farmer's upazila, in the farmer's district with chosen districts, or throughout the country, encompassing 495 upazilas and 64 districts of Bangladesh with their neighbours.
- Safe transport: verified providers offer specific vehicles matched by capacity and facility, the dealer selects or counters an offer, no vehicle can be booked twice and four-digit pickup and delivery codes confirm each handover.
- Less loss on the road: if a vehicle breaks down, an admin approved emergency sale offers the produce to dealers around the vehicle, widening step by step, and it can start by itself.
- A complete admin office: verification of documents with case locks; reports, warnings, suspensions and bans; cancellation requests; products and seasons; a group of admins with particular permissions; activity log; analytics and a business model for agricultural companies.
- Reliable timed rules and live updates: one background job closes bidding, expires offers and creates alerts, and open pages update without refreshing.
- 61 automated API tests that all pass, and a deployment on Vercel, Render, Neon and Cloudinary, which updates itself from GitHub, with the Android app built by GitHub Actions.

## 6.3 Project Limitations

The current version has the following restrictions:

1. **No online payment:** payment to the farmer and transport provider is made off the platform, and FreshNest has no confirmation of payment.
2. **In-app notifications only:** users can see new bids, deals and codes, but must visit the website or the app to view them. These events do not send SMS/push messages.
3. English interface only – farmers who do not understand English may need assistance, although Bangla names are already stored in the product list.
4. Approximate distances and no vehicle tracking – "nearest first" and the widening of an emergency sale are based on lists of neighbouring upazilas and districts, not road distances.
5. **Season advice from a calendar:** warnings for open vehicles follow fixed months and not real time meteorological data.
6. **Free hosting:** the API is hosted on one free server which goes to sleep after 15 minutes without visitors, and the system has not been load tested.
7. **Manual verification:** admins have to verify photos of NIDs and licences manually, not connected with official databases.
8. **Android only and online only:** there is no iPhone app, no Google Play listing and no offline mode.
9. Limited field testing – testing was done with demo data and automated tests, but not with actual farmers, dealers and transport providers.

## 6.4 Scope for Future Work

**Short term:**

- Mobile payments via bKash or Nagad, where the dealer's money is held until the delivery code is entered.
- SMS and push notifications for the most important events, such as a new deal, a booked vehicle and the pickup code.
- A Bangla interface along with a language switch.
- Live weather forecasts for the season advice.
- An always-on server, load testing and automated tests for the pages.

**Long term:**

- Real-time GPS tracking of vehicles, and actual distances on the road using a map service.
- An iPhone app and publication on Google Play.
- Price guidance from the platform's own deal history, by product & upazila.
- Automatic NID verification through an official verification service.
- A field trial with farmers, dealers and transport providers in one district, to enhance the system based on their suggestions.

## 6.5 Conclusion

With current technologies, it is possible to have a fair and timely route from the field to the dealer in Bangladesh, as illustrated by FreshNest. It seeks to answer the issues highlighted in Chapter 1, such as the high number of middlemen, limited coverage, post harvest losses, unplanned transport, trust issues and breakdowns on the road. It enables farmers to sell directly to verified dealers in the designated area, times every listing to the shelf life of the produce, and makes transport part of the deal, with matching vehicles, handover codes and, if there's a breakdown, an emergency sale process.

It's also a project proving that it's possible to provide fairness and simplicity together. Anonymous bidding, automatic winners, clear cancellation rules and a private account standing protect all sides of a deal, and each role gets a simple dashboard of only its own tasks, on a computer or on a phone.

Building the system alone was a challenge, from the initial concept and a clickable prototype to a tested and deployed system with an Android app. I gained real world experience in requirements engineering, UML modelling, real-time API design, database design, automated testing and cloud deployment. With online payments, a Bangla user interface and a field trial, FreshNest can become a valuable instrument for farmers and traders in Bangladesh.
