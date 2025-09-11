#!/bin/bash
set -euo pipefail

repo_url="https://github.com/Youwes09/Ateon.git"
ags_dest="$HOME/.config/ags"
hypr_dest="$HOME/.config/hypr"
matugen_dest="$HOME/.config/matugen"
bin_dest="$HOME/.local/bin"

# --- Detect repo root (works if script is in Ateon/) ---
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Helpers ---
command_exists() { command -v "$1" >/dev/null 2>&1; }
is_arch_based() { [ -f /etc/arch-release ] || command_exists pacman; }

CORE_PKGS=(
    hyprland aylurs-gtk-shell-git libastal-hyprland-git libastal-tray-git
    libastal-notifd-git libastal-apps-git libastal-wireplumber-git
    libastal-mpris-git libastal-network-git libastal-bluetooth-git
    libastal-cava-git libastal-battery-git libastal-powerprofiles-git
    matugen-bin libgtop coreutils dart-sass imagemagick networkmanager
    wireplumber adwaita-icon-theme libadwaita ttf-firacode-nerd ttf-material-symbols-variable-git
    hyprpaper
)

EXTRA_PKGS=( hyprshot swappy grim slurp wl-clipboard )

OCR_PKGS=( normcap python-zxing-cpp tesseract tesseract-data-eng
    leptonica python-pytesseract pyside6 shiboken6 )

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
        echo "⚠️ Only Arch-based distros supported."
        exit 1
    fi
    install_yay
    echo "📦 Installing packages..."
    yay -S --needed --noconfirm "${CORE_PKGS[@]}" "${EXTRA_PKGS[@]}" "${OCR_PKGS[@]}"
}

# --- Copy configs with overwrite prompt ---
copy_configs() {
    # AGS
    if [ -d "$ags_dest" ]; then
        read -rp "⚠️ ~/.config/ags exists. Overwrite? [y/N] " ans
        if [[ "$ans" =~ ^[Yy]$ ]]; then
            rm -rf "$ags_dest"
            cp -r "$script_dir/ags" "$ags_dest"
            echo "✔️ AGS configs overwritten."
        else
            echo "⏩ Skipped AGS configs."
        fi
    else
        cp -r "$script_dir/ags" "$ags_dest"
    fi

    # Hypr
    if [ -d "$hypr_dest" ]; then
        read -rp "⚠️ ~/.config/hypr exists. Overwrite? [y/N] " ans
        if [[ "$ans" =~ ^[Yy]$ ]]; then
            rm -rf "$hypr_dest"
            cp -r "$script_dir/hypr" "$hypr_dest"
            echo "✔️ Hypr configs overwritten."
        else
            echo "⏩ Skipped Hypr configs."
        fi
    else
        cp -r "$script_dir/hypr" "$hypr_dest"
    fi

    # Matugen → always overwrite
    rm -rf "$matugen_dest"
    mkdir -p "$matugen_dest"
    cp -r "$script_dir/matugen/." "$matugen_dest/"
    echo "✔️ Matugen configs installed."
}

# --- Install WallSet permanently ---
install_wallset() {
    mkdir -p "$bin_dest"
    if [ -f "$script_dir/scripts/WallSet.sh" ]; then
        cp "$script_dir/scripts/WallSet.sh" "$bin_dest/wallset"
        chmod +x "$bin_dest/wallset"
        echo "✔️ WallSet installed to $bin_dest (run with 'wallset')."
    fi
}

# --- Main ---
case "${1:-}" in
    --update)
        echo "🔄 Updating configs + WallSet..."
        copy_configs
        install_wallset
        echo "✅ Update complete."
        ;;
    *)
        install_packages
        copy_configs
        install_wallset
        echo "✅ Fresh install complete."
        echo "👉 Start AGS with: ags run"
        ;;
esac
