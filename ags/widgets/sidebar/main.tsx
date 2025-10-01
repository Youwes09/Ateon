// widgets/sidebar/Sidebar.tsx
import app from "ags/gtk4/app";
import { Astal, Gtk } from "ags/gtk4";
import { createState } from "ags";
import ClockWidget from "./modules/ClockWidget";
import WeatherWidget from "./modules/WeatherWidget";
import MatshellSettingsWidget from "./modules/MatshellSettingsWidget";
import QuickActionsWidget from "./modules/QuickActionWidget";
import TemplateWidget from "./modules/BaseTemplateWidget";
import options from "options";

// Define available modes
export type SidebarMode = "settings" | "configs" | "git";

interface ModeConfig {
  id: SidebarMode;
  label: string;
  icon: string;
}

const MODES: ModeConfig[] = [
  { id: "settings", label: "Settings", icon: "Settings" },
  { id: "configs", label: "Configs", icon: "Description" },
  { id: "git", label: "Git", icon: "Code" },
];

/** ---------- Sidebar Window ---------- **/
export default function Sidebar(
  props: {
    children?: Gtk.Widget | JSX.Element | (Gtk.Widget | JSX.Element)[];
  } = {},
) {
  const { TOP, LEFT, BOTTOM } = Astal.WindowAnchor;
  const { NORMAL, EXCLUSIVE } = Astal.Exclusivity;
  const [visible] = createState(false);
  const [currentMode, setCurrentMode] = createState<SidebarMode>("settings");
  const { children = [] } = props;

  // Cycle to next mode
  const cycleMode = () => {
    const currentIndex = MODES.findIndex((m) => m.id === currentMode.get());
    const nextIndex = (currentIndex + 1) % MODES.length;
    setCurrentMode(MODES[nextIndex].id);
  };

  return (
    <window
      name="sidebar"
      cssClasses={["sidebar"]}
      anchor={TOP | LEFT | BOTTOM}
      exclusivity={options["bar.style"]((style) => {
        if (style === "corners") return NORMAL;
        return EXCLUSIVE;
      })}
      layer={Astal.Layer.TOP}
      application={app}
      visible={visible}
      widthRequest={320}
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        hexpand={false}
        vexpand={true}
        spacing={12}
      >
        {/* Built-in widgets */}
        <ClockWidget />
        <Gtk.Separator />
        {/* Mode Selector */}
        <box
          class="mode-selector"
          orientation={Gtk.Orientation.HORIZONTAL}
          spacing={4}
          homogeneous
        >
          {MODES.map((mode) => (
            <button
              cssClasses={currentMode((current) =>
                current === mode.id
                  ? ["mode-button", "mode-button-active"]
                  : ["mode-button"],
              )}
              onClicked={() => setCurrentMode(mode.id)}
              tooltipText={mode.label}
            >
              <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                <label label={mode.icon} cssClasses={["mode-icon"]} />
                <label label={mode.label} cssClasses={["mode-label"]} />
              </box>
            </button>
          ))}
        </box>

        <Gtk.Separator />

        {/* Mode Content - Scrollable */}
        <scrolledwindow
          vexpand={true}
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          cssClasses={["mode-content-scroll"]}
        >
          <stack
            cssClasses={["mode-stack"]}
            transitionType={Gtk.StackTransitionType.SLIDE_LEFT_RIGHT}
            transitionDuration={200}
            visibleChildName={currentMode((mode) => mode)}
          >
            {/* Settings Mode */}
            <box
              $type="named"
              name="settings"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={12}
            >
              <MatshellSettingsWidget />
            </box>

            {/* Configs Mode */}
            <box
              $type="named"
              name="configs"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={12}
            >
              <box
                class="placeholder-content"
                orientation={Gtk.Orientation.VERTICAL}
                spacing={8}
              >
                <label
                  label="Configs Mode"
                  cssClasses={["mode-title"]}
                  halign={Gtk.Align.CENTER}
                />
                <label
                  label="Configuration management coming soon..."
                  cssClasses={["mode-subtitle"]}
                  halign={Gtk.Align.CENTER}
                />
              </box>
            </box>

            {/* Git Mode */}
            <box
              $type="named"
              name="git"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={12}
            >
              <box
                class="placeholder-content"
                orientation={Gtk.Orientation.VERTICAL}
                spacing={8}
              >
                <label
                  label="Git Mode"
                  cssClasses={["mode-title"]}
                  halign={Gtk.Align.CENTER}
                />
                <label
                  label="Git repository management coming soon..."
                  cssClasses={["mode-subtitle"]}
                  halign={Gtk.Align.CENTER}
                />
              </box>
            </box>
          </stack>
        </scrolledwindow>

        <Gtk.Separator />

        {/* Quick Actions at bottom */}
        <QuickActionsWidget />

        {/* Extra widgets */}
        {children}
      </box>
    </window>
  );
}