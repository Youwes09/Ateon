import app from "ags/gtk4/app";
import { Gtk } from "ags/gtk4";
import { createBinding, With } from "ags";
import { firstActivePlayer } from "utils/mpris.ts";

function Cover({ player }) {
  return (
    <box>
      <image
        cssClasses={["cover"]}
        overflow={Gtk.Overflow.HIDDEN}
        file={createBinding(player, "coverArt")}
      />
    </box>
  );
}

function Title({ player }) {
  return (
    <label
      cssClasses={["title", "module"]}
      label={createBinding(
        player,
        "metadata",
      )(() => player.title && `${player.artist} - ${player.title}`)}
    />
  );
}

function MusicBox({ player }) {
  return (
    <box>
      <box>
        <Cover player={player} />
      </box>
      <box>
        <Title player={player} />
      </box>
    </box>
  );
}

export default function Media() {
  return (
    <button
      cssClasses={["Media"]}
      onClicked={() => app.toggle_window("music-player")}
    >
      <With value={firstActivePlayer}>
        {(player) => (player ? <MusicBox player={player} /> : "")}
      </With>
    </button>
  );
}