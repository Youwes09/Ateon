import Mpris from "gi://AstalMpris";
import { createBinding } from "ags";
import { Gtk } from "ags/gtk4";

export function VolumeControl({ player }: { player: Mpris.Player }) {
  const getVolumeIcon = (volume: number) => {
    if (volume === 0) return "audio-volume-muted-symbolic";
    if (volume < 0.33) return "audio-volume-low-symbolic";
    if (volume < 0.66) return "audio-volume-medium-symbolic";
    return "audio-volume-high-symbolic";
  };

  return (
    <box 
      cssClasses={["volume-control"]} 
      orientation={Gtk.Orientation.HORIZONTAL}
    >
      <image
        cssClasses={["volume-icon"]}
        iconName={createBinding(player, "volume")(getVolumeIcon)}
      />
      <slider
        hexpand={true}
        value={createBinding(player, "volume")}
        min={0}
        max={1}
        onChangeValue={({ value }) => {
          player.volume = value;
        }}
      />
    </box>
  );
}