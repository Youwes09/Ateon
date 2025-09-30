import Apps from "gi://AstalApps";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import { register } from "ags/gobject";
import { BaseProvider } from "../SearchProvider.ts";
import { AppItem, ProviderConfig, ISearchProvider } from "../types.ts";

interface PinnedAppsConfig {
  pinned: string[]; // Array of app IDs
}

@register({ GTypeName: "AppProvider" })
export class AppProvider
  extends BaseProvider
  implements ISearchProvider<AppItem>
{
  readonly config: ProviderConfig = {
    command: "apps",
    icon: "Apps",
    name: "Apps",
    placeholder: "Search apps...",
    component: "list",
    maxResults: 8,
  };

  private apps = new Apps.Apps();
  private pinnedApps: string[] = [];
  private configPath: string;

  constructor() {
    super();
    this.command = "apps";
    this.configPath = GLib.build_filenamev([
      GLib.get_home_dir(),
      ".config",
      "ags",
      "pickerapps.json"
    ]);
    
    this.loadPinnedApps();
    this.loadInitialResults();
  }

  private loadPinnedApps(): void {
    try {
      if (GLib.file_test(this.configPath, GLib.FileTest.EXISTS)) {
        const file = Gio.File.new_for_path(this.configPath);
        const [success, contents] = file.load_contents(null);
        
        if (success) {
          const text = new TextDecoder().decode(contents);
          const config: PinnedAppsConfig = JSON.parse(text);
          this.pinnedApps = config.pinned || [];
          console.log(`Loaded ${this.pinnedApps.length} pinned apps`);
        }
      } else {
        // Create default config file
        this.createDefaultConfig();
      }
    } catch (e) {
      console.error("Failed to load pinned apps config:", e);
      this.pinnedApps = [];
    }
  }

  private createDefaultConfig(): void {
    try {
      const defaultConfig: PinnedAppsConfig = {
        pinned: []
      };
      
      const file = Gio.File.new_for_path(this.configPath);
      const contents = JSON.stringify(defaultConfig, null, 2);
      file.replace_contents(
        new TextEncoder().encode(contents),
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null
      );
      
      console.log(`Created default pickerapps.json at ${this.configPath}`);
    } catch (e) {
      console.error("Failed to create default config:", e);
    }
  }

  private getAppId(app: any): string {
    // AstalApps.Application has an app property that contains the Gio.DesktopAppInfo
    // which has get_id() method
    try {
      if (app.app && typeof app.app.get_id === 'function') {
        return app.app.get_id() || "";
      }
      // Fallback: try to get from desktop file path
      if (app.get_id && typeof app.get_id === 'function') {
        return app.get_id() || "";
      }
      return "";
    } catch (e) {
      console.warn("Could not get app ID:", e);
      return "";
    }
  }

  private sortAppsByPinned(apps: any[]): any[] {
    const pinned: any[] = [];
    const unpinned: any[] = [];

    apps.forEach(app => {
      const appId = this.getAppId(app);
      if (appId && this.pinnedApps.includes(appId)) {
        pinned.push(app);
      } else {
        unpinned.push(app);
      }
    });

    // Sort pinned by their order in the config
    pinned.sort((a, b) => {
      const indexA = this.pinnedApps.indexOf(this.getAppId(a));
      const indexB = this.pinnedApps.indexOf(this.getAppId(b));
      return indexA - indexB;
    });

    // Sort unpinned alphabetically
    unpinned.sort((a, b) => a.name.localeCompare(b.name));

    return [...pinned, ...unpinned];
  }

  private loadInitialResults(): void {
    const allApps = this.apps.get_list();
    const sorted = this.sortAppsByPinned(allApps);
    this.setResults(sorted.slice(0, this.config.maxResults));
  }

  async search(query: string): Promise<void> {
    this.setLoading(true);

    try {
      if (query.trim().length === 0) {
        this.loadInitialResults();
        return;
      }

      const results = this.apps.fuzzy_query(query);
      const sorted = this.sortAppsByPinned(results);
      this.setResults(sorted.slice(0, this.config.maxResults));
    } finally {
      this.setLoading(false);
    }
  }

  activate(item: AppItem): void {
    item.launch();
  }
}