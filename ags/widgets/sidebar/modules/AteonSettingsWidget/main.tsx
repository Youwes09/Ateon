import { Gtk } from "ags/gtk4";
import { createState, onCleanup } from "ags";
import BarSettingsPage from "./modules/BarSettingsPage";
import AudioSettingsPage from "./modules/AudioSettingsPage";
import SystemSettingsPage from "./modules/SystemSettingsPage";
import WidgetManagerPage from "./modules/WidgetManagerPage";

export default function MatshellSettingsWidget() {
  const [currentPage, setCurrentPage] = createState("appearance");

  const pages = [
    { id: "appearance", icon: "palette", tooltip: "Appearance" },
    { id: "audio", icon: "graphic_eq", tooltip: "Audio" },
    { id: "system", icon: "settings", tooltip: "System" },
    { id: "widgets", icon: "widgets", tooltip: "Widgets" },
  ];

  return (
    <box
      class="matshell-settings"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={0}
      hexpand={false}
      vexpand={false}
    >
      {/* Compact Header with Inline Navigation */}
      <box
        class="settings-header-compact"
        orientation={Gtk.Orientation.HORIZONTAL}
        spacing={8}
      >
        <label label="Settings" class="settings-title-compact" hexpand />
        
        {/* Compact icon-only navigation */}
        <box class="settings-nav-compact" spacing={4}>
          {pages.map((page) => (
            <button
              cssClasses={currentPage((current) =>
                current === page.id
                  ? ["nav-icon-button", "active"]
                  : ["nav-icon-button"],
              )}
              tooltipText={page.tooltip}
              onClicked={() => setCurrentPage(page.id)}
            >
              <label label={page.icon} cssClasses={["icon-compact"]} />
            </button>
          ))}
        </box>
      </box>

      {/* Content Stack */}
      <stack
        cssClasses={["settings-content"]}
        transitionType={Gtk.StackTransitionType.CROSSFADE}
        transitionDuration={150}
        hexpand={false}
        vexpand={false}
        $={(stack) => {
          const unsubscribe = currentPage.subscribe(() => {
            stack.visibleChildName = currentPage.get();
          });
          onCleanup(unsubscribe);
        }}
      >
        <box $type="named" name="appearance" hexpand={false}>
          <BarSettingsPage />
        </box>

        <box $type="named" name="audio" hexpand={false}>
          <AudioSettingsPage />
        </box>

        <box $type="named" name="system" hexpand={false}>
          <SystemSettingsPage />
        </box>

        <box $type="named" name="widgets" hexpand={false}>
          <WidgetManagerPage />
        </box>
      </stack>
    </box>
  );
}