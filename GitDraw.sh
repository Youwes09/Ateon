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
DRY_RUN=false
AUTO_COMMIT=false
FORCE_PUSH=false
PULL_FIRST=false
DELETE_DEST=false

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

show_help() {
    cat << 'EOF'
ATEON Config Sync - Sync local configs to Git repository

USAGE: ./gitdraw.sh [OPTIONS]

OPTIONS:
    --dry-run        Preview changes without syncing
    --auto-commit    Auto-commit with timestamp
    --force-push     Push after commit
    --pull-first     Pull from remote before syncing
    --delete         DELETE destination folders before syncing (clean copy)
    -h, --help       Show this help

EXAMPLES:
    ./gitdraw.sh                      # Interactive sync
    ./gitdraw.sh --dry-run            # Preview
    ./gitdraw.sh --delete             # Clean sync (removes old files)
    ./gitdraw.sh --pull-first --force-push  # Full remote sync
EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run) DRY_RUN=true ;;
            --auto-commit) AUTO_COMMIT=true ;;
            --force-push) FORCE_PUSH=true ;;
            --pull-first) PULL_FIRST=true ;;
            --delete) DELETE_DEST=true ;;
            -h|--help) show_help; exit 0 ;;
            *) error "Unknown option: $1"; show_help; exit 1 ;;
        esac
        shift
    done
}

validate_environment() {
    [[ ! -d "$DEST/.git" ]] && { error "$DEST is not a Git repository"; return 1; }
    
    local found=0
    for src in "${SOURCES[@]}"; do
        [[ -e "$src" ]] && ((found++))
    done
    [[ $found -eq 0 ]] && { error "No source files found"; return 1; }
    
    if ! git -C "$DEST" diff --quiet || ! git -C "$DEST" diff --cached --quiet; then
        warn "Destination has uncommitted changes"
        [[ "$DRY_RUN" != true ]] && { read -rp "Continue? [y/N]: " ans; [[ ! "$ans" =~ ^[Yy]$ ]] && exit 0; }
    fi
    return 0
}

pull_from_remote() {
    [[ "$DRY_RUN" == true ]] && { log "Would pull from remote"; return 0; }
    
    cd "$DEST"
    if ! git remote >/dev/null 2>&1; then return 0; fi
    
    log "Pulling latest changes..."
    if git fetch; then
        local behind=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "0")
        if [[ "$behind" -gt 0 ]]; then
            git pull --rebase || { error "Pull failed - resolve conflicts"; return 1; }
            log "Pulled $behind commit(s)"
        fi
    fi
    return 0
}

build_rsync_excludes() {
    local args=()
    for p in "${EXCLUDE_PATTERNS[@]}"; do args+=("--exclude=$p"); done
    echo "${args[@]}"
}

sync_configs() {
    log "Syncing configurations..."
    [[ "$DELETE_DEST" == true ]] && warn "DELETE mode: destination folders will be removed first"
    
    local synced=0
    local exclude_args=($(build_rsync_excludes))
    
    for src in "${SOURCES[@]}"; do
        [[ ! -e "$src" ]] && continue
        
        local basename=$(basename "$src")
        local dest_path="$DEST/$basename"
        
        if [[ "$DRY_RUN" == true ]]; then
            log "Would sync: $src -> $dest_path"
            [[ "$DELETE_DEST" == true ]] && echo "  (would DELETE $dest_path first)"
            continue
        fi
        
        # DELETE destination if flag is set (only for directories)
        if [[ "$DELETE_DEST" == true ]] && [[ -d "$src" ]] && [[ -d "$dest_path" ]]; then
            log "Deleting existing $basename directory..."
            rm -rf "$dest_path"
        fi
        
        # Sync file or directory
        if [[ -f "$src" ]]; then
            mkdir -p "$(dirname "$dest_path")"
            cp "$src" "$dest_path" && log "Synced $basename" && ((synced++))
        else
            mkdir -p "$dest_path"
            if command -v rsync >/dev/null 2>&1; then
                rsync -a --delete "${exclude_args[@]}" "$src/" "$dest_path/" && log "Synced $basename" && ((synced++))
            else
                cp -r "$src/." "$dest_path/" && log "Synced $basename" && ((synced++))
                for p in "${EXCLUDE_PATTERNS[@]}"; do
                    find "$dest_path" -name "$p" -delete 2>/dev/null || true
                done
            fi
        fi
    done
    
    log "Synced $synced configuration(s)"
    return 0
}

commit_changes() {
    [[ "$DRY_RUN" == true ]] && { log "Would commit changes"; return 0; }
    
    cd "$DEST"
    
    # Check for changes
    if git diff --quiet && git diff --cached --quiet; then
        [[ -z "$(git ls-files --others --exclude-standard)" ]] && { log "No changes to commit"; return 0; }
    fi
    
    log "Changes detected:"
    git status --short | head -10
    
    # Get commit message
    local msg
    if [[ "$AUTO_COMMIT" == true ]]; then
        msg="Auto-sync configs $(date '+%Y-%m-%d %H:%M:%S')"
    else
        read -rp "Commit message (Enter for auto): " msg
        [[ -z "$msg" ]] && msg="Sync configs $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    
    # Commit
    git add .
    git commit -m "$msg" || { error "Commit failed"; return 1; }
    log "Committed as $(git rev-parse --short HEAD)"
    
    # Push if requested
    if [[ "$FORCE_PUSH" == true ]]; then
        log "Pushing to remote..."
        git push && log "Pushed successfully" || warn "Push failed"
    fi
    
    return 0
}

show_summary() {
    [[ "$DRY_RUN" == true ]] && { log "Dry run complete - no changes made"; return 0; }
    
    cd "$DEST"
    log "✓ Sync complete!"
    echo "  Location: $DEST"
    echo "  Branch: $(git branch --show-current)"
    echo "  Last commit: $(git log -1 --format='%h - %s')"
}

main() {
    trap 'echo; warn "Interrupted"; exit 130' INT TERM
    
    parse_args "$@"
    validate_environment || exit 1
    [[ "$PULL_FIRST" == true ]] && { pull_from_remote || exit 1; }
    sync_configs || exit 1
    commit_changes || exit 1
    show_summary
    
    log "🎉 Your ATEON configs are synced!"
}

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && main "$@"