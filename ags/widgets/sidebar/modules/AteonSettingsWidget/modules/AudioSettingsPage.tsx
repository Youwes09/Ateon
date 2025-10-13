import { Gtk } from "ags/gtk4";
import { OptionSelect, OptionToggle, SectionHeader } from "./SettingsComponents";
import { CAVA_STYLE_OPTIONS } from "utils/config";

export default function AudioSettingsPage() {
  return (
    <scrolledwindow
      hscrollbarPolicy={Gtk.PolicyType.NEVER}
      vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
      cssClasses={["settings-scroll"]}
    >
      <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
        <SectionHeader label="Bar Visualizer" />
        <OptionToggle option="bar.modules.cava.show" label="Enable" />
        <OptionSelect
          option="bar.modules.cava.style"
          label="Style"
          choices={CAVA_STYLE_OPTIONS}
        />
        <OptionToggle
          option="bar.modules.media.cava.show"
          label="Cover Visualizer"
        />
        
        <SectionHeader label="Music Player" />
        <OptionToggle
          option="musicPlayer.modules.cava.show"
          label="Enable Visualizer"
        />
        <OptionSelect
          option="musicPlayer.modules.cava.style"
          label="Style"
          choices={CAVA_STYLE_OPTIONS}
        />
      </box>
    </scrolledwindow>
  );
}