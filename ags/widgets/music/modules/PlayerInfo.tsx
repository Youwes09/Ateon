import { Gtk, Astal } from "ags/gtk4";
import Mpris from "gi://AstalMpris";
import { createBinding } from "ags";
import { isIcon } from "utils/notifd";
import { exec, execAsync } from "ags/process";

export function PlayerInfo({ player }: { player: Mpris.Player }) {
  const { END } = Gtk.Align;
  
  const handleClick = async () => {
    const entry = player.entry || "";
    
    // Map player entry names to their actual window classes
    const classMap: Record<string, string> = {
      "spotify": "Spotify",
      "firefox": "firefox",
      "chromium": "chromium",
      "vlc": "vlc",
      "mpv": "mpv",
    };
    
    const windowClass = classMap[entry.toLowerCase()] || entry;
    
    try {
      // Get all clients info
      const clientsOutput = await execAsync("hyprctl clients -j");
      const clients = JSON.parse(clientsOutput);
      
      // Find the window with matching class
      const targetWindow = clients.find((client: any) => 
        client.class === windowClass
      );
      
      if (targetWindow) {
        const workspaceId = targetWindow.workspace.id;
        console.log(`Switching to workspace ${workspaceId} for ${windowClass}`);
        
        // Switch to the workspace
        await execAsync(`hyprctl dispatch workspace ${workspaceId}`);
        
        // Then focus the window
        await execAsync(`hyprctl dispatch focuswindow ${windowClass}`);
      } else {
        console.error(`Window not found for class: ${windowClass}`);
        player.raise?.();
      }
    } catch (err) {
      console.error(`Failed to switch workspace:`, err);
      player.raise?.();
    }
  };
  
  return (
    <box cssClasses={["player-info"]} halign={END}>
      <button
        cssClasses={["player-icon-button"]}
        halign={END}
        tooltipText={createBinding(player, "identity")((identity) => 
          `Switch to ${identity || "player"}`
        )}
        onClicked={handleClick}
      >
        <image
          cssClasses={["player-icon"]}
          halign={END}
          iconName={createBinding(
            player,
            "entry",
          )((entry) => {
            if (entry === "spotify") entry = "spotify-client";
            return isIcon(entry ?? "") ? entry : "multimedia-player-symbolic";
          })}
        />
      </button>
    </box>
  );
}