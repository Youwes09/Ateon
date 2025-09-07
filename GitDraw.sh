#!/usr/bin/env bash

# --- Config ---
SOURCE_HYPR="$HOME/.config/hypr"
SOURCE_AGS="$HOME/.config/ags"
DEST="$HOME/Ateon"
BRANCH="main"

# --- Safety check ---
if [ ! -d "$SOURCE_HYPR" ] || [ ! -d "$SOURCE_AGS" ]; then
    echo "Error: One or both source directories do not exist."
    exit 1
fi

if [ ! -d "$DEST/.git" ]; then
    echo "Error: Destination directory is not a Git repository."
    exit 1
fi

# --- Copy configs ---
echo "Copying configs..."
cp -r "$SOURCE_HYPR" "$DEST/"
cp -r "$SOURCE_AGS" "$DEST/"

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
