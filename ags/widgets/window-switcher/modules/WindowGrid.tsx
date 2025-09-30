import { Gtk } from "ags/gtk4";
import { windowSwitcher } from "utils/windowSwitcher";
import GLib from "gi://GLib";

export function WindowGrid() {
  let gridBox: Gtk.Box | null = null;

  const iconMap: Record<string, string> = {
    // Browsers
    "firefox": "web",
    "zen": "web",
    "chromium": "web",
    "chrome": "web",
    "brave": "web",
    "safari": "web",
    "edge": "web",
    
    // Development
    "code": "code",
    "vscode": "code",
    "vim": "code",
    "neovim": "code",
    "emacs": "code",
    
    // Terminals
    "terminal": "terminal",
    "kitty": "terminal",
    "alacritty": "terminal",
    "foot": "terminal",
    "wezterm": "terminal",
    "konsole": "terminal",
    "gnome-terminal": "terminal",
    
    // File Managers
    "nautilus": "folder_open",
    "thunar": "folder_open",
    "dolphin": "folder_open",
    "nemo": "folder_open",
    "pcmanfm": "folder_open",
    
    // Communication
    "discord": "chat_bubble",
    "slack": "chat_bubble",
    "telegram": "chat_bubble",
    "signal": "chat_bubble",
    
    // Media
    "spotify": "library_music",
    "vlc": "movie",
    "mpv": "movie",
    
    // Graphics
    "gimp": "palette",
    "inkscape": "draw",
    "blender": "view_in_ar",
    "krita": "palette",
    
    // Notes & Productivity
    "obsidian": "note_alt",
    "notion": "note_alt",
    "logseq": "note_alt",
    "joplin": "note_alt",
  };

  const getIcon = (className: string): string => {
    const lower = className.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lower.includes(key)) return icon;
    }
    return "apps";
  };

  const MAX_ROWS = 2;
  const MAX_COLS = 5;

  // Calculate how many items per row to create a balanced 2-row layout
  const getBalancedLayout = (total: number): number => {
    if (total <= MAX_COLS) return total; // Single row
    return Math.ceil(total / MAX_ROWS); // Divide evenly into 2 rows
  };

  // Simple up/down navigation through all windows
  windowSwitcher.navigateGrid = (direction: 'up' | 'down' | 'left' | 'right') => {
    const total = windowSwitcher.filtered.length;
    if (total === 0) return;

    console.log(`Navigate ${direction}, current index: ${windowSwitcher.index}, total: ${total}`);

    if (direction === 'up' || direction === 'left') {
      // Move up, cycle to bottom if at top
      windowSwitcher.index = windowSwitcher.index > 0 
        ? windowSwitcher.index - 1 
        : total - 1;
    } else if (direction === 'down' || direction === 'right') {
      // Move down, cycle to top if at bottom
      windowSwitcher.index = windowSwitcher.index < total - 1 
        ? windowSwitcher.index + 1 
        : 0;
    }

    console.log(`New index: ${windowSwitcher.index}`);
    windowSwitcher.triggerUpdate();
  };

  const createWindowCard = (win: any, i: number, isSelected: boolean) => {
    const button = new Gtk.Button({
      css_classes: ["window-card", ...(isSelected ? ["selected"] : [])],
    });

    button.connect("clicked", () => {
      windowSwitcher.index = i;
      windowSwitcher.select(i).catch(console.error);
    });

    // Only update selection on mouse enter, don't trigger updates during rebuild
    const motionController = new Gtk.EventControllerMotion();
    let isEntered = false;
    
    motionController.connect("enter", () => {
      // Delay the hover effect to avoid conflicts during initial load
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
        if (windowSwitcher.index !== i && isEntered) {
          windowSwitcher.index = i;
          windowSwitcher.triggerUpdate();
        }
        return false;
      });
      isEntered = true;
    });
    
    motionController.connect("leave", () => {
      isEntered = false;
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

    // Workspace highlight
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
    
    let child = gridBox.get_first_child();
    while (child) {
      const next = child.get_next_sibling();
      gridBox.remove(child);
      child = next;
    }

    if (windowSwitcher.filtered.length === 0) {
      gridBox.append(new Gtk.Label({
        label: windowSwitcher.query ? "No matching windows" : "No windows open",
        css_classes: ["no-entries"],
      }));
      return;
    }

    const total = windowSwitcher.filtered.length;
    const itemsPerRow = getBalancedLayout(total);
    const rows = Math.min(MAX_ROWS, Math.ceil(total / itemsPerRow));

    for (let row = 0; row < rows; row++) {
      const rowBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 0,
        halign: Gtk.Align.START,
      });

      const startIdx = row * itemsPerRow;
      const endIdx = Math.min(startIdx + itemsPerRow, total);

      for (let i = startIdx; i < endIdx; i++) {
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
        setTimeout(() => windowSwitcher.load(), 100); 
      }} 
    />
  );
}