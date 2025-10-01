#!/usr/bin/env bash
set -euo pipefail

# Configuration
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
MAX_BACKUPS=3

# Options
FORCE=false
ACTION=""
RESTORE_TARGET=""
TEMPLATE_MODE="merge"  # merge, overwrite, skip

# Package groups
CORE_PKGS=(
    hyprland aylurs-gtk-shell-git matugen-bin
    libastal-{hyprland,tray,notifd,apps,wireplumber,mpris,network,bluetooth,cava,battery,powerprofiles}-git
    libgtop dart-sass imagemagick adwaita-icon-theme libadwaita
    ttf-jetbrains-mono-nerd ttf-firacode-nerd ttf-material-symbols-variable-git
    hyprpaper polkit-gnome glib-networking libsoup3 resources
)

TERMINAL_PKGS=(
    foot fish starship fastfetch wl-clipboard clipvault
)

UTIL_PKGS=(
    hyprshot swappy grim slurp hyprpicker brightnessctl playerctl
    pipewire pipewire-pulse wireplumber firefox nautilus code
    normcap python-zxing-cpp tesseract tesseract-data-eng
    python-pytesseract pyside6 pavucontrol
)

REQUIRED_DEPS=(git curl systemctl)

# Config mappings: "source:dest:display_name:handler"
CONFIG_MAPPINGS=(
    "hypr:$HYPR_DEST:Hyprland:standard"
    "ags:$AGS_DEST:AGS:ags_templates"
    "matugen:$MATUGEN_DEST:Matugen:matugen_templates"
    "foot:$FOOT_DEST:Foot:standard"
    "fish:$FISH_DEST:Fish:standard"
    "starship.toml:$STARSHIP_DEST:Starship:standard"
    "fastfetch:$FASTFETCH_DEST:Fastfetch:standard"
)

# Logging
_log() { echo -e "\033[1;32m►\033[0m $*"; }
_warn() { echo -e "\033[1;33m⚠\033[0m $*" >&2; }
_err() { echo -e "\033[1;31m✗\033[0m $*" >&2; }
_success() { echo -e "\033[1;32m✓\033[0m $*"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }
is_arch_based() { [[ -f /etc/arch-release ]] || command_exists pacman; }

confirm() {
    [[ "$FORCE" == true ]] && return 0
    read -rp "$1 [y/N]: " ans
    [[ "$ans" =~ ^[Yy]$ ]]
}

# Progress spinner
spinner() {
    local pid=$1
    local message=$2
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    
    while kill -0 "$pid" 2>/dev/null; do
        local temp=${spinstr#?}
        printf "\r\033[1;36m%s\033[0m %s" "${spinstr:0:1}" "$message"
        spinstr=$temp${spinstr%"$temp"}
        sleep $delay
    done
    
    wait "$pid"
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        printf "\r\033[1;32m✓\033[0m %s\n" "$message"
    else
        printf "\r\033[1;31m✗\033[0m %s\n" "$message"
    fi
    
    return $exit_code
}

validate_system() {
    _log "Validating system..."
    
    local missing_deps=()
    for cmd in "${REQUIRED_DEPS[@]}"; do
        command_exists "$cmd" || missing_deps+=("$cmd")
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        _err "Missing: ${missing_deps[*]}"
        _err "Install: sudo pacman -S ${missing_deps[*]}"
        return 1
    fi
    
    is_arch_based || { _err "Arch Linux required"; return 1; }
    
    # Verify we're in repo root
    local expected=("hypr" "ags" "foot" "fish")
    for config in "${expected[@]}"; do
        [[ ! -e "$SCRIPT_DIR/$config" ]] && {
            _err "Run from ATEON repository root"
            return 1
        }
    done
    
    local free_space=$(df "$USER_HOME" --output=avail -B1M | tail -n1 | tr -d ' ')
    if [[ $free_space -lt 1500 ]]; then
        _warn "Low disk space: ${free_space}MB (need 1.5GB+)"
        confirm "Continue?" || return 1
    fi
    
    _success "System validated"
    return 0
}

cleanup_old_backups() {
    [[ ! -d "$BACKUPS_ROOT" ]] && return 0
    
    local backup_count=$(find "$BACKUPS_ROOT" -maxdepth 1 -type d -name "????????_??????" | wc -l)
    
    if [[ $backup_count -ge $MAX_BACKUPS ]]; then
        local to_delete=$((backup_count - MAX_BACKUPS + 1))
        _log "Removing $to_delete old backup(s)..."
        
        find "$BACKUPS_ROOT" -maxdepth 1 -type d -name "????????_??????" | \
            sort | head -n "$to_delete" | while read -r old_backup; do
            rm -rf "$old_backup"
            _log "Deleted: $(basename "$old_backup")"
        done
    fi
}

backup_configs() {
    local backup_needed=false
    
    for config_def in "${CONFIG_MAPPINGS[@]}"; do
        IFS=':' read -r _ dest_path _ _ <<< "$config_def"
        [[ -e "$dest_path" ]] && { backup_needed=true; break; }
    done
    
    [[ -e "$BIN_DEST/gitdraw" ]] && backup_needed=true
    
    if [[ "$backup_needed" == false ]]; then
        _log "No configs to backup"
        return 0
    fi
    
    cleanup_old_backups
    
    _log "Backing up configs..."
    mkdir -p "$BACKUP_DIR" || return 1
    
    local backed_up=0
    for config_def in "${CONFIG_MAPPINGS[@]}"; do
        IFS=':' read -r _ dest_path display_name _ <<< "$config_def"
        
        if [[ -e "$dest_path" ]]; then
            cp -a "$dest_path" "$BACKUP_DIR/$(basename "$dest_path")" 2>/dev/null && ((backed_up++))
        fi
    done
    
    [[ -e "$BIN_DEST/gitdraw" ]] && cp -a "$BIN_DEST/gitdraw" "$BACKUP_DIR/" 2>/dev/null && ((backed_up++))
    
    [[ $backed_up -gt 0 ]] && _success "Backed up $backed_up configs"
    return 0
}

get_file_checksum() {
    [[ -f "$1" ]] || return 1
    md5sum "$1" 2>/dev/null | cut -d' ' -f1
}

is_file_modified() {
    local dest="$1" src="$2"
    [[ ! -f "$dest" ]] && return 1
    [[ ! -f "$src" ]] && return 0
    
    local dest_sum=$(get_file_checksum "$dest")
    local src_sum=$(get_file_checksum "$src")
    [[ "$dest_sum" != "$src_sum" ]]
}

install_templates() {
    local src_dir="$1" dest_dir="$2" name="$3"
    
    [[ ! -d "$src_dir" ]] && return 0
    
    if [[ ! -d "$dest_dir" ]]; then
        mkdir -p "$dest_dir"
        cp -a "$src_dir"/* "$dest_dir/" 2>/dev/null
        _success "Installed $name templates"
        return 0
    fi
    
    # Analyze templates
    local new_templates=() modified_templates=() unmodified_templates=()
    
    while IFS= read -r -d '' src_template; do
        local tname=$(basename "$src_template")
        local dest_template="$dest_dir/$tname"
        
        if [[ ! -e "$dest_template" ]]; then
            new_templates+=("$tname")
        elif is_file_modified "$dest_template" "$src_template"; then
            modified_templates+=("$tname")
        else
            unmodified_templates+=("$tname")
        fi
    done < <(find "$src_dir" -type f -print0)
    
    # Handle based on mode
    case "$TEMPLATE_MODE" in
        merge)
            # Add new
            for t in "${new_templates[@]}"; do
                cp -a "$src_dir/$t" "$dest_dir/" 2>/dev/null
            done
            # Update unmodified
            for t in "${unmodified_templates[@]}"; do
                cp -a "$src_dir/$t" "$dest_dir/" 2>/dev/null
            done
            [[ ${#new_templates[@]} -gt 0 ]] && _success "Added ${#new_templates[@]} new template(s)"
            [[ ${#modified_templates[@]} -gt 0 ]] && _log "Preserved ${#modified_templates[@]} modified template(s)"
            ;;
        overwrite)
            rm -rf "$dest_dir"
            mkdir -p "$dest_dir"
            cp -a "$src_dir"/* "$dest_dir/" 2>/dev/null
            _success "Overwrote all $name templates"
            ;;
        skip)
            _log "Skipped $name templates"
            ;;
    esac
    
    return 0
}

install_ags_templates() {
    local src="$1" dest="$2"
    
    # Backup templates
    local temp_templates=""
    if [[ -d "$dest/matugen/templates" ]]; then
        temp_templates=$(mktemp -d)
        cp -a "$dest/matugen/templates" "$temp_templates/" 2>/dev/null
    fi
    
    # Install AGS
    [[ -e "$dest" ]] && rm -rf "$dest"
    mkdir -p "$dest"
    cp -a "$src"/* "$dest/" 2>/dev/null || return 1
    
    # Smart template handling
    local src_templates="$src/matugen/templates"
    local dest_templates="$dest/matugen/templates"
    
    if [[ -n "$temp_templates" && -d "$temp_templates/templates" ]]; then
        mkdir -p "$dest_templates.backup"
        cp -a "$temp_templates/templates"/* "$dest_templates.backup/" 2>/dev/null
        install_templates "$src_templates" "$dest_templates" "AGS"
        rm -rf "$temp_templates" "$dest_templates.backup"
    else
        install_templates "$src_templates" "$dest_templates" "AGS"
    fi
    
    return 0
}

install_matugen_templates() {
    local src="$1" dest="$2"
    
    mkdir -p "$dest"
    find "$src" -mindepth 1 -maxdepth 1 ! -name "templates" -exec cp -a {} "$dest/" \; 2>/dev/null
    
    install_templates "$src/templates" "$dest/templates" "Matugen"
    return 0
}

install_single_config() {
    local src="$1" dest="$2" name="$3" handler="$4"
    
    [[ ! -e "$src" ]] && { _warn "$name source not found"; return 1; }
    
    case "$handler" in
        ags_templates)
            install_ags_templates "$src" "$dest"
            return $?
            ;;
        matugen_templates)
            install_matugen_templates "$src" "$dest"
            return $?
            ;;
    esac
    
    # Standard install
    [[ -e "$dest" ]] && rm -rf "$dest"
    mkdir -p "$(dirname "$dest")"
    
    if [[ -d "$src" ]]; then
        mkdir -p "$dest"
        cp -a "$src"/* "$dest/" 2>/dev/null || return 1
    else
        cp -a "$src" "$dest" 2>/dev/null || return 1
    fi
    
    return 0
}

install_yay() {
    command_exists yay && return 0
    
    {
        sudo pacman -Sy --needed --noconfirm git base-devel
        local tmpdir=$(mktemp -d)
        git clone https://aur.archlinux.org/yay.git "$tmpdir" 2>&1
        (cd "$tmpdir" && makepkg -si --noconfirm) 2>&1
        rm -rf "$tmpdir"
    } >/dev/null 2>&1 &
    
    spinner $! "Installing yay AUR helper"
}

install_packages() {
    local all_pkgs=("${CORE_PKGS[@]}" "${TERMINAL_PKGS[@]}" "${UTIL_PKGS[@]}")
    local installed=0
    
    for pkg in "${all_pkgs[@]}"; do
        yay -Qi "$pkg" >/dev/null 2>&1 && ((installed++))
    done 2>/dev/null || true
    
    local missing=$((${#all_pkgs[@]} - installed))
    
    if [[ $missing -eq 0 ]]; then
        _success "All packages installed"
        return 0
    fi
    
    _log "Need to install $missing packages (~800MB)"
    confirm "Continue?" || { _log "Skipped packages"; return 0; }
    
    install_yay || return 1
    
    _log "Installing core packages..."
    {
        for pkg in "${CORE_PKGS[@]}"; do
            yay -Qi "$pkg" >/dev/null 2>&1 || yay -S --needed --noconfirm "$pkg" 2>&1
        done
    } >/dev/null 2>&1 &
    spinner $! "Installing core desktop packages"
    
    _log "Installing terminal packages..."
    {
        for pkg in "${TERMINAL_PKGS[@]}"; do
            yay -Qi "$pkg" >/dev/null 2>&1 || yay -S --needed --noconfirm "$pkg" 2>&1
        done
    } >/dev/null 2>&1 &
    spinner $! "Installing terminal packages"
    
    _log "Installing utilities..."
    {
        for pkg in "${UTIL_PKGS[@]}"; do
            yay -Qi "$pkg" >/dev/null 2>&1 || yay -S --needed --noconfirm "$pkg" 2>&1
        done
    } >/dev/null 2>&1 &
    spinner $! "Installing utility packages"
    
    # Configure services
    _log "Configuring services..."
    for service in pipewire pipewire-pulse wireplumber; do
        systemctl --user enable --now "$service" 2>/dev/null || true
    done
    
    if command_exists fish && [[ "$SHELL" != */fish ]]; then
        if confirm "Set Fish as default shell?"; then
            chsh -s "$(which fish)" || _warn "Failed to set Fish"
        fi
    fi
    
    _success "Package installation complete"
    return 0
}

choose_install_mode() {
    [[ "$FORCE" == true ]] && { INSTALL_MODE="grouped"; return 0; }
    
    echo
    _log "Installation mode:"
    echo "  1. Grouped (Desktop + Terminal - recommended)"
    echo "  2. Individual (choose each config)"
    echo
    
    while true; do
        read -rp "Choose [1-2]: " choice
        case "$choice" in
            1|"") INSTALL_MODE="grouped"; break ;;
            2) INSTALL_MODE="individual"; break ;;
            *) _warn "Enter 1 or 2" ;;
        esac
    done
}

install_configs() {
    backup_configs || { _err "Backup failed"; return 1; }
    
    choose_install_mode
    
    local installed=0 failed=0
    
    case "$INSTALL_MODE" in
        grouped)
            _log "Installing all configurations..."
            for config_def in "${CONFIG_MAPPINGS[@]}"; do
                IFS=':' read -r config_name dest_path display_name handler <<< "$config_def"
                local src_path="$SCRIPT_DIR/$config_name"
                
                if install_single_config "$src_path" "$dest_path" "$display_name" "$handler"; then
                    _success "$display_name installed"
                    ((installed++))
                else
                    _err "$display_name failed"
                    ((failed++))
                fi
            done
            ;;
            
        individual)
            _log "Individual installation:"
            for config_def in "${CONFIG_MAPPINGS[@]}"; do
                IFS=':' read -r config_name dest_path display_name handler <<< "$config_def"
                local src_path="$SCRIPT_DIR/$config_name"
                
                if confirm "Install $display_name?"; then
                    if install_single_config "$src_path" "$dest_path" "$display_name" "$handler"; then
                        _success "$display_name installed"
                        ((installed++))
                    else
                        _err "$display_name failed"
                        ((failed++))
                    fi
                else
                    echo "  Skipped $display_name"
                fi
            done
            ;;
    esac
    
    echo
    _log "Installed: $installed | Failed: $failed"
    return 0
}

install_utilities() {
    local gitdraw_src="$SCRIPT_DIR/scripts/GitDraw.sh"
    local gitdraw_dest="$BIN_DEST/gitdraw"
    
    if [[ -f "$gitdraw_src" ]]; then
        mkdir -p "$BIN_DEST"
        if cp "$gitdraw_src" "$gitdraw_dest" && chmod +x "$gitdraw_dest"; then
            _success "GitDraw utility installed"
        fi
    fi
}

show_completion() {
    echo
    echo -e "\033[1;32m╔════════════════════════════════════════════╗\033[0m"
    echo -e "\033[1;32m║  🎉 ATEON Installation Complete!           ║\033[0m"
    echo -e "\033[1;32m╚════════════════════════════════════════════╝\033[0m"
    echo
    _log "Next steps:"
    echo "  1. Log out and select Hyprland"
    echo "  2. Press Super+Return for terminal"
    echo
    _log "Key bindings:"
    echo "  Super+Return  → Terminal"
    echo "  Super+Q       → Close window"
    echo "  Super+Space   → App launcher"
    echo "  Super+Shift+S → Screenshot"
    echo
    _log "Backups: $BACKUPS_ROOT"
    echo
}

list_backups() {
    _log "Available backups (max $MAX_BACKUPS kept):"
    
    [[ ! -d "$BACKUPS_ROOT" ]] && { echo "  None"; return 0; }
    
    find "$BACKUPS_ROOT" -maxdepth 1 -type d -name "????????_??????" | sort -r | while read -r backup; do
        local ts=$(basename "$backup")
        local date="${ts:0:4}-${ts:4:2}-${ts:6:2} ${ts:9:2}:${ts:11:2}:${ts:13:2}"
        local count=$(find "$backup" -mindepth 1 | wc -l)
        echo "  $date ($count items)"
    done
}

restore_backup() {
    local ts="$1"
    local backup_path="$BACKUPS_ROOT/$ts"
    
    [[ ! -d "$backup_path" ]] && { _err "Backup not found: $ts"; return 1; }
    
    _log "Restoring from: $ts"
    confirm "Continue?" || return 0
    
    backup_configs
    
    local restored=0
    for item in "$backup_path"/*; do
        [[ ! -e "$item" ]] && continue
        
        local name=$(basename "$item")
        local dest=""
        
        case "$name" in
            hypr) dest="$HYPR_DEST" ;;
            ags) dest="$AGS_DEST" ;;
            matugen) dest="$MATUGEN_DEST" ;;
            foot) dest="$FOOT_DEST" ;;
            fish) dest="$FISH_DEST" ;;
            starship.toml) dest="$STARSHIP_DEST" ;;
            fastfetch) dest="$FASTFETCH_DEST" ;;
            gitdraw) dest="$BIN_DEST/gitdraw" ;;
            *) continue ;;
        esac
        
        [[ -e "$dest" ]] && rm -rf "$dest"
        mkdir -p "$(dirname "$dest")"
        
        if [[ -d "$item" ]]; then
            mkdir -p "$dest"
            cp -a "$item"/* "$dest/" 2>/dev/null && ((restored++))
        else
            cp -a "$item" "$dest" 2>/dev/null && ((restored++))
        fi
    done
    
    _success "Restored $restored configs"
    _log "Restart Hyprland to apply"
}

show_help() {
    cat << 'EOF'
ATEON Desktop Environment Installer

USAGE:
    ./install.sh [OPTIONS]

OPTIONS:
    --update                Update configs only (skip packages)
    --restore TIMESTAMP     Restore from backup
    --list-backups          Show available backups
    --template-mode MODE    merge (default) | overwrite | skip
    --force                 Skip confirmations
    --help                  Show this help

EXAMPLES:
    ./install.sh                              # Full install
    ./install.sh --update                     # Update configs
    ./install.sh --update --template-mode merge
    ./install.sh --list-backups
    ./install.sh --restore 20240101_120000

FEATURES:
    • Smart template preservation (keeps your edits)
    • Auto-cleanup (keeps last 3 backups)
    • Progress indicators
    • Grouped package installation

REQUIREMENTS:
    • Arch Linux
    • ~1.5GB free space
    • Run from ATEON repo root
EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --force) FORCE=true ;;
            --list-backups) list_backups; exit 0 ;;
            --restore) ACTION="restore"; shift; RESTORE_TARGET="${1:-}" ;;
            --update) ACTION="update" ;;
            --template-mode) shift; TEMPLATE_MODE="${1:-merge}" ;;
            --help|-h) show_help; exit 0 ;;
            *) _err "Unknown: $1"; show_help; exit 1 ;;
        esac
        shift
    done
}

main() {
    trap 'echo; _warn "Interrupted"; exit 130' INT TERM
    
    echo
    echo -e "\033[1;36m🚀 ATEON Desktop Environment Installer\033[0m"
    echo
    
    parse_args "$@"
    ACTION="${ACTION:-install}"
    
    mkdir -p "$BACKUPS_ROOT"
    validate_system || exit 1
    
    case "$ACTION" in
        install)
            install_packages || exit 1
            install_configs || exit 1
            install_utilities
            show_completion
            ;;
        update)
            _log "Updating configs..."
            install_configs || exit 1
            install_utilities
            _success "Update complete - restart Hyprland"
            ;;
        restore)
            [[ -z "$RESTORE_TARGET" ]] && { _err "Timestamp required"; exit 1; }
            restore_backup "$RESTORE_TARGET"
            ;;
    esac
}

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && main "$@"