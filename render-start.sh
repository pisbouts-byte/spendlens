#!/usr/bin/env bash
set -e

echo "==> Running migrations..."
cd server
npx prisma migrate deploy

echo "==> Resolving workspace dependencies..."
rm -rf node_modules/@spendlens
mkdir -p node_modules/@spendlens/shared
cp ../shared/package.json node_modules/@spendlens/shared/
cp -r ../shared/dist node_modules/@spendlens/shared/
echo "==> Shared module contents:"
ls -la node_modules/@spendlens/shared/dist/

echo "==> Starting server..."
npx tsx src/index.ts
