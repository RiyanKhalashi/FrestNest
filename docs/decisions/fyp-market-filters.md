# Dealer market filters (agreed 2026-11-29)

**Problem:** On the dealer Market page the Product, Farmer's district and Farmer's upazila dropdowns show only values that have an open listing the dealer can see (`backend/src/routes/market.ts`, "filter options"). The user wants every value to appear.

**Decision (option 1):** show every value, with a listing count beside each.
- Product: every active product in the admin product list, e.g. "Potato (4)".
- Farmer's district: all 64 districts, e.g. "Bogura (5)", "Rangpur (0)".
- Farmer's upazila: all upazilas of the chosen district, with counts.
- Order: entries that have listings come first (sorted by name), then the zero-count ones (sorted by name).
- Counts = open listings this dealer can see (same visibility rules as the list), not narrowed by the other filters.
- Choosing a zero-count entry shows the usual empty state.

- Farmer's upazila dropdown stays **disabled** ("Choose a district first") until a district is picked, so it never lists all ~495 upazilas (agreed 2026-11-29).

**Status:** agreed, not built.
