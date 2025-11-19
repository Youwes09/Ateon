import Mpris from "gi://AstalMpris";
import GLib from "gi://GLib?version=2.0";
import { createExternal } from "ags";
import { execAsync } from "ags/process";

const mpris = Mpris.get_default();
const MEDIA_CACHE_PATH = GLib.get_user_cache_dir() + "/media";
const blurredPath = MEDIA_CACHE_PATH + "/blurred";

export function findPlayer(players: Mpris.Player[]): Mpris.Player | undefined {
  if (!players || !Array.isArray(players) || players.length === 0) {
    return undefined;
  }

  // Try to get the first active player
  const activePlayer = players.find(
    (p) => p && p.playback_status === Mpris.PlaybackStatus.PLAYING,
  );
  
  if (activePlayer) return activePlayer;

  // Otherwise get the first "working" player
  return players.find((p) => p && p.title !== undefined && p.title !== null);
}

export function mprisStateIcon(status: Mpris.PlaybackStatus): string {
  return status === Mpris.PlaybackStatus.PLAYING
    ? "media-playback-pause-symbolic"
    : "media-playback-start-symbolic";
}

export async function generateBackground(
  coverpath: string | null,
): Promise<string> {
  if (!coverpath || typeof coverpath !== 'string' || coverpath.length === 0) {
    return "";
  }

  try {
    // Validate input path exists
    if (!GLib.file_test(coverpath, GLib.FileTest.EXISTS)) {
      console.warn("Cover art file does not exist:", coverpath);
      return "";
    }

    const relativePath = coverpath.substring(MEDIA_CACHE_PATH.length + 1);
    const blurred = GLib.build_filenamev([blurredPath, relativePath]);

    // Return cached version if exists
    if (GLib.file_test(blurred, GLib.FileTest.EXISTS)) {
      return blurred;
    }

    // Create directory structure safely
    const blurredDir = GLib.path_get_dirname(blurred);
    if (!GLib.file_test(blurredDir, GLib.FileTest.EXISTS)) {
      const mkdirResult = GLib.mkdir_with_parents(blurredDir, 0o755);
      if (mkdirResult !== 0) {
        console.error("Failed to create directory:", blurredDir);
        return coverpath; // Fallback to original
      }
    }

    // Generate blurred version - FIXED SYNTAX ERROR
    await execAsync`magick "${coverpath}" -blur 0x22 "${blurred}"`;
    
    // Verify the blurred file was created
    if (GLib.file_test(blurred, GLib.FileTest.EXISTS)) {
      return blurred;
    } else {
      console.warn("Blurred file was not created successfully");
      return coverpath;
    }

  } catch (e) {
    console.error("Background generation failed:", e);
    // Fallback to original
    return coverpath || "";
  }
}

export function lengthStr(length: number): string {
  if (typeof length !== 'number' || !isFinite(length) || length < 0) {
    return "0:00";
  }

  const min = Math.floor(length / 60).toString();
  const sec = Math.floor(length % 60)
    .toString()
    .padStart(2, "0");
  
  return min + ":" + sec;
}

export function filterActivePlayers(players: Mpris.Player[]): Mpris.Player[] {
  if (!players || !Array.isArray(players)) {
    return [];
  }

  return players.filter((player: Mpris.Player) => {
    if (!player) return false;

    // Check for essential properties that indicate a usable player
    if (!player.title && !player.artist) {
      return false;
    }

    // Check playback status
    // Only include players that are playing or paused
    if (player.playback_status) {
      return [
        Mpris.PlaybackStatus.PLAYING,
        Mpris.PlaybackStatus.PAUSED,
      ].includes(player.playback_status);
    }

    return true;
  });
}

export const activePlayers = createExternal(
  mpris.get_players() || [], 
  (set) => {
    // Poll players periodically
    const interval = setInterval(() => {
      try {
        const players = mpris.get_players();
        // Validate players before setting
        if (players && Array.isArray(players)) {
          set(players);
        } else {
          set([]);
        }
      } catch (error) {
        console.error("Error getting MPRIS players:", error);
        set([]);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }
);

export const hasActivePlayers = activePlayers(
  (players) => {
    try {
      return filterActivePlayers(players).length > 0;
    } catch (error) {
      console.error("Error in hasActivePlayers:", error);
      return false;
    }
  }
);

export const firstActivePlayer = activePlayers((players) => {
  try {
    const active = filterActivePlayers(players);
    return active.length > 0 ? active[0] : null;
  } catch (error) {
    console.error("Error in firstActivePlayer:", error);
    return null;
  }
});