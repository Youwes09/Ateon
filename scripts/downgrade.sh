#!/bin/bash
# Complete downgrade script using the 'downgrade' tool
# This will downgrade ALL packages updated on 2025-11-13

echo "=== COMPLETE SYSTEM DOWNGRADE SCRIPT ==="
echo "This will downgrade packages updated on November 13, 2025"
echo "WARNING: This is a nuclear option. Proceed with caution."
echo ""

read -p "Do you want to proceed with FULL downgrade? (yes/no): " confirm
if [[ $confirm != "yes" ]]; then
    echo "Aborted."
    exit 0
fi

echo "Starting downgrade..."
echo ""

# Function to downgrade a package
downgrade_pkg() {
    echo "Downgrading: $1"
    sudo downgrade --ala-only "$1"
    if [ $? -ne 0 ]; then
        echo "WARNING: Failed to downgrade $1"
        read -p "Continue anyway? (yes/no): " cont
        if [[ $cont != "yes" ]]; then
            exit 1
        fi
    fi
}

# Core system libraries (CRITICAL - do these carefully)
echo "=== Core System Libraries ==="
downgrade_pkg "linux-api-headers"
downgrade_pkg "glibc"
downgrade_pkg "gcc-libs"
downgrade_pkg "systemd-libs"
downgrade_pkg "libxcrypt"
downgrade_pkg "sqlite"
downgrade_pkg "curl"
downgrade_pkg "binutils"
downgrade_pkg "gcc"
downgrade_pkg "icu"
downgrade_pkg "libxml2"
downgrade_pkg "harfbuzz"
downgrade_pkg "glycin"

# Bluetooth
echo ""
echo "=== Bluetooth ==="
downgrade_pkg "bluez"
downgrade_pkg "bluez-libs"
downgrade_pkg "bluez-utils"

# System utilities
echo ""
echo "=== System Utilities ==="
downgrade_pkg "boost-libs"
downgrade_pkg "hwdata"
downgrade_pkg "device-mapper"
downgrade_pkg "systemd"
downgrade_pkg "libpulse"
downgrade_pkg "iso-codes"
downgrade_pkg "libxkbcommon"
downgrade_pkg "tinysparql"

# Graphics stack
echo ""
echo "=== Graphics Stack ==="
downgrade_pkg "llvm-libs"
downgrade_pkg "mesa"
downgrade_pkg "nvidia-utils"
downgrade_pkg "nspr"

# Browsers
echo ""
echo "=== Browsers ==="
downgrade_pkg "chromium"
downgrade_pkg "firefox"

# Development tools
echo ""
echo "=== Development Tools ==="
downgrade_pkg "compiler-rt"
downgrade_pkg "clang"
downgrade_pkg "code"
downgrade_pkg "nodejs"
downgrade_pkg "node-gyp"

# Containers
echo ""
echo "=== Containers ==="
downgrade_pkg "runc"
downgrade_pkg "containerd"
downgrade_pkg "docker"

# Media & Audio
echo ""
echo "=== Media & Audio ==="
downgrade_pkg "serd"
downgrade_pkg "sord"
downgrade_pkg "sratom"
downgrade_pkg "gstreamer"
downgrade_pkg "gst-plugins-base-libs"
downgrade_pkg "libxkbcommon-x11"
downgrade_pkg "gst-plugins-bad-libs"
downgrade_pkg "gst-plugins-base"
downgrade_pkg "gst-plugins-good"
downgrade_pkg "libcava"

# Hyprland ecosystem (CRITICAL for your setup)
echo ""
echo "=== Hyprland Ecosystem ==="
downgrade_pkg "hyprutils"
downgrade_pkg "hyprgraphics"
downgrade_pkg "hyprland"
downgrade_pkg "hyprlock"
downgrade_pkg "hyprpaper"

# 32-bit libraries
echo ""
echo "=== 32-bit Libraries ==="
downgrade_pkg "lib32-glibc"
downgrade_pkg "lib32-gcc-libs"
downgrade_pkg "lib32-icu"
downgrade_pkg "lib32-libxml2"
downgrade_pkg "lib32-llvm-libs"
downgrade_pkg "lib32-libxcrypt"
downgrade_pkg "lib32-curl"
downgrade_pkg "lib32-mesa"
downgrade_pkg "lib32-nvidia-utils"
downgrade_pkg "lib32-systemd"
downgrade_pkg "lib32-libxcrypt-compat"
downgrade_pkg "lib32-nspr"
downgrade_pkg "lib32-sqlite"

# Vulkan
echo ""
echo "=== Vulkan ==="
downgrade_pkg "vulkan-mesa-device-select"
downgrade_pkg "lib32-vulkan-mesa-device-select"
downgrade_pkg "vulkan-radeon"
downgrade_pkg "lib32-vulkan-radeon"

# System libraries continued
echo ""
echo "=== Additional System Libraries ==="
downgrade_pkg "libcurl-gnutls"
downgrade_pkg "libdvdread"
downgrade_pkg "libnautilus-extension"
downgrade_pkg "libnvme"
downgrade_pkg "libtraceevent"
downgrade_pkg "libxcrypt-compat"
downgrade_pkg "mkinitcpio"

# Kernel
echo ""
echo "=== Kernel ==="
downgrade_pkg "linux"

# More tools
echo ""
echo "=== Additional Tools ==="
downgrade_pkg "llvm"
downgrade_pkg "ocl-icd"
downgrade_pkg "localsearch"
downgrade_pkg "luajit"
downgrade_pkg "mobile-broadband-provider-info"
downgrade_pkg "nautilus"

# NVIDIA
echo ""
echo "=== NVIDIA ==="
downgrade_pkg "nvidia-open-dkms"
downgrade_pkg "opencl-nvidia"

# Applications
echo ""
echo "=== Applications ==="
downgrade_pkg "obsidian"
downgrade_pkg "ollama"
downgrade_pkg "ollama-cuda"
downgrade_pkg "openexr"
downgrade_pkg "opencv"
downgrade_pkg "openimageio"
downgrade_pkg "polkit-gnome"

# Python & Qt
echo ""
echo "=== Python & Qt ==="
downgrade_pkg "python-cairo"
downgrade_pkg "python-opencv"
downgrade_pkg "python-pillow"
downgrade_pkg "tslib"
downgrade_pkg "qt6-base"
downgrade_pkg "qt5-base"
downgrade_pkg "qt5-location"
downgrade_pkg "qt6-5compat"
downgrade_pkg "qt6-webengine"
downgrade_pkg "qbittorrent"

# System components
echo ""
echo "=== System Components ==="
downgrade_pkg "systemd-sysvcompat"
downgrade_pkg "tesseract"
downgrade_pkg "vte-common"
downgrade_pkg "vte3"
downgrade_pkg "wget"
downgrade_pkg "zenity"

# AGS and Astal (CRITICAL for your bar)
echo ""
echo "=== AGS and Astal (CRITICAL) ==="
downgrade_pkg "libastal-git"
downgrade_pkg "libastal-4-git"
downgrade_pkg "aylurs-gtk-shell-git"

# AUR packages
echo ""
echo "=== AUR Packages ==="
downgrade_pkg "spotify"
downgrade_pkg "normcap"
downgrade_pkg "clipvault"
downgrade_pkg "zoom"
downgrade_pkg "equibop"
downgrade_pkg "overskride"
downgrade_pkg "overskride-debug"
downgrade_pkg "avogadro2-bin"
downgrade_pkg "yay"
downgrade_pkg "yay-debug"
downgrade_pkg "matugen-bin"
downgrade_pkg "spicetify-cli"
downgrade_pkg "spicetify-cli-debug"
downgrade_pkg "slack-desktop"

# Final packages
echo ""
echo "=== Final Packages ==="
downgrade_pkg "dart-sass"
downgrade_pkg "dkms"
downgrade_pkg "fastfetch"
downgrade_pkg "fish"
downgrade_pkg "freeglut"
downgrade_pkg "js140"
downgrade_pkg "libwacom"
downgrade_pkg "nano"

echo ""
echo "=== COMPLETE DOWNGRADE FINISHED ==="
echo ""
echo "IMPORTANT: Add to /etc/pacman.conf to prevent future upgrades:"
echo ""
echo "IgnorePkg = aylurs-gtk-shell-git libastal-git libastal-4-git glibc gcc-libs systemd hyprland mesa nvidia-utils"
echo ""
echo "Reboot is HIGHLY recommended to load old kernel and libraries."
echo ""
echo "After reboot, check if AGS bar works with: ags"