import { Gtk } from "ags/gtk4";
import { windowSwitcher } from "utils/windowSwitcher";
import GLib from "gi://GLib";

// Load icon mappings from config file
function loadIconMappings(): Record<string, string> {
  const configPath = `${GLib.get_home_dir()}/.config/ags/configs/system/iconmappings.json`;
  
  try {
    const [success, contents] = GLib.file_get_contents(configPath);
    if (!success) throw new Error("Failed to read file");
    
    const text = new TextDecoder().decode(contents);
    const mappings: Record<string, string> = {};
    
    // Parse the file - supports various formats:
    // JSON: { "firefox": "web", "code": "code" }
    // or line-by-line: firefox=web or firefox:web
    
    // Try JSON first
    try {
      return JSON.parse(text);
    } catch {
      // Parse line-by-line format
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        // Support both = and : as separators
        const match = trimmed.match(/^(\S+)\s*[=:]\s*(\S+)$/);
        if (match) {
          mappings[match[1]] = match[2];
        }
      }
      return mappings;
    }
  } catch (error) {
    console.warn(`Could not load icon mappings from ${configPath}:`, error);
    // Return default mappings as fallback
    return {
      "firefox": "web", "zen": "web", "chromium": "web", "chrome": "web",
      "brave": "web", "safari": "web", "edge": "web",
      "code": "code", "vscode": "code", "vim": "code", "neovim": "code",
      "terminal": "terminal", "kitty": "terminal", "alacritty": "terminal",
      "foot": "terminal", "wezterm": "terminal", "konsole": "terminal",
      "nautilus": "folder_open", "thunar": "folder_open", "dolphin": "folder_open",
      "discord": "chat_bubble", "slack": "chat_bubble", "telegram": "chat_bubble",
      "spotify": "library_music", "vlc": "movie", "mpv": "movie",
    };
  }
}

export function WindowGrid() {
  let gridBox: Gtk.Box | null = null;
  const iconMap = loadIconMappings();

  const getIcon = (className: string): string => {
    const lower = className.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lower.includes(key)) return icon;
    }
    return "apps";
  };

  const ITEMS_PER_ROW = 5;

  const createWindowCard = (win: any, i: number, isSelected: boolean) => {
    const button = new Gtk.Button({
      css_classes: ["window-card", ...(isSelected ? ["selected"] : [])],
    });

    button.connect("clicked", () => {
      windowSwitcher.index = i;
      windowSwitcher.select(i);
    });

    // Mouse hover - but only if keyboard hasn't been used recently
    const motionController = new Gtk.EventControllerMotion();
    motionController.connect("enter", () => {
      const timeSinceKeyboard = Date.now() - windowSwitcher.lastKeyboardAction;
      // Only respond to mouse if keyboard hasn't been used in last 200ms
      if (timeSinceKeyboard > 200 && windowSwitcher.index !== i) {
        windowSwitcher.index = i;
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
          windowSwitcher.triggerUpdate();
          return false;
        });
      }
    });
    button.add_controller(motionController);

    const content = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 6,
      halign: Gtk.Align.CENTER,
    });

    // Icon
    content.append(new Gtk.Label({
      label: getIcon(win.class),
      css_classes: ["window-icon-large"],
    }));

    // Title
    const title = win.title.length > 25 ? win.title.slice(0, 22) + "..." : win.title;
    content.append(new Gtk.Label({
      label: title,
      ellipsize: 3,
      xalign: 0.5,
      css_classes: ["window-card-title"],
      max_width_chars: 25,
    }));

    // Workspace
    content.append(new Gtk.Label({
      label: `Workspace ${win.workspace.id}`,
      xalign: 0.5,
      css_classes: ["window-card-workspace"],
    }));

    // Class
    content.append(new Gtk.Label({
      label: win.class,
      xalign: 0.5,
      css_classes: ["window-card-subtitle"],
    }));

    // Badges
    if (win.floating || win.fullscreen) {
      const badgeBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 4,
        halign: Gtk.Align.CENTER,
      });

      if (win.fullscreen) {
        badgeBox.append(new Gtk.Label({
          label: "Full",
          css_classes: ["window-badge-small", "fullscreen-badge"],
        }));
      }

      if (win.floating) {
        badgeBox.append(new Gtk.Label({
          label: "Float",
          css_classes: ["window-badge-small", "floating-badge"],
        }));
      }

      content.append(badgeBox);
    }

    button.set_child(content);
    return button;
  };

  const rebuild = () => {
    if (!gridBox) return;
    
    // Clear grid
    let child = gridBox.get_first_child();
    while (child) {
      const next = child.get_next_sibling();
      gridBox.remove(child);
      child = next;
    }

    const total = windowSwitcher.filtered.length;

    if (total === 0) {
      gridBox.append(new Gtk.Label({
        label: windowSwitcher.query ? "No matching windows" : "No windows open",
        css_classes: ["no-entries"],
      }));
      return;
    }

    // Clamp index
    if (windowSwitcher.index >= total) windowSwitcher.index = total - 1;
    if (windowSwitcher.index < 0) windowSwitcher.index = 0;

    // Build rows with cards
    const numRows = Math.ceil(total / ITEMS_PER_ROW);

    for (let row = 0; row < numRows; row++) {
      const rowBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 0,
        halign: Gtk.Align.START,
      });

      const start = row * ITEMS_PER_ROW;
      const end = Math.min(start + ITEMS_PER_ROW, total);

      for (let i = start; i < end; i++) {
        const win = windowSwitcher.filtered[i];
        const isSelected = windowSwitcher.index === i;
        const card = createWindowCard(win, i, isSelected);
        rowBox.append(card);
      }

      gridBox.append(rowBox);
    }
  };

  windowSwitcher.addUpdateCallback(rebuild);

  return (
    <box 
      orientation={Gtk.Orientation.VERTICAL}
      spacing={8}
      cssClasses={["window-grid"]}
      $={(self) => { 
        gridBox = self;
      }} 
    />
  );
}