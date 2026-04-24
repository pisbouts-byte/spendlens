#!/usr/bin/env bash
set -e

echo "==> Installing pnpm..."
npm install -g pnpm@10

echo "==> Installing dependencies (skipping postinstall scripts)..."
rm -rf node_modules server/node_modules shared/node_modules
pnpm install --frozen-lockfile --ignore-scripts

echo "==> Prisma version installed:"
cd server && ./node_modules/.bin/prisma --version

echo "==> Generating Prisma client..."
./node_modules/.bin/prisma generate
cd ..

echo "==> Building shared package..."
cd shared && ../node_modules/.bin/tsc && cd ..

echo "==> Build complete"
