# CHAPTER 4 | DEPLOYMENT AND MAINTENANCE

## 4.1 Introduction

The marketplace is just useful when it's online and dependable. This chapter covers how FreshNest progressed from the development machine to the internet through the stages of the software release life cycle, the production system's organization and configuration, and how the system is kept healthy and up to date.

## 4.2 Adhering to the Software Release Life Cycle (SRLC)

### 4.2.1 Alpha Release

**Purpose:** internal testing by the system's developer during the construction of the system (Phases 5 & 6 in Table 1.3).

- The system was installed to run on the development computer with a local PostgreSQL database, demo accounts for all roles, and a demo market containing listings, deals and 12 months worth of history.
- Every browser tab can be logged in as a different role, and a complete deal (from farmer to dealer to transport provider to admin) can be followed on one computer.
- All build stages ended with automated API testing of their rules (Chapter 3), and every new page was checked in the browser.

### 4.2.2 Beta Release

**Purpose:** running the full system in the real cloud (Phase 7 in Table 1.3).

- The website was deployed on Vercel, the API on Render and the database on Neon, in addition to the photos and documents on Cloudinary. The online database was loaded with the locations, products, demo accounts, demo market and history.
- Live system testing was carried out using the demo accounts of all four roles – signing in, the data appearing on each of the dashboards, and the live connection for updates.
- A problem that was identified at this stage was addressed prior to the release. When there are no visitors for 15 minutes, the free Render server stops, and the first request has to wait until the server has started again. The site now shows a "Starting the server…" notice whenever a request takes longer than four seconds, instead of seeming broken.

### 4.2.3 Release Candidate

**Purpose:** final tests of the completed system prior to the production release.

- There were no issues found by the TypeScript check and all automated API tests passed (Table 3.3).
- The security settings were reviewed. Secrets are defined only in Render/Vercel's environment variables, not in the code, and not in Git. A long random signing key was created by Render. SameSite=Lax, Secure and httpOnly are all set in the session cookie. Only the website's address can make API requests or open a live connection (CORS). Private files are handed out only after a permission check, as Cloudinary links that expire after five minutes.
- The Android app was built and signed with GitHub Actions using a fixed signing key, which means that the next releases install over the existing app.

### 4.2.4 Production Release

The release of FreshNest (M7 in Chapter 1) was on 26 November 2026. Table 4.1 gives the details of the release.

Table 4.1: Production release details

| Item | Value |
|---|---|
| Version | FreshNest 1.0; Android app 1.0.1 |
| Release date | 26 November 2026 |
| Website | https://freshnest-bd.vercel.app |
| API | https://freshnest-api-lls6.onrender.com/api |
| Android app | FreshNest.apk for Android 7.0 or later, from the project's GitHub Releases: https://github.com/RiyanKhalashi/FrestNest/releases/latest |
| Hosting | Vercel (website); Render free web service in Singapore (API, live updates and background job); Neon PostgreSQL in Singapore (database); Cloudinary (files); BulkSMSBD (SMS) |
| Monitoring | Render health check on /api/health, and the Render and Vercel logs |

## 4.3 Deployment Architecture

The deployment of FreshNest is shown in Figure 4.1. Users open the website in a browser (or in the Android app, which displays the same website). Vercel serves the Next.js pages using HTTPS. Pages make API calls using the website's own address (/api), and Vercel passes these calls to the Express server on Render, which means that the session cookie remains with the website. Live updates are from a direct Socket.IO connection with Render. Since the cookie is not sent to another address, the page first asks the API for a two-minute ticket and then opens the connection with it.

The closest Render region to Bangladesh is Singapore, which is where the Render service is situated. It runs the API, the live updates and the background job. It uses the Neon PostgreSQL database in the same region through Prisma over an encrypted (SSL) connection, stores photos and documents in Cloudinary and sends SMS codes via BulkSMSBD. With the free plan, Render shuts down the server after 15 minutes of no visits. It restarts in less than a minute the next time someone visits the site, meanwhile displaying the "Starting the server…" notice on the site.

When pushed to the main branch on GitHub, the website on Vercel is rebuilt, and if the backend folder has been changed, the API on Render is deployed, applying any new database migrations on start. When changes are made to the mobile folder, the Android app is built, signed and published as a GitHub Release with a GitHub Actions workflow. Since the app opens the live website, updates to the website reach phones without having to download a new version of the application.

![Figure 4.1: Deployment architecture](diagrams/deployment.png)

### 4.3.1 Configuration

All secrets and settings are given to the services as environment variables in the Render and Vercel dashboards, and are never written in the code. There are no secrets in the repository, as the `.env` files of the development computer are not in the Git repository. The main variables are listed in Table 4.2.

Table 4.2: Main environment variables

| Variable | Service | Purpose |
|---|---|---|
| DATABASE_URL | Render | Connection string of the Neon database, with SSL required |
| JWT_SECRET | Render | Key that signs the session tokens; Render generated it as a long random value |
| WEB_ORIGIN | Render | The website address that may call the API and open live connections |
| CLOUDINARY_URL | Render | Cloudinary account; when it is set, files go to Cloudinary instead of the local disk |
| NODE_ENV, NODE_VERSION | Render | Production mode and Node.js 22 |
| API_URL | Vercel | Address of the API to which /api and /uploads are forwarded |
| NEXT_PUBLIC_SOCKET_URL | Vercel | Address for the live Socket.IO connection |

### 4.3.2 Deployment Steps

1. In the Singapore region create a Neon project and then copy the connection string, but disable the connection pooling as the migrations require a direct connection.
2. Create a Cloudinary account, and copy its `CLOUDINARY_URL`.
3. On Render, deploy the API using the `render.yaml` blueprint found in the repository: root folder `backend`, build command `npm install` and `npm run build` (Prisma client and TypeScript), start command `npm start` (run the migrations, then start the server) and health check `/api/health`. Set `DATABASE_URL`, `WEB_ORIGIN` and `CLOUDINARY_URL`; Render creates `JWT_SECRET`.
4. Import the repository into Vercel with the "`frontend`" root folder and set `API_URL` and `NEXT_PUBLIC_SOCKET_URL` to the Render address.
5. Set `WEB_ORIGIN` on Render to the Vercel address.
6. Use `scripts/seed-production.sh` to load the following data into Neon: migrations, 64 districts, 495 upazilas, products, admin and demo accounts, demo market, 12 months of history.
7. Verify `/api/health` is ok, then log in as 2 different roles in 2 separate windows and make sure a bid shows up on the other page without refreshing.
8. Put the app signing key in a GitHub secret and trigger the Android workflow, which will publish `FreshNest.apk` as a GitHub Release.

## 4.4 Maintenance Procedures

**Daily:**

- Open the website, check for the `/api/health` response, and view the Render logs for any errors.
- Process admin queues – dealers, transport providers & vehicles awaiting verification, delivery failures (urgent alert after 30 mins), reports, requests for cancellation & locked handover codes.

**Weekly:**

- Read the admin activity log for suspicious activity and check the account standing of users who have multiple reports.
- Check the free-plan limits: the database size on Neon, the storage on Cloudinary and the SMS credit in BulkSMSBD.
- Address reported bugs; make an automated test for each bug; run `npm test` and `npm run typecheck` before pushing.

**Monthly:**

- Before deploying, update npm packages, test and type check.
- Look at the product list, the shelf-life values and the season calendar in the admin office. They can be changed without any code changes.
- Create a backup of the database and check that it can be restored.
- Keep a backup of the Android signing key, as users otherwise would be forced to uninstall the app to install the next update. Change any secrets that might have been compromised.

**Releasing an update:**

- On every push to the main branch deploying takes place, and new migrations to the database run when the server starts on Render.
- In the event that a deployment causes issues, the previous deployment can be restored on the Vercel and Render dashboards.
- A new APK will not be required if nothing changes in the app itself, e.g. if the app keeps the same name and icon and the same permissions are required.

## 4.5 Summary

FreshNest has been through the Alpha, Beta and Release Candidate stages leading up to its production launch on 26 November 2026. The web app is hosted on Vercel, the API and the DB are hosted in Singapore on Render & Neon, files are kept on Cloudinary and SMS is sent through BulkSMSBD. New pushes are deployed automatically, the Android app follows the website with no new downloads, and all secrets are kept in environment variables. Daily, weekly and monthly routines keep the system running, secure and up to date. The next chapter is a user manual for each of the roles.
