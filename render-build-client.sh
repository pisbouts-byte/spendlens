#!/usr/bin/env bash
set -e

echo "==> Installing pnpm..."
npm install -g pnpm@10

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile --ignore-scripts

echo "==> Building shared package..."
cd shared && rm -rf dist tsconfig.tsbuildinfo && ../node_modules/.bin/tsc && cd ..

echo "==> Building client..."
cd client && pnpm run build

echo "==> Build complete"
