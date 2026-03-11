import Mpris from "gi://AstalMpris";
import { createBinding } from "ags";
import { Gtk } from "ags/gtk4";
import Wp from "gi://AstalWp";
import options from "../../../options.ts"; // Adjust path as needed

export function VolumeControl({ player }: { player: Mpris.Player }) {
  const getVolumeIcon = (volume: number) => {
    if (volume === 0) return "audio-volume-muted-symbolic";
    if (volume < 0.33) return "audio-volume-low-symbolic";
    if (volume < 0.66) return "audio-volume-medium-symbolic";
    return "audio-volume-high-symbolic";
  };

  // Get the volume stream based on config
  const getVolumeStream = () => {
    return options["audio.volume-control"].value === "pcm"
      ? Wp.get_default()!.get_default_microphone()
      : Wp.get_default()!.audio.defaultSpeaker;
  };

  return (
    <box 
      cssClasses={["volume-control"]} 
      orientation={Gtk.Orientation.HORIZONTAL}
    >
      <image
        cssClasses={["volume-icon"]}
        iconName={createBinding(getVolumeStream(), "volumeIcon")}
      />
      <slider
        hexpand={true}
        value={createBinding(getVolumeStream(), "volume")}
        min={0}
        max={1}
        onChangeValue={({ value }) => {
          getVolumeStream().volume = value;
        }}
      />
    </box>
  );
}