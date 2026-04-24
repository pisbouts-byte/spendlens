#!/usr/bin/env bash
set -e

echo "==> Installing pnpm..."
npm install -g pnpm@10

echo "==> Installing dependencies (clean)..."
rm -rf node_modules server/node_modules shared/node_modules
pnpm install --frozen-lockfile

echo "==> Verifying Prisma version..."
cd server
./node_modules/.bin/prisma --version
echo "==> Generating Prisma client..."
./node_modules/.bin/prisma generate
cd ..

echo "==> Building shared package..."
cd shared && pnpm exec tsc && cd ..

echo "==> Build complete"
