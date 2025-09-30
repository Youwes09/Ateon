import app from "ags/gtk4/app";
import { Astal, Gtk } from "ags/gtk4";
import { createBinding } from "ags";
import { gdkmonitor, currentMonitorWidth } from "utils/monitors.ts";
import { picker } from "utils/picker/";
import { SearchSection } from "./modules/SearchSection.tsx";
import { ModeBar } from "./modules/ModeBar.tsx";
import { ResultsRenderer } from "./modules/ResultsRenderer.tsx";
import Adw from "gi://Adw?version=1";

const CloseButton = ({ onClicked, widthRequest }: { onClicked: () => void; widthRequest?: any }) => (
  <button
    widthRequest={widthRequest}
    onClicked={onClicked}
    cssClasses={["invisible-close"]}
  />
);

function PickerLayout({ children, onClickOutside }: { children: any; onClickOutside: () => void }) {
  const halfWidth = currentMonitorWidth((w) => w / 2);

  return (
    <Adw.Clamp maximumSize={550}>
      <box hexpand vexpand>
        <CloseButton onClicked={onClickOutside} widthRequest={halfWidth} />
        <box hexpand={false} vexpand orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
          <CloseButton onClicked={onClickOutside} />
          <box widthRequest={550} cssClasses={["picker"]} orientation={Gtk.Orientation.VERTICAL}>
            {children}
          </box>
          <CloseButton onClicked={onClickOutside} />
        </box>
        <CloseButton onClicked={onClickOutside} widthRequest={halfWidth} />
      </box>
    </Adw.Clamp>
  );
}

export default function PickerWindow() {
  return (
    <window
      name="picker"
      visible={createBinding(picker, "isVisible")}
      gdkmonitor={gdkmonitor}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.ON_DEMAND}
      application={app}
      $={(self) => { picker.window = self; }}
      onNotifyVisible={({ visible }) => visible ? picker.focusSearch() : picker.clearSearch()}
    >
      <Gtk.EventControllerKey onKeyPressed={({}, keyval: number) => picker.handleKeyPress(keyval)} />

      <PickerLayout onClickOutside={() => picker.hide()}>
        <ModeBar picker={picker} />
        <ResultsRenderer picker={picker} />
        <SearchSection picker={picker} />
      </PickerLayout>
    </window>
  );
}