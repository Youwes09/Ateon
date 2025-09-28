<div align="center">

```
    ___   __                  
   /   | / /____  ____  ____  
  / /| |/ __/ _ \/ __ \/ __ \ 
 / ___ / /_/  __/ /_/ / / / / 
/_/  |_\__/\___/\____/_/ /_/  
```
### A complete Hyprland desktop rice with GTK4 Material Design shell

![GitHub repo size](https://img.shields.io/github/repo-size/Youwes09/Ateon?style=for-the-badge&logo=gitlfs&logoColor=%23D8B4FE&labelColor=%234C1D95&color=%23D8B4FE)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Youwes09/Ateon?style=for-the-badge&logo=git&logoColor=%23C084FC&labelColor=%234C1D95&color=%23C084FC)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/Youwes09/Ateon/main?style=for-the-badge&logo=git&logoColor=%23A855F7&labelColor=%234C1D95&color=%23A855F7)
![GitHub Repo stars](https://img.shields.io/github/stars/Youwes09/Ateon?style=for-the-badge&logo=github&logoColor=%239333EA&labelColor=%234C1D95&color=%239333EA)

</div>

Ateon is a complete desktop rice featuring a Material Design-inspired shell built with [AGS/Astal](https://github.com/Aylur/astal) for [Hyprland](https://github.com/hyprwm/Hyprland). This comprehensive rice includes configurations for the window manager, shell components, and various system utilities to create a cohesive desktop experience.

Built upon the foundation of [Matshell](https://github.com/neurarian/matshell), Ateon provides a polished, modern desktop environment with elegant animations and thoughtful design choices.

***Powered by AGSv3 and modern tooling.***

## What's Included

- **Complete Desktop Environment**: Pre-configured Hyprland setup with all necessary components
- **Material Design Shell**: Beautiful AGS-based interface with dynamic theming
- **Adaptive Layouts**: Seamlessly works across desktop and laptop configurations  
- **Multi-monitor Ready**: Optimized for complex display setups
- **Dynamic Theming**: Real-time theme switching with matugen integration
- **Comprehensive Configs**: Window manager rules, keybindings, and system integrations

<details>
  <summary>Show detailed components list</summary>

### Components

- Status Bar - Sleek, informative main bar with system information

  - Workspace Management - Themed Hyprland workspace integration
  - System Tray
  - Visual Performance Monitoring - CPU & memory
  - Simple Clock

- Music Player - Media controls, music cover themed

  - Audio Visualization - Extensive library of CAVA visualizer styles to choose from

- System Menu - Minimalistic core system integration

  - Network Management - WiFi scanning, connection management, and status monitoring
  - Bluetooth Support - Device pairing, management, and status indicators
  - Brightness Controls
  - Audio Controls
  - Battery Metrics
  - Power Profiles
  - Notification Center - Intuitive notification management system & DND mode

- Logout Menu - wlogout-like but ags

- App Launcher - Fast fuzzy search application access
  
- Wallpaper Manager - Linked with Matugen Theming

- On-Screen Display - Tracks Audio, Brightness, and Bluetooth connections

- Sidebar - Weather display and digital flip clock
  
- Customized Terminal

</details>

______________________________________________________________________

### Dependencies

<details>
  <summary>Show dependency list</summary>

#### Required:

- aylurs-gtk-shell-git
- libastal-hyprland-git
- libastal-tray-git
- libastal-notifd-git
- libastal-apps-git
- libastal-wireplumber-git
- libastal-mpris-git
- libastal-network-git
- libastal-bluetooth-git
- libastal-cava-git
- libastal-battery-git
- libastal-powerprofiles-git
- libgtop
- libadwaita
- libsoup3
- hyprland
- coreutils
- dart-sass
- imagemagick
- networkmanager
- wireplumber
- bluez & bluez-utils (will also run fine without, but throws some non-critical errors on startup)
- adwaita-icon-theme
- ttf-material-symbols-variable-git
- ttf-firacode-nerd
- ***For matugen theming:***
  - matugen
  - [chromash](https://github.com/Youwes09/Chromash) (optional; for additional chroma/tone based theming)

#### Not required but useful for laptop device features:

- upower
- brightnessctl

</details>

### Installation

The installation script will handle everything for you while preserving your existing configurations:

```console
git clone https://github.com/Youwes09/Ateon.git ~/Ateon
bash ~/Ateon/install.sh
```

> [!NOTE]  
> The installer respects existing configurations and won't overwrite your current setup without permission.

### Wallpaper Management

Change your wallpaper and apply matching themes:

```console
./WallSet.sh /path/to/your/wallpaper.jpg
```

This script automatically generates a color scheme from your wallpaper and applies it system-wide.

### Personal Backup System

Create backups of your customizations or pull changes from your personal system:

```console
./GitDraw.sh
```

Use this to maintain your personal fork or backup your modifications.

### Configuration

After installation, customize your experience by editing the generated config files:

- **Shell Settings**: `~/.config/ags/config.json` - Terminal, browser, file manager preferences
- **Hyprland Config**: Included window manager configuration with optimized rules
- **Theme Templates**: Automatic theme generation templates for consistent styling

> [!TIP]  
> The rice includes pre-configured Hyprland layer rules for optimal blur effects and performance.

______________________________________________________________________

## Acknowledgements

This project wouldn't be possible without:
- [Neurarian](https://github.com/Neurarian) for the amazing [Matshell](https://github.com/neurarian/matshell) foundation
- [Aylur](https://github.com/Aylur) for the powerful widget toolkit
- [fufexan's dotfiles](https://github.com/fufexan/dotfiles) for the initial inspiration and foundation
- [matugen](https://github.com/InioX/matugen) for the amazing Material Color theming utility
- [kotontrion](https://github.com/kotontrion/kompass) for the GTK4 CAVA Catmull-Rom spline widget
- [ARKye03](https://github.com/ARKye03) for the GTK4 circular progress widget which is currently still on its way to be merged into Astal
- [saimoomedits' eww-widgets](https://github.com/saimoomedits/eww-widgets) for design influence
- [end-4's dots-hyprland](https://github.com/end-4/dots-hyprland) for some inspiration on the color generation

Special thanks to the broader community of rice enthusiasts and the developers of the underlying technologies that make Ateon possible.
