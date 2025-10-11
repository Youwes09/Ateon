import GLib from "gi://GLib?version=2.0";
import { execAsync } from "ags/process";
import type { WeatherData } from "utils/weather";
import type { UsageEntry } from "utils/picker/frecency/types";
import { initializeConfig, defineOption } from "./utils/config";
import { ThemeProperties } from "utils/wallpaper";

const options = await (async () => {
  const currentWallpaper = await execAsync(
    "hyprctl hyprpaper listloaded",
  ).catch(() => "");
  
  const config = initializeConfig(
    `${GLib.get_user_config_dir()}/ags/configs/config.json`,
    {
      "theme.style": defineOption("normal", { useCache: true }),
      "app.browser": defineOption("firefox"),
      "app.file-manager": defineOption("nautilus"),
      "app.resource-monitor": defineOption("resources"),
      "app.terminal": defineOption("foot"),
      "app.wifi": defineOption(
        "XDG_CURRENT_DESKTOP=GNOME gnome-control-center wifi",
      ),
      "app.audio": defineOption("pwvucontrol"),
      "bar.position": defineOption("top"),
      "bar.style": defineOption("beveled"),
      "bar.modules.cava.show": defineOption(true),
      "bar.modules.cava.style": defineOption("catmull_rom"),
      "bar.modules.media.cava.show": defineOption(true),
      "bar.modules.media.truncate": defineOption(true),
      "bar.modules.media.max-chars": defineOption(70),
      "bar.modules.os-icon.type": defineOption("arch-symbolic"),
      "bar.modules.os-icon.show": defineOption(true),
      "clock.format": defineOption("24"),
      "musicPlayer.modules.cava.show": defineOption(true),
      "musicPlayer.modules.cava.style": defineOption("catmull_rom"),
      "system-menu.modules.bluetooth-advanced.enable": defineOption(true),
      "system-menu.modules.wifi-advanced.enable": defineOption(true),
      "wallpaper.dir": defineOption(
        `${GLib.get_home_dir()}/Pictures/wallpapers`,
      ),
      "wallpaper.cache-size": defineOption(50),
      "wallpaper.theme.cache-size": defineOption(100),
      "wallpaper.current": defineOption(currentWallpaper, {
        useCache: true,
      }),
      "wallpaper.theme.cache": defineOption<
        Record<string, CacheEntry<ThemeProperties>>
      >({}, { useCache: true }),
      "notification-center.max-notifications": defineOption(4),
      "picker.frecency-cache": defineOption<Record<string, UsageEntry>>(
        {},
        { useCache: true },
      ),
      "clipboard.show-images": defineOption(true),
      "weather.update-interval": defineOption(900_000),
      "weather.cache": defineOption<Record<string, { data: WeatherData; timestamp: number }>>(
        {},
        { useCache: true },
      ),
      "dock.enabled": defineOption(true),
      "dock.auto-hide": defineOption(true),
      "dock.pinned-apps": defineOption([
        { name: "Firefox", icon: "firefox", class: "firefox" },
        { name: "Code", icon: "code", class: "Code" },
        { name: "Terminal", icon: "utilities-terminal", class: "foot" },
        { name: "Files", icon: "system-file-manager", class: "org.gnome.Nautilus" },
        { name: "Discord", icon: "discord", class: "discord" },
        { name: "Obsidian", icon: "obsidian", class: "obsidian" },
        { name: "Spotify", icon: "spotify", class: "Spotify" },
        { name: "VLC", icon: "vlc", class: "vlc" },
      ]),
    },
  );
  
  return config;
})();

export default options;