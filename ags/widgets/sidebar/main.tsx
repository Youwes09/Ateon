// widgets/sidebar/Sidebar.tsx
import app from "ags/gtk4/app";
import { Astal, Gtk } from "ags/gtk4";
import { createState } from "ags";
import ClockWidget from "./modules/ClockWidget";
import WeatherWidget from "./modules/WeatherWidget";
import MatshellSettingsWidget from "./modules/MatshellSettingsWidget";
import QuickActionsWidget from "./modules/QuickActionWidget";
import TimerWidget from "./modules/TimerWidget";
import UpdaterWidget from "./modules/UpdaterWidget";
import options from "options";

export type SidebarMode = "widgets" | "settings";

interface ModeConfig {
  id: SidebarMode;
  label: string;
  icon: string;
}

const MODES: ModeConfig[] = [
  { id: "widgets", label: "Widgets", icon: "Widgets" },
  { id: "settings", label: "Settings", icon: "Settings" },
];

export default function Sidebar(
  props: {
    children?: Gtk.Widget | JSX.Element | (Gtk.Widget | JSX.Element)[];
  } = {},
) {
  const { TOP, LEFT, BOTTOM } = Astal.WindowAnchor;
  const { NORMAL, EXCLUSIVE } = Astal.Exclusivity;
  const [visible] = createState(false);
  const [currentMode, setCurrentMode] = createState<SidebarMode>("widgets");
  const { children = [] } = props;

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
        <ClockWidget />
        <Gtk.Separator />

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
            <box
              $type="named"
              name="widgets"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={12}
            >
              <WeatherWidget />
              <Gtk.Separator />
              <TimerWidget />
            </box>

            <box
              $type="named"
              name="settings"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={12}
            >
              <UpdaterWidget />
              <Gtk.Separator />
              <MatshellSettingsWidget />
            </box>
          </stack>
        </scrolledwindow>

        <Gtk.Separator />

        <QuickActionsWidget />

        {children}
      </box>
    </window>
  );
}