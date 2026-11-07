#!/usr/bin/env bash
# install.sh: one-command setup of the AI coding docs into a TanStack Start app.
#
#   cd your-app
#   bash /path/to/ai-coding-docs/install.sh [--dry-run] [--owner @org/team] [--help]
#
# All the logic is in install.mjs (Node 20+, no dependencies). This file only checks that Node and pnpm exist.
set -euo pipefail

# Resolve the real location of this file, also when it is started through a symlink (for example from ~/.local/bin).
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  LINK_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  case "$SOURCE" in /*) ;; *) SOURCE="$LINK_DIR/$SOURCE" ;; esac
done
DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "install: Node.js is required (version 20 or newer). Install it, then run this again." >&2
  exit 2
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "install: Node $(node -v) is too old; version 20 or newer is required." >&2
  exit 2
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "install: pnpm is required (this project never uses npm or yarn). Install pnpm, then run this again." >&2
  exit 2
fi

exec node "$DIR/install.mjs" "$@"
