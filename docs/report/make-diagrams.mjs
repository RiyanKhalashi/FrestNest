// Writes the report's draw.io diagrams into diagrams/. It does not overwrite a .drawio file that
// already exists (it may have been edited in VS Code) unless you pass --force.
//   node make-diagrams.mjs [--force] [name ...]      then: npm run diagrams

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Diagram, flow, S, sequence } from "./drawio.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(ROOT, "diagrams");
const SCHEMA = path.join(ROOT, "..", "..", "backend", "prisma", "schema.prisma");
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => a !== "--force");

const diagrams = {};

// ================================================================ Chapter 1

diagrams["block-diagram"] = () => {
  const d = new Diagram("Block diagram");
  const group = (title, x, y, w, h) => d.vertex(title, x, y, w, h, "rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;align=left;spacingLeft=8;spacingTop=2;fontStyle=1;fontSize=12;fillColor=none;");
  const row = (labels, x0, y, w, h, gap) => labels.map((l, i) => d.vertex(l, x0 + i * (w + gap), y, w, h, S.box + "fontSize=11;"));
  const both = "endArrow=block;startArrow=block;endFill=1;startFill=1;html=1;fontSize=11;labelBackgroundColor=#ffffff;";
  group("Users", 0, 0, 900, 70);
  row(["Farmer", "Dealer", "Transport Provider", "Admin"], 50, 24, 170, 34, 40);
  group("Website and Android app (Next.js, hosted on Vercel)", 0, 120, 900, 80);
  row(["Farmer pages", "Dealer pages", "Transporter pages", "Admin panel", "Home, login and register"], 22, 148, 155, 40, 18);
  group("Server (Express and Node.js, hosted on Render)", 0, 250, 900, 150);
  row(["Login and roles (JWT)", "Listings and bidding", "Offers and deals", "Transport and handover codes"], 30, 278, 190, 44, 20);
  row(["Delivery failure and emergency sale", "Admin, reports and analytics", "Live updates (Socket.IO)", "Timed jobs (every 5 seconds)"], 30, 340, 190, 44, 20);
  group("Data", 0, 450, 480, 90);
  row(["PostgreSQL database (Neon)", "File storage (Cloudinary)"], 30, 480, 200, 44, 20);
  group("External service", 540, 450, 360, 90);
  row(["SMS gateway (BulkSMSBD)"], 620, 480, 200, 44, 0);
  d.line(450, 70, 450, 120, "HTTPS", both);
  d.line(450, 200, 450, 250, "REST API (JSON) and Socket.IO", both);
  d.line(240, 400, 240, 450, "Prisma ORM", both);
  d.line(720, 400, 720, 450, "HTTPS", both);
  return d;
};

diagrams["gantt-chart"] = () => {
  const d = new Diagram("Project Gantt chart");
  const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
  const days = [31, 30, 31, 30, 31, 31, 30, 31, 30];
  const LW = 230, MW = 78, RH = 30, TOP = 30;
  const xOf = (m, day) => LW + months.indexOf(m) * MW + ((day - 1) / days[months.indexOf(m)]) * MW;
  const tasks = [
    ["1. Planning", ["Mar", 23], ["Apr", 30]],
    ["2. Requirement analysis", ["May", 1], ["Jul", 12]],
    ["3. Mid-defense", ["Jul", 13], ["Jul", 22]],
    ["4. Design and prototype", ["Jul", 23], ["Aug", 31]],
    ["5. Marketplace development", ["Sep", 1], ["Oct", 10]],
    ["6. Transport and admin development", ["Oct", 11], ["Nov", 10]],
    ["7. Deployment and Android app", ["Nov", 11], ["Nov", 26]],
    ["8. Report", ["Nov", 20], ["Nov", 30]],
  ];
  const width = LW + months.length * MW;
  const height = TOP + tasks.length * RH;
  d.vertex("Task", 0, 0, LW, TOP, S.box + "fontStyle=1;align=left;spacingLeft=8;");
  months.forEach((m, i) => d.vertex(m + " 2026", LW + i * MW, 0, MW, TOP, S.box + "fontStyle=1;fontSize=11;"));
  tasks.forEach(([name, a, b], i) => {
    const y = TOP + i * RH;
    d.vertex(name, 0, y, LW, RH, S.box + "align=left;spacingLeft=8;fontSize=11;");
    months.forEach((_, j) => d.vertex("", LW + j * MW, y, MW, RH, "rounded=0;html=1;strokeColor=#BFBFBF;fillColor=none;"));
    const x1 = xOf(...a), x2 = xOf(b[0], b[1] + 1);
    d.vertex("", x1, y + 8, Math.max(6, x2 - x1), RH - 16, "rounded=0;html=1;fillColor=#D9D9D9;strokeColor=#000000;");
  });
  d.vertex("", 0, 0, width, height, "rounded=0;html=1;fillColor=none;strokeColor=#000000;");
  const marks = [["M1", "Mar", 23, "Proposal accepted"], ["M2", "Jul", 12, "Requirements complete"], ["M3", "Jul", 22, "Mid-defense"], ["M4", "Aug", 31, "Design and prototype"],
    ["M5", "Oct", 10, "Marketplace working"], ["M6", "Nov", 10, "All features"], ["M7", "Nov", 26, "Live system and APK"], ["M8", "Nov", 30, "Report submitted"]];
  d.vertex("Milestones", 0, height + 14, LW, 24, S.text + "fontStyle=1;align=left;spacingLeft=8;fontSize=11;");
  marks.forEach(([label, m, day], i) => {
    const x = xOf(m, day + 0.5);
    d.vertex("", x - 7, height + 19, 14, 14, "rhombus;html=1;fillColor=#000000;strokeColor=#000000;");
    d.vertex(label, x - 16, height + 36 + (i % 3) * 14, 32, 14, S.text + "align=center;fontSize=10;fontStyle=1;");
  });
  const legend = marks.map(([label, m, day, text]) => `${label}: ${text} (${day} ${m})`);
  d.vertex(legend.slice(0, 4).join(";  "), 0, height + 84, width, 16, S.text + "align=left;spacingLeft=8;fontSize=10;");
  d.vertex(legend.slice(4).join(";  "), 0, height + 100, width, 16, S.text + "align=left;spacingLeft=8;fontSize=10;");
  return d;
};

// ================================================================ Chapter 2: use case diagram

diagrams["use-case"] = () => {
  const d = new Diagram("Use case diagram");
  const actor = (name, cx, y) => d.vertex(name, cx - 15, y, 30, 60, S.actor);
  const uc = (text, cx, cy, w = 190, h = 46) => d.vertex(text, cx - w / 2, cy - h / 2, w, h, S.usecase + (h > 50 ? "fontSize=11;" : ""));
  const link = (a, b) => d.edge(a, b, "", S.assoc);
  const include = (a, b) => d.edge(a, b, "«include»", S.include);
  d.vertex("FreshNest", 170, 110, 800, 1210, "rounded=0;whiteSpace=wrap;html=1;fillColor=none;verticalAlign=top;align=left;spacingLeft=10;spacingTop=6;fontStyle=1;fontSize=14;");

  // use cases every user has: one row under the User actor, so no line crosses another use case
  const user = actor("User", 570, 0);
  ["Register", "Log in", "Reset password by SMS", "Manage profile", "View notifications", "Rate and review", "Report a user"]
    .forEach((t, i) => link(user, uc(t, 229 + i * 113, 190, 110, 60)));

  const L = 320, M = 570, R = 820;
  const farmer = actor("Farmer", 60, 410), dealer = actor("Dealer", 60, 880);
  const tp = actor("Transport Provider", 1080, 420), admin = actor("Admin", 1080, 860), timer = actor("System Timer", 1080, 1180);

  const createL = uc("Create listing", L, 330), answer = uc("Answer dealer offers", L, 390), pick = uc("Give pickup code", L, 450), emerg = uc("Start emergency sale", L, 510);
  const cancel = uc("Cancel deal", 265, 650, 160);
  const browse = uc("Browse market", L, 760), bid = uc("Place bid or Buy Now", L, 820), offer = uc("Send offer", L, 880), choose = uc("Choose or counter transport", L, 940), deliverCode = uc("Give delivery code", L, 1000);
  [createL, answer, pick, emerg, cancel].forEach((u) => link(farmer, u));
  [cancel, browse, bid, offer, choose, deliverCode].forEach((u) => link(dealer, u));

  const vehicles = uc("Manage vehicles", R, 330), find = uc("Find deals", R, 390), send = uc("Send transport offer", R, 450), counter = uc("Answer counter-offer", R, 510), handover = uc("Confirm pickup and delivery", R, 570), failure = uc("Report delivery failure", R, 630);
  [vehicles, find, send, counter, handover, failure].forEach((u) => link(tp, u));
  const verify = uc("Verify users and vehicles", R, 740), cancels = uc("Decide cancellation requests", R, 800), reports = uc("Handle reports", R, 860), approve = uc("Approve delivery failure", R, 920), products = uc("Manage products and settings", R, 980), announce = uc("Send announcements", R, 1040), analytics = uc("View analytics", R, 1100);
  [verify, cancels, reports, approve, products, announce, analytics].forEach((u) => link(admin, u));
  const close = uc("Close bidding", R, 1170), expire = uc("Expire offers and counters", R, 1230), widen = uc("Widen emergency sale", R, 1290);
  [close, expire, widen].forEach((u) => link(timer, u));

  include(createL, uc("Suggest scope and deadline", M, 330));
  include(send, uc("Check vehicle fits the load", M, 450, 180));
  include(choose, uc("Make handover codes", M, 940, 170));

  // generalisation: every human role is a User
  const gen = (from, pts) => d.edge(from, user, "", S.general + "edgeStyle=none;", { points: pts });
  gen(farmer, [[60, 40]]);
  gen(dealer, [[22, 910], [22, 25]]);
  gen(tp, [[1080, 40]]);
  gen(admin, [[1118, 890], [1118, 25]]);
  return d;
};

// ================================================================ Chapter 2: activity diagrams (one per role)

diagrams["activity-farmer"] = () => flow("Farmer activity", ["Farmer", "FreshNest"], {
  s: ["start", "", 0, "m"],
  reg: ["action", "Register with phone number", 1, "m"],
  open: ["action", "Open the account at once", 2, "y"],
  create: ["action", "Create a listing", 3, "m"],
  suggest: ["action", "Suggest scope and safe deadline", 4, "y"],
  mode: ["decision", "Selling mode?", 5, "m"],
  accept: ["action", "Accept a dealer's offer", 6, "s"],
  bidding: ["action", "Run open bidding until the deadline", 6, "y"],
  bids: ["decision", "Any bids?", 7, "y"],
  relist: ["action", "Relist with a new price or mode", 7, "m"],
  deal: ["action", "Create the deal", 8, "y"],
  code: ["action", "Give the pickup code to the driver", 9, "m"],
  transit: ["action", "Deal in transit", 10, "y"],
  failed: ["decision", "Delivery failed?", 11, "y"],
  emerg: ["action", "Set the emergency sale (time, price drop)", 11, "m"],
  sell: ["action", "Sell to dealers near the vehicle", 12, "y"],
  done: ["action", "Deal completed", 13, "y"],
  rate: ["action", "Rate the dealer and transporter", 14, "m"],
  e: ["end", "", 15, "m"],
}, [
  ["s", "reg"], ["reg", "open", "", "r-t"], ["open", "create", "", "l-t"], ["create", "suggest", "", "r-t"], ["suggest", "mode", "", "l-t"],
  ["mode", "bidding", "Open bidding", "r-t", -0.5], ["mode", "accept", "Own price", "l-t", -0.4],
  ["bidding", "bids", "", "b-t"], ["bids", "relist", "No", "l-r"], ["bids", "deal", "Yes", "b-t"], ["relist", "mode", "", "t-b"],
  ["accept", "deal", "", "b-l"], ["deal", "code", "", "b-r"], ["code", "transit", "", "b-l"], ["transit", "failed", "", "b-t"],
  ["failed", "emerg", "Yes", "l-r"], ["failed", "done", "No", "r-r"], ["emerg", "sell", "", "b-l"], ["sell", "done", "", "b-t"],
  ["done", "rate", "", "l-t"], ["rate", "e", "", "b-t"],
]);

diagrams["activity-dealer"] = () => flow("Dealer activity", ["Dealer", "FreshNest"], {
  s: ["start", "", 0, "m"],
  reg: ["action", "Register with a business name", 1, "m"],
  pending: ["action", "Keep the account pending", 2, "y"],
  docs: ["action", "Upload NID and trade licence", 3, "m"],
  ok: ["decision", "Documents approved?", 4, "y"],
  again: ["action", "Upload clearer documents", 4, "s"],
  market: ["action", "Show listings in my area, nearest first", 5, "y"],
  mode: ["decision", "Selling mode?", 6, "m"],
  bid: ["action", "Bid on the whole lot or Buy Now", 7, "s"],
  offer: ["action", "Send quantity, price and reply time", 7, "m"],
  wins: ["action", "Highest bid wins, or the farmer accepts", 8, "y"],
  made: ["decision", "Deal made?", 9, "y"],
  deal: ["action", "Create the deal", 10, "y"],
  choose: ["action", "Choose a transport offer or send one counter-price", 11, "m"],
  book: ["action", "Book the vehicle and make the handover codes", 12, "y"],
  give: ["action", "Give the delivery code when the produce arrives", 13, "m"],
  done: ["action", "Mark the deal completed", 14, "y"],
  rate: ["action", "Rate the farmer", 15, "m"],
  e: ["end", "", 16, "m"],
}, [
  ["s", "reg"], ["reg", "pending", "", "r-t"], ["pending", "docs", "", "l-t"], ["docs", "ok", "", "r-t"],
  ["ok", "again", "No", "l-r"], ["again", "docs", "", "t-l"], ["ok", "market", "Yes", "b-t"], ["market", "mode", "", "l-t"],
  ["mode", "bid", "Open bidding", "l-t", -0.4], ["mode", "offer", "Own price", "b-t"],
  ["bid", "wins", "", "b-l"], ["offer", "wins", "", "r-t"], ["wins", "made", "", "b-t"],
  ["made", "market", "No", "r-r"], ["made", "deal", "Yes", "b-t"], ["deal", "choose", "", "l-t"], ["choose", "book", "", "r-t"],
  ["book", "give", "", "l-t"], ["give", "done", "", "r-t"], ["done", "rate", "", "l-t"], ["rate", "e", "", "b-t"],
]);

diagrams["activity-transporter"] = () => flow("Transport provider activity", ["Transport Provider", "FreshNest"], {
  s: ["start", "", 0, "m"],
  reg: ["action", "Register with a company name", 1, "m"],
  pending: ["action", "Keep the account pending", 2, "y"],
  docs: ["action", "Upload NID and driving licence", 3, "m"],
  ok: ["decision", "Documents approved?", 4, "y"],
  again: ["action", "Upload clearer documents", 4, "s"],
  activate: ["action", "Activate the account", 5, "y"],
  vehicle: ["action", "Add a vehicle with its registration paper", 6, "m"],
  vok: ["decision", "Vehicle approved?", 7, "y"],
  fix: ["action", "Fix the vehicle details", 7, "s"],
  deals: ["action", "Show deals that fit my vehicles, with season tags", 8, "y"],
  offer: ["action", "Send an offer for one vehicle", 9, "m"],
  chosen: ["decision", "Offer accepted?", 10, "y"],
  book: ["action", "Book the vehicle; send codes to farmer and dealer", 11, "y"],
  pick: ["action", "Enter the farmer's pickup code", 12, "m"],
  pok: ["decision", "Pickup code correct?", 13, "y"],
  retry: ["action", "Try again (at most 5 tries)", 13, "s"],
  transit: ["action", "Deal in transit", 14, "y"],
  stuck: ["decision", "Vehicle stuck?", 15, "m"],
  report: ["action", "Report the delivery failure", 16, "s"],
  deliver: ["action", "Enter the dealer's delivery code", 16, "m"],
  e2: ["end", "", 17, "s"],
  done: ["action", "Mark the deal completed", 17, "y"],
  e: ["end", "", 18, "y"],
}, [
  ["s", "reg"], ["reg", "pending", "", "r-t"], ["pending", "docs", "", "l-t"], ["docs", "ok", "", "r-t"],
  ["ok", "again", "No", "l-r"], ["again", "docs", "", "t-l"], ["ok", "activate", "Yes", "b-t"], ["activate", "vehicle", "", "l-t"], ["vehicle", "vok", "", "r-t"],
  ["vok", "fix", "No", "l-r"], ["fix", "vehicle", "", "t-l"], ["vok", "deals", "Yes", "b-t"], ["deals", "offer", "", "l-t"], ["offer", "chosen", "", "r-t"],
  ["chosen", "deals", "No", "r-r"], ["chosen", "book", "Yes", "b-t"], ["book", "pick", "", "l-t"], ["pick", "pok", "", "r-t"],
  ["pok", "retry", "No", "l-r"], ["retry", "pick", "", "t-l"], ["pok", "transit", "Yes", "b-t"], ["transit", "stuck", "", "l-t"],
  ["stuck", "report", "Yes", "l-t", -0.4], ["stuck", "deliver", "No", "b-t"], ["report", "e2", "", "b-t"], ["deliver", "done", "", "r-t"], ["done", "e", "", "b-t"],
]);

diagrams["activity-admin"] = () => flow("Admin activity", ["Admin", "FreshNest"], {
  s: ["start", "", 0, "m"],
  login: ["action", "Log in to the admin panel", 1, "m"],
  isAdmin: ["decision", "Admin account?", 2, "y"],
  refused: ["action", "Access refused", 2, "s"],
  e2: ["end", "", 3, "s"],
  overview: ["action", "Show the overview and waiting queues", 3, "y"],
  review: ["action", "Review a dealer, transporter or vehicle", 4, "m"],
  clear: ["decision", "Documents clear?", 5, "m"],
  reject: ["action", "Reject, or ask for a re-upload, with a reason", 6, "s"],
  approve: ["action", "Approve", 6, "m"],
  status: ["action", "Update the status and notify the user", 7, "y"],
  failure: ["action", "Review a delivery failure", 8, "m"],
  okFail: ["decision", "Approve the failure?", 9, "m"],
  noFail: ["action", "Reject; the driver continues", 10, "s"],
  yesFail: ["action", "Approve; the emergency sale can start", 10, "m"],
  notify: ["action", "Update the deal and notify everyone", 11, "y"],
  cases: ["action", "Decide cancellation requests and reports", 12, "m"],
  record: ["action", "Record the decision; warn or suspend if needed", 13, "y"],
  analytics: ["action", "Check analytics and send announcements", 14, "m"],
  logout: ["action", "Log out", 15, "m"],
  e: ["end", "", 16, "m"],
}, [
  ["s", "login"], ["login", "isAdmin", "", "r-t"], ["isAdmin", "refused", "No", "l-r"], ["refused", "e2", "", "b-t"], ["isAdmin", "overview", "Yes", "b-t"],
  ["overview", "review", "", "l-t"], ["review", "clear", "", "b-t"], ["clear", "reject", "No", "l-t", -0.4], ["clear", "approve", "Yes", "b-t"],
  ["reject", "status", "", "b-l"], ["approve", "status", "", "r-t"], ["status", "failure", "", "b-r"], ["failure", "okFail", "", "b-t"],
  ["okFail", "noFail", "No", "l-t", -0.4], ["okFail", "yesFail", "Yes", "b-t"], ["noFail", "notify", "", "b-l"], ["yesFail", "notify", "", "r-t"],
  ["notify", "cases", "", "b-r"], ["cases", "record", "", "b-l"], ["record", "analytics", "", "b-r"], ["analytics", "logout", "", "b-t"], ["logout", "e", "", "b-t"],
]);

// ================================================================ Chapter 2: sequence diagrams (one per function)

const web = { key: "web", label: "Web App" }, server = { key: "srv", label: "Server" }, db = { key: "db", label: "Database" };
const actorP = (key, label) => ({ key, label, actor: true });
const m = (from, to, text) => ({ from, to, text });
const r = (from, to, text) => ({ from, to, text, reply: true });
const self = (who, text) => ({ self: who, text });

diagrams["seq-login"] = () => sequence("Login", [actorP("u", "User"), web, server, db], [
  m("u", "web", "Enter phone & password"), m("web", "srv", "POST /api/auth/login"), m("srv", "db", "Find user by phone"), r("db", "srv", "User row"),
  self("srv", "Check password (bcrypt)"),
  { alt: [
    { guard: "wrong phone or password", steps: [r("srv", "web", "401 error"), r("web", "u", "Show error")] },
    { guard: "correct", steps: [self("srv", "Sign session token (7 days)"), r("srv", "web", "200 OK + session cookie"), r("web", "u", "Open role dashboard")] },
  ] },
]);

diagrams["seq-registration"] = () => sequence("Registration and verification", [actorP("d", "Dealer"), web, server, db, actorP("a", "Admin")], [
  m("d", "web", "Fill in the form"), m("web", "srv", "POST /api/auth/register"), m("srv", "db", "Phone already used?"), r("db", "srv", "Result"),
  { alt: [
    { guard: "phone already registered", steps: [r("srv", "web", "409 error"), r("web", "d", "Show error")] },
    { guard: "new phone", steps: [m("srv", "db", "Save user (PENDING)"), r("srv", "web", "201 + session cookie"), r("web", "d", "Waiting for verification")] },
  ] },
  m("d", "web", "Upload NID and trade licence"), m("web", "srv", "POST /api/profile/docs"), m("srv", "db", "Save private documents"),
  m("a", "web", "Open Verification"), m("web", "srv", "GET /api/admin/verification"), m("srv", "db", "Find pending users"), r("db", "srv", "Users + documents"),
  r("srv", "web", "Application list"), r("web", "a", "Show documents"),
  { alt: [
    { guard: "approve", steps: [m("a", "web", "Approve"), m("web", "srv", "POST /verification/user/:id"), m("srv", "db", "Status ACTIVE, log, notify"), r("srv", "web", "Approved")] },
    { guard: "reject or ask for re-upload", steps: [m("a", "web", "Reject + reason"), m("web", "srv", "POST /verification/user/:id"), m("srv", "db", "Status REJECTED / REUPLOAD, notify"), r("srv", "web", "Saved")] },
  ] },
]);

diagrams["seq-password-reset"] = () => sequence("Password reset by SMS", [actorP("u", "User"), web, server, db, { key: "sms", label: "BulkSMSBD" }], [
  m("u", "web", "Forgot password: enter phone"), m("web", "srv", "Request a reset code"), m("srv", "db", "Find user by phone"), r("db", "srv", "User"),
  self("srv", "Make one-time code, hash it"), m("srv", "db", "Save hashed code + expiry"), m("srv", "sms", "Send SMS with the code"), r("sms", "u", "SMS with the code"),
  r("srv", "web", "Code sent"), m("u", "web", "Enter code + new password"), m("web", "srv", "Reset the password"), m("srv", "db", "Check code, count the try"),
  { alt: [
    { guard: "wrong or expired code", steps: [r("srv", "web", "400 error"), r("web", "u", "Show error")] },
    { guard: "correct code", steps: [m("srv", "db", "Save new password hash"), r("srv", "web", "Password changed"), r("web", "u", "Log in again")] },
  ] },
]);

diagrams["seq-bidding"] = () => sequence("Open bidding to deal", [actorP("d", "Dealer"), web, server, db, { key: "t", label: "Timer (every 5 s)" }], [
  m("d", "web", "Enter a bid price"), m("web", "srv", "POST /api/market/:id/bid"), m("srv", "db", "Lock listing, read highest bid"), r("db", "srv", "Listing + highest bid"),
  { alt: [
    { guard: "too low or bidding closed", steps: [r("srv", "web", "400 / 409 error"), r("web", "d", "Show the minimum bid")] },
    { guard: "valid bid", steps: [m("srv", "db", "Save bid, notify farmer"), r("srv", "web", "OK + live update"), r("web", "d", "Show new highest bid")] },
  ] },
  m("t", "db", "Listings past the deadline?"), r("db", "t", "Due listings"), m("t", "db", "Lock listing, take highest bid"),
  { alt: [
    { guard: "has bids", steps: [m("t", "db", "Mark SOLD, create the deal"), m("t", "db", "Notify winner, farmer, others"), m("t", "web", "Live update (Socket.IO)")] },
    { guard: "no bids", steps: [m("t", "db", "Mark NO_SALE, tell the farmer")] },
  ] },
], { gap: 180 });

diagrams["seq-offer"] = () => sequence("Fixed-price offer to deal", [actorP("d", "Dealer"), web, server, db, actorP("f", "Farmer")], [
  m("d", "web", "Quantity, price, reply time"), m("web", "srv", "POST /api/offers/listing/:id"), m("srv", "db", "Check quantity left + minimum"), r("db", "srv", "OK"),
  m("srv", "db", "Save offer, notify farmer"), r("srv", "web", "Offer sent"), m("f", "web", "Open the offer"),
  { alt: [
    { guard: "farmer accepts", steps: [m("f", "web", "Accept"), m("web", "srv", "POST /api/offers/:id/accept"), m("srv", "db", "Create deal, reduce quantity left"), r("srv", "web", "Deal created")] },
    { guard: "farmer counters once", steps: [m("f", "web", "Counter-offer"), m("web", "srv", "POST /api/offers/:id/counter"), m("srv", "db", "Status COUNTERED, notify dealer"), m("d", "web", "Accept the counter"), m("web", "srv", "POST /:id/accept-counter"), m("srv", "db", "Create deal")] },
    { guard: "no answer in time", steps: [self("srv", "Timer: offer EXPIRED")] },
  ] },
]);

diagrams["seq-transport"] = () => sequence("Transport booking", [actorP("tp", "Transport Provider"), web, server, db, actorP("d", "Dealer")], [
  m("tp", "web", "Vehicle, price, pickup time"), m("web", "srv", "POST /transport/deals/:id/offers"), m("srv", "db", "Check capacity, facility, free time"), r("db", "srv", "Result"),
  { alt: [
    { guard: "vehicle does not fit or is busy", steps: [r("srv", "web", "409 error"), r("web", "tp", "Show the reason")] },
    { guard: "vehicle fits", steps: [m("srv", "db", "Save offer, notify dealer"), r("srv", "web", "Offer sent")] },
  ] },
  m("d", "web", "Compare offers"),
  { alt: [
    { guard: "choose an offer", steps: [m("d", "web", "Choose"), m("web", "srv", "POST .../transport/:offerId/accept"), m("srv", "db", "Lock deal, book, close others"), m("srv", "db", "Make pickup + delivery codes"), r("srv", "web", "Transport confirmed")] },
    { guard: "send one counter-price", steps: [m("d", "web", "Lower price"), m("web", "srv", "POST .../transport/:offerId/counter"), m("srv", "db", "Counter waits 2 hours, notify"), m("tp", "web", "Accept the counter"), m("web", "srv", "POST /offers/:id/counter/accept"), m("srv", "db", "Book at counter price, make codes"), r("srv", "web", "Transport confirmed")] },
  ] },
], { gap: 185 });

diagrams["seq-handover"] = () => sequence("Pickup and delivery", [actorP("dr", "Transport Provider"), web, server, db, actorP("f", "Farmer"), actorP("d", "Dealer")], [
  r("f", "dr", "Tells the pickup code"), m("dr", "web", "Enter the pickup code"), m("web", "srv", "POST /trips/:id/pickup"), m("srv", "db", "Read deal, code, tries"), r("db", "srv", "Deal"),
  { alt: [
    { guard: "wrong code", steps: [m("srv", "db", "Count the try (5 at most)"), r("srv", "web", "400 wrong code"), r("web", "dr", "Tries left")] },
    { guard: "correct code", steps: [m("srv", "db", "IN_TRANSIT, notify both"), r("srv", "web", "Picked up")] },
  ] },
  r("d", "dr", "Tells the delivery code"), m("dr", "web", "Enter the delivery code"), m("web", "srv", "POST /trips/:id/deliver"), m("srv", "db", "Check code and tries"),
  { alt: [
    { guard: "wrong code", steps: [r("srv", "web", "400 wrong code")] },
    { guard: "correct code", steps: [m("srv", "db", "COMPLETED, notify all"), r("srv", "web", "Deal completed"), r("web", "dr", "Trip finished")] },
  ] },
], { gap: 165 });

diagrams["seq-failure"] = () => sequence("Delivery failure and emergency sale", [actorP("dr", "Transport Provider"), web, server, db, actorP("a", "Admin"), actorP("f", "Farmer")], [
  m("dr", "web", "Report: reason, photo, usable kg"), m("web", "srv", "POST /trips/:id/failure"), m("srv", "db", "Save failure, FAILURE_REQUESTED"), m("srv", "db", "Notify admins"),
  m("a", "web", "Open Delivery failures"),
  { alt: [
    { guard: "reject", steps: [m("a", "web", "Reject + reason"), m("web", "srv", "POST /failures/:id/reject"), m("srv", "db", "Back to IN_TRANSIT, notify driver")] },
    { guard: "approve", steps: [m("a", "web", "Approve"), m("web", "srv", "POST /failures/:id/approve"), m("srv", "db", "Deal FAILED, notify farmer + dealer"),
      m("f", "web", "Duration and price drop"), m("web", "srv", "POST /emergency/deal/:id/start"), m("srv", "db", "Emergency listing in stuck upazila"),
      self("srv", "Timer: no bids for 1 hour, widen"), self("srv", "Timer: highest bid wins, new deal")] },
  ] },
], { gap: 165 });

// ================================================================ Chapter 2: ER diagram from the Prisma schema

diagrams["er-diagram"] = () => {
  const src = fs.readFileSync(SCHEMA, "utf8");
  const enums = new Set([...src.matchAll(/^enum (\w+) \{/gm)].map((x) => x[1]));
  const models = Object.fromEntries([...src.matchAll(/^model (\w+) \{([\s\S]*?)\n\}/gm)].map((x) => [x[1], x[2]]));
  const SQL = { String: "text", Int: "int", Boolean: "bool", DateTime: "timestamp", Decimal: "decimal", Json: "json" };
  const tables = {}, fks = [], m2m = [];
  for (const [name, body] of Object.entries(models)) {
    const lines = body.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//") && !l.startsWith("@@") && !l.startsWith("///"));
    const fkFields = new Set();
    for (const l of lines) {
      const rel = /^(\w+)\s+(\w+)(\??)\s+@relation\((?:"[^"]*",\s*)?fields:\s*\[(\w+)\]/.exec(l);
      if (rel) { fkFields.add(rel[4]); fks.push({ from: name, field: rel[4], to: rel[2], optional: rel[3] === "?" }); }
    }
    const cols = [];
    for (const l of lines) {
      const [f, t] = l.split(/\s+/);
      if (!t) continue;
      const base = t.replace(/[?[\]]/g, "");
      if (models[base]) {
        if (t.endsWith("[]") && !l.includes("fields:")) {
          const relName = (/@relation\("([^"]+)"/.exec(l) ?? [])[1] ?? "";
          m2m.push({ a: name, b: base, relName });
        }
        continue;
      }
      const key = l.includes("@id") ? "PK" : fkFields.has(f) ? (l.includes("@unique") ? "FK, UK" : "FK") : l.includes("@unique") ? "UK" : "";
      const type = (SQL[base] ?? (enums.has(base) ? base : base)) + (t.endsWith("[]") ? "[]" : "");
      cols.push([key, f, type]);
    }
    tables[name] = cols;
  }
  // implicit many-to-many relations appear on both sides: keep one per pair and relation name
  const seen = new Set(), pairs = [];
  for (const x of m2m) {
    const other = m2m.find((y) => y.relName === x.relName && y.a === x.b && y !== x);
    if (!x.relName || !other) continue;
    const k = [x.a, x.b].sort().join("|") + x.relName;
    if (seen.has(k)) continue;
    seen.add(k);
    pairs.push(x);
  }
  const d = new Diagram("ER diagram");
  // ROW and HEAD: table row and title heights; GAP: space between stacked tables; MARK: width of the PK/FK column;
  // TRACK: distance between parallel lines. Five columns of similar height make the diagram about as wide as a
  // page is tall (it is printed turned a quarter turn), so the text prints as large as possible.
  const ROW = 15, HEAD = 24, GAP = 16, MARK = 34, TRACK = 4;
  const columns = [
    ["District", "Upazila", "Product", "Setting", "Company", "Announcement", "CaseLock"],
    ["Listing", "Bid", "Offer"],
    ["User", "Notification", "AdminLog", "VerificationDoc", "Review"],
    ["Deal", "CancelRequest", "Report"],
    ["TransportOffer", "Vehicle", "DeliveryFailure"],
  ];
  // Text widths from the Helvetica font metrics (thousandths of the font size), so that each column of tables is
  // only as wide as its text and the printed diagram can be as large as possible.
  const REG = [[556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500],
    [667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611]];
  const BOLD = [[556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500],
    [722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611]];
  const charW = (ch, bold) => {
    const c = ch.charCodeAt(0), t = bold ? BOLD : REG;
    if (c >= 97 && c <= 122) return t[0][c - 97];
    if (c >= 65 && c <= 90) return t[1][c - 65];
    if (c >= 48 && c <= 57) return 556;
    return { "[": 278, "]": 278, ",": 278, " ": 278, "_": 556, "-": 333, ".": 278 }[ch] ?? 600;
  };
  const textW = (str, px, bold = false) => ([...str].reduce((w, ch) => w + charW(ch, bold), 0) * px) / 1000;
  const tableW = (n) => {
    const cols = tables[n];
    const name = Math.max(...cols.map((c) => textW(c[1], 10))), type = Math.max(...cols.map((c) => textW(c[2], 10)));
    return Math.max(textW(n, 10, true) + 24, MARK + 8 + name + 8 + type + 8 + 8);
  };
  const colW = columns.map((names) => Math.ceil(Math.max(...names.map(tableW))));

  // Heights first: they do not depend on the widths of the channels.
  const box = {};
  columns.forEach((names, ci) => {
    let y = 0;
    for (const n of names) {
      const h = HEAD + tables[n].length * ROW + 4;
      box[n] = { col: ci, y, h };
      y += h + GAP;
    }
  });
  const H = Math.max(...Object.values(box).map((b) => b.y + b.h));

  // Lines never cross a table: they leave a table's side into the channel next to it, run along that channel,
  // and reach a table two or more columns away along a bus above or below all the tables.
  // Each channel is only as wide as the lines that run through it need.
  const route = (a, b) => {
    const sideA = b.col > a.col ? "r" : b.col < a.col ? "l" : a.col === columns.length - 1 ? "l" : "r";
    const sideB = b.col > a.col ? "l" : b.col < a.col ? "r" : sideA;
    return { sideA, sideB, chA: sideA === "r" ? a.col : a.col - 1, chB: sideB === "r" ? b.col : b.col - 1, near: Math.abs(a.col - b.col) <= 1 };
  };
  const links = [
    ...fks.map((f) => {
      const unique = tables[f.from].find((c) => c[1] === f.field)?.[0].includes("UK");
      return [f.from, f.to, unique ? "ERzeroToOne" : "ERmany", f.optional ? "ERzeroToOne" : "ERmandOne", ""];
    }),
    ...pairs.map((p) => [p.a, p.b, "ERmany", "ERmany", "dashed=1;"]),
  ];
  const lines = {};
  for (const [from, to] of links) {
    const r = route(box[from], box[to]);
    lines[r.chA] = (lines[r.chA] ?? 0) + 1;
    if (!r.near) lines[r.chB] = (lines[r.chB] ?? 0) + 1;
  }
  const chW = (c) => (lines[c] ? 8 + (lines[c] - 1) * TRACK + 16 : 20);
  const colX = [];
  columns.forEach((_, ci) => { colX[ci] = ci === 0 ? (lines[-1] ? chW(-1) : 0) : colX[ci - 1] + colW[ci - 1] + chW(ci - 1); });

  const td = "padding:0 4px;white-space:nowrap;";
  columns.forEach((names, ci) => {
    for (const n of names) {
      const b = box[n];
      const rows = tables[n].map(([k, f, t]) => `<tr><td style="${td}width:${MARK}px;font-weight:bold;">${k}</td><td style="${td}">${f}</td><td style="${td}text-align:right;">${t}</td></tr>`).join("");
      const html = `<div style="font-weight:bold;text-align:center;border-bottom:1px solid #000;line-height:${HEAD - 1}px;">${n}</div><table style="width:100%;border-collapse:collapse;font-size:10px;line-height:${ROW}px;">${rows}</table>`;
      b.x = colX[ci];
      b.id = d.htmlVertex(html, b.x, b.y, colW[ci], b.h, "rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;overflow=fill;fontSize=10;spacing=0;");
    }
  });

  const used = {}, track = (key) => (used[key] = (used[key] ?? 0) + 1) - 1;
  const chanX = (c) => (c < 0 ? colX[0] - chW(-1) : colX[c] + colW[c]) + 8 + track("ch" + c) * TRACK;
  const anchor = (b, side) => { const k = track(b.id + side); return Math.min(b.y + b.h - 8, b.y + HEAD + 10 + k * 13); };
  const er = "edgeStyle=none;rounded=0;html=1;endFill=0;startFill=0;";
  for (const [from, to, start, end, extra] of links) {
    const a = box[from], b = box[to];
    const { sideA, sideB, chA, chB, near } = route(a, b);
    const ay = anchor(a, sideA), by = anchor(b, sideB);
    let pts;
    if (near) {
      const x = chanX(chA);
      pts = [[x, ay], [x, by]];
    } else {
      const top = (ay + by) / 2 < H / 2;
      const busY = top ? -10 - track("top") * TRACK : H + 10 + track("bottom") * TRACK;
      const xa = chanX(chA), xb = chanX(chB);
      pts = [[xa, ay], [xa, busY], [xb, busY], [xb, by]];
    }
    const ends = `exitX=${sideA === "r" ? 1 : 0};exitY=${((ay - a.y) / a.h).toFixed(4)};exitPerimeter=0;entryX=${sideB === "r" ? 1 : 0};entryY=${((by - b.y) / b.h).toFixed(4)};entryPerimeter=0;`;
    d.edge(a.id, b.id, "", er + `startArrow=${start};endArrow=${end};` + ends + extra, { points: pts });
  }
  console.log("ER layout: column widths", colW.join(", "), "| lines per channel", JSON.stringify(lines), "| width", colX[columns.length - 1] + colW[columns.length - 1], "height", H);
  return d;
};

// ================================================================ Chapter 4: deployment diagram

diagrams["deployment"] = () => {
  const d = new Diagram("Deployment architecture");
  const group = (title, x, y, w, h) => d.vertex(title, x, y, w, h, "rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;align=left;spacingLeft=8;spacingTop=2;fontStyle=1;fontSize=12;fillColor=none;");
  const box = (text, x, y, w, h) => d.vertex(text, x, y, w, h, S.box + "fontSize=11;");
  const both = "endArrow=block;startArrow=block;endFill=1;startFill=1;html=1;fontSize=11;labelBackgroundColor=#ffffff;";
  const one = "endArrow=block;endFill=1;html=1;fontSize=11;labelBackgroundColor=#ffffff;";
  // requests: user devices -> website (Vercel) -> API (Render) -> database and outside services
  group("User devices", 0, 40, 190, 210);
  box("Web browser\n(computer, tablet or phone)", 15, 78, 160, 56);
  box("FreshNest Android app\n(shows the website)", 15, 168, 160, 56);
  group("Vercel", 260, 40, 190, 210);
  box("Next.js website\n(frontend folder)", 275, 78, 160, 56);
  box("Forwards /api and\n/uploads to the API", 275, 168, 160, 56);
  group("Render (Singapore)", 520, 0, 210, 290);
  box("Express API\n(backend folder)", 535, 32, 180, 44);
  box("Socket.IO live updates", 535, 96, 180, 44);
  box("Background job\n(every 5 seconds)", 535, 160, 180, 44);
  box("Health check /api/health", 535, 224, 180, 44);
  group("Neon (Singapore)", 800, 0, 130, 82);
  box("PostgreSQL\ndatabase", 810, 30, 110, 44);
  group("Cloudinary", 800, 104, 130, 82);
  box("Photos and\ndocuments", 810, 134, 110, 44);
  group("BulkSMSBD", 800, 208, 130, 82);
  box("SMS for\npassword reset", 810, 238, 110, 44);
  d.line(190, 145, 260, 145, "HTTPS", both);
  d.line(450, 145, 520, 145, "HTTPS", both);
  d.line(150, 40, 520, 16, "Socket.IO (WebSocket)", both, [[150, 16]]);
  d.line(730, 52, 800, 52, "SSL", both);
  d.line(730, 156, 800, 156, "HTTPS", both);
  d.line(730, 260, 800, 260, "HTTPS", both);
  // GitHub: the code, automatic deploys and the Android app
  group("GitHub", 0, 360, 730, 110);
  box("Releases\n(FreshNest.apk)", 15, 395, 160, 56);
  box("Actions\n(builds and signs the APK)", 265, 395, 180, 56);
  box("Repository\n(main branch)", 545, 395, 170, 56);
  d.line(670, 395, 670, 290, "push: API rebuilt", one);
  d.line(590, 395, 355, 250, "push: website rebuilt", one, [[590, 325], [355, 325]]);
  d.line(545, 423, 445, 423, "push to mobile/", one);
  d.line(265, 423, 175, 423, "signed APK", one);
  d.line(95, 395, 95, 224, "download and install", one);
  return d;
};

// ================================================================ write files

fs.mkdirSync(DIR, { recursive: true });
for (const [file, make] of Object.entries(diagrams)) {
  if (only.length && !only.includes(file)) continue;
  const target = path.join(DIR, file + ".drawio");
  if (fs.existsSync(target) && !force) { console.log("kept", file + ".drawio (use --force to replace it)"); continue; }
  fs.writeFileSync(target, make().xml());
  console.log("wrote", file + ".drawio");
}
