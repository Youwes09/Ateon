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
  private isSelecting = false;

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

      console.log(`Loaded ${this.windows.length} windows`);
      this.filter();
      
      // Ensure index is valid after loading
      if (this.filtered.length > 0 && this.index >= this.filtered.length) {
        this.index = 0;
      }
    } catch (e) {
      console.error("Failed to get windows:", e);
      this.windows = [];
      this.filtered = [];
      this.triggerUpdate();
    }
  }

  filter() {
    const q = this.query.toLowerCase();
    
    if (q === "") {
      this.filtered = [...this.windows];
    } else {
      this.filtered = this.windows.filter(w => 
        w.title.toLowerCase().includes(q) || 
        w.class.toLowerCase().includes(q)
      );
    }
    
    // Clamp index to valid range
    if (this.filtered.length === 0) {
      this.index = 0;
    } else {
      this.index = Math.max(0, Math.min(this.index, this.filtered.length - 1));
    }
    
    console.log(`Filtered: ${this.filtered.length} windows, index: ${this.index}`);
    this.triggerUpdate();
  }

  async select(i = this.index) {
    // Prevent multiple simultaneous selections
    if (this.isSelecting) {
      console.log("Already selecting, ignoring duplicate call");
      return;
    }

    const win = this.filtered[i];
    if (!win) {
      console.error(`No window at index ${i}`);
      return;
    }

    this.isSelecting = true;
    console.log(`Selecting window: ${win.title} (${win.class}) at index ${i}`);
    
    try {
      // Switch to the window's workspace first
      console.log(`Switching to workspace ${win.workspace.id}`);
      await execAsync(["hyprctl", "dispatch", "workspace", win.workspace.id.toString()]);
      
      // Small delay to ensure workspace switch completes
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Then focus the window
      console.log(`Focusing window ${win.address}`);
      await execAsync(["hyprctl", "dispatch", "focuswindow", `address:${win.address}`]);
      
      console.log("Window selected successfully");
      
      // Hide the switcher after successful selection
      this.hide();
    } catch (e) {
      console.error("Failed to focus window:", e);
      this.isSelecting = false;
    }
  }

  async close(i = this.index) {
    const win = this.filtered[i];
    if (!win) {
      console.error(`No window at index ${i}`);
      return;
    }

    console.log(`Closing window: ${win.title} (${win.class})`);
    
    try {
      await execAsync(["hyprctl", "dispatch", "closewindow", `address:${win.address}`]);
      
      // Reload windows after closing
      await this.load();
      
      // If we closed the last window, move selection back
      if (this.index >= this.filtered.length && this.filtered.length > 0) {
        this.index = this.filtered.length - 1;
        this.triggerUpdate();
      }
    } catch (e) {
      console.error("Failed to close window:", e);
    }
  }

  show() {
    console.log("Showing window switcher");
    this.isVisible = true;
    this.index = 0;
    this.query = "";
    this.isSelecting = false;
    
    if (this.window) {
      this.window.visible = true;
    }
    
    // Load windows when showing
    this.load().catch(console.error);
    
    // Focus search bar after a brief delay
    setTimeout(() => {
      if (this.focusSearch) {
        this.focusSearch();
      }
    }, 100);
    
    return Promise.resolve();
  }

  hide() {
    console.log("Hiding window switcher");
    this.isVisible = false;
    this.query = "";
    this.index = 0;
    this.isSelecting = false;
    
    if (this.window) {
      this.window.visible = false;
    }
  }

  key(keyval: number) {
    // Don't process keys while selecting
    if (this.isSelecting) {
      console.log("Ignoring key press during selection");
      return;
    }

    console.log(`Key pressed: ${keyval}`);
    
    const GDK_KEY_Up = 65362;
    const GDK_KEY_Down = 65364;
    const GDK_KEY_Left = 65361;
    const GDK_KEY_Right = 65363;
    const GDK_KEY_Return = 65293;
    const GDK_KEY_KP_Enter = 65421; // Numpad enter
    const GDK_KEY_Delete = 65535;
    const GDK_KEY_BackSpace = 65288;
    const GDK_KEY_Escape = 65307;
    const GDK_KEY_Tab = 65289;
    const GDK_KEY_ISO_Left_Tab = 65056; // Shift+Tab

    switch (keyval) {
      case GDK_KEY_Up:
        console.log("↑ Navigate up");
        this.navigateGrid?.('up');
        break;
        
      case GDK_KEY_Down:
        console.log("↓ Navigate down");
        this.navigateGrid?.('down');
        break;
        
      case GDK_KEY_Left:
        console.log("← Navigate left");
        this.navigateGrid?.('left');
        break;
        
      case GDK_KEY_Right:
        console.log("→ Navigate right");
        this.navigateGrid?.('right');
        break;
        
      case GDK_KEY_Tab:
        console.log("Tab - Navigate right");
        this.navigateGrid?.('right');
        break;
        
      case GDK_KEY_ISO_Left_Tab:
        console.log("Shift+Tab - Navigate left");
        this.navigateGrid?.('left');
        break;
        
      case GDK_KEY_Return:
      case GDK_KEY_KP_Enter:
        console.log("⏎ Select window");
        if (this.filtered.length > 0) {
          this.select(this.index).catch(e => {
            console.error("Select failed:", e);
            this.isSelecting = false;
          });
        }
        break;
        
      case GDK_KEY_Delete:
      case GDK_KEY_BackSpace:
        console.log("⌫ Close window");
        if (this.filtered.length > 0) {
          this.close(this.index).catch(console.error);
        }
        break;
        
      case GDK_KEY_Escape:
        console.log("Esc - Hide");
        this.hide();
        break;
        
      default:
        console.log(`Unhandled key: ${keyval}`);
    }
  }

  search(q: string) {
    console.log(`Search: "${q}"`);
    this.query = q;
    this.filter();
  }

  clearSearch() {
    console.log("Clearing search");
    this.query = "";
    this.index = 0;
    this.filter();
  }
}

export const windowSwitcher = new WindowSwitcherManager();