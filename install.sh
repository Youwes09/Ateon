#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# ATEON Desktop Environment - First Install Only
# ============================================================================

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

# Package groups
DESKTOP_PKGS=(
    hyprland aylurs-gtk-shell-git matugen-bin
    libastal-hyprland-git libastal-tray-git libastal-notifd-git
    libastal-apps-git libastal-wireplumber-git libastal-mpris-git
    libastal-network-git libastal-bluetooth-git libastal-cava-git
    libastal-battery-git libastal-powerprofiles-git
    libgtop dart-sass imagemagick adwaita-icon-theme libadwaita
    ttf-jetbrains-mono-nerd ttf-firacode-nerd ttf-material-symbols-variable-git
    hyprpaper polkit-gnome glib-networking apple-fonts libsoup3 resources
)

TERMINAL_PKGS=(
    foot fish starship fastfetch wl-clipboard clipvault
)

UTILITY_PKGS=(
    hyprshot swappy grim slurp hyprpicker brightnessctl playerctl
    pipewire pipewire-pulse wireplumber firefox nautilus code
    normcap python-zxing-cpp tesseract tesseract-data-eng
    python-pytesseract pyside6 pavucontrol
)

# Config mappings: "source:dest:display_name"
CONFIG_MAPPINGS=(
    "hypr:$HYPR_DEST:Hyprland"
    "ags:$AGS_DEST:AGS"
    "matugen:$MATUGEN_DEST:Matugen"
    "foot:$FOOT_DEST:Foot"
    "fish:$FISH_DEST:Fish"
    "starship.toml:$STARSHIP_DEST:Starship"
    "fastfetch:$FASTFETCH_DEST:Fastfetch"
)

# ============================================================================
# Utilities
# ============================================================================

_log() { echo -e "\033[1;36m▸\033[0m $*"; }
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

# Simple progress display
show_progress() {
    local current=$1
    local total=$2
    local pkg_name=$3
    local percentage=$((current * 100 / total))
    
    printf "\r  \033[1;36m[%d/%d]\033[0m %3d%% - Installing: %-30s" "$current" "$total" "$percentage" "$pkg_name"
}

# ============================================================================
# System Validation
# ============================================================================

validate_system() {
    _log "Validating system..."
    
    # Check Arch Linux
    if ! is_arch_based; then
        _err "This installer requires Arch Linux"
        return 1
    fi
    
    # Check required commands
    local missing_deps=()
    for cmd in git curl systemctl rsync; do
        command_exists "$cmd" || missing_deps+=("$cmd")
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        _err "Missing required commands: ${missing_deps[*]}"
        _err "Install with: sudo pacman -S ${missing_deps[*]}"
        return 1
    fi
    
    # Verify repo structure
    local expected=("hypr" "ags" "foot" "fish" "matugen")
    for config in "${expected[@]}"; do
        if [[ ! -e "$SCRIPT_DIR/$config" ]]; then
            _err "Missing config directory: $config"
            _err "Please run this script from the ATEON repository root"
            return 1
        fi
    done
    
    # Check disk space (need ~1.5GB)
    local free_space=$(df "$USER_HOME" --output=avail -B1M | tail -n1 | tr -d ' ')
    if [[ $free_space -lt 1500 ]]; then
        _warn "Low disk space: ${free_space}MB available (need 1.5GB+)"
        confirm "Continue anyway?" || return 1
    fi
    
    _success "System validation passed"
    return 0
}

# ============================================================================
# Backup System
# ============================================================================

cleanup_old_backups() {
    [[ ! -d "$BACKUPS_ROOT" ]] && return 0
    
    local backup_count=$(find "$BACKUPS_ROOT" -maxdepth 1 -type d -name "????????_??????" 2>/dev/null | wc -l)
    
    if [[ $backup_count -ge $MAX_BACKUPS ]]; then
        local to_delete=$((backup_count - MAX_BACKUPS + 1))
        _log "Cleaning up old backups..."
        
        find "$BACKUPS_ROOT" -maxdepth 1 -type d -name "????????_??????" 2>/dev/null | \
            sort | head -n "$to_delete" | while read -r old_backup; do
            rm -rf "$old_backup"
        done
    fi
}

backup_configs() {
    local backup_needed=false
    
    # Check if any configs exist
    for config_def in "${CONFIG_MAPPINGS[@]}"; do
        IFS=':' read -r _ dest_path _ <<< "$config_def"
        if [[ -e "$dest_path" ]]; then
            backup_needed=true
            break
        fi
    done
    
    [[ -e "$BIN_DEST/gitdraw" ]] && backup_needed=true
    
    if [[ "$backup_needed" == false ]]; then
        _log "No existing configs to backup"
        return 0
    fi
    
    _log "Backing up existing configs..."
    cleanup_old_backups
    mkdir -p "$BACKUP_DIR" || return 1
    
    local backed_up=0
    for config_def in "${CONFIG_MAPPINGS[@]}"; do
        IFS=':' read -r _ dest_path display_name <<< "$config_def"
        
        if [[ -e "$dest_path" ]]; then
            local backup_name=$(basename "$dest_path")
            if cp -a "$dest_path" "$BACKUP_DIR/$backup_name" 2>/dev/null; then
                ((backed_up++))
            fi
        fi
    done
    
    # Backup utilities
    if [[ -e "$BIN_DEST/gitdraw" ]]; then
        cp -a "$BIN_DEST/gitdraw" "$BACKUP_DIR/" 2>/dev/null && ((backed_up++))
    fi
    
    if [[ $backed_up -gt 0 ]]; then
        _success "Backed up $backed_up items to: $BACKUP_DIR"
    fi
    
    return 0
}

# ============================================================================
# Package Installation
# ============================================================================

install_yay() {
    if command_exists yay; then
        _success "yay already installed"
        return 0
    fi
    
    _log "Installing yay AUR helper..."
    
    # Install dependencies
    if ! sudo pacman -Sy --needed --noconfirm git base-devel >/dev/null 2>&1; then
        _err "Failed to install yay dependencies"
        return 1
    fi
    
    # Clone and build yay
    local tmpdir=$(mktemp -d)
    if ! git clone https://aur.archlinux.org/yay.git "$tmpdir" >/dev/null 2>&1; then
        _err "Failed to clone yay repository"
        rm -rf "$tmpdir"
        return 1
    fi
    
    if ! (cd "$tmpdir" && makepkg -si --noconfirm) >/dev/null 2>&1; then
        _err "Failed to build yay"
        rm -rf "$tmpdir"
        return 1
    fi
    
    rm -rf "$tmpdir"
    _success "yay installed"
    return 0
}

install_package_group() {
    local group_name="$1"
    shift
    local packages=("$@")
    
    # Count installed vs missing
    local installed=0
    local missing=()
    
    for pkg in "${packages[@]}"; do
        if yay -Qi "$pkg" >/dev/null 2>&1; then
            ((installed++))
        else
            missing+=("$pkg")
        fi
    done
    
    if [[ ${#missing[@]} -eq 0 ]]; then
        _success "$group_name: All ${#packages[@]} packages already installed"
        return 0
    fi
    
    _log "$group_name: Installing ${#missing[@]}/${#packages[@]} packages..."
    
    # Show progress during install
    local total=${#missing[@]}
    local current=0
    
    for pkg in "${missing[@]}"; do
        ((current++))
        show_progress "$current" "$total" "$pkg"
        
        if ! yay -S --needed --noconfirm "$pkg" >/dev/null 2>&1; then
            echo
            _warn "Failed to install: $pkg (continuing...)"
        fi
    done
    
    echo
    _success "$group_name: Installation complete"
    return 0
}

install_packages() {
    echo
    _log "Package Installation"
    echo "  1. Desktop Environment (${#DESKTOP_PKGS[@]} packages, ~600MB)"
    echo "  2. Terminal Tools (${#TERMINAL_PKGS[@]} packages, ~50MB)"
    echo "  3. Utilities (${#UTILITY_PKGS[@]} packages, ~150MB)"
    echo
    
    if ! confirm "Install all packages?"; then
        _log "Skipping package installation"
        return 0
    fi
    
    # Install yay first
    install_yay || return 1
    
    # Install groups with progress
    install_package_group "Desktop" "${DESKTOP_PKGS[@]}" || return 1
    install_package_group "Terminal" "${TERMINAL_PKGS[@]}" || return 1
    install_package_group "Utilities" "${UTILITY_PKGS[@]}" || return 1
    
    # Enable services
    _log "Configuring audio services..."
    for service in pipewire pipewire-pulse wireplumber; do
        systemctl --user enable --now "$service" 2>/dev/null || true
    done
    
    # Offer to set Fish as default shell
    if command_exists fish && [[ "$SHELL" != */fish ]]; then
        if confirm "Set Fish as default shell?"; then
            if chsh -s "$(which fish)"; then
                _success "Fish set as default shell"
            else
                _warn "Failed to set Fish as default shell"
            fi
        fi
    fi
    
    _success "Package installation complete"
    return 0
}

# ============================================================================
# Config Installation
# ============================================================================

install_single_config() {
    local src="$1"
    local dest="$2"
    local name="$3"
    
    if [[ ! -e "$src" ]]; then
        _warn "$name source not found: $src"
        return 1
    fi
    
    # Remove existing destination
    if [[ -e "$dest" ]]; then
        rm -rf "$dest" || return 1
    fi
    
    # Create parent directory
    mkdir -p "$(dirname "$dest")" || return 1
    
    # Copy with rsync for better handling
    if [[ -d "$src" ]]; then
        mkdir -p "$dest"
        if rsync -a "$src/" "$dest/" 2>/dev/null; then
            return 0
        fi
    else
        if rsync -a "$src" "$dest" 2>/dev/null; then
            return 0
        fi
    fi
    
    return 1
}

install_configs() {
    echo
    _log "Configuration Installation"
    
    # Backup existing configs
    backup_configs || {
        _err "Backup failed"
        return 1
    }
    
    # Install mode selection
    local install_mode="grouped"
    if [[ "$FORCE" != true ]]; then
        echo
        echo "  1. Install all configs (recommended)"
        echo "  2. Choose per component"
        echo
        read -rp "Select [1-2]: " choice
        [[ "$choice" == "2" ]] && install_mode="individual"
    fi
    
    local installed=0
    local failed=0
    local skipped=0
    
    echo
    case "$install_mode" in
        grouped)
            _log "Installing all configurations..."
            for config_def in "${CONFIG_MAPPINGS[@]}"; do
                IFS=':' read -r config_name dest_path display_name <<< "$config_def"
                local src_path="$SCRIPT_DIR/$config_name"
                
                if install_single_config "$src_path" "$dest_path" "$display_name"; then
                    _success "$display_name"
                    ((installed++))
                else
                    _err "$display_name failed"
                    ((failed++))
                fi
            done
            ;;
            
        individual)
            for config_def in "${CONFIG_MAPPINGS[@]}"; do
                IFS=':' read -r config_name dest_path display_name <<< "$config_def"
                local src_path="$SCRIPT_DIR/$config_name"
                
                if confirm "Install $display_name?"; then
                    if install_single_config "$src_path" "$dest_path" "$display_name"; then
                        _success "$display_name"
                        ((installed++))
                    else
                        _err "$display_name failed"
                        ((failed++))
                    fi
                else
                    echo "  Skipped $display_name"
                    ((skipped++))
                fi
            done
            ;;
    esac
    
    echo
    _log "Results: $installed installed, $failed failed, $skipped skipped"
    
    [[ $failed -gt 0 ]] && return 1
    return 0
}

# ============================================================================
# Utilities Installation
# ============================================================================

install_utilities() {
    local gitdraw_src="$SCRIPT_DIR/scripts/GitDraw.sh"
    local gitdraw_dest="$BIN_DEST/gitdraw"
    
    if [[ ! -f "$gitdraw_src" ]]; then
        return 0
    fi
    
    _log "Installing utilities..."
    mkdir -p "$BIN_DEST"
    
    if cp "$gitdraw_src" "$gitdraw_dest" && chmod +x "$gitdraw_dest"; then
        _success "GitDraw utility installed to ~/.local/bin"
    else
        _warn "Failed to install GitDraw"
    fi
}

# ============================================================================
# Completion
# ============================================================================

show_completion() {
    echo
    echo -e "\033[1;32m╔═══════════════════════════════════════════╗\033[0m"
    echo -e "\033[1;32m║  🎉 ATEON Installation Complete!         ║\033[0m"
    echo -e "\033[1;32m╚═══════════════════════════════════════════╝\033[0m"
    echo
    _log "Next steps:"
    echo "  1. Log out of your current session"
    echo "  2. Select 'Hyprland' from your display manager"
    echo "  3. Log in to start ATEON"
    echo
    _log "Key bindings:"
    echo "  Super + Return      → Terminal"
    echo "  Super + Q           → Close window"
    echo "  Super + Space       → App launcher"
    echo "  Super + Shift + S   → Screenshot"
    echo
    if [[ -d "$BACKUP_DIR" ]]; then
        _log "Backups saved to:"
        echo "  $BACKUP_DIR"
    fi
    echo
}

# ============================================================================
# Help
# ============================================================================

show_help() {
    cat << 'EOF'
ATEON Desktop Environment Installer

USAGE:
    ./install.sh [OPTIONS]

OPTIONS:
    --force     Skip all confirmations (auto-yes)
    --help      Show this help message

DESCRIPTION:
    First-time installer for the ATEON desktop environment.
    This script will:
      • Validate your Arch Linux system
      • Backup existing configs (keeps last 3 backups)
      • Install required packages via yay
      • Install configuration files
      • Set up utilities

REQUIREMENTS:
    • Arch Linux (or Arch-based distro)
    • ~1.5GB free disk space
    • Run from ATEON repository root

EXAMPLES:
    ./install.sh            # Interactive install
    ./install.sh --force    # Auto-install everything

NOTES:
    • Backups are stored in ~/.config/ateon_backups
    • Only the 3 most recent backups are kept
    • You'll need to log out and select Hyprland after install
EOF
}

# ============================================================================
# Main
# ============================================================================

main() {
    trap 'echo; _warn "Installation interrupted"; exit 130' INT TERM
    
    # Parse arguments
    for arg in "$@"; do
        case "$arg" in
            --force) FORCE=true ;;
            --help|-h) show_help; exit 0 ;;
            *) _err "Unknown option: $arg"; show_help; exit 1 ;;
        esac
    done
    
    # Header
    echo
    echo -e "\033[1;36m🚀 ATEON Desktop Environment Installer\033[0m"
    echo -e "\033[0;36m   First-time installation\033[0m"
    echo
    
    # Create backup directory
    mkdir -p "$BACKUPS_ROOT"
    
    # Validate system
    validate_system || exit 1
    
    # Install packages
    install_packages || exit 1
    
    # Install configs
    install_configs || exit 1
    
    # Install utilities
    install_utilities
    
    # Show completion
    show_completion
}

# Run if executed directly
[[ "${BASH_SOURCE[0]}" == "${0}" ]] && main "$@"