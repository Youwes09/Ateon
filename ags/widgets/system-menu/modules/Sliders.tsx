import { Gtk } from "ags/gtk4";
import { execAsync, exec } from "ags/process";
import { createBinding, createState, onCleanup } from "ags";
import Wp from "gi://AstalWp";
import Brightness from "utils/brightness.ts";
import options from "options";

export const Sliders = () => {
  const speaker = Wp.get_default()!.audio.defaultSpeaker;
  const microphone = Wp.get_default()!.get_default_microphone();
  const brightness = Brightness.get_default();
  
  // Get PCM volume from amixer
  const getPcmVolume = () => {
    try {
      const output = exec("amixer -c 2 sget PCM");
      const match = output.match(/\[(\d+)%\]/);
      return match ? parseInt(match[1]) / 100 : 0;
    } catch {
      return 0;
    }
  };

  // Set PCM volume via amixer
  const setPcmVolume = (value: number) => {
    const percent = Math.round(value * 100);
    execAsync(`amixer -c 2 sset PCM ${percent}%`);
  };

  const [pcmVolume, setPcmVolumeState] = createState(getPcmVolume());
  const [volumeIcon, setVolumeIcon] = createState("audio-volume-high-symbolic");

  // Poll PCM volume periodically
  let pcmPollInterval: any = null;

  const updatePcmPolling = () => {
    if (pcmPollInterval) {
      clearInterval(pcmPollInterval);
      pcmPollInterval = null;
    }

    if (options["audio.volume-control"].value === "pcm") {
      pcmPollInterval = setInterval(() => {
        const vol = getPcmVolume();
        setPcmVolumeState(vol);
        
        // Update icon based on volume
        if (vol === 0) setVolumeIcon("audio-volume-muted-symbolic");
        else if (vol < 0.33) setVolumeIcon("audio-volume-low-symbolic");
        else if (vol < 0.66) setVolumeIcon("audio-volume-medium-symbolic");
        else setVolumeIcon("audio-volume-high-symbolic");
      }, 500);
    }
  };

  // Initial setup
  updatePcmPolling();

  // Watch for config changes
  const unsubscribe = options["audio.volume-control"].subscribe(() => {
    updatePcmPolling();
  });

  onCleanup(() => {
    if (pcmPollInterval) clearInterval(pcmPollInterval);
    unsubscribe();
  });

  return (
    <box cssClasses={["sliders"]} orientation={Gtk.Orientation.VERTICAL}>
      <box cssClasses={["volume"]}>
        <button onClicked={() => execAsync(options["app.audio"].get())}>
          <image iconName={
            options["audio.volume-control"].value === "pcm"
              ? volumeIcon
              : createBinding(speaker, "volumeIcon")
          } />
        </button>
        <slider
          onChangeValue={(self) => {
            if (options["audio.volume-control"].value === "pcm") {
              setPcmVolume(self.value);
              setPcmVolumeState(self.value);
            } else {
              speaker.volume = self.value;
            }
          }}
          value={
            options["audio.volume-control"].value === "pcm"
              ? pcmVolume
              : createBinding(speaker, "volume")
          }
          valign={Gtk.Align.CENTER}
          hexpand={true}
        />
      </box>
      <box
        cssClasses={["volume"]}
        visible={createBinding(microphone, "path")((mic) => mic !== null)}
      >
        <button onClicked={() => execAsync(options["app.audio"].get())}>
          <image iconName={createBinding(microphone, "volumeIcon")} />
        </button>
        <slider
          onChangeValue={(self) => {
            microphone.volume = self.value;
          }}
          value={createBinding(microphone, "volume")}
          valign={Gtk.Align.CENTER}
          hexpand={true}
        />
      </box>
      <box cssClasses={["brightness"]} visible={brightness.hasBacklight}>
        <image iconName="display-brightness-symbolic" />
        <slider
          value={createBinding(brightness, "screen")}
          onChangeValue={(self) => {
            brightness.screen = self.value;
          }}
          min={0.1}
          valign={Gtk.Align.CENTER}
          hexpand={true}
        />
      </box>
    </box>
  );
};