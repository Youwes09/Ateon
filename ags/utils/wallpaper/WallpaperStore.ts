import GObject from "gi://GObject";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { Gdk } from "ags/gtk4";
import { Accessor } from "ags";
import { execAsync } from "ags/process";
import { timeout, Timer } from "ags/time";
import { register, property, signal } from "ags/gobject";
import { getThumbnailManager, ThumbnailManager } from "./index";
import options from "options";
import Fuse from "../fuse.js";
import type { WallpaperItem } from "utils/picker/types.ts";
import type {
  CachedThemeEntry,
  ThemeProperties,
  ThemeMode,
  ThemeScheme,
} from "./types";

const CHROMASH_PATH = GLib.build_filenamev([
  GLib.get_home_dir(),
  ".config",
  "ags",
  "utils",
  "chromash",
  "chromash"
]);

function getChromashPath() {
  return CHROMASH_PATH;
}

@register({ GTypeName: "WallpaperStore" })
export class WallpaperStore extends GObject.Object {
  @property(Array) wallpapers: WallpaperItem[] = [];
  @property(String) currentWallpaperPath: string = "";
  @property(Boolean) includeHidden: boolean = false;
  @property(Number) maxItems: number = 12;
  @property(Object) manualMode: ThemeMode = "auto";
  @property(String) manualScheme: ThemeScheme = "auto";

  @signal([Array], GObject.TYPE_NONE, { default: false })
  wallpapersChanged(wallpapers: WallpaperItem[]): undefined {}

  @signal([String], GObject.TYPE_NONE, { default: false })
  wallpaperSet(path: string): undefined {}

  @signal([String, String], GObject.TYPE_NONE, { default: false })
  themeSettingsChanged(mode: string, scheme: string): undefined {}

  private files: Gio.File[] = [];
  private fuse!: Fuse;

  // Configuration accessors
  private wallpaperDir: Accessor<string>;
  private currentWallpaper: Accessor<string>;
  private maxThemeCacheSize: Accessor<number>;

  private unsubscribers: (() => void)[] = [];

  // Caching
  private themeCache = new Map<string, CachedThemeEntry>();

  // Debounce fast theme changes
  private themeDebounceTimer: Timer | null = null;
  private readonly THEME_DEBOUNCE_DELAY = 100;

  // Thumbnail generation
  private thumbnailManager: ThumbnailManager;

  constructor(params: { includeHidden?: boolean } = {}) {
    super();

    this.thumbnailManager = getThumbnailManager();

    this.includeHidden = params.includeHidden ?? false;

    // Setup accessors from options
    this.wallpaperDir = options["wallpaper.dir"]((wd) => String(wd));
    this.currentWallpaper = options["wallpaper.current"]((w) => String(w));
    this.maxThemeCacheSize = options["wallpaper.theme.cache-size"]((s) =>
      Number(s),
    );

    // Connect to option changes
    this.setupWatchers();

    // Init
    this.loadThemeCache();
    this.loadWallpapers();
  }

  // Setup & Configuration
  private setupWatchers(): void {
    const dirUnsubscribe = this.wallpaperDir.subscribe(() => {
      this.loadWallpapers();
    });
    this.unsubscribers.push(dirUnsubscribe);
  }

  private loadThemeCache(): void {
    try {
      const persistentCache = options["wallpaper.theme.cache"].get() as Record<
        string,
        any
      >;
      for (const [path, entry] of Object.entries(persistentCache)) {
        if (typeof entry === "object" && entry.timestamp) {
          this.themeCache.set(path, entry as CachedThemeEntry);
        }
      }
    } catch (error) {
      console.warn("Failed to load theme cache:", error);
      this.emit("error", "Failed to load theme cache");
    }
  }

  private saveThemeCache(): void {
    setTimeout(() => {
      try {
        const persistentCache: Record<string, CachedThemeEntry> = {};
        for (const [path, entry] of this.themeCache) {
          persistentCache[path] = entry;
        }
        options["wallpaper.theme.cache"].value = persistentCache as any;
      } catch (error) {
        console.error("Failed to save theme cache:", error);
        this.emit("error", "Failed to save theme cache");
      }
    }, 0);
  }

  // Wallpaper Loading & Scanning
  private loadWallpapers(): void {
    try {
      const dirPath = this.wallpaperDir.get();
      if (!GLib.file_test(dirPath, GLib.FileTest.EXISTS)) {
        console.warn(`Wallpaper directory does not exist: ${dirPath}`);
        this.updateWallpapers([], []);
        return;
      }

      this.files = this.ls(dirPath, {
        level: 2,
        includeHidden: this.includeHidden,
      }).filter((file) => {
        const info = file.query_info(
          Gio.FILE_ATTRIBUTE_STANDARD_CONTENT_TYPE,
          Gio.FileQueryInfoFlags.NONE,
          null,
        );
        return info.get_content_type()?.startsWith("image/") ?? false;
      });

      const items = this.files.map((file) => {
        const path = file.get_path();
        return {
          id: path || file.get_uri(),
          name: file.get_basename() || "Unknown",
          description: "Image",
          iconName: "image-x-generic",
          path: path ?? undefined,
          file: file,
        };
      });

      this.updateWallpapers(this.files, items);
      console.log(`Loaded ${this.files.length} wallpapers from ${dirPath}`);
    } catch (error) {
      console.error("Failed to load wallpapers:", error);
      this.emit("error", "Failed to load wallpapers");
      this.updateWallpapers([], []);
    }
  }

  private updateWallpapers(files: Gio.File[], items: WallpaperItem[]): void {
    this.files = files;
    this.wallpapers = items;
    this.updateFuse();
    this.emit("wallpapers-changed", items);
  }

  private ls(
    dir: string,
    props?: { level?: number; includeHidden?: boolean },
  ): Gio.File[] {
    const { level = 0, includeHidden = false } = props ?? {};
    if (!GLib.file_test(dir, GLib.FileTest.IS_DIR)) {
      return [];
    }

    const files: Gio.File[] = [];
    try {
      const enumerator = Gio.File.new_for_path(dir).enumerate_children(
        "standard::name,standard::type",
        Gio.FileQueryInfoFlags.NONE,
        null,
      );

      for (const info of enumerator) {
        const file = enumerator.get_child(info);
        const basename = file.get_basename();

        if (basename?.startsWith(".") && !includeHidden) {
          continue;
        }

        const type = file.query_file_type(Gio.FileQueryInfoFlags.NONE, null);
        if (type === Gio.FileType.DIRECTORY && level > 0) {
          files.push(
            ...this.ls(file.get_path()!, {
              includeHidden,
              level: level - 1,
            }),
          );
        } else {
          files.push(file);
        }
      }
    } catch (error) {
      console.error(`Failed to list directory ${dir}:`, error);
    }

    return files;
  }

  private updateFuse(): void {
    this.fuse = new Fuse(this.wallpapers, {
      keys: ["name"],
      includeScore: true,
      threshold: 0.6,
      location: 0,
      distance: 100,
      minMatchCharLength: 1,
      ignoreLocation: true,
      ignoreFieldNorm: false,
      useExtendedSearch: false,
      shouldSort: true,
      isCaseSensitive: false,
    });
  }

  // Public API Methods
  search(text: string): WallpaperItem[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const results = this.fuse.search(text, { limit: this.maxItems });
    return results.map((result) => result.item);
  }

  async setRandomWallpaper(): Promise<void> {
    if (this.wallpapers.length === 0) {
      console.warn("No wallpapers available for random selection");
      this.emit("error", "No wallpapers available");
      return;
    }

    const currentWallpaperPath = this.currentWallpaper.get();
    const availableWallpapers = this.wallpapers.filter(
      (item) => item.path !== currentWallpaperPath,
    );

    const wallpapers =
      availableWallpapers.length > 0 ? availableWallpapers : this.wallpapers;
    const randomIndex = Math.floor(Math.random() * wallpapers.length);
    const randomWallpaper = wallpapers[randomIndex];

    await this.setWallpaper(randomWallpaper.file);
  }

  async refresh(): Promise<void> {
    this.loadWallpapers();
  }

  // Manual Theme Control Methods
  setManualMode(mode: ThemeMode): void {
    if (this.manualMode !== mode) {
      this.manualMode = mode;
      this.emit("theme-settings-changed", mode, this.manualScheme);

      if (this.currentWallpaperPath) {
        this.applyManualThemeSettings();
      }
    }
  }

  setManualScheme(scheme: ThemeScheme): void {
    if (this.manualScheme !== scheme) {
      this.manualScheme = scheme;
      this.emit("theme-settings-changed", this.manualMode, scheme);

      if (this.currentWallpaperPath) {
        this.applyManualThemeSettings();
      }
    }
  }

  private applyManualThemeSettings(): void {
    const chromash = getChromashPath();
    if (!GLib.file_test(chromash, GLib.FileTest.IS_EXECUTABLE)) {
      console.warn("chromash not found, cannot apply manual theme settings");
      return;
    }

    if (!this.currentWallpaperPath) {
      console.warn("No wallpaper set, cannot apply manual theme");
      return;
    }

    // Build wallpaper command with manual overrides
    let cmd = `"${chromash}" wallpaper "${this.currentWallpaperPath}"`;
    
    if (this.manualMode !== "auto") {
      cmd += ` --mode ${this.manualMode}`;
    }
    
    if (this.manualScheme !== "auto") {
      const chromashScheme = this.manualScheme === "scheme-neutral" ? "neutral" : 
                            this.manualScheme === "scheme-rainbow" ? "rainbow" :
                            this.manualScheme; // Pass through other schemes
      cmd += ` --scheme ${chromashScheme}`;
    }

    execAsync(cmd)
      .then(() => {
        console.log(`Applied manual theme: mode=${this.manualMode}, scheme=${this.manualScheme}`);
        const analysis: ThemeProperties = {
          mode: this.manualMode === "auto" ? "dark" : this.manualMode,
          scheme: this.manualScheme === "auto" ? "scheme-rainbow" : this.manualScheme,
          tone: this.manualMode === "light" ? 80 : 20,
          chroma: this.manualScheme === "scheme-neutral" ? 10 : 40,
        };
        this.sendThemeNotification(this.currentWallpaperPath, analysis);
      })
      .catch((error) => {
        console.error("Failed to apply manual theme settings:", error);
        this.emit("error", `Failed to apply theme: ${error}`);
      });
  }

  // Wallpaper Setting & Theme Application
  async setWallpaper(file: Gio.File): Promise<void> {
    const imagePath = file.get_path();
    if (!imagePath) {
      console.error("Could not get file path for wallpaper");
      this.emit("error", "Could not get file path for wallpaper");
      return;
    }

    const currentWallpaper = this.currentWallpaper.get();
    if (currentWallpaper === imagePath) {
      return;
    }

    // Update current wallpaper immediately
    options["wallpaper.current"].value = imagePath;
    this.currentWallpaperPath = imagePath;

    try {
      await this.applyWallpaperWithChromash(imagePath);
      this.emit("wallpaper-set", imagePath);
    } catch (error) {
      console.error("Wallpaper setting failed:", error);
      this.emit("error", `Wallpaper setting failed: ${error}`);
      // Revert config on failure
      options["wallpaper.current"].value = currentWallpaper;
      this.currentWallpaperPath = currentWallpaper;
    }
  }

  private async applyWallpaperWithChromash(imagePath: string): Promise<void> {
    const chromash = getChromashPath();
    if (!GLib.file_test(chromash, GLib.FileTest.IS_EXECUTABLE)) {
      throw new Error("chromash not found or not executable at " + chromash);
    }

    // Build wallpaper command with any manual overrides
    let cmd = `"${chromash}" wallpaper "${imagePath}"`;
    
    if (this.manualMode !== "auto") {
      cmd += ` --mode ${this.manualMode}`;
    }
    
    if (this.manualScheme !== "auto") {
      const chromashScheme = this.manualScheme === "scheme-neutral" ? "neutral" : 
                            this.manualScheme === "scheme-rainbow" ? "rainbow" :
                            this.manualScheme;
      cmd += ` --scheme ${chromashScheme}`;
    }

    await execAsync(cmd);
    this.scheduleThemeUpdate(imagePath);
  }

  private scheduleThemeUpdate(imagePath: string): void {
    if (this.themeDebounceTimer) {
      this.themeDebounceTimer.cancel();
    }

    this.themeDebounceTimer = timeout(this.THEME_DEBOUNCE_DELAY, () => {
      this.applyThemeWithManualOverrides(imagePath).catch((error) => {
        console.error("Theme application failed:", error);
        this.emit("error", `Theme application failed: ${error}`);
      });
      this.themeDebounceTimer = null;
    });
  }

  private async applyThemeWithManualOverrides(imagePath: string): Promise<void> {
    try {
      const chromash = getChromashPath();
      if (!GLib.file_test(chromash, GLib.FileTest.IS_EXECUTABLE)) {
        return;
      }

      // Get the theme info from chromash
      const themeOutput = await execAsync(`"${chromash}" theme`);
      const autoAnalysis = this.parseChromashThemeOutput(themeOutput) ?? this.fallbackColorAnalysis(imagePath);

      // Cache the auto-detected analysis
      this.cacheThemeAnalysis(imagePath, autoAnalysis);

      // Determine final analysis based on manual overrides
      const finalAnalysis: ThemeProperties = {
        tone: autoAnalysis.tone,
        chroma: autoAnalysis.chroma,
        mode: this.manualMode === "auto" ? autoAnalysis.mode : this.manualMode,
        scheme: this.manualScheme === "auto" ? autoAnalysis.scheme : this.manualScheme,
      };

      setTimeout(() => this.sendThemeNotification(imagePath, finalAnalysis), 0);
    } catch (error) {
      console.error("Failed to apply theme with manual overrides:", error);
      throw error;
    }
  }

  private parseChromashThemeOutput(output: string): ThemeProperties | null {
    try {
      let mode: "light" | "dark" = "dark";
      let scheme: "scheme-neutral" | "scheme-rainbow" = "scheme-rainbow";
      let tone = 20;
      let chroma = 40;

      const lines = output.trim().split("\n");
      for (const line of lines) {
        if (line.includes("light")) {
          mode = "light";
          tone = 80;
        } else if (line.includes("dark")) {
          mode = "dark";
          tone = 20;
        }

        if (line.includes("neutral")) {
          scheme = "scheme-neutral";
          chroma = 10;
        } else if (line.includes("rainbow") || line.includes("rainbow")) {
          scheme = "scheme-rainbow";
          chroma = 40;
        }
      }

      return { tone, chroma, mode, scheme };
    } catch (error) {
      console.warn("Failed to parse chromash theme output:", error);
      return null;
    }
  }

  private fallbackColorAnalysis(imagePath: string): ThemeProperties {
    const basename = GLib.path_get_basename(imagePath).toLowerCase();

    let mode: "light" | "dark" = "dark";
    let scheme: "scheme-neutral" | "scheme-rainbow" = "scheme-rainbow";

    // Filename-based heuristics
    if (
      basename.includes("light") ||
      basename.includes("day") ||
      basename.includes("bright")
    ) {
      mode = "light";
    } else if (
      basename.includes("dark") ||
      basename.includes("night") ||
      basename.includes("moon")
    ) {
      mode = "dark";
    } else {
      // Time-based fallback
      const hour = new Date().getHours();
      mode = hour >= 6 && hour < 18 ? "light" : "dark";
    }

    if (
      basename.includes("neutral") ||
      basename.includes("gray") ||
      basename.includes("grey") ||
      basename.includes("mono") ||
      basename.includes("black") ||
      basename.includes("white")
    ) {
      scheme = "scheme-neutral";
    }

    return {
      tone: mode === "light" ? 80 : 20,
      chroma: scheme === "scheme-rainbow" ? 40 : 10,
      mode,
      scheme,
    };
  }

  private cacheThemeAnalysis(
    imagePath: string,
    analysis: ThemeProperties,
  ): void {
    const entry: CachedThemeEntry = {
      ...analysis,
      timestamp: Date.now(),
    };

    this.themeCache.set(imagePath, entry);

    if (this.themeCache.size > this.maxThemeCacheSize.get()) {
      setTimeout(() => this.cleanupThemeCache(), 0);
    }
    this.saveThemeCache();
  }

  private cleanupThemeCache(): void {
    const maxSize = this.maxThemeCacheSize.get();
    if (this.themeCache.size <= maxSize) return;

    const entries = Array.from(this.themeCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );

    const toRemove = this.themeCache.size - maxSize;
    for (let i = 0; i < toRemove; i++) {
      this.themeCache.delete(entries[i][0]);
    }
  }

  private sendThemeNotification(
    imagePath: string,
    analysis: ThemeProperties,
  ): void {
    try {
      const notifySend = GLib.find_program_in_path("notify-send");
      if (!notifySend) return;

      const basename = GLib.path_get_basename(imagePath);
      const message = `Theme: ${analysis.mode} ${analysis.scheme}`;

      GLib.spawn_command_line_async(
        `${notifySend} "Chromash Theme Applied" "Image: ${basename}\n${message}"`,
      );
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }

  // Thumbnail Management
  async getThumbnail(imagePath: string): Promise<Gdk.Texture | null> {
    return this.thumbnailManager.getThumbnail(imagePath);
  }

  // Utility Methods
  clearThemeCache(): void {
    this.themeCache.clear();
    options["wallpaper.theme.cache"].value = {};
    console.log("Theme cache cleared");
  }

  dispose(): void {
    console.log("Disposing WallpaperStore");

    if (this.themeDebounceTimer) {
      this.themeDebounceTimer.cancel();
      this.themeDebounceTimer = null;
    }

    this.unsubscribers.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.error("Error during unsubscribe:", error);
      }
    });
    this.unsubscribers = [];

    this.themeCache.clear();
  }
}