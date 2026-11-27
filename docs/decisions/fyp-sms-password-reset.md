---
name: fyp-sms-password-reset
description: Planned 2026-11-26 — forgot-password with a one-time code sent by SMS through BulkSMSBD; already described in the report; not built yet, build when the user says
metadata:
  type: project
---

On 2026-11-26 the user said they will soon implement password reset through BulkSMSBD, and asked for it to be in the project report already.

- **What:** a user who forgot the password gets a one-time code by SMS on their registered phone, through the BulkSMSBD gateway (https://bulksmsbd.net), and sets a new password. SMS is used only for this; all other notifications stay in-app.
- **BulkSMSBD needs:** an account, an API key and an approved sender ID. Its API may need IP whitelisting turned off, since the Render server has no fixed IP (to check when building). Each SMS costs money.
- **Status:** not built. The details (code length, expiry, number of tries, resend limit) are still to agree with the user when they say to build. Keep the API key in `.env` / `.env.deploy`, never in the code.
- **After building it:** add the reset-code table to the schema, then run `node make-diagrams.mjs --force er-diagram && npm run diagrams` in `docs/report`, add the table to Table 2.8 and check FR03 and Figure 2.8 (sequence diagram) against the real flow.
- **In the report:** Chapter 1 already describes it (scope, feasibility, block diagram, Table 1.2, constraints, dependencies, reference [16]) and Chapter 2 has FR03, the use case "Reset password by SMS" and sequence diagram Figure 2.8, and so do the block and deployment diagram plans. It must be built before the report is submitted (30 Nov 2026).
- **Report places to fill after building (2026-11-27).** The user had all the yellow SMS placeholders removed and will come back to this in a few days. Add:
  - **Chapter 3:** "Password reset by SMS" in 3.2.1 (important features); one or two rows in Table 3.2 for the right code, a wrong or expired code, and too many tries; new counts in Table 3.3 and 3.4.1, and the "61 tests" in 3.3.2, 3.5 and the abstract, if new automated tests are added.
  - **Chapter 4:** the BulkSMSBD variables (API key, sender ID) as a row in Table 4.2 (service: Render), and, if needed, a line in 4.3.2 Deployment Steps.
  - **Chapter 5:** a "Forgot password" step in 5.2.1 (after step 5); a screenshot after Figure 5.3, captioned "Figure 5.4: Password reset page" with a one-sentence description, then renumber Figures 5.4–5.27 to 5.5–5.28. Take it by adding a "password-reset" entry to `docs/report/screenshots.mjs` and running `npm run screenshots password-reset`.

See [[fyp-report-writing]] and [[fyp-build-progress]].
