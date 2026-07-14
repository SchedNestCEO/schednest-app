#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="$ROOT/.engineering-backups"

if [[ ! -d "$BACKUP_ROOT" ]]; then
  echo "No engineering backups were found."
  exit 1
fi

BACKUP="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d | sort -r | head -n 1)"
if [[ -z "$BACKUP" ]]; then
  echo "No engineering backups were found."
  exit 1
fi

echo "Latest backup: $BACKUP"
read -r -p "Restore this backup? [y/N] " ANSWER
case "$ANSWER" in
  y|Y|yes|YES) ;;
  *) echo "Rollback cancelled."; exit 0 ;;
esac

if [[ -d "$BACKUP/files" ]]; then
  cp -R "$BACKUP/files/." "$ROOT/"
fi

if [[ -f "$BACKUP/created-files.txt" ]]; then
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    if [[ ! -e "$BACKUP/files/$file" ]]; then
      rm -f "$ROOT/$file"
    fi
  done < "$BACKUP/created-files.txt"
fi

echo "Rollback complete. Review changes with: git status"
