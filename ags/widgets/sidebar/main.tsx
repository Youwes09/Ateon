// widgets/sidebar/Sidebar.tsx
import app from "ags/gtk4/app";
import { Astal, Gtk } from "ags/gtk4";
import { createState, For } from "ags";
import ClockWidget from "./modules/ClockWidget";
import QuickActionsWidget from "./modules/QuickActionWidget";
import options from "options";
import { gdkmonitor } from "utils/monitors";
import { SIDEBAR_WIDGETS } from "./widgetRegistry";
import { DEFAULT_WIDGET_ORDER, DEFAULT_ENABLED_WIDGETS, SidebarWidgetId, MODES, SidebarMode } from "./types";

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

  const [filteredWidgets, setFilteredWidgets] = createState<SidebarWidgetId[]>(
    [],
  );

  const [widgetsForCurrentMode, setWidgetsForCurrentMode] = createState<SidebarWidgetId[]>(
    [],
  );

  const updateFilteredWidgets = () => {
    const order =
      (options["sidebar.widget-order"]?.get() as SidebarWidgetId[]) ||
      DEFAULT_WIDGET_ORDER;
    const enabled =
      (options["sidebar.enabled-widgets"]?.get() as SidebarWidgetId[]) ||
      DEFAULT_ENABLED_WIDGETS;
    const filtered = order.filter((id) => enabled.includes(id));
    setFilteredWidgets(filtered);
    updateWidgetsForMode(filtered);
  };

  const updateWidgetsForMode = (widgets?: SidebarWidgetId[]) => {
    const mode = currentMode.get();
    const widgetList = widgets || filteredWidgets.get();
    // Filter out clock since it's always shown at the top
    const forMode = widgetList.filter((id) => {
      if (id === "clock") return false;
      const widget = SIDEBAR_WIDGETS[id];
      return widget && widget.mode === mode;
    });
    setWidgetsForCurrentMode(forMode);
  };

  options["sidebar.widget-order"]?.subscribe(updateFilteredWidgets);
  options["sidebar.enabled-widgets"]?.subscribe(updateFilteredWidgets);
  currentMode.subscribe(() => updateWidgetsForMode());

  updateFilteredWidgets();

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
      keymode={Astal.Keymode.ON_DEMAND}
      application={app}
      visible={visible}
      widthRequest={320}
      gdkmonitor={gdkmonitor}
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        hexpand={false}
        vexpand={true}
        spacing={12}
      >
        {/* Clock always at top */}
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

        {/* Dynamic widgets based on mode - with proper expansion */}
        <scrolledwindow
          vexpand={true}
          hexpand={false}
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          cssClasses={["mode-content-scroll"]}
          minContentHeight={100}
        >
          <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
            <For each={widgetsForCurrentMode}>
              {(widgetId, index) => {
                const widgetDef = SIDEBAR_WIDGETS[widgetId];
                if (!widgetDef) return <box />;

                const Component = widgetDef.component;
                const showSeparator =
                  (widgetDef.separatorAfter ?? false) &&
                  index.get() < widgetsForCurrentMode.get().length - 1;

                return (
                  <box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                    <Component />
                    {showSeparator && <Gtk.Separator />}
                  </box>
                );
              }}
            </For>
          </box>
        </scrolledwindow>

        {/* Spacer removed - let scrolledwindow handle expansion */}
        <Gtk.Separator />
        <QuickActionsWidget />
        {children}
      </box>
    </window>
  );
}