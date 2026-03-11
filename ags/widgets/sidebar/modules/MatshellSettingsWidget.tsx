import { Gtk } from "ags/gtk4";
import { createState, onCleanup } from "ags";
import {
  OptionSelectProps,
  OptionToggleProps,
  BAR_POSITION_OPTIONS,
  BAR_STYLE_OPTIONS,
  OS_OPTIONS,
} from "utils/config";
import options from "options.ts";

const TIME_FORMAT_OPTIONS = [
  { label: "12 Hour", value: "12" },
  { label: "24 Hour", value: "24" },
];

const THEME_STYLE_OPTIONS = [
  { label: "Normal", value: "normal" },
  { label: "Glass", value: "glass" },
];

function OptionSelect({ option, label, choices = [] }: OptionSelectProps) {
  return (
    <box cssClasses={["option-row", "option-select"]}>
      <label
        label={label}
        halign={Gtk.Align.START}
        hexpand={true}
        cssClasses={["option-label"]}
      />
      <Gtk.ComboBoxText
        cssClasses={["option-dropdown"]}
        onChanged={(self) => {
          const selectedIndex = self.get_active();
          const selectedChoice = choices[selectedIndex];
          options[option].value = selectedChoice.value;
        }}
        $={(self) => {
          choices.forEach((choice) => {
            self.append_text(choice.label);
          });

          const currentValue = String(options[option].get());
          const initialIndex = choices.findIndex(
            (choice) => choice.value === currentValue,
          );

          if (initialIndex !== -1) {
            self.set_active(initialIndex);
          } else {
            self.set_active(0);
            options[option].value = choices[0].value;
          }
        }}
      />
    </box>
  );
}

function OptionToggle({ option, label }: OptionToggleProps) {
  return (
    <box cssClasses={["option-row", "option-toggle"]}>
      <label
        label={label}
        halign={Gtk.Align.START}
        hexpand={true}
        cssClasses={["option-label"]}
      />
      <switch
        cssClasses={["option-switch"]}
        active={options[option]((value) => Boolean(value))}
        onNotifyActive={(self) => {
          options[option].value = self.active;
        }}
      />
    </box>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <label 
      label={label} 
      cssClasses={["section-header"]} 
      halign={Gtk.Align.START}
    />
  );
}

export default function MatshellSettingsWidget() {
  const [currentPage, setCurrentPage] = createState("bar");

  const pages = [
    { id: "bar", icon: "view_agenda" },
    { id: "dock", icon: "apps" },
    { id: "system", icon: "settings" },
  ];

  return (
    <box
      class="matshell-settings"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={0}
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
              tooltipText={page.id.charAt(0).toUpperCase() + page.id.slice(1)}
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
        $={(stack) => {
          const unsubscribe = currentPage.subscribe(() => {
            stack.visibleChildName = currentPage.get();
          });
          onCleanup(unsubscribe);
        }}
      >
        {/* Bar Settings */}
        <box
          $type="named"
          name="bar"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={8}
        >
          <SectionHeader label="Appearance" />
          <OptionSelect
            option="bar.position"
            label="Position"
            choices={BAR_POSITION_OPTIONS}
          />
          <OptionSelect
            option="bar.style"
            label="Style"
            choices={BAR_STYLE_OPTIONS}
          />
          
          <SectionHeader label="OS Icon" />
          <OptionToggle option="bar.modules.os-icon.show" label="Show Icon" />
          <OptionSelect
            option="bar.modules.os-icon.type"
            label="Icon Type"
            choices={OS_OPTIONS}
          />
        </box>

        {/* Dock Settings */}
        <box
          $type="named"
          name="dock"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={8}
        >
          <SectionHeader label="Dock" />
          <OptionToggle option="dock.enabled" label="Enable" />
          <OptionToggle option="dock.auto-hide" label="Auto-hide" />
          
          <box cssClasses={["info-box"]}>
            <label 
              label="Dock hides when bar is at bottom"
              cssClasses={["info-text"]}
              wrap
              halign={Gtk.Align.START}
            />
          </box>
        </box>

        {/* System Settings */}
        <box
          $type="named"
          name="system"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={8}
        >
          <SectionHeader label="Theme" />
          <OptionSelect
            option="theme.style"
            label="Style"
            choices={THEME_STYLE_OPTIONS}
          />
          
          <SectionHeader label="Clock" />
          <OptionSelect
            option="clock.format"
            label="Time Format"
            choices={TIME_FORMAT_OPTIONS}
          />
          
          <SectionHeader label="Advanced Menus" />
          <OptionToggle
            option="system-menu.modules.wifi-advanced.enable"
            label="WiFi Settings"
          />
          <OptionToggle
            option="system-menu.modules.bluetooth-advanced.enable"
            label="Bluetooth Settings"
          />
        </box>
      </stack>
    </box>
  );
}