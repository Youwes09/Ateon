import { Gtk } from "ags/gtk4";
import { createState, onCleanup, Accessor } from "ags";
import { exec } from "ags/process";
import Pango from "gi://Pango";
import Wp from "gi://AstalWp";
import Brightness from "utils/brightness";
import Bluetooth from "gi://AstalBluetooth";
import options from "options";

interface OnScreenProgressProps {
  visible: boolean | Accessor<boolean>;
  setVisible: (visible: boolean) => void;
}

export default function OnScreenProgress({ visible, setVisible }: OnScreenProgressProps) {
  const [value, setValue] = createState(0);
  const [label, setLabel] = createState("");
  const [icon, setIcon] = createState("");
  const [hasProgress, setHasProgress] = createState(true);

  let currentTimeout: any = null;
  const TIMEOUT_DELAY = 2000;

  const show = (val: number, text: string, iconName: string, progress = true) => {
    setValue(val);
    setLabel(text);
    setIcon(iconName);
    setHasProgress(progress);
    setVisible(true);

    if (currentTimeout) clearTimeout(currentTimeout);
    currentTimeout = setTimeout(() => setVisible(false), TIMEOUT_DELAY);
  };

  // Audio - Handle both PCM and Master with dynamic switching
  let pcmPollInterval: any = null;
  let lastVolume = 0;
  let speakerConnection: number | null = null;

  const setupPcmMonitoring = () => {
    if (pcmPollInterval) clearInterval(pcmPollInterval);
    lastVolume = 0;
    
    pcmPollInterval = setInterval(() => {
      try {
        const output = exec("amixer -c 2 sget PCM");
        const match = output.match(/\[(\d+)%\]/);
        if (match) {
          const volume = parseInt(match[1]) / 100;
          if (volume !== lastVolume) {
            lastVolume = volume;
            show(volume, "PCM Volume", "audio-volume-high-symbolic");
          }
        }
      } catch {}
    }, 100);
  };

  const setupMasterMonitoring = () => {
    if (pcmPollInterval) {
      clearInterval(pcmPollInterval);
      pcmPollInterval = null;
    }

    const speaker = Wp.get_default()?.get_default_speaker();
    if (speaker) {
      if (speakerConnection !== null) {
        speaker.disconnect(speakerConnection);
      }
      
      speakerConnection = speaker.connect("notify::volume", () => {
        show(speaker.volume, speaker.description || "Master Volume", speaker.volumeIcon);
      });
    }
  };

  const updateAudioMonitoring = () => {
    const mode = options["audio.volume-control"].value;
    
    if (mode === "pcm") {
      setupPcmMonitoring();
    } else {
      setupMasterMonitoring();
    }
  };

  // Initial setup
  updateAudioMonitoring();

  // Watch for config changes using subscribe
  const unsubscribe = options["audio.volume-control"].subscribe(() => {
    updateAudioMonitoring();
  });

  onCleanup(() => {
    if (pcmPollInterval) clearInterval(pcmPollInterval);
    if (speakerConnection !== null) {
      const speaker = Wp.get_default()?.get_default_speaker();
      if (speaker) speaker.disconnect(speakerConnection);
    }
    unsubscribe();
  });

  // Brightness
  try {
    const brightness = Brightness.get_default();
    const id = brightness.connect("notify::screen", () =>
      show(brightness.screen, "Screen Brightness", "display-brightness-symbolic")
    );
    onCleanup(() => brightness.disconnect(id));
  } catch {}

  // Bluetooth
  const bluetooth = Bluetooth.get_default();
  const btId = bluetooth.connect("notify::devices", () => {
    bluetooth.devices.forEach((device) => {
      const devId = device.connect("notify::connected", () => {
        const message = device.connected
          ? `Connected: ${device.name || device.address}`
          : `Disconnected: ${device.name || device.address}`;
        const iconName = device.connected
          ? "bluetooth-active-symbolic"
          : "bluetooth-symbolic";
        show(0, message, iconName, false);
      });
      onCleanup(() => device.disconnect(devId));
    });
  });
  onCleanup(() => {
    try { bluetooth.disconnect(btId); } catch {}
  });

  return (
    <revealer revealChild={visible} transitionType={Gtk.RevealerTransitionType.CROSSFADE}>
      <box cssClasses={["osd"]}>
        <image iconName={icon} />
        <box orientation={Gtk.Orientation.VERTICAL}>
          <label
            label={label}
            maxWidthChars={24}
            widthRequest={200}
            halign={Gtk.Align.CENTER}
            ellipsize={Pango.EllipsizeMode.END}
            wrap={false}
          />
          <levelbar value={value} visible={hasProgress} />
        </box>
      </box>
    </revealer>
  );
}