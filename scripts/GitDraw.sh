#!/usr/bin/env bash
set -euo pipefail

# Configuration
DEST="$HOME/Ateon"
SOURCES=(
    "$HOME/.config/hypr"
    "$HOME/.config/ags" 
    "$HOME/.config/foot"
    "$HOME/.config/matugen"
    "$HOME/.config/fish"
    "$HOME/.config/starship.toml"
    "$HOME/.config/fastfetch"
)

EXCLUDE_PATTERNS=(
    "*.log" "*.tmp" "*.cache" ".DS_Store" "node_modules"
    "__pycache__" "fish_variables" "fishd.*" "completions" "conf.d"
)

# Options
CLEAN=false
PUSH=false
PULL=false

# Logging
_log() { echo -e "\033[1;32m►\033[0m $*"; }
_warn() { echo -e "\033[1;33m⚠\033[0m $*" >&2; }
_err() { echo -e "\033[1;31m✗\033[0m $*" >&2; }

show_help() {
    cat << 'EOF'
GitDraw - Sync ATEON configs to repository

USAGE: ./gitdraw.sh [OPTIONS]

OPTIONS:
    --clean      Remove destination files first (fresh copy)
    --push       Auto-commit and push to remote
    --pull       Pull from remote before syncing
    -h, --help   Show this help

EXAMPLES:
    ./gitdraw.sh              # Basic sync + commit
    ./gitdraw.sh --clean      # Clean sync (remove old files)
    ./gitdraw.sh --pull --push  # Full remote sync workflow
EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean) CLEAN=true ;;
            --push) PUSH=true ;;
            --pull) PULL=true ;;
            -h|--help) show_help; exit 0 ;;
            *) _err "Unknown option: $1"; show_help; exit 1 ;;
        esac
        shift
    done
}

validate_environment() {
    [[ ! -d "$DEST/.git" ]] && { _err "$DEST is not a Git repository"; return 1; }
    
    local found=0
    for src in "${SOURCES[@]}"; do
        [[ -e "$src" ]] && ((found++))
    done
    [[ $found -eq 0 ]] && { _err "No source files found"; return 1; }
    
    if ! git -C "$DEST" diff --quiet || ! git -C "$DEST" diff --cached --quiet; then
        _warn "Destination has uncommitted changes"
        read -rp "Continue? [y/N]: " ans
        [[ ! "$ans" =~ ^[Yy]$ ]] && exit 0
    fi
    
    return 0
}

pull_from_remote() {
    cd "$DEST"
    git remote >/dev/null 2>&1 || return 0
    
    _log "Pulling latest changes..."
    if git fetch; then
        local behind=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "0")
        if [[ "$behind" -gt 0 ]]; then
            git pull --rebase || { _err "Pull failed - resolve conflicts manually"; return 1; }
            _log "Pulled $behind commit(s)"
        else
            _log "Already up to date"
        fi
    fi
    return 0
}

build_rsync_excludes() {
    local args=()
    for p in "${EXCLUDE_PATTERNS[@]}"; do 
        args+=("--exclude=$p")
    done
    echo "${args[@]}"
}

sync_configs() {
    _log "Syncing configurations..."
    [[ "$CLEAN" == true ]] && _warn "Clean mode: removing destination folders first"
    
    local synced=0
    local exclude_args=($(build_rsync_excludes))
    
    for src in "${SOURCES[@]}"; do
        [[ ! -e "$src" ]] && continue
        
        local basename=$(basename "$src")
        local dest_path="$DEST/$basename"
        
        # Clean mode: delete destination first (directories only)
        if [[ "$CLEAN" == true ]] && [[ -d "$src" ]] && [[ -d "$dest_path" ]]; then
            _log "Removing $basename..."
            rm -rf "$dest_path"
        fi
        
        # Sync based on type
        if [[ -f "$src" ]]; then
            # Single file (e.g., starship.toml)
            mkdir -p "$(dirname "$dest_path")"
            cp "$src" "$dest_path" && _log "✓ $basename" && ((synced++))
        else
            # Directory
            mkdir -p "$dest_path"
            if command -v rsync >/dev/null 2>&1; then
                # Prefer rsync for better sync control
                rsync -a --delete "${exclude_args[@]}" "$src/" "$dest_path/" && _log "✓ $basename" && ((synced++))
            else
                # Fallback to cp with manual cleanup
                cp -r "$src/." "$dest_path/" && _log "✓ $basename" && ((synced++))
                for p in "${EXCLUDE_PATTERNS[@]}"; do
                    find "$dest_path" -name "$p" -delete 2>/dev/null || true
                done
            fi
        fi
    done
    
    _log "Synced $synced configuration(s)"
    return 0
}

commit_and_push() {
    cd "$DEST"
    
    # Check for changes
    if git diff --quiet && git diff --cached --quiet; then
        [[ -z "$(git ls-files --others --exclude-standard)" ]] && { _log "No changes to commit"; return 0; }
    fi
    
    # Show changes
    _log "Changes detected:"
    git status --short | head -15
    echo
    
    # Get commit message
    read -rp "Commit message (Enter for auto): " msg
    [[ -z "$msg" ]] && msg="Sync configs $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Commit
    git add .
    git commit -m "$msg" || { _err "Commit failed"; return 1; }
    _log "Committed: $(git rev-parse --short HEAD)"
    
    # Push if requested
    if [[ "$PUSH" == true ]]; then
        _log "Pushing to remote..."
        git push && _log "✓ Pushed successfully" || _warn "Push failed"
    fi
    
    return 0
}

show_summary() {
    cd "$DEST"
    echo
    _log "✓ Sync complete!"
    echo "  Location: $DEST"
    echo "  Branch: $(git branch --show-current)"
    echo "  Last commit: $(git log -1 --format='%h - %s')"
}

main() {
    trap 'echo; _warn "Interrupted by user"; exit 130' INT TERM
    
    parse_args "$@"
    validate_environment || exit 1
    
    [[ "$PULL" == true ]] && { pull_from_remote || exit 1; }
    
    sync_configs || exit 1
    commit_and_push || exit 1
    show_summary
    
    _log "🎉 Your ATEON configs are synced!"
}

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && main "$@"