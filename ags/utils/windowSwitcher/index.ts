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
  lastKeyboardAction = 0;

  addUpdateCallback(callback: () => void) {
    this.updateCallbacks.push(callback);
  }

  triggerUpdate() {
    this.updateCallbacks.forEach(callback => {
      try {
        callback();
      } catch (e) {
        // Silent error handling
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
        }))
        .sort((a, b) => {
          // Sort by workspace ID first
          if (a.workspace.id !== b.workspace.id) {
            return a.workspace.id - b.workspace.id;
          }
          // Within same workspace, sort by x position (left to right)
          return a.at[0] - b.at[0];
        });

      this.filter();
    } catch (e) {
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
    if (!win) {
      return;
    }
    
    try {
      await execAsync(["hyprctl", "dispatch", "workspace", win.workspace.id.toString()]);
      await execAsync(["hyprctl", "dispatch", "focuswindow", `address:${win.address}`]);
      this.hide();
    } catch (e) {
      // Silent error handling
    }
  }

  show() {
    this.isVisible = true;
    this.lastKeyboardAction = 0;
    if (this.window) this.window.visible = true;
    this.load().catch(() => {});
    return Promise.resolve();
  }

  hide() {
    this.isVisible = false;
    this.query = "";
    this.index = 0;
    if (this.window) this.window.visible = false;
  }

  // Cycle to next window (wraps around)
  next() {
    if (this.filtered.length > 0) {
      this.index = (this.index + 1) % this.filtered.length;
      this.lastKeyboardAction = Date.now();
      this.triggerUpdate();
    }
  }

  // Cycle to previous window (wraps around)
  prev() {
    if (this.filtered.length > 0) {
      this.index = (this.index - 1 + this.filtered.length) % this.filtered.length;
      this.lastKeyboardAction = Date.now();
      this.triggerUpdate();
    }
  }

  up() {
    if (this.filtered.length > 0) {
      // Cycle behavior - wrap to bottom if at top
      this.index = (this.index - 1 + this.filtered.length) % this.filtered.length;
      this.lastKeyboardAction = Date.now();
      this.triggerUpdate();
    }
  }

  down() {
    if (this.filtered.length > 0) {
      // Cycle behavior - wrap to top if at bottom
      this.index = (this.index + 1) % this.filtered.length;
      this.lastKeyboardAction = Date.now();
      this.triggerUpdate();
    }
  }

  key(k: number) {
    switch (k) {
      case 65307: 
        this.hide(); 
        break;
      case 65293: 
        this.select(); 
        break;
      case 65289: // Tab key
        this.next();
        break;
      case 65056: // Shift+Tab (ISO_Left_Tab)
        this.prev();
        break;
      case 65362: 
        this.up(); 
        break;
      case 65364: 
        this.down(); 
        break;
      default:
        if (this.focusSearch) this.focusSearch();
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