---
name: fyp-bangla-language
description: Bangla language switch for farmers, dealers and transporters (built 2026-11-27); admin pages stay English; report not changed
metadata:
  type: project
---

**Asked 2026-11-27:** farmers, transporters and dealers can switch the website (and so the Android app) to Bangla. The user approved the plan with "onumoti dilam, tumi nije nijei koro" and said nothing in the report should change.

**What was built**
- An "English | বাংলা" switch in the top bar of every farmer, dealer and transporter page, and on the home, login and register pages. Admin pages always stay English.
- The choice is kept in the browser (`fn-lang`, works before sign-in) and on the account (`User.language`, "en" or "bn", migration `20261127144956_user_language`, saved through `PATCH /api/profile`). A choice made while signed out is copied to the account at the next sign-in; otherwise the account's choice wins. The page reloads in the new language (at most one automatic reload per tab).
- How it translates: the pages are still written in English. In Bangla mode `components/layout/Translator.tsx` translates the visible text in place with a MutationObserver, so live updates, server error messages and notifications are translated too. The dictionary is `frontend/src/lib/i18n/bn.ts` (exact phrases plus patterns for sentences with names, numbers and codes); `translate.ts` then turns digits into Bangla digits, kg/mon/ton into কেজি/মণ/টন, months, weekdays, am/pm and countdowns. Product, district and upazila names come in Bangla from the API (`/meta/locations` now also returns upazila `nameBn`).
- Kept in English on purpose: people's and business names, number plates, deal codes (FN-…), and anything a user typed (notes, reasons, reviews, descriptions), digits included. The logo is never translated (`data-i18n-skip`).
- Bangla font: Hind Siliguri (next/font). In Bangla mode letter-spacing and capitals are switched off, because they break Bangla letters apart. A short pre-paint script hides the page until the first translation, so English does not flash.

**Checked:** an automated walk through every farmer, dealer and transporter page in Bangla (including each listing, deal, tab and the notification list) found no English left except names, codes and user-written text. Server errors appear in Bangla, admin pages stay English, English mode is unchanged, the phone layout fits at 360 px. `npm test` (61 tests) and both type checks pass, and the production build succeeds.

**Writing in Bangla (2026-11-27, user asked):** reviews, report details, delivery-failure details and cancel reasons can be written in Bangla (no server or browser rule blocks it; length limits count Bangla letters normally). Their boxes now say "You can write in Bangla or English" (Bangla in Bangla mode). Tested: a Bangla report was saved and shows correctly on the English admin Cases page (Hind Siliguri font); the test report was deleted again.

**Adding text later:** a new English text on these pages shows in English until its Bangla line is added to `bn.ts`.

**Not done:** not committed or deployed yet (waiting for the user). The report still says the interface is English only (the user asked not to change the report).
