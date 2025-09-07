#!/usr/bin/env bash
set -euo pipefail

# --- Config ---
DEST="$HOME/Ateon"
SOURCES=("$HOME/.config/hypr" "$HOME/.config/ags" "$HOME/.config/foot")

# --- Safety check ---
for dir in "${SOURCES[@]}"; do
    [ -d "$dir" ] || { echo "Error: Source directory '$dir' does not exist."; exit 1; }
done
[ -d "$DEST/.git" ] || { echo "Error: Destination directory is not a Git repository."; exit 1; }

# --- Copy configs ---
echo "Copying configs..."
for dir in "${SOURCES[@]}"; do
    echo "  -> $(basename "$dir")"
    cp -r "$dir" "$DEST/"
done

# --- Prompt for commit message ---
read -rp "Enter commit message: " COMMIT_MSG

# --- Commit changes ---
cd "$DEST" || exit
git add .
if git diff --cached --quiet; then
    echo "No changes to commit."
else
    git commit -m "$COMMIT_MSG"
    echo "Changes committed. Ready to push."
fi
