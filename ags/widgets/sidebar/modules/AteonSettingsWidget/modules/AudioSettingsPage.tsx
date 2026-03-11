import { Gtk } from "ags/gtk4";
import { SectionHeader } from "./SettingsComponents";

export default function AudioSettingsPage() {
  return (
    <scrolledwindow
      hscrollbarPolicy={Gtk.PolicyType.NEVER}
      vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
      cssClasses={["settings-scroll"]}
    >
      <box 
        orientation={Gtk.Orientation.VERTICAL} 
        spacing={8}
        valign={Gtk.Align.CENTER}
        halign={Gtk.Align.CENTER}
      >
        <label 
          label="Audio settings coming soon"
          cssClasses={["dim-label"]}
        />
      </box>
    </scrolledwindow>
  );
}