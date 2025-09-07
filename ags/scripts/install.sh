#!/bin/bash
set -euo pipefail

repo="https://github.com/Youwes09/Ateon.git"
ags_dest="$HOME/.config/ags"
hypr_dest="$HOME/.config/hypr"

# --- Helpers ---
command_exists() { command -v "$1" >/dev/null 2>&1; }
is_arch_based() { [ -f /etc/arch-release ] || command_exists pacman; }

# --- Package lists ---
CORE_PKGS=(
    hyprland
    aylurs-gtk-shell-git
    libastal-hyprland-git
    libastal-tray-git
    libastal-notifd-git
    libastal-apps-git
    libastal-wireplumber-git
    libastal-mpris-git
    libastal-network-git
    libastal-bluetooth-git
    libastal-cava-git
    libastal-battery-git
    libastal-powerprofiles-git
    matugen-bin
    libgtop
    coreutils
    dart-sass
    imagemagick
    networkmanager
    wireplumber
    adwaita-icon-theme
    ttf-firacode-nerd
    ttf-material-symbols-variable-git
    hyprpaper
)

EXTRA_PKGS=(
    hyprshot
    swappy
    grim
    slurp
    wl-clipboard
)

# --- Install yay if missing ---
install_yay() {
    if ! command_exists yay; then
        echo "📥 Installing yay..."
        sudo pacman -Sy --needed --noconfirm git base-devel
        tmpdir=$(mktemp -d)
        git clone https://aur.archlinux.org/yay.git "$tmpdir"
        pushd "$tmpdir"
        makepkg -si --noconfirm
        popd
        rm -rf "$tmpdir"
    fi
}

# --- Install packages ---
install_packages() {
    if ! is_arch_based; then
        echo "⚠️ Only Arch-based distros supported. Install packages manually."
        exit 1
    fi

    install_yay

    echo "📦 Installing core packages..."
    yay -S --needed --noconfirm "${CORE_PKGS[@]}"

    echo "📦 Installing extra packages..."
    yay -S --needed --noconfirm "${EXTRA_PKGS[@]}"
}

# --- Clone Ateon repo into tmp and copy configs ---
setup_configs() {
    tmp_dir=$(mktemp -d)
    echo "📥 Cloning Ateon repo..."
    git clone --depth 1 "$repo" "$tmp_dir"

    echo "📂 Installing configs..."
    mkdir -p "$ags_dest" "$hypr_dest"
    cp -r "$tmp_dir/ags/." "$ags_dest/"
    cp -r "$tmp_dir/hypr/." "$hypr_dest/"

    rm -rf "$tmp_dir"
    echo "✔️ Configs installed to ~/.config/ags and ~/.config/hypr"
}

# --- Setup matugen config ---
setup_matugen() {
    local matugen_config_dir="$HOME/.config/matugen"
    local matugen_config_file="$matugen_config_dir/config.toml"

    mkdir -p "$matugen_config_dir"

    if [ ! -f "$matugen_config_file" ]; then
        echo "⚙️ Writing matugen configuration..."
        cat > "$matugen_config_file" << 'EOF'
[templates.ags]
input_path = "~/.config/ags/matugen/templates/ags.scss"
output_path = "~/.config/ags/style/abstracts/_variables.scss"

[templates.hypr]
input_path = "~/.config/ags/matugen/templates/hyprland_colors.conf"
output_path = "~/.config/hypr/hyprland_colors.conf"
EOF
    else
        echo "✔️ Matugen config already exists"
    fi
}

# --- Run all steps ---
install_packages
setup_configs
setup_matugen

echo "✅ Ateon (Hyprland + AGS) environment ready."
echo "👉 Start AGS with: ags run"
