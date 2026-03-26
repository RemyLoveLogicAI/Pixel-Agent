#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Install dependencies (idempotent)
if [ ! -d node_modules ] || [ package.json -nt node_modules/.package-lock.json ]; then
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
fi

# Ensure vitest is available
if ! pnpm exec vitest --version &>/dev/null; then
  echo "Vitest not found, will be installed by foundation features"
fi

echo "Environment ready."
