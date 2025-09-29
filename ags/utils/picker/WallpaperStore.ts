import GObject from "gi://GObject";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GdkPixbuf from "gi://GdkPixbuf";
import { Gdk } from "ags/gtk4";
import { Accessor } from "ags";
import { execAsync } from "ags/process";
import { timeout, Timer } from "ags/time";
import { register, property, signal } from "ags/gobject";
import options from "options";
import Fuse from "./fuse.js";
import type { WallpaperItem, CachedThemeEntry, CachedThumbnail, ThemeProperties } from "./types.ts";

// Helper for chromash absolute path
const CHROMASH_PATH = GLib.build_filenamev([
  GLib.get_home_dir(),
  ".config",
  "ags",
  "utils",
  "chromash",
  "chromash"
]);

function getChromashPath() {
  // Optionally make this relative to this file's location, but absolute is easier for ags
  return CHROMASH_PATH;
}

@register({ GTypeName: "WallpaperStore" })
export class WallpaperStore extends GObject.Object {
  @property(Array) wallpapers: WallpaperItem[] = [];
  @property(String) currentWallpaperPath: string = "";
  @property(Boolean) includeHidden: boolean = false;
  @property(Number) maxItems: number = 12;

  @signal([Array], GObject.TYPE_NONE, { default: false })
  wallpapersChanged(wallpapers: WallpaperItem[]): undefined {}
  @signal([String], GObject.TYPE_NONE, { default: false })
  wallpaperSet(path: string): undefined {}

  private files: Gio.File[] = [];
  private fuse!: Fuse;
  private thumbnailCache = new Map<string, CachedThumbnail>();
  private themeCache = new Map<string, CachedThemeEntry>();
  private unsubscribers: (() => void)[] = [];
  private thumbnailCleanupInterval: any;
  private themeDebounceTimer: Timer | null = null;
  private readonly THEME_DEBOUNCE_DELAY = 100;

  // Configuration
  private wallpaperDir: Accessor<string>;
  private currentWallpaper: Accessor<string>;
  private maxThumbnailCacheSize: Accessor<number>;
  private maxThemeCacheSize: Accessor<number>;

  constructor(params: { includeHidden?: boolean } = {}) {
    super();
    this.includeHidden = params.includeHidden ?? false;
    this.wallpaperDir = options["wallpaper.dir"]((wd) => String(wd));
    this.currentWallpaper = options["wallpaper.current"]((w) => String(w));
    this.maxThumbnailCacheSize = options["wallpaper.cache-size"]((c) => Number(c));
    this.maxThemeCacheSize = options["wallpaper.theme-cache-size"]((s) => Number(s));
    this.setupWatchers();
    this.loadThemeCache();
    this.loadWallpapers();
    this.startPeriodicCleanup();
  }

  private setupWatchers() {
    this.unsubscribers.push(this.wallpaperDir.subscribe(() => this.loadWallpapers()));
  }

  private loadThemeCache() {
    try {
      const persistentCache = options["wallpaper.theme-cache"].get() as Record<string, any>;
      Object.entries(persistentCache).forEach(([path, entry]) => {
        if (typeof entry === "object" && entry.timestamp)
          this.themeCache.set(path, entry as CachedThemeEntry);
      });
    } catch (e) {
      console.warn("Failed to load theme cache:", e);
      this.emit("error", "Failed to load theme cache");
    }
  }

  private saveThemeCache() {
    setTimeout(() => {
      try {
        const persistentCache = Object.fromEntries(this.themeCache);
        options["wallpaper.theme-cache"].value = persistentCache as any;
      } catch (e) {
        console.error("Failed to save theme cache:", e);
        this.emit("error", "Failed to save theme cache");
      }
    }, 0);
  }

  private loadWallpapers() {
    try {
      const dirPath = this.wallpaperDir.get();
      if (!GLib.file_test(dirPath, GLib.FileTest.EXISTS)) {
        console.warn(`Wallpaper directory does not exist: ${dirPath}`);
        this.updateWallpapers([], []);
        return;
      }
      this.files = this.ls(dirPath, { level: 2, includeHidden: this.includeHidden })
        .filter((file) => file.query_info(
          Gio.FILE_ATTRIBUTE_STANDARD_CONTENT_TYPE,
          Gio.FileQueryInfoFlags.NONE,
          null,
        ).get_content_type()?.startsWith("image/"));
      const items = this.files.map((file) => ({
        id: file.get_path() || file.get_uri(),
        name: file.get_basename() || "Unknown",
        description: "Image",
        iconName: "image-x-generic",
        path: file.get_path() ?? undefined,
        file
      }));
      this.updateWallpapers(this.files, items);
      console.log(`Loaded ${this.files.length} wallpapers from ${dirPath}`);
    } catch (e) {
      console.error("Failed to load wallpapers:", e);
      this.emit("error", "Failed to load wallpapers");
      this.updateWallpapers([], []);
    }
  }

  private updateWallpapers(files: Gio.File[], items: WallpaperItem[]) {
    this.files = files;
    this.wallpapers = items;
    this.updateFuse();
    this.emit("wallpapers-changed", items);
  }

  private ls(dir: string, props?: { level?: number; includeHidden?: boolean }): Gio.File[] {
    const { level = 0, includeHidden = false } = props ?? {};
    if (!GLib.file_test(dir, GLib.FileTest.IS_DIR)) return [];
    const files: Gio.File[] = [];
    try {
      const enumerator = Gio.File.new_for_path(dir).enumerate_children(
        "standard::name,standard::type",
        Gio.FileQueryInfoFlags.NONE,
        null
      );
      for (const info of enumerator) {
        const file = enumerator.get_child(info);
        const basename = file.get_basename();
        if (basename?.startsWith(".") && !includeHidden) continue;
        const type = file.query_file_type(Gio.FileQueryInfoFlags.NONE, null);
        if (type === Gio.FileType.DIRECTORY && level > 0)
          files.push(...this.ls(file.get_path()!, { includeHidden, level: level - 1 }));
        else files.push(file);
      }
    } catch (e) {
      console.error(`Failed to list directory ${dir}:`, e);
    }
    return files;
  }

  private updateFuse() {
    this.fuse = new Fuse(this.wallpapers, {
      keys: ["name"], includeScore: true, threshold: 0.6, location: 0, distance: 100,
      minMatchCharLength: 1, ignoreLocation: true, ignoreFieldNorm: false,
      useExtendedSearch: false, shouldSort: true, isCaseSensitive: false,
    });
  }

  // Public API
  search(text: string): WallpaperItem[] {
    if (!text?.trim()) return this.getAllWallpapers();
    return this.fuse.search(text, { limit: this.maxItems }).map((r) => r.item);
  }

  // Method to get all wallpapers sorted alphabetically
  getAllWallpapers(): WallpaperItem[] {
    return [...this.wallpapers]
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, this.maxItems);
  }

  async setRandomWallpaper() {
    if (!this.wallpapers.length) {
      console.warn("No wallpapers available for random selection");
      this.emit("error", "No wallpapers available");
      return;
    }
    const current = this.currentWallpaper.get();
    const pool = this.wallpapers.filter((x) => x.path !== current) || this.wallpapers;
    const random = pool[Math.floor(Math.random() * pool.length)];
    await this.setWallpaper(random.file);
  }

  async refresh() { this.loadWallpapers(); }

  async setWallpaper(file: Gio.File) {
    const imagePath = file.get_path();
    if (!imagePath) {
      console.error("Could not get file path for wallpaper");
      this.emit("error", "Could not get file path for wallpaper");
      return;
    }
    const prev = this.currentWallpaper.get();
    if (prev === imagePath) return;
    options["wallpaper.current"].value = imagePath;
    this.currentWallpaperPath = imagePath;
    try {
      await this.applyWallpaperWithChromash(imagePath);
      this.emit("wallpaper-set", imagePath);
    } catch (e) {
      console.error("Wallpaper setting failed:", e);
      this.emit("error", `Wallpaper setting failed: ${e}`);
      options["wallpaper.current"].value = prev;
      this.currentWallpaperPath = prev;
    }
  }

  private async applyWallpaperWithChromash(imagePath: string) {
    const chromash = getChromashPath();
    if (!GLib.file_test(chromash, GLib.FileTest.IS_EXECUTABLE)) {
      throw new Error("chromash not found or not executable at " + chromash);
    }
    await execAsync(`"${chromash}" wallpaper "${imagePath}"`);

    await new Promise(resolve => setTimeout(resolve, 100));
    await execAsync(`"${chromash}" export-colors`);
    this.scheduleThemeUpdate(imagePath);
  }

  private scheduleThemeUpdate(imagePath: string) {
    if (this.themeDebounceTimer) this.themeDebounceTimer.cancel();
    this.themeDebounceTimer = timeout(this.THEME_DEBOUNCE_DELAY, () => {
      this.cacheThemeFromChromash(imagePath).catch((e) => {
        console.error("Theme caching failed:", e);
        this.emit("error", `Theme caching failed: ${e}`);
      });
      this.themeDebounceTimer = null;
    });
  }

  private async cacheThemeFromChromash(imagePath: string) {
    try {
      const chromash = getChromashPath();
      if (!GLib.file_test(chromash, GLib.FileTest.IS_EXECUTABLE)) return;
      const themeOutput = await execAsync(`"${chromash}" theme`);
      const analysis = this.parseChromashThemeOutput(themeOutput) ?? this.fallbackColorAnalysis(imagePath);
      this.cacheThemeAnalysis(imagePath, analysis);
      setTimeout(() => this.sendThemeNotification(imagePath, analysis), 0);
    } catch (e) {
      console.error("Failed to cache theme from chromash:", e);
      this.cacheThemeAnalysis(imagePath, this.fallbackColorAnalysis(imagePath));
    }
  }

  private parseChromashThemeOutput(output: string): ThemeProperties | null {
    try {
      let mode: "light" | "dark" = "dark";
      let scheme: "scheme-neutral" | "scheme-vibrant" = "scheme-vibrant";
      let tone = 20, chroma = 40;
      output.trim().split("\n").forEach((line) => {
        if (line.includes("light")) { mode = "light"; tone = 80; }
        else if (line.includes("dark")) { mode = "dark"; tone = 20; }
        if (line.includes("neutral")) { scheme = "scheme-neutral"; chroma = 10; }
        else if (line.includes("vibrant") || line.includes("rainbow")) { scheme = "scheme-vibrant"; chroma = 40; }
      });
      return { tone, chroma, mode, scheme };
    } catch (e) {
      console.warn("Failed to parse chromash theme output:", e);
      return null;
    }
  }

  private fallbackColorAnalysis(imagePath: string): ThemeProperties {
    const name = GLib.path_get_basename(imagePath).toLowerCase();
    let mode: "light" | "dark" = name.match(/light|day|bright/) ? "light" :
      name.match(/dark|night|moon/) ? "dark" :
      (new Date().getHours() >= 6 && new Date().getHours() < 18 ? "light" : "dark");
    let scheme: "scheme-neutral" | "scheme-vibrant" = name.match(/neutral|gray|grey|mono|black|white/) ? "scheme-neutral" : "scheme-vibrant";
    return { tone: mode === "light" ? 80 : 20, chroma: scheme === "scheme-vibrant" ? 40 : 10, mode, scheme };
  }

  private cacheThemeAnalysis(imagePath: string, analysis: ThemeProperties) {
    this.themeCache.set(imagePath, { ...analysis, timestamp: Date.now() });
    if (this.themeCache.size > this.maxThemeCacheSize.get()) setTimeout(() => this.cleanupThemeCache(), 0);
    this.saveThemeCache();
  }

  private cleanupThemeCache() {
    const maxSize = this.maxThemeCacheSize.get();
    if (this.themeCache.size <= maxSize) return;
    Array.from(this.themeCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, this.themeCache.size - maxSize)
      .forEach(([key]) => this.themeCache.delete(key));
  }

  private sendThemeNotification(imagePath: string, analysis: ThemeProperties) {
    try {
      const notifySend = GLib.find_program_in_path("notify-send");
      if (!notifySend) return;
      const basename = GLib.path_get_basename(imagePath);
      GLib.spawn_command_line_async(`${notifySend} "Chromash Theme Applied" "Image: ${basename}\nTheme: ${analysis.mode} ${analysis.scheme}"`);
    } catch (e) { console.error("Failed to send notification:", e); }
  }

  async applyColorTheme(color: string, mode?: "light" | "dark", scheme?: string) {
    const chromash = getChromashPath();
    if (!GLib.file_test(chromash, GLib.FileTest.IS_EXECUTABLE)) throw new Error("chromash not found or not executable at " + chromash);
    let cmd = `"${chromash}" color "${color}"`;
    if (mode) cmd += ` --mode ${mode}`;
    if (scheme) cmd += ` --scheme ${scheme}`;
    await execAsync(cmd);
    await execAsync(`"${chromash}" export-colors`);
    console.log(`Applied color theme: ${color}`);
  }

  async applyPreset(presetName: string) {
    const chromash = getChromashPath();
    if (!GLib.file_test(chromash, GLib.FileTest.IS_EXECUTABLE)) throw new Error("chromash not found or not executable at " + chromash);
    await execAsync(`"${chromash}" preset apply "${presetName}"`);
    await execAsync(`"${chromash}" export-colors`);
    console.log(`Applied preset: ${presetName}`);
  }

  async listPresets(): Promise<string[]> {
    const chromash = getChromashPath();
    if (!GLib.file_test(chromash, GLib.FileTest.IS_EXECUTABLE)) return [];
    try {
      return (await execAsync(`"${chromash}" presets`)).trim().split('\n').filter(Boolean);
    } catch (e) {
      console.error("Failed to list presets:", e);
      return [];
    }
  }

  // Thumbnail Management
  async getThumbnail(imagePath: string): Promise<Gdk.Texture | null> {
    const cached = this.thumbnailCache.get(imagePath);
    if (cached) { cached.lastAccessed = Date.now(); return cached.texture; }
    try {
      const texture = await this.loadThumbnail(imagePath);
      if (texture) {
        this.thumbnailCache.set(imagePath, { texture, timestamp: Date.now(), lastAccessed: Date.now() });
        setTimeout(() => this.performThumbnailCacheCleanup(), 0);
      }
      return texture;
    } catch (e) {
      console.error(`Failed to load thumbnail for ${imagePath}:`, e);
      return null;
    }
  }

  private async loadThumbnail(imagePath: string) {
    try {
      const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(imagePath, 280, 200, true);
      return pixbuf ? Gdk.Texture.new_for_pixbuf(pixbuf) : null;
    } catch (e) {
      console.error(`Failed to load thumbnail for ${imagePath}:`, e);
      return null;
    }
  }

  private performThumbnailCacheCleanup() {
    const maxSize = this.maxThumbnailCacheSize.get();
    if (this.thumbnailCache.size <= maxSize) return;
    Array.from(this.thumbnailCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
      .slice(0, this.thumbnailCache.size - maxSize)
      .forEach(([key]) => this.thumbnailCache.delete(key));
  }

  private startPeriodicCleanup() {
    this.thumbnailCleanupInterval = setInterval(() => this.performThumbnailCacheCleanup(), 10 * 60 * 1000);
  }

  clearThumbnailCache() { this.thumbnailCache.clear(); console.log("Thumbnail cache cleared"); }
  clearThemeCache() { this.themeCache.clear(); options["wallpaper.theme-cache"].value = {}; console.log("Theme cache cleared"); }

  dispose() {
    console.log("Disposing WallpaperStore");
    if (this.themeDebounceTimer) { this.themeDebounceTimer.cancel(); this.themeDebounceTimer = null; }
    this.unsubscribers.forEach((unsub) => { try { unsub(); } catch (e) { console.error("Error during unsubscribe:", e); } });
    this.unsubscribers = [];
    if (this.thumbnailCleanupInterval) { clearInterval(this.thumbnailCleanupInterval); this.thumbnailCleanupInterval = undefined; }
    this.clearThumbnailCache();
    this.clearThemeCache();
  }
}