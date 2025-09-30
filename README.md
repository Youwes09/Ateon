<div align="center">

```
    ___   __                  
   /   | / /____  ____  ____  
  / /| |/ __/ _ \/ __ \/ __ \ 
 / ___ / /_/  __/ /_/ / / / / 
/_/  |_\__/\___/\____/_/ /_/  
```
[![GitHub repo size](https://img.shields.io/github/repo-size/Youwes09/Ateon?style=for-the-badge&logo=gitlfs&logoColor=%23D8B4FE&labelColor=%234C1D95&color=%23D8B4FE)](https://github.com/Youwes09/Ateon)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Youwes09/Ateon?style=for-the-badge&logo=git&logoColor=%23C084FC&labelColor=%234C1D95&color=%23C084FC)](https://github.com/Youwes09/Ateon/commits/main)
[![GitHub last commit](https://img.shields.io/github/last-commit/Youwes09/Ateon/main?style=for-the-badge&logo=git&logoColor=%23A855F7&labelColor=%234C1D95&color=%23A855F7)](https://github.com/Youwes09/Ateon/commits/main)
[![GitHub stars](https://img.shields.io/github/stars/Youwes09/Ateon?style=for-the-badge&logo=github&logoColor=%239333EA&labelColor=%234C1D95&color=%239333EA)](https://github.com/Youwes09/Ateon/stargazers)

*Powered by AGSv3 • Built with GTK4 • Designed for Hyprland*

</div>

---

## Overview

Ateon is a complete desktop rice featuring a Material Design shell built with [AGS/Astal](https://github.com/Aylur/astal) for [Hyprland](https://github.com/hyprwm/Hyprland). Built upon the foundation of [Matshell](https://github.com/neurarian/matshell), it provides a cohesive desktop experience with intelligent theming, smooth animations, and adaptive layouts that work seamlessly across desktop and laptop configurations.

---

## Project Structure

```
~/Ateon/
├── ags/
│   ├── app.ts                      # Application entry point
│   ├── options.ts                  # Configuration options
│   ├── pickerapps.json             # Pinned Apps (Picker)
│   ├── config.json                 # User configuration
│   ├── assets/                     # Icons and default wallpaper
│   ├── matugen/templates/          # Theme generation templates
│   ├── style/                      # SCSS stylesheets
│   │   ├── abstracts/              # Variables, mixins, functions
│   │   ├── base/                   # Reset and base styles
│   │   ├── components/             # Component-specific styles
│   │   └── layouts/                # Layout definitions
│   ├── utils/                      # Utility functions and services
│   │   ├── battery.ts
│   │   ├── bluetooth/              # Bluetooth management
│   │   ├── brightness.ts
│   │   ├── chromash/               # Color theming utility
│   │   ├── clipboard/              # Clipboard manager
│   │   ├── config/                 # Configuration system
│   │   ├── notifd/                 # Notification daemon
│   │   ├── picker/                 # App and wallpaper picker
│   │   ├── weather/                # Weather service
│   │   ├── wifi/                   # WiFi management
│   │   └── windowSwitcher/         # Window Switcher (WIP)
│   └── widgets/                    # UI components
│       ├── bar/                    # Status bar
│       ├── clipboard/              # Clipboard interface
│       ├── common/                 # Common widgets & panels
│       ├── control-panel/          # Settings panel
│       ├── launcher/               # App launcher
│       ├── logout-menu/            # Power menu
│       ├── music/                  # Media player with CAVA
│       ├── notifications/          # Notification popups
│       ├── osd/                    # On-screen display
│       ├── picker/                 # Unified picker interface
│       ├── sidebar/                # Clock and weather sidebar
│       ├── system-menu/            # Quick settings
│       └── window-switcher/        # Window switcher (WIP)
├── hypr/                           # Hyprland configuration
│   ├── hyprland.conf
│   ├── autostart.conf
│   ├── keybinds.conf
│   └── workspaces.conf
├── fish/                           # Fish shell config
├── foot/                           # Foot terminal config
├── fastfetch/                      # System info display
├── matugen/                        # Matugen configuration
├── install.sh                      # Installation script
└── GitDraw.sh                      # Backup utility
```

---

## Features

<details>
<summary><strong>Dynamic Theming Engine</strong></summary>

Automatic color scheme generation from wallpaper selection using matugen. Real-time theme switching across the entire system including shell components, terminal, and applications. Fine-tune specific colors through the chromash utility located at `~/.config/ags/utils/chromash/chromash` for complete control over your aesthetic.

</details>

<details>
<summary><strong>Intelligent Clipboard Manager</strong></summary>

System-wide clipboard history with fuzzy search, live preview, and keyboard-driven navigation. Built with GTK4 and powered by clipvault, supporting multiple content types with efficient memory management. Supports up to 100 entries with smooth scrolling interface limited to 9 visible items.

</details>

<details>
<summary><strong>Audio Visualization</strong></summary>

CAVA-powered sound visualizer with extensive library of visual styles including bars, catmull-rom splines, circular, dots, jumping bars, mesh, particles, smooth, waterfall, and wave particles. Real-time waveform rendering using advanced interpolation for smooth, responsive animations.

</details>

<details>
<summary><strong>Unified Picker Interface</strong></summary>

Integrated wallpaper manager with live preview grid and automatic theme generation on selection. Fast fuzzy search application launcher with adaptive results and instant execution. Both modes accessible through a single, elegant interface.

</details>

<details>
<summary><strong>Notification Center</strong></summary>

Comprehensive notification management with Do Not Disturb mode, grouped notifications by application, action buttons, and notification history. Integrated with system tray for quick access. Live notification popups with customizable timeout.

</details>

<details>
<summary><strong>System Control Panel</strong></summary>

Unified settings interface featuring network management with WiFi scanning and connection controls, Bluetooth device pairing and status monitoring, audio output and input controls with wireplumber integration, brightness adjustment, battery metrics with power profile switching, and quick toggles for common settings.

</details>

<details>
<summary><strong>Digital Flip Clock & Weather Widget</strong></summary>

Sidebar featuring animated flip clock with smooth transitions and live weather information with forecast data. Minimalist design with quick action buttons and additional widget templates for customization.

</details>

<details>
<summary><strong>Performance Monitoring</strong></summary>

Visual CPU and memory usage indicators integrated into the status bar using GTK4 circular progress widgets. Real-time system health tracking with smooth animations.

</details>

<details>
<summary><strong>Multi-Monitor Support</strong></summary>

Optimized for complex display setups with per-monitor configurations, intelligent workspace management, and seamless monitor hotplugging. Pre-configured Hyprland layer rules ensure optimal blur effects and performance across all displays.

</details>

<details>
<summary><strong>Status Bar</strong></summary>

Information-dense status bar with themed Hyprland workspace indicators, system tray integration, performance metrics, media controls, and clock. Adaptive layout adjusts to available space and active components. Includes system information display with battery, Bluetooth, and network status.

</details>

---

## Installation

### Quick Start

```bash
git clone https://github.com/Youwes09/Ateon.git ~/Ateon
cd ~/Ateon
bash install.sh
```

> [!IMPORTANT]
> The installer preserves existing configurations and will not overwrite files without explicit permission.

### Dependencies

<details>
<summary><strong>Core Requirements</strong></summary>

```
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
libgtop
libadwaita
libsoup3
hyprland
networkmanager
wireplumber
```

</details>

<details>
<summary><strong>System Utilities</strong></summary>

```
coreutils
dart-sass
imagemagick
bluez
bluez-utils
adwaita-icon-theme
```
</details>

<details>
<summary><strong>Fonts</strong></summary>

```
ttf-material-symbols-variable-git
ttf-firacode-nerd
```

</details>

<details>
<summary><strong>Theming System</strong></summary>

```
matugen
chromash(https://github.com/Youwes09/Chromash)
```
</details>

<details>
<summary><strong>Laptop Features (Optional)</strong></summary>

```
upower
brightnessctl
```

Required for battery monitoring and display brightness control on portable devices.

</details>

---

## Usage

### Wallpaper & Theme Management

Access the integrated wallpaper picker through the unified picker interface. Select any wallpaper to automatically generate and apply a matching Material Design color scheme across the entire system.

For advanced color customization, use the chromash utility:

```bash
~/.config/ags/utils/chromash/chromash
```

This executable provides fine-grained control over specific color values in your generated theme.

### Configuration

#### Shell Settings

Edit `~/.config/ags/config.json` to customize:
- Preferred terminal emulator
- Default browser
- File manager
- Component behavior
- Animation speeds and effects

#### Hyprland Configuration

The included Hyprland configuration provides:
- Optimized window rules for shell components
- Pre-configured keybindings
- Layer rules for proper blur effects
- Multi-monitor workspace assignments

#### Theme Customization

Theme templates are located in `~/.config/ags/matugen/templates/`. These files control:
- Color scheme application across multiple applications
- Material Design token mapping
- GTK, terminal, and application theming

Generated themes are applied to:
- AGS shell components
- Hyprland colors
- Hyprlock lockscreen
- Foot terminal
- Fish shell
- GTK applications
- Discord (Ateon Midnight theme)

### Personal Backup System

Maintain your customizations across multiple machines:

```bash
./GitDraw.sh
```

This utility creates backups of your configuration or syncs changes from your personal fork.

---

## Component Architecture

| Component | Description | Technology |
|-----------|-------------|------------|
| **Status Bar** | System information, workspace indicators, system tray | GTK4, Astal |
| **App Launcher** | Fuzzy search application access with instant execution | libastal-apps |
| **Wallpaper Manager** | Grid-based wallpaper browser with live preview | GTK4, matugen |
| **Clipboard Manager** | History management with search and content preview | GTK4, clipvault |
| **Notification Center** | Grouped notifications with DND mode and actions | libastal-notifd |
| **System Menu** | Network, Bluetooth, audio, brightness, power controls | Multiple Astal libraries |
| **Music Player** | Media controls with CAVA visualization | libastal-mpris, libastal-cava |
| **Sidebar** | Weather display and animated flip clock | GTK4, libsoup3 |
| **OSD** | On-screen indicators for volume, brightness, Bluetooth | GTK4 |
| **Logout Menu** | Power management interface with confirmation | GTK4 |
| **Control Panel** | Centralized settings and configuration interface | GTK4 |

---

## Acknowledgements

This project is built upon the work of numerous talented developers:

**Core Foundation**
- [Neurarian](https://github.com/Neurarian) - [Matshell](https://github.com/neurarian/matshell) provided the architectural foundation
- [Aylur](https://github.com/Aylur) - Creator of AGS/Astal widget toolkit
- [fufexan](https://github.com/fufexan/dotfiles) - Initial inspiration and implementation patterns

**Theming & Visualization**
- [InioX](https://github.com/InioX/matugen) - Material color theming utility
- [kotontrion](https://github.com/kotontrion/kompass) - GTK4 CAVA Catmull-Rom spline widget implementation
- [ARKye03](https://github.com/ARKye03) - GTK4 circular progress widget

**Design Influence**
- [saimoomedits](https://github.com/saimoomedits/eww-widgets) - UI/UX design patterns
- [end-4](https://github.com/end-4/dots-hyprland) - Color generation methodology

Special recognition to the Hyprland community and all contributors who make ambitious desktop customization projects possible.

---

<div align="center">

**[⬆ Back to Top](#ateon)**

</div>
