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

# Exclude patterns (files/dirs to skip during sync)
EXCLUDE_PATTERNS=(
    "*.log"
    "*.tmp" 
    "*.cache"
    ".DS_Store"
    "node_modules"
    "__pycache__"
    "fish_variables"
    "fishd.*"
    "completions"
    "conf.d"
)

# Options
DRY_RUN=false
FORCE_PUSH=false
AUTO_COMMIT=false
VERBOSE=false
SHOW_CHANGES=true
CREATE_BACKUP=false
BACKUP_DIR="$HOME/.config-backups"
PULL_FIRST=false

# Colors and logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
debug() { [[ "$VERBOSE" == true ]] && echo -e "${BLUE}[DEBUG]${NC} $*" >&2 || true; }

show_help() {
    cat << 'EOF'
ATEON Config Sync Script - Sync local configs to Git repository

USAGE:
    ./gitdraw.sh [OPTIONS]

OPTIONS:
    --dry-run           Show what would be synced without making changes
    --auto-commit       Auto-commit with timestamp (no prompt)
    --force-push        Automatically push after commit
    --verbose           Enable verbose logging
    --no-backup         Skip creating backup before sync
    --pull-first        Pull from remote before syncing (recommended)
    --help              Show this help

EXAMPLES:
    ./gitdraw.sh                         # Interactive sync
    ./gitdraw.sh --dry-run               # Preview changes
    ./gitdraw.sh --auto-commit           # Auto-commit with timestamp
    ./gitdraw.sh --pull-first --force-push  # Full sync with remote
    ./gitdraw.sh --verbose --dry-run     # Detailed preview

CONFIGURATION FILES SYNCED:
    - Hyprland configs (~/.config/hypr)
    - AGS configs (~/.config/ags)
    - Foot terminal (~/.config/foot)
    - Matugen theming (~/.config/matugen)
    - Fish shell (~/.config/fish)
    - Starship prompt (~/.config/starship.toml)
    - Fastfetch system info (~/.config/fastfetch)

NOTES:
    - Fish temporary files are excluded automatically
    - Use --pull-first to avoid conflicts when working on multiple machines
    - Creates backups by default unless --no-backup is specified
EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run) DRY_RUN=true ;;
            --auto-commit) AUTO_COMMIT=true ;;
            --force-push) FORCE_PUSH=true ;;
            --verbose) VERBOSE=true ;;
            --no-backup) CREATE_BACKUP=false ;;
            --pull-first) PULL_FIRST=true ;;
            --help|-h) show_help; exit 0 ;;
            *) error "Unknown option: $1"; show_help; exit 1 ;;
        esac
        shift
    done
}

pull_from_remote() {
    if [[ "$DRY_RUN" == true ]]; then
        log "Would pull from remote first"
        return 0
    fi
    
    cd "$DEST"
    
    # Check if we have a remote
    if ! git remote >/dev/null 2>&1; then
        debug "No remote configured, skipping pull"
        return 0
    fi
    
    log "Pulling latest changes from remote..."
    
    # Fetch first to see what's available
    if git fetch; then
        # Check if we're behind
        local behind_count=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "0")
        if [[ "$behind_count" -gt 0 ]]; then
            log "Remote has $behind_count new commit(s), pulling..."
            if git pull --rebase; then
                log "Successfully pulled and rebased changes"
            else
                error "Failed to pull changes - you may need to resolve conflicts"
                return 1
            fi
        else
            debug "Already up to date with remote"
        fi
    else
        warn "Failed to fetch from remote, continuing anyway..."
    fi
    
    return 0
}

show_uncommitted_changes() {
    log "Current uncommitted changes in destination:"
    echo
    
    cd "$DEST"
    
    # Show staged changes
    if ! git diff --cached --quiet; then
        echo -e "${YELLOW}Staged changes:${NC}"
        git diff --cached --name-status | head -20
        echo
    fi
    
    # Show unstaged changes
    if ! git diff --quiet; then
        echo -e "${YELLOW}Unstaged changes:${NC}"
        git diff --name-status | head -20
        echo
        
        # Show a few lines of actual changes for context
        echo -e "${YELLOW}Sample of changes:${NC}"
        git diff | head -30
        echo
    fi
    
    # Show untracked files
    local untracked_files
    untracked_files=$(git ls-files --others --exclude-standard)
    if [[ -n "$untracked_files" ]]; then
        echo -e "${YELLOW}Untracked files:${NC}"
        echo "$untracked_files" | head -20
        echo
    fi
}

validate_environment() {
    log "Validating environment..."
    
    # Check if destination exists and is a git repo
    if [[ ! -d "$DEST" ]]; then
        error "Destination directory does not exist: $DEST"
        error "Please clone your Ateon repository to $DEST first"
        return 1
    fi
    
    if [[ ! -d "$DEST/.git" ]]; then
        error "$DEST is not a Git repository"
        error "Run 'git init' or clone a repository first"
        return 1
    fi
    
    # Check git config
    if ! git -C "$DEST" config user.name >/dev/null || ! git -C "$DEST" config user.email >/dev/null; then
        warn "Git user.name or user.email not configured"
        warn "Set them with: git config user.name 'Your Name' && git config user.email 'you@example.com'"
    fi
    
    # Check for uncommitted changes in destination
    if ! git -C "$DEST" diff --quiet || ! git -C "$DEST" diff --cached --quiet; then
        warn "Destination has uncommitted changes"
        show_uncommitted_changes
        
        if [[ "$DRY_RUN" != true ]]; then
            read -rp "Continue anyway? [y/N]: " ans
            [[ "$ans" =~ ^[Yy]$ ]] || { log "Aborted by user"; exit 0; }
        fi
    fi
    
    # Validate source directories and files
    local missing_sources=()
    local found_sources=()
    
    for source in "${SOURCES[@]}"; do
        if [[ -d "$source" ]] || [[ -f "$source" ]]; then
            found_sources+=("$source")
            debug "Found: $source"
        else
            missing_sources+=("$source")
        fi
    done
    
    if [[ ${#found_sources[@]} -eq 0 ]]; then
        error "No source directories or files found"
        return 1
    elif [[ ${#missing_sources[@]} -gt 0 ]]; then
        warn "Missing source directories/files:"
        printf '  %s\n' "${missing_sources[@]}"
        echo
        log "Found ${#found_sources[@]} source(s) to sync"
    fi
    
    debug "Environment validation passed"
    return 0
}

create_backup() {
    if [[ "$DRY_RUN" == true ]]; then
        log "Would create backup at $BACKUP_DIR"
        return 0
    fi
    
    log "Creating backup..."
    
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_path="$BACKUP_DIR/ateon_backup_$timestamp"
    
    mkdir -p "$backup_path"
    
    if cp -r "$DEST" "$backup_path/"; then
        log "Backup created at: $backup_path"
        debug "Backup contains: $(du -sh "$backup_path" | cut -f1)"
    else
        error "Failed to create backup"
        return 1
    fi
    
    # Keep only last 5 backups
    local backup_count
    backup_count=$(find "$BACKUP_DIR" -maxdepth 1 -name "ateon_backup_*" -type d 2>/dev/null | wc -l)
    if [[ $backup_count -gt 5 ]]; then
        log "Cleaning old backups (keeping 5 most recent)..."
        find "$BACKUP_DIR" -maxdepth 1 -name "ateon_backup_*" -type d 2>/dev/null | sort | head -n $((backup_count - 5)) | xargs rm -rf
    fi
    
    return 0
}

build_rsync_excludes() {
    local exclude_args=()
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        exclude_args+=("--exclude=$pattern")
    done
    echo "${exclude_args[@]}"
}

sync_single_file() {
    local source="$1"
    local dest_file="$2"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "Would sync file: $source -> $dest_file"
        return 0
    fi
    
    # Create destination directory if needed
    mkdir -p "$(dirname "$dest_file")"
    
    if cp "$source" "$dest_file"; then
        debug "Successfully synced $(basename "$source")"
        return 0
    else
        error "Failed to sync $(basename "$source")"
        return 1
    fi
}

sync_configs() {
    log "Syncing configurations..."
    
    local synced_count=0
    local exclude_args
    exclude_args=($(build_rsync_excludes))
    
    for source in "${SOURCES[@]}"; do
        if [[ ! -d "$source" ]] && [[ ! -f "$source" ]]; then
            debug "Skipping missing source: $source"
            continue
        fi
        
        # Handle single files differently from directories
        if [[ -f "$source" ]]; then
            local filename=$(basename "$source")
            local dest_file="$DEST/$filename"
            
            if sync_single_file "$source" "$dest_file"; then
                log "Synced $filename"
                ((synced_count++))
            fi
            continue
        fi
        
        # Handle directories
        local basename=$(basename "$source")
        local dest_path="$DEST/$basename"
        
        if [[ "$DRY_RUN" == true ]]; then
            log "Would sync: $source -> $dest_path"
            # Show what would be synced
            if command -v rsync >/dev/null 2>&1; then
                echo "Preview of changes:"
                rsync -av --dry-run "${exclude_args[@]}" "$source/" "$dest_path/" 2>/dev/null | head -20
                echo "..."
            fi
        else
            log "Syncing $(basename "$source")..."
            
            # Create destination directory if it doesn't exist
            mkdir -p "$dest_path"
            
            # Use rsync if available (better for large configs), otherwise cp
            if command -v rsync >/dev/null 2>&1; then
                if rsync -av --delete "${exclude_args[@]}" "$source/" "$dest_path/"; then
                    debug "Successfully synced $basename with rsync"
                else
                    error "Failed to sync $basename with rsync"
                    continue
                fi
            else
                # Fallback to cp with manual exclusion
                if cp -r "$source/." "$dest_path/"; then
                    # Remove excluded patterns manually
                    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
                        find "$dest_path" -name "$pattern" -delete 2>/dev/null || true
                    done
                    debug "Successfully synced $basename with cp"
                else
                    error "Failed to sync $basename with cp"
                    continue
                fi
            fi
            
            log "Synced $basename"
            ((synced_count++))
        fi
    done
    
    if [[ "$DRY_RUN" != true ]]; then
        log "Synced $synced_count configuration(s)"
    fi
    
    return 0
}

commit_changes() {
    if [[ "$DRY_RUN" == true ]]; then
        log "Would check for changes and commit"
        return 0
    fi
    
    cd "$DEST"
    
    # Check if there are any changes
    if git diff --quiet && git diff --cached --quiet; then
        local untracked=$(git ls-files --others --exclude-standard)
        if [[ -z "$untracked" ]]; then
            log "No changes to commit"
            return 0
        fi
    fi
    
    # Show status
    log "Git status:"
    git status --porcelain | head -10
    local total_changes=$(git status --porcelain | wc -l)
    [[ $total_changes -gt 10 ]] && log "... and $((total_changes - 10)) more changes"
    
    # Get commit message
    local commit_msg
    if [[ "$AUTO_COMMIT" == true ]]; then
        commit_msg="Auto-sync ATEON configs $(date '+%Y-%m-%d %H:%M:%S')"
        log "Using auto-commit message: $commit_msg"
    else
        echo
        read -rp "Enter commit message (or press Enter for auto-message): " commit_msg
        if [[ -z "$commit_msg" ]]; then
            commit_msg="Sync ATEON configs $(date '+%Y-%m-%d %H:%M:%S')"
        fi
    fi
    
    # Stage and commit
    log "Staging changes..."
    git add .
    
    log "Committing changes..."
    if git commit -m "$commit_msg"; then
        local commit_hash=$(git rev-parse --short HEAD)
        log "Successfully committed as $commit_hash"
        
        # Push if requested
        if [[ "$FORCE_PUSH" == true ]]; then
            log "Pushing to remote..."
            if git push; then
                log "Successfully pushed to remote"
            else
                warn "Failed to push to remote - you may need to set up remote first"
                return 1
            fi
        else
            log "Use 'git push' to upload changes to remote"
        fi
    else
        error "Failed to commit changes"
        return 1
    fi
    
    return 0
}

show_summary() {
    if [[ "$DRY_RUN" == true ]]; then
        log "Dry run completed - no changes were made"
        log "Run without --dry-run to actually sync your configs"
        return 0
    fi
    
    cd "$DEST"
    
    log "ATEON config sync completed successfully!"
    echo
    log "Repository status:"
    echo "  Location: $DEST"
    echo "  Branch: $(git branch --show-current)"
    echo "  Last commit: $(git log -1 --format='%h - %s (%cr)')"
    
    # Show what was synced
    echo
    log "Synced configurations:"
    for source in "${SOURCES[@]}"; do
        if [[ -d "$source" ]] || [[ -f "$source" ]]; then
            echo "  ✓ $(basename "$source")"
        fi
    done
    
    # Show remote status if available
    if git remote >/dev/null 2>&1; then
        local remote_url=$(git remote get-url origin 2>/dev/null || echo "none")
        echo
        echo "  Remote: $remote_url"
        
        # Check if we're ahead/behind
        if git ls-remote origin >/dev/null 2>&1; then
            local ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
            local behind=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "0")
            
            if [[ "$ahead" -gt 0 ]]; then
                warn "Local branch is $ahead commit(s) ahead of remote"
                [[ "$FORCE_PUSH" != true ]] && warn "Use --force-push next time to push automatically"
            fi
            if [[ "$behind" -gt 0 ]]; then
                warn "Local branch is $behind commit(s) behind remote"
                warn "Use --pull-first next time to avoid conflicts"
            fi
            if [[ "$ahead" -eq 0 ]] && [[ "$behind" -eq 0 ]]; then
                log "✓ In sync with remote"
            fi
        fi
    fi
}

cleanup() {
    local exit_code=$?
    debug "Cleanup function called with exit code: $exit_code"
    exit $exit_code
}

main() {
    trap cleanup EXIT
    trap 'echo; warn "Interrupted by user"; exit 130' INT TERM
    
    log "ATEON Config Sync Script"
    echo
    
    parse_args "$@"
    
    # Show configuration in verbose mode
    if [[ "$VERBOSE" == true ]]; then
        debug "Configuration:"
        debug "  Destination: $DEST"
        debug "  Backup directory: $BACKUP_DIR"
        debug "  Sources: ${SOURCES[*]}"
        debug "  Dry run: $DRY_RUN"
        debug "  Auto commit: $AUTO_COMMIT"
        debug "  Force push: $FORCE_PUSH"
        debug "  Pull first: $PULL_FIRST"
        debug "  Create backup: $CREATE_BACKUP"
        echo
    fi
    
    validate_environment || exit 1
    
    # Pull from remote if requested
    if [[ "$PULL_FIRST" == true ]]; then
        pull_from_remote || exit 1
    fi
    
    # Create backup before making changes
    if [[ "$CREATE_BACKUP" == true ]]; then
        create_backup || exit 1
    fi
    
    sync_configs || exit 1
    commit_changes || exit 1
    show_summary
    
    echo
    log "🎉 Your ATEON configs are now synced!"
    [[ "$DRY_RUN" != true ]] && log "Your beautiful terminal setup is safely stored in Git."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi