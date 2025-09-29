#!/usr/bin/env bash
set -euo pipefail

# Configuration
REPO_URL="https://github.com/Youwes09/Ateon.git"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_HOME="$HOME"

# Destinations
AGS_DEST="$USER_HOME/.config/ags"
HYPR_DEST="$USER_HOME/.config/hypr"
MATUGEN_DEST="$USER_HOME/.config/matugen"
FOOT_DEST="$USER_HOME/.config/foot"
FISH_DEST="$USER_HOME/.config/fish"
FASTFETCH_DEST="$USER_HOME/.config/fastfetch"
STARSHIP_DEST="$USER_HOME/.config/starship.toml"
BIN_DEST="$USER_HOME/.local/bin"

# Backup settings
BACKUPS_ROOT="$USER_HOME/.config/ateon_backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$BACKUPS_ROOT/$TIMESTAMP"

# Options
DRY_RUN=false
FORCE=false
ACTION=""
RESTORE_TARGET=""
INSTALL_MODE="grouped"  # "grouped" or "individual"

# Package groups
CORE_PKGS=(
    hyprland aylurs-gtk-shell-git matugen-bin
    libastal-{hyprland,tray,notifd,apps,wireplumber,mpris,network,bluetooth,cava,battery,powerprofiles}-git
    libgtop dart-sass imagemagick adwaita-icon-theme libadwaita
    ttf-jetbrains-mono-nerd ttf-firacode-nerd ttf-material-symbols-variable-git
    hyprpaper polkit-gnome glib-networking libsoup3 resources
)

TERMINAL_PKGS=(
    foot fish starship fastfetch
    wl-clipboard clipvault
)

UTIL_PKGS=(
    hyprshot swappy grim slurp hyprpicker-git
    brightnessctl playerctl pipewire pipewire-pulse wireplumber
    firefox nautilus github-desktop code obsidian spotify-launcher
    normcap python-zxing-cpp tesseract tesseract-data-eng
    python-pytesseract pyside6 pavucontrol
)

REQUIRED_DEPS=(git curl systemctl)

# Config group definitions
declare -A CONFIG_GROUPS=(
    ["desktop"]="Desktop Environment (Hyprland + AGS + Matugen theming)"
    ["terminal"]="Terminal Setup (Foot + Fish + Starship + Fastfetch)"
    ["individual"]="Individual configuration files"
)

# Config mappings: "source:dest:display_name:group:critical"
CONFIG_MAPPINGS=(
    "hypr:$HYPR_DEST:Hyprland configuration:desktop:true"
    "ags:$AGS_DEST:AGS desktop shell:desktop:true"
    "matugen:$MATUGEN_DEST:Matugen theming:desktop:false"
    "foot:$FOOT_DEST:Foot terminal:terminal:false"
    "fish:$FISH_DEST:Fish shell:terminal:false"
    "starship.toml:$STARSHIP_DEST:Starship prompt:terminal:false"
    "fastfetch:$FASTFETCH_DEST:Fastfetch system info:terminal:false"
)

# Logging
_log() { echo -e "\033[1;32m[ateon]\033[0m $*"; }
_warn() { echo -e "\033[1;33m[WARN]\033[0m $*" >&2; }
_err() { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }
_debug() { [[ "${DEBUG:-}" == "1" ]] && echo -e "\033[1;36m[DEBUG]\033[0m $*" >&2 || true; }

command_exists() { command -v "$1" >/dev/null 2>&1; }
is_arch_based() { [[ -f /etc/arch-release ]] || command_exists pacman; }

confirm_action() {
    local message="$1"
    local is_destructive="${2:-false}"
    local attempts=1
    
    [[ "$FORCE" == true ]] && return 0
    
    if [[ "$is_destructive" == "true" ]]; then
        attempts=3
        _warn "DESTRUCTIVE OPERATION DETECTED"
        _warn "This will overwrite existing configurations!"
    fi
    
    for ((i=1; i<=attempts; i++)); do
        if [[ $attempts -gt 1 ]]; then
            _log "Confirmation $i/$attempts: $message"
        else
            _log "$message"
        fi
        
        read -rp "Continue? [y/N]: " ans
        if [[ ! "$ans" =~ ^[Yy]$ ]]; then
            _log "Operation cancelled by user"
            return 1
        fi
        
        [[ $attempts -gt 1 && $i -lt $attempts ]] && sleep 1
    done
    
    return 0
}

validate_system() {
    _log "Validating system requirements..."
    
    local missing_deps=()
    for cmd in "${REQUIRED_DEPS[@]}"; do
        command_exists "$cmd" || missing_deps+=("$cmd")
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        _err "Missing dependencies: ${missing_deps[*]}"
        _err "Install with: sudo pacman -S ${missing_deps[*]}"
        return 1
    fi
    
    if ! is_arch_based; then
        _err "Only Arch-based distributions are supported"
        return 1
    fi
    
    # Check if script is run from correct directory
    local expected_configs=("hypr" "ags" "foot" "fish")
    local missing_configs=()
    
    for config in "${expected_configs[@]}"; do
        [[ ! -d "$SCRIPT_DIR/$config" && ! -f "$SCRIPT_DIR/$config" ]] && missing_configs+=("$config")
    done
    
    if [[ ${#missing_configs[@]} -gt 0 ]]; then
        _err "Missing source configurations: ${missing_configs[*]}"
        _err "Please run this script from the ATEON repository root directory"
        return 1
    fi
    
    local free_space
    free_space=$(df "$USER_HOME" --output=avail -B1M | tail -n1 | tr -d ' ')
    if [[ $free_space -lt 1500 ]]; then
        _warn "Low disk space: ${free_space}MB available (recommended: 1.5GB+)"
        confirm_action "Continue with limited disk space?" || return 1
    fi
    
    return 0
}

backup_if_exists() {
    local path="$1"
    local backup_name="${2:-$(basename "$path")}"
    
    [[ ! -e "$path" ]] && return 0
    
    mkdir -p "$BACKUP_DIR" || {
        _err "Failed to create backup directory"
        return 1
    }
    
    _log "Creating backup of $backup_name"
    
    if [[ "$DRY_RUN" == true ]]; then
        _log "[dry-run] Would backup $path"
        return 0
    fi
    
    if cp -a "$path" "$BACKUP_DIR/$backup_name" 2>/dev/null; then
        if [[ -e "$BACKUP_DIR/$backup_name" ]]; then
            _log "Successfully backed up $backup_name"
            return 0
        fi
    fi
    
    _err "Failed to backup $backup_name"
    return 1
}

install_single_config() {
    local src="$1"
    local dest="$2"
    local name="$3" 
    local is_critical="$4"
    local confirm_mode="$5"  # "confirm" or "no_confirm"
    
    if [[ ! -e "$src" ]]; then
        _warn "Source not found: $src"
        [[ "$is_critical" == "true" ]] && return 1 || return 2
    fi
    
    # Handle existing config
    if [[ -e "$dest" ]]; then
        if ! backup_if_exists "$dest" "$(basename "$dest")"; then
            _err "Failed to create backup for $name"
            [[ "$is_critical" == "true" ]] && return 1
        fi
        
        case "$confirm_mode" in
            "confirm")
                _warn "Existing configuration found: $dest"
                if ! confirm_action "Replace existing $name?" "true"; then
                    _log "Skipping installation of $name"
                    return 2  # Skip code
                fi
                ;;
            "no_confirm")
                _log "Replacing existing $name"
                ;;
        esac
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        _log "[dry-run] Would install $name"
        return 0
    fi
    
    # Install the config
    [[ -e "$dest" ]] && rm -rf "$dest"
    mkdir -p "$(dirname "$dest")"
    
    if cp -a "$src" "$dest" 2>/dev/null && [[ -e "$dest" ]]; then
        _log "Successfully installed $name"
        return 0
    else
        _err "Failed to install $name"
        return 1
    fi
}

install_yay() {
    command_exists yay && return 0
    
    _log "Installing yay AUR helper..."
    [[ "$DRY_RUN" == true ]] && return 0
    
    sudo pacman -Sy --needed --noconfirm git base-devel || return 1
    
    local tmpdir
    tmpdir="$(mktemp -d)" || return 1
    trap "rm -rf '$tmpdir'" EXIT
    
    git clone https://aur.archlinux.org/yay.git "$tmpdir" >/dev/null 2>&1 || return 1
    (cd "$tmpdir" && makepkg -si --noconfirm) >/dev/null 2>&1 || return 1
    
    command_exists yay || return 1
    return 0
}

install_packages() {
    # Check existing packages
    local all_packages=("${CORE_PKGS[@]}" "${TERMINAL_PKGS[@]}" "${UTIL_PKGS[@]}")
    local total_packages=${#all_packages[@]}
    local installed_count=0
    
    for pkg in "${all_packages[@]}"; do
        yay -Qi "$pkg" >/dev/null 2>&1 && ((installed_count++))
    done 2>/dev/null || true
    
    if [[ $installed_count -gt $((total_packages / 2)) ]]; then
        _log "Found $installed_count/$total_packages packages already installed"
        confirm_action "Install missing packages?" || {
            _log "Skipping package installation"
            return 0
        }
    else
        local missing=$((total_packages - installed_count))
        confirm_action "Install $missing packages? (~800MB download)" || {
            _log "Skipping package installation"
            return 0
        }
    fi
    
    install_yay || return 1
    
    if [[ "$DRY_RUN" == true ]]; then
        _log "[dry-run] Would install packages"
        return 0
    fi
    
    # Install core packages first (critical for desktop)
    _log "Installing core desktop packages..."
    local failed_core=()
    for pkg in "${CORE_PKGS[@]}"; do
        if ! yay -Qi "$pkg" >/dev/null 2>&1; then
            if ! yay -S --needed --noconfirm "$pkg" >/dev/null 2>&1; then
                failed_core+=("$pkg")
                _warn "Failed to install: $pkg"
            fi
        fi
    done
    
    # Install terminal packages
    _log "Installing terminal packages..."
    local failed_terminal=()
    for pkg in "${TERMINAL_PKGS[@]}"; do
        if ! yay -Qi "$pkg" >/dev/null 2>&1; then
            if ! yay -S --needed --noconfirm "$pkg" >/dev/null 2>&1; then
                failed_terminal+=("$pkg")
                _warn "Failed to install: $pkg"
            fi
        fi
    done
    
    # Install utility packages (non-critical)
    _log "Installing utility packages..."
    for pkg in "${UTIL_PKGS[@]}"; do
        if ! yay -Qi "$pkg" >/dev/null 2>&1; then
            yay -S --needed --noconfirm "$pkg" >/dev/null 2>&1 || _warn "Failed: $pkg"
        fi
    done
    
    # Check critical packages
    if [[ ${#failed_core[@]} -gt 0 ]]; then
        _err "Critical desktop packages failed: ${failed_core[*]}"
        return 1
    fi
    
    # Warn about terminal packages but don't fail
    if [[ ${#failed_terminal[@]} -gt 0 ]]; then
        _warn "Some terminal packages failed: ${failed_terminal[*]}"
        _warn "Terminal features may be limited"
    fi
    
    # Configure services
    _log "Configuring services..."
    
    # Audio services
    for service in pipewire pipewire-pulse wireplumber; do
        systemctl --user enable --now "$service" 2>/dev/null || _warn "Failed to enable $service"
    done
    
    # Set Fish as default shell if installed
    if command_exists fish && [[ "$SHELL" != */fish ]]; then
        _log "Setting Fish as default shell..."
        if confirm_action "Make Fish your default shell?"; then
            chsh -s "$(which fish)" || _warn "Failed to set Fish as default shell"
        fi
    fi
    
    return 0
}

choose_install_mode() {
    if [[ "$FORCE" == "true" ]]; then
        INSTALL_MODE="grouped"
        return 0
    fi
    
    echo
    _log "Configuration installation options:"
    echo "  1. Grouped installation (recommended)"
    echo "     • Desktop Environment: Hyprland + AGS + Matugen theming"
    echo "     • Terminal Setup: Foot + Fish + Starship + Fastfetch"
    echo "  2. Individual configuration selection"
    echo
    
    while true; do
        read -rp "Choose installation mode [1-2]: " choice
        case "$choice" in
            1|"") INSTALL_MODE="grouped"; break ;;
            2) INSTALL_MODE="individual"; break ;;
            *) _warn "Invalid choice. Please enter 1 or 2." ;;
        esac
    done
}

install_config_group() {
    local group="$1"
    local group_description="$2"
    local confirm_mode="$3"
    
    # Find all configs in this group
    local group_configs=()
    local group_names=()
    for config_def in "${CONFIG_MAPPINGS[@]}"; do
        IFS=':' read -r config_name dest_path display_name config_group is_critical <<< "$config_def"
        if [[ "$config_group" == "$group" ]]; then
            group_configs+=("$config_def")
            group_names+=("$display_name")
        fi
    done
    
    if [[ ${#group_configs[@]} -eq 0 ]]; then
        _warn "No configurations found for group: $group"
        return 0
    fi
    
    # Check if group should be installed
    if [[ "$confirm_mode" == "confirm" ]]; then
        echo
        _log "Install $group_description?"
        echo "  Includes: ${group_names[*]}"
        if ! confirm_action "Install this group?"; then
            _log "Skipping $group_description"
            return 0
        fi
    fi
    
    # Check for existing configs in group
    local has_existing=false
    if [[ "$confirm_mode" != "no_confirm" ]]; then
        for config_def in "${group_configs[@]}"; do
            IFS=':' read -r config_name dest_path _ _ _ <<< "$config_def"
            if [[ -e "$dest_path" ]]; then
                has_existing=true
                break
            fi
        done
        
        if [[ "$has_existing" == "true" ]] && [[ "$confirm_mode" == "confirm" ]]; then
            if ! confirm_action "Replace existing configurations in this group?" "true"; then
                _log "Skipping $group_description"
                return 0
            fi
        fi
    fi
    
    # Install all configs in group
    local installed=0
    local failed=0
    
    _log "Installing $group_description..."
    
    for config_def in "${group_configs[@]}"; do
        IFS=':' read -r config_name dest_path display_name _ is_critical <<< "$config_def"
        local src_path="$SCRIPT_DIR/$config_name"
        
        local result=0
        install_single_config "$src_path" "$dest_path" "$display_name" "$is_critical" "no_confirm" || result=$?
        
        case $result in
            0) ((installed++)) ;;
            1) ((failed++)) ;;
            2) _log "Skipped $display_name (source not found)" ;;
        esac
    done
    
    if [[ $installed -gt 0 ]]; then
        _log "Successfully installed $installed configurations in $group_description"
    fi
    
    if [[ $failed -gt 0 ]]; then
        _warn "$failed configurations failed in $group_description"
        return 1
    fi
    
    return 0
}

install_configs() {
    _log "Installing configurations..."
    
    choose_install_mode
    
    local total_installed=0
    local total_failed=0
    
    case "$INSTALL_MODE" in
        "grouped")
            # Check if any configs exist and ask once for all
            local has_existing_configs=false
            for config_def in "${CONFIG_MAPPINGS[@]}"; do
                IFS=':' read -r config_name dest_path _ _ _ <<< "$config_def"
                if [[ -e "$dest_path" ]]; then
                    has_existing_configs=true
                    break
                fi
            done
            
            local confirm_mode="no_confirm"
            if [[ "$has_existing_configs" == "true" ]] && [[ "$FORCE" != "true" ]]; then
                if ! confirm_action "Replace ALL existing configurations?" "true"; then
                    _log "Installation cancelled"
                    return 1
                fi
            fi
            
            # Install desktop group
            if install_config_group "desktop" "${CONFIG_GROUPS[desktop]}" "$confirm_mode"; then
                ((total_installed += 3))  # hypr + ags + matugen
            else
                ((total_failed++))
            fi
            
            # Install terminal group
            if install_config_group "terminal" "${CONFIG_GROUPS[terminal]}" "$confirm_mode"; then
                ((total_installed += 4))  # foot + fish + starship + fastfetch
            else
                ((total_failed++))
            fi
            ;;
            
        "individual")
            # Ask for each config individually
            for config_def in "${CONFIG_MAPPINGS[@]}"; do
                IFS=':' read -r config_name dest_path display_name config_group is_critical <<< "$config_def"
                local src_path="$SCRIPT_DIR/$config_name"
                
                if confirm_action "Install $display_name?"; then
                    local result=0
                    install_single_config "$src_path" "$dest_path" "$display_name" "$is_critical" "confirm" || result=$?
                    
                    case $result in
                        0) ((total_installed++)) ;;
                        1) ((total_failed++)) ;;
                        2) _log "Skipped $display_name" ;;
                    esac
                else
                    _log "Skipping $display_name"
                fi
            done
            ;;
    esac
    
    echo
    _log "Configuration installation summary:"
    _log "  Successfully installed: $total_installed"
    _log "  Failed: $total_failed"
    
    # Only fail if critical configs failed
    local critical_failed=false
    for config_def in "${CONFIG_MAPPINGS[@]}"; do
        IFS=':' read -r config_name dest_path display_name config_group is_critical <<< "$config_def"
        if [[ "$is_critical" == "true" && ! -e "$dest_path" ]]; then
            critical_failed=true
            _err "Critical configuration missing: $display_name"
        fi
    done
    
    [[ "$critical_failed" == "true" ]] && return 1
    return 0
}

install_utilities() {
    local utilities_installed=0
    
    # Install GitDraw utility
    local gitdraw_src="$SCRIPT_DIR/scripts/GitDraw.sh"
    local gitdraw_dest="$BIN_DEST/gitdraw"
    
    if [[ -f "$gitdraw_src" ]]; then
        if [[ ! -f "$gitdraw_dest" ]] || confirm_action "Install/update GitDraw utility?"; then
            backup_if_exists "$gitdraw_dest" "gitdraw"
            mkdir -p "$BIN_DEST"
            
            if [[ "$DRY_RUN" == true ]]; then
                _log "[dry-run] Would install GitDraw utility"
            else
                if cp "$gitdraw_src" "$gitdraw_dest" && chmod +x "$gitdraw_dest"; then
                    _log "Installed GitDraw utility"
                    ((utilities_installed++))
                else
                    _warn "Failed to install GitDraw utility"
                fi
            fi
        fi
    fi
    
    [[ $utilities_installed -gt 0 ]] && _log "Installed $utilities_installed utilities"
    return 0
}

show_completion() {
    [[ "$DRY_RUN" == true ]] && {
        _log "Dry run completed - review the changes above"
        return 0
    }
    
    echo
    _log "🎉 ATEON installation completed successfully!"
    echo
    _log "Next steps:"
    echo "  1. Log out and select Hyprland session"
    echo "  2. Desktop should load automatically with AGS shell"
    echo "  3. Open terminal (Super+Return) to see your new setup"
    echo
    _log "Key bindings:"
    echo "  Super+Return: Terminal (Foot with Fish shell)"
    echo "  Super+Q: Close window"
    echo "  Super+Space: App launcher"
    echo "  Super+Shift+S: Screenshot"
    echo
    _log "Terminal features:"
    echo "  • Fish shell with autosuggestions"
    echo "  • Starship prompt with git integration"
    echo "  • Fastfetch with ATEON ASCII art"
    echo "  • JetBrains Mono Nerd Font"
    echo
    _log "Configuration backups: $BACKUPS_ROOT"
    _log "Use './install.sh --list-backups' to see available backups"
}

list_backups() {
    _log "Available backups:"
    
    if [[ ! -d "$BACKUPS_ROOT" ]]; then
        echo "  No backups found"
        return 0
    fi
    
    local count=0
    while read -r backup_dir; do
        if [[ -d "$backup_dir" ]]; then
            local timestamp=$(basename "$backup_dir")
            local date_part=${timestamp%_*}
            local time_part=${timestamp#*_}
            local formatted="${date_part:0:4}-${date_part:4:2}-${date_part:6:2} ${time_part:0:2}:${time_part:2:2}:${time_part:4:2}"
            
            # Show what's in the backup
            local backup_contents=()
            for config_def in "${CONFIG_MAPPINGS[@]}"; do
                IFS=':' read -r config_name _ _ _ _ <<< "$config_def"
                [[ -e "$backup_dir/$(basename "${config_name}")" ]] && backup_contents+=("$(basename "${config_name}")")
            done
            
            echo "  $formatted (${#backup_contents[@]} configs: ${backup_contents[*]})"
            ((count++))
        fi
    done < <(find "$BACKUPS_ROOT" -maxdepth 1 -type d -name "????????_??????" | sort -r | head -10)
    
    [[ $count -eq 0 ]] && echo "  No backups found"
    [[ $count -eq 10 ]] && echo "  (showing 10 most recent)"
}

restore_backup() {
    local timestamp="$1"
    local backup_path="$BACKUPS_ROOT/$timestamp"
    
    if [[ ! -d "$backup_path" ]]; then
        _err "Backup not found: $timestamp"
        return 1
    fi
    
    _log "Restoring from backup: $timestamp"
    
    # Show available configs in backup
    local available_configs=()
    for config_def in "${CONFIG_MAPPINGS[@]}"; do
        IFS=':' read -r config_name dest_path display_name _ _ <<< "$config_def"
        local backup_config="$backup_path/$(basename "$config_name")"
        [[ -e "$backup_config" ]] && available_configs+=("$config_name:$dest_path:$display_name")
    done
    
    # Check for utilities
    [[ -e "$backup_path/gitdraw" ]] && available_configs+=("gitdraw:$BIN_DEST/gitdraw:GitDraw utility")
    
    if [[ ${#available_configs[@]} -eq 0 ]]; then
        _err "No configurations found in backup"
        return 1
    fi
    
    _log "Found ${#available_configs[@]} configurations in backup"
    confirm_action "Restore all configurations from backup?" "true" || return 0
    
    local restored=0
    for config_def in "${available_configs[@]}"; do
        IFS=':' read -r config_name dest_path display_name <<< "$config_def"
        local backup_item="$backup_path/$(basename "$config_name")"
        
        [[ -e "$dest_path" ]] && backup_if_exists "$dest_path" "$(basename "$config_name")"
        
        _log "Restoring $display_name..."
        [[ -e "$dest_path" ]] && rm -rf "$dest_path"
        mkdir -p "$(dirname "$dest_path")"
        
        if cp -a "$backup_item" "$dest_path"; then
            [[ "$config_name" =~ gitdraw ]] && chmod +x "$dest_path"
            ((restored++))
        else
            _err "Failed to restore $display_name"
        fi
    done
    
    _log "Restored $restored configurations from backup"
    _log "Restart your session to apply changes"
    return 0
}

show_help() {
    cat << 'EOF'
ATEON Desktop Environment Installer

USAGE:
    ./install.sh [OPTIONS]

OPTIONS:
    --update              Update configs only (skip packages)
    --restore TIMESTAMP   Restore from backup
    --list-backups        Show available backups  
    --dry-run            Preview changes without making them
    --force              Skip all confirmations (use grouped mode)
    --help               Show this help

EXAMPLES:
    ./install.sh                    # Full interactive install
    ./install.sh --dry-run          # Preview installation
    ./install.sh --update           # Update configs only
    ./install.sh --list-backups     # Show available backups
    ./install.sh --restore 20240101_120000

CONFIGURATION GROUPS:
    Desktop Environment:
    • Hyprland compositor configuration
    • AGS shell with widgets and panels
    • Matugen theming integration
    
    Terminal Setup:
    • Foot terminal with transparency
    • Fish shell with autosuggestions  
    • Starship prompt with git integration
    • Fastfetch with ATEON ASCII art

REQUIREMENTS:
    • Arch Linux or derivative
    • ~1.5GB free space
    • Internet connection for packages
    • Run from ATEON repository root directory
EOF
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dry-run) DRY_RUN=true ;;
            --force) FORCE=true ;;
            --list-backups) list_backups; exit 0 ;;
            --restore) ACTION="restore"; shift; RESTORE_TARGET="${1:-}" ;;
            --update) ACTION="update" ;;
            --help|-h) show_help; exit 0 ;;
            *) _err "Unknown option: $1"; show_help; exit 1 ;;
        esac
        shift
    done
}

cleanup() {
    local exit_code=$?
    [[ -n "${tmpdir:-}" && -d "$tmpdir" ]] && rm -rf "$tmpdir"
    exit $exit_code
}

main() {
    trap cleanup EXIT
    trap 'echo; _warn "Interrupted by user"; exit 130' INT TERM
    
    echo
    _log "🚀 ATEON Desktop Environment Installer"
    echo
    
    parse_arguments "$@"
    ACTION="${ACTION:-install}"
    
    mkdir -p "$BACKUPS_ROOT"
    validate_system || exit 1
    
    [[ "$DRY_RUN" == true ]] && _log "DRY RUN MODE - No changes will be made"
    
    case "$ACTION" in
        install)
            install_packages || exit 1
            install_configs || exit 1
            install_utilities
            show_completion
            ;;
        update)
            _log "Updating configurations only..."
            install_configs || exit 1
            install_utilities
            _log "Configuration update completed"
            _log "Restart your Hyprland session to apply changes"
            ;;
        restore)
            [[ -z "$RESTORE_TARGET" ]] && { _err "Restore target timestamp required"; exit 1; }
            restore_backup "$RESTORE_TARGET"
            ;;
        *) _err "Unknown action: $ACTION"; exit 1 ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi