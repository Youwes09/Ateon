import { Gtk } from "ags/gtk4";
import { windowSwitcher } from "utils/windowSwitcher";
import GLib from "gi://GLib";

export function SearchBar() {
  let searchEntry: any = null;
  let hintLabel: Gtk.Label | null = null;
  
  windowSwitcher.focusSearch = () => {
    searchEntry?.grab_focus();
  };

  const updateHintVisibility = () => {
    if (hintLabel) {
      const shouldShow = windowSwitcher.filtered.length > 1;
      hintLabel.set_visible(shouldShow);
    }
  };

  windowSwitcher.addUpdateCallback(updateHintVisibility);

  return (
    <box cssClasses={["search-section"]} orientation={Gtk.Orientation.HORIZONTAL}>
      <label label="search" cssClasses={["search-icon"]} />
      <entry 
        $={(self) => { 
          searchEntry = self;
          // Focus search when switcher opens
          windowSwitcher.addUpdateCallback(() => {
            if (windowSwitcher.isVisible && !windowSwitcher.query) {
              // Small delay to ensure window is ready
              GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
                self.grab_focus();
                return false;
              });
            }
          });
        }} 
        placeholderText="Search windows by title or class..." 
        text={windowSwitcher.query} 
        onChanged={({ text }) => {
          console.log(`Search text changed: "${text}"`);
          windowSwitcher.search(text || "");
        }} 
        onActivate={() => {
          // Enter key in search - select current window
          console.log("Search activated (Enter pressed)");
          windowSwitcher.select();
        }}
        cssClasses={["search-entry"]} 
        hexpand 
      />
      <label 
        label="↑↓: Nav • Enter: Focus • Tab: Cycle" 
        cssClasses={["shortcut-hint"]} 
        $={(self) => { hintLabel = self; }}
      />
    </box>
  );
}