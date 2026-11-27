<!--
Front matter text. The title page, approval page and the two declarations are
built from report.json by build.mjs. Text in [[double brackets]] shows as a
yellow placeholder in Word.
-->

# ACKNOWLEDGEMENTS

I would like to express my sincere gratitude to my supervisor, Khalid Been Badruzzaman Biplob, Lecturer (Senior Scale), Department of Software Engineering, Daffodil International University, for the guidance, valuable feedback and encouragement given throughout this project.

I am also grateful to the faculty members of the Department of Software Engineering for the knowledge and support they have given me during my undergraduate studies.

Finally, I thank my parents and family for their constant love, patience and support, without which this work would not have been possible.

# ABSTRACT

In the country of Bangladesh, the farmers typically sell fresh vegetables and fruits along a long chain of intermediaries, engage only the traders who visit their local markets, and arrange transport through phone calls. Owing to the perishability of produce, there has been a high loss rate from slow sales combined with unsuitable vehicles. This is an online agricultural marketplace, in the form of an Android app and a responsive website, that connects four roles of this project, FreshNest: Farmer, Dealer, Transport Provider and Admin.

A farmer lists produce with its harvest date, quantity and price, and sells it in one of two ways: open bidding, where the highest bid wins automatically when bidding closes, or a fixed price, where dealers send quantity and price offers. The system relies on every product's shelf life to set safe deadlines, suggest who should see the listing and determine what type of vehicle to use. Once an agreement has been reached, verified providers offer a specific vehicle, the dealer chooses or counters an offer, and four-digit pickup and delivery codes confirm every handover. If a vehicle breaks down on the way, an admin-approved emergency sale offers the produce to dealers near the stuck vehicle. Admins verify dealers and transport providers, process reports and cancellation requests, and monitor market analytics.

FreshNest is built with Next.js, Express, PostgreSQL with Prisma and Socket.IO, and is deployed online for free on Vercel, Render and Neon. All 61 automated tests of its business rules pass when run against the real API and database.
