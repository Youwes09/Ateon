import GLib from "gi://GLib?version=2.0";
import type { WeatherData } from "utils/weather";
import type { UsageEntry } from "utils/picker/frecency/types";
import { initializeConfig, defineOption } from "./utils/config";
import { ThemeProperties } from "utils/wallpaper";
import type { SidebarWidgetId } from "widgets/sidebar/types.ts";

const options = initializeConfig(
  `${GLib.get_user_config_dir()}/ags/configs/config.json`,
  {
    "theme.style": defineOption("normal", { useCache: true }),
    "app.audio": defineOption("pwvucontrol"),
    "app.bluetooth": defineOption("overskride"),
    "app.browser": defineOption("firefox"),
    "app.file-manager": defineOption("nautilus"),
    "app.resource-monitor": defineOption("resources"),
    "app.terminal": defineOption("foot"),
    "app.wifi": defineOption(
      "XDG_CURRENT_DESKTOP=GNOME gnome-control-center wifi",
    ),
    "bar.position": defineOption("top"),
    "bar.style": defineOption("beveled"),
    "bar.modules.cava.show": defineOption(false),
    "bar.modules.cava.style": defineOption("catmull_rom"),
    "bar.modules.media.cava.show": defineOption(false),
    "bar.modules.media.truncate": defineOption(true),
    "bar.modules.media.max-chars": defineOption(70),
    "bar.modules.os-icon.type": defineOption("arch-symbolic"),
    "bar.modules.os-icon.show": defineOption(true),
    "hardware-monitor.notifications.enable": defineOption(true),
    "hardware-monitor.thresholds.cpu-temp": defineOption(85),
    "hardware-monitor.thresholds.gpu-temp": defineOption(85),
    "hardware-monitor.thresholds.memory": defineOption(0.95),
    "clock.format": defineOption("24"),
    "notes.content": defineOption("", { useCache: true }),
    "sidebar.widget-order": defineOption<SidebarWidgetId[]>(
      ["clock", "weather", "hardware", "timer", "notes", "settings", "updater"],
      { useCache: true },
    ),
    "sidebar.enabled-widgets": defineOption<SidebarWidgetId[]>(
      ["clock", "weather", "hardware", "timer", "notes", "settings", "updater"],
      { useCache: true },
    ),
    "musicPlayer.modules.cava.show": defineOption(false),
    "musicPlayer.modules.cava.style": defineOption("catmull_rom"),
    "system-menu.modules.bluetooth-advanced.enable": defineOption(true),
    "system-menu.modules.wifi-advanced.enable": defineOption(true),
    "wallpaper.dir": defineOption(
      `${GLib.get_home_dir()}/Pictures/Wallpapers`,
    ),
    "wallpaper.cache-size": defineOption(50),
    "wallpaper.theme.cache-size": defineOption(100),
    "wallpaper.current": defineOption("", {
      useCache: true,
    }),
    "wallpaper.theme.cache": defineOption<Record<string, { properties: ThemeProperties; timestamp: number }>>({}, { useCache: true }),
    "notification-center.max-notifications": defineOption(4),
    "picker.frecency-cache": defineOption<Record<string, UsageEntry>>(
      {},
      { useCache: true },
    ),
    "clipboard.show-images": defineOption(true),
    "weather.update-interval": defineOption(900_000),
    "weather.cache": defineOption<Record<string, { data: WeatherData; timestamp: number }>>({}, { useCache: true }),
    "dock.enabled": defineOption(true),
    "dock.auto-hide": defineOption(true),
    "dock.pinned-apps": defineOption([
      { name: "Firefox", icon: "firefox", class: "firefox" },
      { name: "Code", icon: "code-oss", class: "Code" },
      { name: "Terminal", icon: "utilities-terminal", class: "foot" },
      { name: "Files", icon: "system-file-manager", class: "org.gnome.Nautilus" },
      { name: "Discord", icon: "discord", class: "discord" },
      { name: "Obsidian", icon: "obsidian", class: "obsidian" },
      { name: "Spotify", icon: "spotify", class: "Spotify" },
      { name: "VLC", icon: "vlc", class: "vlc" },
    ]),
  },
);

export default options;