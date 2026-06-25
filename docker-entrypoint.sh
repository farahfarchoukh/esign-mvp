#!/bin/sh
set -e

# Ensure the SQLite schema is present (idempotent — safe on every start).
# When prisma/dev.db is mounted as a persistent volume this is a no-op after
# the first run; on a fresh volume it creates the tables.
npx prisma db push --skip-generate

exec "$@"
