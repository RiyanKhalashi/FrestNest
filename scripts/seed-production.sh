#!/bin/zsh
# Loads the FreshNest demo into the ONLINE database (Neon).
# Run it yourself once, after the first Render deploy succeeded:   ./scripts/seed-production.sh
# It asks for the Neon connection string; nothing is saved to disk.
set -e
export PATH="$HOME/.local/node/bin:$PATH"
cd "$(dirname "$0")/../server"

echo "Paste the Neon connection string (it is not shown and not saved), then press Enter:"
read -rs DB
[[ "$DB" == postgres* ]] || { echo "That does not look like a postgres:// connection string."; exit 1; }
export DATABASE_URL="$DB"

echo "1/3  Applying database migrations…"
npx prisma migrate deploy
echo "2/3  Locations, products, admins and demo accounts…"
npx tsx prisma/seed.ts
echo "3/3  Demo market + 12 months of history (this resets listings, deals and notifications)…"
npx tsx prisma/demo.ts
npx tsx prisma/history.ts
echo "Done. Sign in on your Vercel address with the demo accounts (password freshnest123)."
