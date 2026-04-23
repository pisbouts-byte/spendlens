#!/usr/bin/env bash
set -e

echo "==> Installing pnpm..."
npm install -g pnpm@9

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Generating Prisma client..."
cd server && npx prisma generate && cd ..

echo "==> Building shared package..."
cd shared && npx tsc && cd ..

echo "==> Build complete (server runs via tsx, no tsc needed)"
