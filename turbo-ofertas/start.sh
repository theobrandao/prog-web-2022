#!/bin/sh
# Production entrypoint (Docker / Railway / Render).
# Keeps DB + generated media on the persistent volume mounted at /data.
set -e

DATA_DIR="${DATA_DIR:-/data}"

# Persist dynamic media on the volume (keeps public/img/brand and other static files intact).
# Replace the built-in dirs with symlinks to the volume. `rm -rf` first so the link
# lands AT the path instead of being created INSIDE an existing directory.
mkdir -p "$DATA_DIR/products" "$DATA_DIR/creatives" "$DATA_DIR/vid-products"
rm -rf public/img/products public/img/creatives public/vid/products
ln -sfn "$DATA_DIR/products"     public/img/products
ln -sfn "$DATA_DIR/creatives"    public/img/creatives
ln -sfn "$DATA_DIR/vid-products" public/vid/products

# Ensure the schema exists on the volume DB (idempotent).
npx prisma db push --skip-generate --accept-data-loss

# Optional one-time demo seed: set SEED_ON_START=1 the first time only.
if [ "${SEED_ON_START:-0}" = "1" ]; then
  echo "Seeding demo data..."
  node --import tsx prisma/seed.ts || echo "seed falhou (seguindo mesmo assim)"
fi

# Cron worker in background (shares this container's SQLite volume).
if [ "${RUN_WORKER:-1}" = "1" ]; then
  node --import tsx worker.ts &
  echo "worker (cron) iniciado em background"
fi

# Web server in foreground.
exec node node_modules/.bin/next start -p "${PORT:-3000}" -H 0.0.0.0
