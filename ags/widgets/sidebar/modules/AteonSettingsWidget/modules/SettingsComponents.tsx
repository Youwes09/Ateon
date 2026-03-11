import { Gtk } from "ags/gtk4";
import options from "options.ts";
import { OptionSelectProps, OptionToggleProps } from "utils/config";

export function OptionSelect({ option, label, choices = [] }: OptionSelectProps) {
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

export function OptionToggle({ option, label }: OptionToggleProps) {
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

export function SectionHeader({ label }: { label: string }) {
  return (
    <label 
      label={label} 
      cssClasses={["section-header"]} 
      halign={Gtk.Align.START}
    />
  );
}