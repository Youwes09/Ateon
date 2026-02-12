import { Gtk } from "ags/gtk4";
import { OptionSelect, OptionToggle, SectionHeader } from "./SettingsComponents";
import {
  BAR_POSITION_OPTIONS,
  BAR_STYLE_OPTIONS,
  OS_OPTIONS,
  THEME_STYLE_OPTIONS,
} from "utils/config";

export default function BarSettingsPage() {
  return (
    <scrolledwindow
      hscrollbarPolicy={Gtk.PolicyType.NEVER}
      vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
      cssClasses={["settings-scroll"]}
    >
      <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
        <SectionHeader label="Theme" />
        <OptionSelect
          option="theme.style"
          label="Style"
          choices={THEME_STYLE_OPTIONS}
        />

        <SectionHeader label="Bar" />
        <OptionSelect
          option="bar.position"
          label="Position"
          choices={BAR_POSITION_OPTIONS}
        />
        <OptionSelect
          option="bar.style"
          label="Style"
          choices={BAR_STYLE_OPTIONS}
        />
        
        <SectionHeader label="OS Icon" />
        <OptionToggle option="bar.modules.os-icon.show" label="Show Icon" />
        <OptionSelect
          option="bar.modules.os-icon.type"
          label="Icon Type"
          choices={OS_OPTIONS}
        />

        <SectionHeader label="Dock" />
        <OptionToggle option="dock.enabled" label="Enable Dock" />
        <OptionToggle option="dock.auto-hide" label="Auto-hide" />
        
        <box cssClasses={["info-box"]}>
          <label 
            label="Dock hides when bar is at bottom"
            cssClasses={["info-text"]}
            wrap
            halign={Gtk.Align.START}
          />
        </box>
      </box>
    </scrolledwindow>
  );
}