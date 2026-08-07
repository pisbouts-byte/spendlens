#!/usr/bin/env bash
set -e

echo "==> Installing pnpm..."
npm install -g pnpm@10 --prefix="$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile --ignore-scripts

echo "==> Building shared package..."
cd shared && rm -rf dist tsconfig.tsbuildinfo && ../node_modules/.bin/tsc && cd ..

echo "==> Building client..."
cd client && pnpm run build

echo "==> Build complete"
