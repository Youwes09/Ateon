import { register } from "ags/gobject";
import { BaseProvider } from "../SearchProvider.ts";
import { WallpaperItem, ProviderConfig, ISearchProvider } from "../types.ts";
import { WallpaperStore } from "../WallpaperStore.ts";
import { Gdk } from "ags/gtk4";

@register({ GTypeName: "WallpaperProvider" })
export class WallpaperProvider
  extends BaseProvider
  implements ISearchProvider<WallpaperItem>
{
  readonly config: ProviderConfig = {
    command: "wallpapers",
    icon: "Image_Search",
    name: "Wallpapers",
    placeholder: "Search wallpapers...",
    component: "grid",
    maxResults: 12,
    features: {
      random: true,
      refresh: true,
    },
  };

  private wallpapers = new WallpaperStore();

  constructor() {
    super();
    this.command = "wallpapers";
    this.wallpapers.maxItems = this.config.maxResults;
    
    // Load initial results
    this.loadInitialResults();
  }

  private loadInitialResults(): void {
    const initialResults = this.wallpapers.getAllWallpapers();
    this.setResults(initialResults);
  }

  async search(query: string): Promise<void> {
    this.setLoading(true);

    try {
      if (query.trim().length === 0) {
        // Show all wallpapers when query is empty
        const allWallpapers = this.wallpapers.getAllWallpapers();
        this.setResults(allWallpapers);
        return;
      }
      const results = this.wallpapers.search(query);
      const limitedResults = results.slice(0, this.wallpapers.maxItems);
      this.setResults(limitedResults);
    } finally {
      this.setLoading(false);
    }
  }

  activate(item: WallpaperItem): void {
    this.wallpapers.setWallpaper(item.file);
  }

  async refresh(): Promise<void> {
    this.setLoading(true);
    try {
      await this.wallpapers.refresh();
      // Reload initial results after refresh
      this.loadInitialResults();
    } finally {
      this.setLoading(false);
    }
  }

  async random(): Promise<void> {
    await this.wallpapers.setRandomWallpaper();
  }

  async getThumbnail(imagePath: string): Promise<Gdk.Texture | null> {
    return await this.wallpapers.getThumbnail(imagePath);
  }

  dispose(): void {
    this.wallpapers.dispose();
  }
}