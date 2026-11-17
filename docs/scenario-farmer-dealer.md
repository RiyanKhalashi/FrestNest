# Scenario: "Karim and Hasan, One Winter Season"

Demo walkthrough covering every Farmer and Dealer function. Screen codes refer to the prototype (F1–F4, D1–D4). The prototype is a snapshot of Fri 13 Nov 2026, 10:50 AM, so each listing/deal sits at a different stage of this story; the numbers below match the prototype data.

**Main characters**
- **Karim Uddin**: Farmer, Bogura
- **Hasan Traders** (owner Hasan Ali): Dealer, Rajabazar, Bogura

**Background characters**: dealers Joypurhat Fresh, Kawran Bazar Agro (Dhaka), Rangpur Mart; transporters Bogura Logistics, Mintu Pickup, Cold Line BD; the Admin.

---

## Part 1: Sign-up and verification

1. **Karim** signs up with phone + password. Farmers need no verification, so he can use the system immediately. In **F4 Profile** he adds photo, district, upazila, village and crops usually grown.
2. **Hasan** signs up and uploads NID + trade license. He sees **"Verification pending"** (top-bar toggle) and cannot use the marketplace. The admin approves him and he gets a **Verified badge**.

## Part 2: Karim lists 3 products (F2 Create listing)

**Listing A: Tomato, 1,000 kg, Open bidding**
- Category Vegetable → Tomato; shelf life and storage requirement filled in by the system.
- Harvest date 18 Nov, multiple photos, price per kg.
- System suggests **within district**; Karim also ticks Joypurhat from the **neighbouring districts quick-select**.
- **Season note:** November (winter) → system **recommends a normal vehicle (cheaper)**.
- Base price, **minimum bid increment**, **Buy Now price**. Deadline outside the **safe range** → **warning** → he moves it to the recommended date (1 day before harvest).

**Listing B: Potato, 2,000 kg, Own price**
- Long shelf life → suggestion: **nationwide with a normal vehicle**.
- Asking price, **minimum order 200 kg**, **minimum response time 6h**.

**Listing C: Lal shak (custom product)**
- Not in the product list → Karim types the name and sets **shelf life (2 days) and vehicle needed**.
- He **edits** the price before any bid, and later **withdraws** the listing (allowed because there are no bids).

## Part 3: Bidding (D2 Marketplace → F3 My Sales)

1. Hasan finds the tomato listing with **D2** filters. Kawran Bazar Agro (Dhaka) cannot see it (**visibility scope**).
2. Hasan bids; other dealers see him as **"Dealer #1"** (anonymous); Karim sees real names.
3. Joypurhat Fresh (Dealer #2) and Dealer #3 bid too; Hasan leads at ৳28/kg. Buy Now is now **locked** for Karim (after first bid).
4. When the highest bid passes the Buy Now price, the **Buy Now button disappears**.
5. At the deadline Hasan has the highest bid → **wins automatically** → **Primary Deal** created. Notifications arrive in the **bell dropdown**.

*Second view:* on a cauliflower listing Hasan clicks **Buy Now** → confirm popup → **instant deal**. If two dealers click at once, the first click wins.

## Part 4: Own-price offers (Potato)

1. Hasan offers **800 kg at ৳20/kg** (total auto-calculated) with a **12h timer**. 2h is not available because Karim set a 6h minimum.
2. Hasan **edits** his offer once (allowed before acceptance). One active offer per dealer per listing.
3. Karim sends **one counter-offer**; Hasan accepts before his timer ends → Deal #2.
4. Joypurhat Fresh's offer is accepted; remaining quantity is low. Rangpur Mart's larger offer now exceeds the remaining quantity → **auto-cancelled** (notified). Another offer **expires** because Karim did not respond in time.
5. All sold → **listing closes**.

## Part 5: Transport and delivery (D3 My Purchases)

*(Shown in the prototype on the completed deal FN-1019: Tomato 800 kg, ৳26.50/kg, ৳21,200, delivered 6 Nov.)*

1. Transport offers arrive for the tomato deal. Both see them; only **Hasan confirms** and Hasan pays.
2. Mintu Pickup's offer has the **Cost-saving** tag → Hasan confirms it.
3. **No offers** for Deal #2 in the window → Hasan **extends the window once**.
4. While the deal is active, Karim sets his **emergency fallback preference**: auto-start the emergency sale if he does not respond.
5. **Pickup:** Karim gives the **OTP** to the driver → Picked Up → In Transit.
6. **Delivery:** Hasan gives his OTP → **Confirm receipt** → **Completed**.
7. **Ratings:** Karim rates Hasan and the transporter; Hasan rates Karim (stars + comment), shown in F4 and D4.

## Part 6: Delivery failure and emergency sale

**Karim's side (F3, deal FN-1031)**
1. Karim's green chili deal (400 kg, Kawran Bazar Agro, Dhaka, ৳60/kg) is on its way when the vehicle breaks down in **Sirajganj**.
2. Driver sends a failure report (380 kg usable, vehicle cannot move) → **admin approves** → Kawran Bazar Agro is notified; deal becomes **"Failed: Released for emergency sale"**.
3. Karim had set his **emergency fallback preference**; he sets duration + price drop himself (system suggested, start ৳45/kg). **14 verified dealers in Sirajganj** are notified and bid anonymously; **highest bid wins automatically**.
4. Vehicle cannot move → after the sale a **new transport stage** opens for Sirajganj transporters; handover with a code.
5. If nobody bids: extend once, drop the price further, or **widen to neighbouring districts** (Pabna, Tangail, Natore, Bogura).

**Hasan's side (D1 → D2)**
6. **D1 Home** shows an **emergency-sale alert**: a vehicle carrying Jalal Mia's 700 kg cauliflower broke down at Shibganj, Bogura, on its way to Dhaka.
7. In D2 the listing has a **red tag**, pickup from the vehicle; Hasan bids or uses **Buy Now**.
8. Hasan also sees his own failed deal FN-1028 (brinjal, failed in Joypurhat): **closed, he pays nothing**.

## Part 7: Cancellations and reports

1. **Karim cancels** a deal before transport is booked → cancels **immediately**, reason still required.
2. **Hasan wants to cancel** after transport is booked → **request to admin** with a description; admin decides.
3. On another deal Hasan cancels without a valid reason → Karim clicks **"Report dealer"**, picks a reason from the **dropdown**; deal details are **attached automatically**. Karim **relists in one click** (or switches selling mode).
4. **D4 Profile** shows "**3 cancellations in 30 days**"; admin gets an **automatic alert**.
5. Hasan **reports a farmer** with the dealer-side dropdown.

## Part 8: Unsold listing and expiry

1. Karim's brinjal gets **no bids**. After the harvest date an **urgency badge** and **shelf-life countdown** appear.
2. System suggests **narrowing scope and lowering the price**. Karim **extends the deadline once**, later **switches to own-price mode**.
3. Another unsold listing is **hidden automatically** when its shelf life ends.

## Epilogue: May (summer)

Hasan confirms a normal vehicle in May → **weather-risk warning** recommending a ventilated vehicle. Advice only; he can still confirm.

---

## Coverage check

| Feature | Part |
|---|---|
| Sign-up, verification, profile | 1 |
| Listing: dropdown, shelf life, visibility, districts, photos, custom product, edit/withdraw | 2 |
| Bidding: anonymous bidders, increment, Buy Now, auto-win | 3 |
| Own-price offers: quantity, timer, counter-offer, auto-cancel, expiry | 4 |
| Transport confirm, extend window, OTP, receipt, rating | 5 |
| Delivery failure, emergency sale, widen to neighbouring districts | 6 |
| Cancel rules, report dropdown, cancel count, relist | 7 |
| Urgency badge, suggestions, extend, switch mode, auto-expire | 8 |
| Season warning and cost-saving recommendation | 2, 5, Epilogue |
