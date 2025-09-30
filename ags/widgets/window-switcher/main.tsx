import app from "ags/gtk4/app";
import { Astal, Gtk } from "ags/gtk4";
import { gdkmonitor } from "utils/monitors.ts";
import { windowSwitcher } from "utils/windowSwitcher";
import { WindowGrid } from "./modules/WindowGrid.tsx";
import { SearchBar } from "./modules/SearchBar.tsx";

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
      }}
    >
      <Gtk.EventControllerKey 
        onKeyPressed={({}, keyval) => { 
          windowSwitcher.key(keyval); 
          return true; 
        }} 
      />
      <WindowSwitcherLayout onClickOutside={() => windowSwitcher.hide()}>
        <SearchBar />
        <WindowGrid />
      </WindowSwitcherLayout>
    </window>
  );
}