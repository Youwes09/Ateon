import { execAsync } from "ags/process";

export interface WindowInfo {
  address: string;
  title: string;
  class: string;
  workspace: {
    id: number;
    name: string;
  };
  monitor: number;
  fullscreen: boolean;
  floating: boolean;
  at: [number, number];
  size: [number, number];
}

class WindowSwitcherManager {
  windows: WindowInfo[] = [];
  filtered: WindowInfo[] = [];
  index = 0;
  query = "";
  isVisible = false;
  window: any = null;
  updateCallbacks: (() => void)[] = [];
  focusSearch?: () => void;
  navigateGrid?: (direction: 'up' | 'down' | 'left' | 'right') => void;

  addUpdateCallback(callback: () => void) {
    this.updateCallbacks.push(callback);
  }

  triggerUpdate() {
    this.updateCallbacks.forEach(callback => {
      try {
        callback();
      } catch (e) {
        console.error("Update callback error:", e);
      }
    });
  }

  set onUpdate(callback: (() => void) | undefined) {
    if (callback) {
      this.updateCallbacks = [callback];
    } else {
      this.updateCallbacks = [];
    }
  }

  get onUpdate() {
    return this.updateCallbacks[0];
  }

  async load() {
    console.log("Loading windows...");
    this.windows = [];
    this.filtered = [];

    try {
      const output = await execAsync(["hyprctl", "clients", "-j"]);
      const clients = JSON.parse(output);
      
      this.windows = clients
        .filter((c: any) => c.mapped && !c.hidden)
        .map((c: any) => ({
          address: c.address,
          title: c.title || c.initialTitle || "Untitled",
          class: c.class || c.initialClass || "Unknown",
          workspace: c.workspace,
          monitor: c.monitor,
          fullscreen: c.fullscreen,
          floating: c.floating,
          at: c.at,
          size: c.size,
        }));

      console.log(`Found ${this.windows.length} windows`);
      this.filter();
    } catch (e) {
      console.error("Failed to get windows:", e);
      this.windows = [];
      this.filtered = [];
      this.triggerUpdate();
    }
  }

  filter() {
    const q = this.query.toLowerCase();
    this.filtered = this.windows.filter(w => 
      w.title.toLowerCase().includes(q) || 
      w.class.toLowerCase().includes(q)
    );
    this.index = Math.min(this.index, Math.max(0, this.filtered.length - 1));
    this.triggerUpdate();
  }

  async select(i = this.index) {
    const win = this.filtered[i];
    if (!win) return;

    try {
      // Switch to the window's workspace first
      await execAsync(["hyprctl", "dispatch", "workspace", win.workspace.id.toString()]);
      // Then focus the window
      await execAsync(["hyprctl", "dispatch", "focuswindow", `address:${win.address}`]);
      this.hide();
    } catch (e) {
      console.error("Failed to focus window:", e);
    }
  }

  async close(i = this.index) {
    const win = this.filtered[i];
    if (!win) return;

    try {
      await execAsync(["hyprctl", "dispatch", "closewindow", `address:${win.address}`]);
      await this.load();
    } catch (e) {
      console.error("Failed to close window:", e);
    }
  }

  show() {
    console.log("Showing window switcher...");
    this.isVisible = true;
    this.index = 0; // Always start at first window
    if (this.window) this.window.visible = true;
    this.load().catch(console.error);
    return Promise.resolve();
  }

  hide() {
    this.isVisible = false;
    this.query = "";
    this.index = 0;
    if (this.window) this.window.visible = false;
  }

  key(keyval: number) {
    console.log("Key pressed:", keyval);
    
    const GDK_KEY_Up = 65362;
    const GDK_KEY_Down = 65364;
    const GDK_KEY_Left = 65361;
    const GDK_KEY_Right = 65363;
    const GDK_KEY_Return = 65293;
    const GDK_KEY_Delete = 65535;
    const GDK_KEY_Escape = 65307;

    switch (keyval) {
      case GDK_KEY_Up:
        console.log("Navigating up");
        if (this.navigateGrid) {
          this.navigateGrid('up');
        } else {
          console.error("navigateGrid not defined!");
        }
        break;
      case GDK_KEY_Down:
        console.log("Navigating down");
        if (this.navigateGrid) {
          this.navigateGrid('down');
        } else {
          console.error("navigateGrid not defined!");
        }
        break;
      case GDK_KEY_Left:
        console.log("Navigating left");
        if (this.navigateGrid) {
          this.navigateGrid('left');
        } else {
          console.error("navigateGrid not defined!");
        }
        break;
      case GDK_KEY_Right:
        console.log("Navigating right");
        if (this.navigateGrid) {
          this.navigateGrid('right');
        } else {
          console.error("navigateGrid not defined!");
        }
        break;
      case GDK_KEY_Return:
        console.log("Selecting window");
        this.select(this.index);
        break;
      case GDK_KEY_Delete:
        console.log("Closing window");
        this.close(this.index);
        break;
      case GDK_KEY_Escape:
        console.log("Hiding window switcher");
        this.hide();
        break;
    }
  }

  search(q: string) {
    this.query = q;
    this.filter();
  }

  clearSearch() {
    this.query = "";
    this.index = 0;
    this.filter();
  }
}

export const windowSwitcher = new WindowSwitcherManager();