#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LATEST="$(find "$ROOT/.engineering-backups" -mindepth 1 -maxdepth 1 -type d -name '*-sprint4' | sort -r | head -n 1 || true)"
[[ -n "$LATEST" ]] || { echo "No Sprint 4 backup found."; exit 1; }
cp -R "$LATEST/files/." "$ROOT/" 2>/dev/null || true
if [[ -f "$LATEST/created-files.txt" ]]; then while IFS= read -r f; do [[ -z "$f" ]] || [[ -e "$LATEST/files/$f" ]] || rm -f "$ROOT/$f"; done < "$LATEST/created-files.txt"; fi
echo "Application-file rollback complete."
