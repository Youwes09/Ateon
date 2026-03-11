import app from "ags/gtk4/app";
import { Astal, Gtk } from "ags/gtk4";
import { createBinding, createComputed, createState } from "ags";
import { execAsync } from "ags/process";
import Hyprland from "gi://AstalHyprland";
import options from "options.ts";

interface PinnedApp {
  name: string;
  icon: string;
  class: string;
}

function AppButton({ 
  app, 
  hypr, 
  index, 
  hoveredIndex,
  setHoveredIndex 
}: { 
  app: PinnedApp; 
  hypr: Hyprland.Hyprland;
  index: number;
  hoveredIndex: ReturnType<typeof createState>[0];
  setHoveredIndex: (index: number | null) => void;
}) {
  const clients = createBinding(hypr, "clients");
  const focusedClient = createBinding(hypr, "focusedClient");
  const focusedWorkspace = createBinding(hypr, "focusedWorkspace");
  const [isLaunching, setIsLaunching] = createState(false);

  const handleClick = async () => {
    try {
      const clientsList = hypr.get_clients();
      const appClient = clientsList.find(
        (c) => c.get_class().toLowerCase() === app.class.toLowerCase()
      );

      if (appClient) {
        // App is running
        const currentWorkspace = focusedWorkspace.get();
        const appWorkspaceId = appClient.get_workspace().get_id();
        const currentWorkspaceId = currentWorkspace ? currentWorkspace.get_id() : -1;

        if (appWorkspaceId === currentWorkspaceId) {
          const currentFocused = focusedClient.get();
          const isFocused = currentFocused && 
            currentFocused.get_address() === appClient.get_address();

          if (isFocused) {
            // If already focused, minimize the window
            await execAsync(`hyprctl dispatch movetoworkspacesilent special:minimized,address:${appClient.get_address()}`);
          } else {
            // Focus the window
            await execAsync(`hyprctl dispatch focuswindow address:${appClient.get_address()}`);
          }
        } else {
          // Different workspace - switch and focus
          await execAsync(`hyprctl dispatch workspace ${appWorkspaceId}`);
          await execAsync(`hyprctl dispatch focuswindow address:${appClient.get_address()}`);
        }
      } else {
        // App not running - launch with bounce animation
        setIsLaunching(true);
        setTimeout(() => setIsLaunching(false), 600);
        await execAsync(`hyprctl dispatch exec ${app.class.toLowerCase()}`);
      }
    } catch (err) {
      console.error(`Error handling app click for ${app.name}:`, err);
      setIsLaunching(false);
    }
  };

  // Create computed binding for class names
  const buttonClasses = createComputed(
    [clients, focusedClient, isLaunching], 
    (cls, fc, launching) => {
      const isRunning = cls.some(
        (c) => c.get_class().toLowerCase() === app.class.toLowerCase()
      );
      const isFocused = fc && fc.get_class() 
        ? fc.get_class().toLowerCase() === app.class.toLowerCase() 
        : false;
      
      const classes = ["dock-item"];
      if (isRunning) classes.push("running");
      if (isFocused) classes.push("active");
      if (launching) classes.push("launching");
      
      return classes;
    }
  );

  return (
    <button
      cssClasses={buttonClasses}
      tooltipText={app.name}
      onClicked={handleClick}
      $={(self) => {
        const motionController = new Gtk.EventControllerMotion();
        
        motionController.connect("enter", () => {
          setHoveredIndex(index);
        });
        
        motionController.connect("leave", () => {
          setHoveredIndex(null);
        });
        
        self.add_controller(motionController);
      }}
    >
      <box 
        cssClasses={["icon-background"]} 
        halign={Gtk.Align.CENTER} 
        valign={Gtk.Align.CENTER}
      >
        <Gtk.Image iconName={app.icon} pixelSize={32} />
      </box>
    </button>
  );
}

export default function Dock() {
  const hypr = Hyprland.get_default();
  const pinnedApps = options["dock.pinned-apps"].get();
  const enabled = options["dock.enabled"].get();
  const autoHide = options["dock.auto-hide"].get();
  const barPosition = options["bar.position"].get();
  const [revealDock, setRevealDock] = createState(true);
  const [hoveredIndex, setHoveredIndex] = createState<number | null>(null);
  const [hideTimeout, setHideTimeout] = createState<number | null>(null);

  // Don't show dock if disabled or if bar is at bottom
  if (!enabled || barPosition === "bottom") {
    return null;
  }

  const dockClasses = createComputed([revealDock], (revealed) => {
    const classes = ["dock"];
    if (!revealed && autoHide) classes.push("hidden");
    return classes;
  });

  const handleMouseEnter = () => {
    const timeout = hideTimeout.get();
    if (timeout !== null) {
      clearTimeout(timeout);
      setHideTimeout(null);
    }
    setRevealDock(true);
  };

  const handleMouseLeave = () => {
    if (autoHide) {
      const timeout = setTimeout(() => {
        setRevealDock(false);
        setHoveredIndex(null);
      }, 300) as unknown as number;
      setHideTimeout(timeout);
    }
  };

  return (
    <window
      name="dock"
      cssClasses={["dock-window"]}
      application={app}
      anchor={Astal.WindowAnchor.BOTTOM}
      exclusivity={Astal.Exclusivity.NORMAL}
      layer={Astal.Layer.TOP}
      marginBottom={2}
      visible
    >
      <box 
        valign={Gtk.Align.END}
        $={(self) => {
          if (autoHide) {
            const motionController = new Gtk.EventControllerMotion();
            motionController.connect("enter", handleMouseEnter);
            motionController.connect("leave", handleMouseLeave);
            self.add_controller(motionController);
          }
        }}
      >
        <box cssClasses={["dock-container"]} halign={Gtk.Align.CENTER}>
          <box cssClasses={dockClasses} spacing={8} homogeneous={false}>
            {pinnedApps.map((app: PinnedApp, idx: number) => (
              <AppButton 
                app={app} 
                hypr={hypr} 
                index={idx}
                hoveredIndex={hoveredIndex}
                setHoveredIndex={setHoveredIndex}
              />
            ))}
          </box>
        </box>
      </box>
    </window>
  );
}