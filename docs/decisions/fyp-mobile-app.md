---
name: fyp-mobile-app
description: Android app agreed 2026-11-26 — Capacitor wrapper that loads the live site (auto-updates), APK built by GitHub Actions; built 2026-11-26, first APK pending secrets + push
metadata:
  type: project
---

Agreed on 2026-11-26. Built the same day (M1–M3 code); the first APK still needs the GitHub secrets and a push.

**Approach:** a Capacitor Android app that loads the live website https://freshnest-bd.vercel.app inside the app (remote `server.url`). Every website change shows up in the app straight away, with no new APK. This replaces the earlier Expo / React Native idea, which would have meant rewriting every screen.

**Decisions**
- App name **FreshNest**, app ID `com.freshnest.app`, icon made from the existing FreshNest logo.
- **Android only**, delivered as an **APK** (no Play Store, no iPhone).
- **Push notifications later.** Version 1 has no Firebase.
- The APK is built by **GitHub Actions** (the Mac has no Android Studio) and published as a GitHub Release download.

**Phases**
- **M1. Website ready for the app:** app name and icon (manifest), small phone fixes, a "No internet, retry" screen, and a "Server is starting…" screen for when Render is asleep.
- **M2. Capacitor app in `mobile/`:** splash screen, Android back button, camera or gallery for photo uploads.
- **M3. GitHub Actions workflow:** builds the APK when `mobile/` changes and attaches it to a Release.
- **M4. Testing:** install on the user's Android phone and run the full deal flow for all 4 roles.

**When a new APK is needed:** only when the icon, the name or the native permissions change. Website changes never need a new APK.

See [[fyp-build-progress]] and [[fyp-responsive]].

**Build notes (2026-11-26)**
- M1 (live on Vercel): `web/src/app/manifest.ts`, icons in `web/public/icons/`, theme colour, and `WakeNotice.tsx`. Any API call slower than 4 s shows "Starting the server…" (`slowWatch` in `lib/api.ts`).
- M2: `mobile/` is a standalone npm project, outside the root workspaces. It uses Capacitor 8.6.0 and contains `capacitor.config.json` (server.url = live site, errorPath = `offline.html`), `www/offline.html` (English and Bangla retry screen), and the generated `android/` folder.
  - Icons come from `mobile/assets/` via `npm run icons`.
  - The manifest adds the CAMERA permission.
  - `app/build.gradle` reads VERSION_CODE, KEYSTORE_FILE and KEYSTORE_PASSWORD from the environment.
- M3: `.github/workflows/android.yml` runs on a push touching `mobile/**`, or by hand. It builds a signed release APK and creates the Release `app-v1.0.<run>` (marked latest).
  - Stable download link: https://github.com/RiyanKhalashi/FrestNest/releases/latest/download/FreshNest.apk
- Signing key: PKCS12 at `~/.freshnest-keys/freshnest-release.p12`, password in `keystore-password.txt`, alias `freshnest`. Keep a backup: if it is lost, phones must uninstall before the next update.
  - GitHub secrets ANDROID_KEYSTORE_BASE64 and ANDROID_KEYSTORE_PASSWORD are set by the user.
