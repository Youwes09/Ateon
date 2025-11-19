import app from "ags/gtk4/app";
import { Astal, Gtk } from "ags/gtk4";
import Mpris from "gi://AstalMpris";
import { createBinding, createState, With, onCleanup } from "ags";
import Gio from "gi://Gio?version=2.0";
import { findPlayer, generateBackground } from "utils/mpris";
import { Cover } from "./modules/Cover";
import { Info } from "./modules/Info";
import { CavaDraw } from "./modules/cava";
import options from "options.ts";
import { gdkmonitor } from "utils/monitors";

function MusicBox({ player }: { player: Mpris.Player }) {
  const [blurredCover, setBlurredCover] = createState(player.cover_art || "");
  let measureBox: Gtk.Box | null = null;
  let isGeneratingBackground = false;

  const coverBinding = createBinding(player, "cover_art");
  
  const unsubscribe = coverBinding.subscribe(() => {
    const coverArt = player.cover_art;
    
    // Prevent multiple simultaneous background generation calls
    if (coverArt && !isGeneratingBackground) {
      isGeneratingBackground = true;
      
      generateBackground(coverArt)
        .then((path) => {
          if (path) {
            setBlurredCover(path);
          }
        })
        .catch((error) => {
          console.error("Failed to generate background:", error);
        })
        .finally(() => {
          isGeneratingBackground = false;
        });
    }
  });

  onCleanup(() => {
    unsubscribe();
    measureBox = null;
  });

  // Initial blur generation
  if (player.cover_art && !isGeneratingBackground) {
    isGeneratingBackground = true;
    
    generateBackground(player.cover_art)
      .then((path) => {
        if (path) {
          setBlurredCover(path);
        }
      })
      .catch((error) => {
        console.error("Failed to generate initial background:", error);
      })
      .finally(() => {
        isGeneratingBackground = false;
      });
  }

  return (
    <overlay
      $={(self) => {
        if (measureBox) {
          self.set_measure_overlay(measureBox, true);
        }
      }}
    >
      <Gtk.ScrolledWindow $type="overlay">
        <Gtk.Picture
          cssClasses={["blurred-cover"]}
          file={blurredCover((path) => {
            try {
              return Gio.file_new_for_path(path);
            } catch (error) {
              console.error("Invalid file path:", error);
              return null;
            }
          })}
          contentFit={Gtk.ContentFit.COVER}
        />
      </Gtk.ScrolledWindow>
      
      {/* CAVA visualization - wrapped in conditional for safety */}
      {options["music-player.modules.cava.enable"] && (
        <box
          cssClasses={["cava-container"]}
          $type="overlay"
          canTarget={false}
          visible={true}
        >
          <CavaDraw
            hexpand
            vexpand
            style={options["music-player.modules.cava.style"]}
          />
        </box>
      )}
      
      <box
        $type="overlay"
        $={(self) => {
          measureBox = self;
        }}
      >
        <Cover player={player} />
        <Info player={player} />
      </box>
    </overlay>
  );
}

export default function MusicPlayer() {
  const mpris = Mpris.get_default();
  const { TOP, BOTTOM } = Astal.WindowAnchor;
  const [visible, _setVisible] = createState(false);

  const topMargin = options["bar.position"]((pos) => {
    return pos === "top" ? 45 : 0;
  });

  const bottomMargin = options["bar.position"]((pos) => {
    return pos === "bottom" ? 45 : 0;
  });

  const anchorPosition = options["bar.position"]((pos) => {
    switch (pos) {
      case "top":
        return TOP;
      case "bottom":
        return BOTTOM;
      default:
        return TOP;
    }
  });

  return (
    <window
      name="music-player"
      cssClasses={["music", "window"]}
      application={app}
      layer={Astal.Layer.OVERLAY}
      exclusivity={Astal.Exclusivity.IGNORE}
      anchor={anchorPosition}
      keymode={Astal.Keymode.ON_DEMAND}
      visible={visible}
      gdkmonitor={gdkmonitor}
      marginTop={topMargin}
      marginBottom={bottomMargin}
    >
      <box>
        <With value={createBinding(mpris, "players")}>
          {(players: Mpris.Player[]) => {
            try {
              return players && players.length > 0 ? (
                <MusicBox player={findPlayer(players)} />
              ) : null;
            } catch (error) {
              console.error("Error rendering MusicBox:", error);
              return null;
            }
          }}
        </With>
      </box>
    </window>
  );
}