---
name: fyp-stack-plan
description: FYP agreed tech stack — Next.js + TypeScript frontend, Express + TypeScript backend, PostgreSQL + Prisma, Socket.io, pg-boss
metadata:
  type: project
---

Agreed with user on 2026-11-15. Part of [[fyp-project-overview]]; UI comes from [[fyp-prototype-plan]].

User chose React/Next.js + Node/Express + PostgreSQL; details below were suggested by Claude and accepted.

| Part | Choice | Why |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript** | Pages map to F1–F4, D1–D4…; type safety |
| Styling | Reuse prototype **`css/base.css`** as global CSS (no Tailwind) | Keeps the agreed look |
| Backend | **Node + Express + TypeScript**, separate always-on server | Live bidding + timed jobs need a persistent server |
| Database | **PostgreSQL + Prisma ORM** | Relational data (listings → bids/offers → deals → transport → reviews); transactions prevent double Buy Now |
| Real-time | **Socket.io** | Live highest bid, countdowns, bell notifications |
| Timed jobs | **pg-boss** (Postgres-backed queue, no Redis) | Auto-close bidding (highest bid wins), expire offers, transport offer windows |
| Auth | Phone + password, **bcrypt** + **JWT in httpOnly cookie**, role/permission middleware | Farmer, Dealer, Transporter, Admin, Super Admin |
| Validation | **Zod** | Shared form/API validation |
| File uploads | **Multer + Cloudinary** (free tier) | Verification docs, delivery-failure photos |
| Hosting (demo) | Vercel (frontend) + Render/Railway (backend) + Neon (Postgres) | Free, live link for defence |

Architecture: Next.js ↔ REST API + Socket.io ↔ Express ↔ Prisma ↔ PostgreSQL (pg-boss runs in the Express server).

Later / optional: weather API (seasonal warnings), SMS gateway for real OTP (demo shows OTP on screen).
