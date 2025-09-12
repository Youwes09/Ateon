#!/usr/bin/env bash
set -euo pipefail

# --- Config ---
DEST="$HOME/Ateon"
SOURCES=(
    "$HOME/.config/hypr"
    "$HOME/.config/ags"
    "$HOME/.config/foot"
    "$HOME/.config/matugen"
)

# --- Safety check ---
if [ ! -d "$DEST/.git" ]; then
    echo "❌ Error: $DEST is not a Git repository."
    exit 1
fi

for dir in "${SOURCES[@]}"; do
    [ -d "$dir" ] || echo "⚠️ Warning: Skipping missing $dir"
done

# --- Copy configs ---
echo "📂 Syncing configs into $DEST..."
for dir in "${SOURCES[@]}"; do
    [ -d "$dir" ] || continue
    cp -r "$dir" "$DEST/"
    echo "  ✔ Copied $(basename "$dir")"
done

# --- Commit changes ---
cd "$DEST"
if git diff --quiet && git diff --cached --quiet; then
    echo "ℹ️ No changes to commit."
    exit 0
fi

read -rp "💬 Commit message: " COMMIT_MSG
git add .
git commit -m "$COMMIT_MSG"
echo "✅ Changes committed. Use 'git push' to upload."
