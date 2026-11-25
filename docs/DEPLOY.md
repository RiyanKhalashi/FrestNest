# Putting FreshNest online

Four free accounts. About 45 minutes the first time. You never need to share a password with anyone.

| Service | What runs there | Free plan note |
|---|---|---|
| **GitHub** | the code | — |
| **Neon** | the PostgreSQL database | 0.5 GB, plenty for the demo |
| **Render** | the API server (Express, live updates, timed jobs) | sleeps after 15 min without visitors; the first visit then takes about 50 seconds |
| **Vercel** | the website (Next.js) | — |
| **Cloudinary** | listing photos, documents, failure photos | 25 GB |

> Before the defence, open the site once about a minute early so the Render server is awake.

---

## 1. GitHub: put the code online

1. Make an account at **github.com** (use your DIU email if you like).
2. Top right **+** → **New repository** → name `freshnest` → **Private** → **Create repository**. Do not tick "Add a README".
3. GitHub shows a box "…or push an existing repository from the command line". In Terminal:

   ```bash
   cd ~/freshnest
   git remote add origin https://github.com/YOUR-NAME/freshnest.git
   git push -u origin main
   ```

   The first push asks you to sign in to GitHub in the browser.

## 2. Neon: the database

1. **neon.tech** → sign up with GitHub → **Create project**: name `freshnest`, region **AWS Asia Pacific (Singapore)**, Postgres version as offered.
2. On the project page click **Connect**. Turn **Connection pooling OFF** and copy the connection string. It looks like
   `postgresql://neondb_owner:…@ep-….ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
   Keep this tab open; you need the string twice (steps 4 and 6). Do not paste it into chats, documents or GitHub.

## 3. Cloudinary: photos and documents

1. **cloudinary.com** → sign up (free).
2. Dashboard → **API Keys** (or "Product Environment Credentials") → copy the **API environment variable**. It looks like
   `cloudinary://123456789012345:abcDEF…@your-cloud-name`

## 4. Render: the API server

1. **render.com** → sign up with GitHub → **New** → **Blueprint** → choose the `freshnest` repository. Render reads `render.yaml`.
2. It asks for three values:
   - `DATABASE_URL` → the Neon string from step 2
   - `WEB_ORIGIN` → type `https://freshnest.vercel.app` for now (you correct it in step 7 if Vercel gives a different address)
   - `CLOUDINARY_URL` → the Cloudinary string from step 3
3. **Apply**. The first build takes 3–5 minutes. When it says **Live**, copy the address, e.g. `https://freshnest-api.onrender.com`.
4. Check it: open `https://freshnest-api.onrender.com/api/health` in the browser. It should show `{"ok":true}`.

## 5. Vercel: the website

1. **vercel.com** → sign up with GitHub → **Add New… → Project** → import `freshnest`.
2. **Root Directory** → click **Edit** → choose `web`.
3. **Environment Variables**, add both with your Render address from step 4:
   - `API_URL` = `https://freshnest-api.onrender.com`
   - `NEXT_PUBLIC_SOCKET_URL` = `https://freshnest-api.onrender.com`
4. **Deploy**. When it finishes, note the address, e.g. `https://freshnest.vercel.app`.

## 6. Load the demo into the online database

In Terminal on your Mac:

```bash
cd ~/freshnest
./scripts/seed-production.sh
```

Paste the Neon string when asked (it stays hidden). It adds the locations, products, admin and demo accounts, the demo market, and 12 months of history.

## 7. Final check

1. If Vercel's address is not `https://freshnest.vercel.app`: Render → `freshnest-api` → **Environment** → set `WEB_ORIGIN` to the real Vercel address → **Save** (Render redeploys by itself).
2. Open the Vercel address and sign in as **Farmer** (01712345678 / freshnest123).
3. In a private window sign in as **Dealer** (01811000001) and place a bid. The farmer's page should update by itself within a second or two. If it does, live updates work end to end.

## Updating later

Every `git push` to `main` makes Render and Vercel build the new version automatically.

```bash
cd ~/freshnest
git add -A
git commit -m "Describe the change"
git push
```

Database changes (new migrations) are applied automatically when Render starts.

## If something goes wrong

| What you see | What to do |
|---|---|
| Website loads but sign-in says "Could not reach the server" | Check `API_URL` in Vercel (no slash at the end), then **Deployments → Redeploy**. |
| Pages work but nothing updates live | Check `NEXT_PUBLIC_SOCKET_URL` in Vercel and `WEB_ORIGIN` in Render (both exact, with `https://`). |
| Render build fails at "prisma migrate deploy" | The Neon string must be the one with connection pooling **off**. |
| Photo upload fails | Check `CLOUDINARY_URL` in Render (it starts with `cloudinary://`). |
| First page takes about a minute | The free Render server was asleep. Normal; open the site a minute before you present. |
