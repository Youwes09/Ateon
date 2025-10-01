import app from "ags/gtk4/app";
import { Astal, Gtk } from "ags/gtk4";
import { gdkmonitor } from "utils/monitors.ts";
import { windowSwitcher } from "utils/windowSwitcher";
import { WindowGrid } from "./modules/WindowGrid.tsx";
import { SearchBar } from "./modules/SearchBar.tsx";
import GLib from "gi://GLib";

function WindowSwitcherLayout({ children, onClickOutside }) {
  return (
    <box cssClasses={["window-switcher-background"]}>
      <box 
        orientation={Gtk.Orientation.VERTICAL} 
        valign={Gtk.Align.CENTER}
        halign={Gtk.Align.CENTER}
      >
        <box 
          cssClasses={["window-switcher"]} 
          orientation={Gtk.Orientation.VERTICAL}
        >
          {children}
        </box>
      </box>
      <button cssClasses={["invisible-close"]} onClicked={onClickOutside} />
    </box>
  );
}

export default function WindowSwitcher() {
  return (
    <window
      name="window-switcher"
      visible={windowSwitcher.isVisible}
      gdkmonitor={gdkmonitor}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.ON_DEMAND}
      application={app}
      $={(self) => { 
        windowSwitcher.window = self;
        
        self.connect("notify::visible", () => {
          if (self.visible) {
            windowSwitcher.load().catch(console.error);
          }
        });

        const keyController = new Gtk.EventControllerKey();
        keyController.set_propagation_phase(Gtk.PropagationPhase.BUBBLE);
        
        keyController.connect("key-pressed", (_, keyval, keycode, state) => {
          console.log(`Window key event: ${keyval}`);
          
          // Get focused widget
          const focusWidget = self.get_focus();
          const isFocusedOnEntry = focusWidget && focusWidget.constructor.name === "GtkText";
          
          console.log(`Focused widget: ${focusWidget?.constructor.name}, is entry: ${isFocusedOnEntry}`);
          
          // If search entry is focused, only handle navigation keys
          if (isFocusedOnEntry) {
            // Only intercept navigation keys
            if (keyval === 65307 || // Escape
                keyval === 65362 || // Up
                keyval === 65364 || // Down
                keyval === 65293 || // Enter
                keyval === 65289 || // Tab
                keyval === 65056) { // Shift+Tab
              console.log("Navigation key while in search - handling");
              windowSwitcher.key(keyval);
              return true;
            }
            // Let other keys through to the entry
            console.log("Typing key - passing to entry");
            return false;
          } else {
            // Not in search entry, handle all keys
            console.log("Not in search entry - handling key");
            windowSwitcher.key(keyval);
            return true;
          }
        });
        
        self.add_controller(keyController);
      }}
    >
      <WindowSwitcherLayout onClickOutside={() => windowSwitcher.hide()}>
        <SearchBar />
        <WindowGrid />
      </WindowSwitcherLayout>
    </window>
  );
}