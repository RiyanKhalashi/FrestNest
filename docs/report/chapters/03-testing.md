# CHAPTER 3 | SOFTWARE TESTING

## 3.1 Introduction

Deals in fresh produce are made on FreshNest between four types of users, so a mistake in the rules has an immediate price: a truck that is booked for two different trips, a winning bid that is ignored, a lot sold to two dealers or a deadline that passes the shelf life of the produce. To this end, every build phase was accompanied by testing, rather than leaving it to the end. Automated testing of its business rules was performed at the end of each phase; and one single command was used to run the tests of all phases, and therefore a change in one phase was also tested with the rules of the others. The features tested, the methodology and the passing and failing criteria are discussed in this chapter followed by the test cases and their outcomes.

## 3.2 Testing Features

### 3.2.1 Features to Be Tested

**Critical features:**

1. The visibility of the listing, in relation to the farmer's upazila, in relation to the district and districts (chosen) and in relation to the whole country.
2. Open bidding: base price, minimum increment, anonymous bidders, Buy Now and a single winner if two dealers act at the same time.
3. Automatic closing of bidding and relisting a lot that was not bid on.
4. Own-price offers: reply duration, minimal order, quantity available, one counter offer and expiration.
5. Transport matching and booking: vehicle capacity, facility, small-pickup rule, offer window, counter-prices and no double booking of a vehicle.
6. Pickup and delivery codes, with the limit on wrong tries.
7. Delivery failure, the admin decision and the emergency sale.
8. Access control: role, verification status and admin permission on all the routes, private documents and photos.

**Important features:**

1. Registration and verification of dealers.
2. Cancelling deals, with admin approval after transport is booked.
3. Reviews, reports, warnings, suspensions and bans.
4. Notifications for events such as being outbid or a failed delivery.
5. Amounts shown in the farmer's unit: kg, mon or ton.
6. Admin office: Products, Season calendar, settings and team permissions, case locks and announcements, activity log.

### 3.2.2 Features Not Tested Automatically

- Appearance and action of the pages, such as their layout on phones and live updating via Socket.IO. These were verified by hand in the browser.
- Profile editing, adding vehicles using the form, logging out and failed logins – none of these have automated testing of their own. Each test script does log in at the beginning.
- Market analytics, the CSV export and company subscriptions (FR22).
- Uploads to Cloudinary, which are only used by the online version. The tests run with the local file storage of the development server.
- Load and stress testing with multiple users at the same time.

## 3.3 Testing Strategies

### 3.3.1 Test Approach

**Integration (API) testing:**

- **Tools:** 4 TypeScript scripts in `backend/test`, one for each build phase from Phase 2 to Phase 5, using tsx. They utilise the assert module and fetch that come with Node.js - no external test frameworks required.
- **Method:** each script logs in as demo accounts and sends HTTP requests to the real Express API using real session cookies, in the same way as the website. After each step it checks the status code as well as the response, and then fetches the data from the database using Prisma to verify the data stored.
- **Accounts:** ten demo accounts – 1 farmer, 3 dealers (Bogura, Joypurhat, Dhaka), 3 transport providers (with different types of vehicles) and 3 admins with different permissions (including the Super Admin).
- **Data:** All listings and deals created by each script will be destroyed at the end of the scripts to keep the demo data intact, so the scripts can be run again.
- **Command:** `npm test` will run the four scripts in sequence. A failed check aborts the current run and sets the test case's result to failure.

**Timed rules:**

- It is not feasible to wait hours for a real deadline. Instead, a script moves a deadline into the past in the DB and waits for 6.5 seconds, so the real background job, which runs every 5 seconds (Section 2.5.5), works on it. This includes: end of bidding; expiry of offers and counter-prices; end of the transport offer window; the automatic emergency sale and the urgent alert for admins.

**Concurrency testing:**

- Two dealers using Buy Now for the same lot at the same time, and the test checks that only one deal is created.

**Security testing:**

- Requests are made as the wrong user: a farmer on admin routes, an admin without permission, a transport provider on another provider's trip/offer, and a pending/suspended or banned user. Private documents and photos are accessed by other users, and without logging in.

**Static testing:**

- When invoking the TypeScript compiler against the backend and the frontend, type errors are checked (`npm run typecheck`).

**Manual testing:**

- While it was being built, each page was hand-browsed in full screen and at phone width in the Google Chrome browser.

The tests were conducted in the environment as indicated in Table 3.1.

Table 3.1: Test environment

| Item | Used for the tests |
|---|---|
| Computer | The development computer, an Apple silicon Mac running macOS |
| Runtime | Node.js 26.13 |
| Database | PostgreSQL 18.6 on the same computer, with the demo data |
| API | The FreshNest Express 5 API on localhost, with the background job running every five seconds |
| Test tools | tsx 4.23, the Node.js assert module and fetch, Prisma Client 7.10 |
| Type check | TypeScript 7.0 compiler |
| Browser | Google Chrome, for the manual checks |

### 3.3.2 Pass/Fail Criteria

**Pass criteria:**

- Each test step should return the expected status code, while the response and the database should show the expected result.
- 100% of the 61 test cases pass in one run.
- TypeScript check succeeds with no errors.

**Fail criteria:**

- Any status code that is incorrect, crash or unhandled error.
- If a user observes or alters something he/she has no right to observe or alter.
- A timed rule that does not act after its deadline.

## 3.4 System Testing (Test Cases with Report)

The system test cases are given in Table 3.2. They are supported by the automated tests in the `backend/test` folder that contain 61 test cases in total (Table 3.3). Numbers of the requirements refer to Table 2.1. The status codes are: done – 200, created – 201, invalid input – 400, not allowed – 403, not found/not visible to this user – 404, not possible in the current state – 409, locked by another admin – 423. The final run on 27th November 2026 passed all cases.

Table 3.2: System test cases

| ID | Scenario | Input | Expected output | Actual output | Result |
|---|---|---|---|---|---|
| TC-01 | Registration (FR01, FR05) | New dealer registers; uploads a driving licence, then an NID and a trade licence | Account created; driving licence refused for a dealer; documents complete | 201; 400; complete | PASS |
| TC-02 | Verification (FR05) | Admin asks for a clearer document with no reason, then with one; dealer uploads again; admin approves | Reason required; status REUPLOAD, then PENDING, then ACTIVE | 400; 200; each status reached | PASS |
| TC-03 | Pending account (FR05) | A dealer waiting for verification bids | Bid refused | 403 | PASS |
| TC-04 | Listing rules (FR06) | Potato preview with the harvest in 3 days; bidding that ends in 2 hours | Nationwide scope and a safe deadline suggested; bidding under 12 hours refused | NATION, window given; 400 | PASS |
| TC-05 | Visibility (FR07) | Bogura listing that adds Joypurhat; dealers in Bogura, Joypurhat and Dhaka | Seen in Bogura and Joypurhat; the Dhaka dealer can neither see nor open it | Shown to both; 404 for Dhaka | PASS |
| TC-06 | Bid rules (FR08, FR20) | Base Tk 20/kg, step Tk 1: bids of 19 and 21; 21.5 and 22 from a second dealer; the leader bids again | Bids under the base or the step refused; the leading dealer cannot bid again; the outbid dealer is notified | 400, 200, 400, 200, 409; notice | PASS |
| TC-07 | Anonymous bids (FR08) | A dealer and the farmer open the same listing | Dealers see "Dealer #1", "Dealer #2"; the farmer sees names | As expected | PASS |
| TC-08 | Buy Now (FR08) | Two dealers use Buy Now one after the other; on a new lot, two at the same moment | One instant deal; the other request refused, also at the same moment | 200 and 409 both times; one deal | PASS |
| TC-09 | Bidding close (FR09) | Deadline passes with bids of Tk 20 and 20.5; another with no bids, relisted twice | Highest bid wins at the deadline; no bids gives NO_SALE and one relist | Tk 20.5 wins; NO_SALE; 200, 409 | PASS |
| TC-10 | Offer rules (FR10) | 800 kg, minimum 100 kg, 6 h reply: offers with a 2 h reply, for 50, 900 and 500 kg; a second offer; an edit | Wrong offers refused; one offer per dealer; no edits after the first offer | 400, 400, 400, 201, 409; edit 409 | PASS |
| TC-11 | Accept and counter (FR10) | Farmer accepts 500 kg while 400 kg is also offered; then counters a 300 kg offer twice | 300 kg left and the 400 kg offer cancelled; one counter only; deal at the counter price | 300 kg left; 200, 409; SOLD | PASS |
| TC-12 | Offer expiry (FR10) | The reply time of an offer passes | Offer EXPIRED | EXPIRED | PASS |
| TC-13 | Cancel a deal (FR11) | Dealer cancels with an empty reason, then with one | Reason required; quantity back on sale; farmer notified | 400; 200; 300 kg back | PASS |
| TC-14 | Units (FR06) | 2,000 kg listed in mon; offers of 2,400 and 400 kg at Tk 21/kg | Stored in kg, shown in mon | Error: 50 mon; notice: Tk 840/mon | PASS |
| TC-15 | Vehicle matching (FR13) | A 1.5-ton deal; a 150 kg deal in Bogura Sadar | Not offered to a 1-ton pickup; small loads only within or next to the upazila | As expected | PASS |
| TC-16 | Refrigerated (FR13) | Local strawberries, without and with the farmer asking for a refrigerated vehicle | A pickup is enough without it; with it, refrigerated only and a pickup's offer refused | Shown, then hidden; 400 | PASS |
| TC-17 | Offer window (FR13) | New deal; brinjal with 3 days left and windows of 24, 5 and 3 h; the farmer tries; a change after an offer | Default 12 h; unsafe or unknown lengths refused; dealer only; then locked | 12 h; 400, 400, 403, 200; 409 | PASS |
| TC-18 | Transport offers (FR13) | 1-ton vehicle for 1.5 tons; another owner's vehicle; delivery before pickup; a valid offer; a second offer | Wrong offers refused; one offer per provider | 400, 400, 400, 201, 409 | PASS |
| TC-19 | Season tag (FR13) | A normal truck offer and a refrigerated offer in November | Normal truck tagged cost-saving in winter; refrigerated one untagged | As expected | PASS |
| TC-20 | Booking (FR14) | Dealer chooses the truck offer | Booked; pickup code to the farmer only, delivery code to the dealer only | As expected | PASS |
| TC-21 | Double booking (FR13) | The booked truck offered at an overlapping time | Refused | 400 "already booked" | PASS |
| TC-22 | Late cancel (FR11) | Farmer cancels a booked deal twice; admin approves another such request | Becomes an admin request, one at a time; cancelled after approval | 200, 409; CANCELLED | PASS |
| TC-23 | Pickup code (FR15) | Wrong code; right code from another provider, then from the driver; a locked code | Tries counted; driver only; IN_TRANSIT; an admin resets the lock | 400; 404; 200; reset to 0 | PASS |
| TC-24 | Delivery (FR15, FR18) | Driver enters the delivery code; the dealer reviews the provider twice | COMPLETED; one review per person per deal | 200; 200, 409 | PASS |
| TC-25 | Reopening transport (FR13) | Provider cancels a booked trip; another window ends with no offers and is extended twice | Deal reopens for offers; dealer notified; one extension | Reopened; notice; 200, 409 | PASS |
| TC-26 | Transport counter (FR14) | On a Tk 3,200 offer: counters of Tk 3,300, from the farmer, of Tk 2,700, then again; provider edits | Lower, by the dealer, once, with 2 hours to answer; no edits meanwhile | 400, 403, 200, 409; 409 | PASS |
| TC-27 | Counter answered (FR14) | Provider accepts a Tk 2,700 counter; another accepts later; a counter gets no answer | Booked at Tk 2,700; the first acceptance wins; an unanswered counter expires | ACCEPTED; 409; EXPIRED | PASS |
| TC-28 | Failure report (FR16) | No photo; 1,200 kg usable of 1,000 kg; a valid report; a second report | Wrong reports refused; the deal waits for an admin; one open report | 400, 400, 201, 409 | PASS |
| TC-29 | Failure decision (FR16) | Admin rejects without and with a reason; driver reports again; admin approves twice | Reason required; trip continues; FAILED after approval, with suggested values for the farmer | 400; 200; 201; 200, 409 | PASS |
| TC-30 | Emergency sale (FR17) | Sale before approval; after it, 25% off for 950 kg, widened three times | Not before approval; upazila, then district, then neighbouring districts | 404; Tk 27/kg; 3 tiers; 409 | PASS |
| TC-31 | Emergency deal (FR17) | Highest bid wins; the vehicle can still move | EMERGENCY deal; the same truck delivers | COMPLETED | PASS |
| TC-32 | Automatic start (FR17) | Vehicle cannot move; no farmer action for 30 minutes; a dealer uses Buy Now | Sale starts by itself; local transport with a handover code | Started; handover trip | PASS |
| TC-33 | Urgent alert (FR16) | A failure report waits 30 minutes | Urgent alert to the deals admins | URGENT notice; escalated | PASS |
| TC-34 | Admin permissions (FR21) | Failures, reports, products, team and announcements opened without the permission; a farmer opens failures | Refused | 403; no reports shown | PASS |
| TC-35 | Private files (security) | ID document, failure photo and vehicle document opened by other users or without login | Only the owner, the people in the deal and admins | 200 allowed; 404 others | PASS |
| TC-36 | Case lock (FR12, FR21) | Super Admin approves a vehicle another admin holds; the lock released by a normal admin, then the Super Admin | Blocked, with the holder's name; only the Super Admin releases a lock | 423; 403; 200; 200 | PASS |
| TC-37 | Reports (FR19) | Report on someone outside the deal; a valid report; a repeat; warnings without and with a reason; a fake review | Trading partners only; one per deal; reason required; review hidden | 404, 201, 409; 400, 200 | PASS |
| TC-38 | Suspension and ban (FR19) | Suspended dealer bids; banned dealer opens the site; ban lifted by a normal admin, then the Super Admin | Bid refused; account blocked; only the Super Admin lifts a ban | 403; 403; 403, 200 | PASS |
| TC-39 | Admin office (FR21) | Duplicate product; calendar without February; pickup limit of −5 kg; admin added, changed and removed | Wrong values refused; valid changes saved and logged | 409, 400, 400; 201, 200, 200 | PASS |
| TC-40 | Sponsored offer (FR22) | Sponsored seed offer to farmers | Only farmers who opted in receive it | Opted-in farmers only | PASS |

### 3.4.1 Test Summary

The last run was made on the development computer on 27 November 2026. The four scripts executed 61 test cases containing 310 assertions in 58 seconds with all test cases passing (Table 3.3). Eight waits of 6.5 seconds each are for the background job, which takes up most of this time. The TypeScript compiler found no errors in the backend or the frontend.

Table 3.3: Automated test results

| Suite | Area | Test cases | Assertions | Passed | Failed | Time |
|---|---|---|---|---|---|---|
| Phase 2 | Listings, bidding, offers and deals | 20 | 72 | 20 | 0 | 21 s |
| Phase 3 | Transport, handover codes and reviews | 18 | 120 | 18 | 0 | 15 s |
| Phase 4 | Delivery failure and emergency sale | 11 | 55 | 11 | 0 | 21 s |
| Phase 5 | Verification, cases and the admin office | 12 | 63 | 12 | 0 | 1 s |
| **Total** | | **61** | **310** | **61** | **0** | **58 s** |

A defect was also uncovered in the testing which was resolved. Table 3.4 describes it.

Table 3.4: Defect found and fixed

| Date | Defect | Cause | Fix |
|---|---|---|---|
| 18 Nov 2026 | The transport offer window stayed open for 18 hours instead of 12. | The database default for the end of the window was shifted by the time zone, which added six hours. | The end of the window is now set in code from the admin setting, and TC-17 checks its length. |

## 3.5 Summary

The testing primarily employed 61 automated test cases which test the real API and real database. All of them passed in the last run, and there were no TypeScript errors. The test cases include each role together with the rules that are most pertinent for a marketplace of perishable produce: fair bidding, where a single dealer wins; offers and counter offers; transport matching, where no vehicle is double booked; as well as handover codes and the delivery failure process. All the rules are tested with good and bad data. The timed rules were successfully tested with the real background job, and access control for each of the roles was tested. One problem was identified and resolved and the pages were verified manually using the browser. How the tested system was released is described in the following chapter, as well as a description of how it is maintained.
