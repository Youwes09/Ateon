import Mpris from "gi://AstalMpris";
import GLib from "gi://GLib?version=2.0";
import { createBinding } from "ags";
import { exec } from "ags/process";

const mpris = Mpris.get_default();
const MEDIA_CACHE_PATH = GLib.get_user_cache_dir() + "/media";
const blurredPath = MEDIA_CACHE_PATH + "/blurred";

// Cache to track player changes
let cachedPlayerSelection: Mpris.Player | undefined;

export function findPlayer(players: Mpris.Player[]): Mpris.Player | undefined {
  if (players.length === 0) return undefined;
  if (players.length === 1) return players[0];

  console.log(`\n=== Finding player from ${players.length} players ===`);
  
  try {
    const playerctlList = exec("playerctl -l 2>/dev/null").trim().split("\n");
    console.log("playerctl list:", playerctlList);
    
    for (const playerctlName of playerctlList) {
      if (!playerctlName) continue;
      
      try {
        const status = exec(`playerctl status -p ${playerctlName} 2>/dev/null`).trim();
        console.log(`  ${playerctlName}: ${status}`);
        
        if (status === "Playing") {
          const baseName = playerctlName.split(".")[0].toLowerCase();
          console.log(`  -> Looking for MPRIS player matching: ${baseName}`);
          
          const matchingPlayer = players.find((p) => {
            const entry = (p.entry || "").toLowerCase();
            return entry === baseName || entry.includes(baseName);
          });
          
          if (matchingPlayer) {
            console.log(`  ✓ Found playing player: ${matchingPlayer.entry}`);
            return matchingPlayer;
          }
        }
      } catch (e) {
        console.log(`  Error checking ${playerctlName}:`, e);
        continue;
      }
    }
    
    console.log("No playing players found via playerctl");
  } catch (e) {
    console.error("playerctl error:", e);
  }

  // Fallback to paused
  const pausedPlayer = players.find(
    (p) => p.playback_status === Mpris.PlaybackStatus.PAUSED,
  );
  
  if (pausedPlayer) {
    console.log(`Falling back to paused: ${pausedPlayer.entry}`);
    return pausedPlayer;
  }

  console.log(`Falling back to first: ${players[0].entry}`);
  return players[0];
}

// Set up listeners for playback status changes
mpris.connect("player-added", (_, player: Mpris.Player) => {
  console.log(`Player added: ${player.entry}`);
  
  // Listen for playback status changes on this player
  player.connect("notify::playback-status", () => {
    console.log(`Playback status changed for ${player.entry}: ${player.playback_status}`);
    
    // Re-evaluate active player
    const players = filterActivePlayers(mpris.get_players());
    const newActivePlayer = findPlayer(players);
    
    // Only emit update if active player actually changed
    if (newActivePlayer?.bus_name !== cachedPlayerSelection?.bus_name) {
      console.log(`Active player switched: ${cachedPlayerSelection?.entry} -> ${newActivePlayer?.entry}`);
      cachedPlayerSelection = newActivePlayer;
      
      // Trigger UI update by emitting on mpris
      mpris.notify("players");
    }
  });
});

export function mprisStateIcon(status: Mpris.PlaybackStatus): string {
  return status === Mpris.PlaybackStatus.PLAYING
    ? "media-playback-pause-symbolic"
    : "media-playback-start-symbolic";
}

export function generateBackground(coverpath: string | null): string {
  if (!coverpath) return "";

  const relativePath = coverpath.substring(MEDIA_CACHE_PATH.length + 1);
  const blurred = GLib.build_filenamev([blurredPath, relativePath]);

  const blurredDir = GLib.path_get_dirname(blurred);
  !GLib.file_test(blurredDir, GLib.FileTest.EXISTS) &&
    GLib.mkdir_with_parents(blurredDir, 0o755);

  try {
    exec(`magick "${coverpath}" -blur 0x22 "${blurred}"`);
  } catch (e) {
    console.error("Background generation failed:", e);
    return "";
  }

  return blurred;
}

export function lengthStr(length: number) {
  const min = Math.floor(length / 60).toString();
  const sec = Math.floor(length % 60)
    .toString()
    .padStart(2, "0");
  return min + ":" + sec;
}

export function filterActivePlayers(players: Mpris.Player[]) {
  return players.filter((player: Mpris.Player) => {
    if (!player.title && !player.artist) {
      return false;
    }

    if (player.playback_status) {
      return [
        Mpris.PlaybackStatus.PLAYING,
        Mpris.PlaybackStatus.PAUSED,
      ].includes(player.playback_status);
    }

    return true;
  });
}

export const hasActivePlayers = createBinding(
  mpris,
  "players",
)((players: Mpris.Player[]) => filterActivePlayers(players).length > 0);

export const firstActivePlayer = createBinding(
  mpris,
  "players",
)((players: Mpris.Player[]) => {
  const active = filterActivePlayers(players);
  const selected = findPlayer(active);
  cachedPlayerSelection = selected;
  return selected;
});