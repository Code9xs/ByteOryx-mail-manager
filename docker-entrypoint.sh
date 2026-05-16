#!/bin/sh
set -eu

npx prisma generate
npx prisma db push
node scripts/ensure-default-group.js

exec "$@"
