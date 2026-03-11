import { Gtk } from "ags/gtk4";
import { OptionSelect, OptionToggle, SectionHeader } from "./SettingsComponents";

const TIME_FORMAT_OPTIONS = [
  { label: "12 Hour", value: "12" },
  { label: "24 Hour", value: "24" },
];

export default function SystemSettingsPage() {
  return (
    <scrolledwindow
      hscrollbarPolicy={Gtk.PolicyType.NEVER}
      vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
      cssClasses={["settings-scroll"]}
    >
      <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
        <SectionHeader label="Clock" />
        <OptionSelect
          option="clock.format"
          label="Time Format"
          choices={TIME_FORMAT_OPTIONS}
        />
        
        <SectionHeader label="Advanced Menus" />
        <OptionToggle
          option="system-menu.modules.wifi-advanced.enable"
          label="WiFi Settings"
        />
        <OptionToggle
          option="system-menu.modules.bluetooth-advanced.enable"
          label="Bluetooth Settings"
        />
      </box>
    </scrolledwindow>
  );
}