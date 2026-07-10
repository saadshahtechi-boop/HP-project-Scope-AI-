#!/bin/sh
# Container startup: ensure the database schema is applied before serving.
# Render/Railway run this on every deploy; `migrate deploy` is idempotent.
set -e

echo "→ Applying database migrations..."
npx prisma migrate deploy

# Seed only when explicitly requested (avoids re-seeding on every restart).
if [ "$RUN_SEED" = "true" ]; then
  echo "→ Seeding database (RUN_SEED=true)..."
  npx prisma db seed || echo "Seed skipped or already applied."
fi

echo "→ Starting API..."
exec node dist/main
