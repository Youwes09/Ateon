import { Gtk } from "ags/gtk4";
import { SectionHeader, OptionSelect } from "./SettingsComponents";
import options from "options.ts";

const AUDIO_CONTROL_OPTIONS = [
  { label: "Master Volume", value: "master" },
  { label: "PCM Volume", value: "pcm" },
];

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
      >
        <SectionHeader label="Volume Control" />
        <OptionSelect
          option="audio.volume-control"
          label="Control Type"
          choices={AUDIO_CONTROL_OPTIONS}
        />
        
        <box cssClasses={["info-box"]}>
          <label 
            label="Master: System volume via WirePlumber
PCM: ALSA PCM channel control"
            cssClasses={["info-text"]}
            wrap
            halign={Gtk.Align.START}
          />
        </box>
      </box>
    </scrolledwindow>
  );
}