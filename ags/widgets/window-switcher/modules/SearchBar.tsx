import { Gtk } from "ags/gtk4";
import { windowSwitcher } from "utils/windowSwitcher";

export function SearchBar() {
  let searchEntry: any = null;
  windowSwitcher.focusSearch = () => searchEntry?.grab_focus();

  return (
    <box cssClasses={["search-section"]} orientation={Gtk.Orientation.HORIZONTAL}>
      <label label="search" cssClasses={["search-icon"]} />
      <entry 
        $={(self) => { searchEntry = self; }} 
        placeholderText="Search windows by title or class..." 
        text={windowSwitcher.query} 
        onChanged={({ text }) => windowSwitcher.search(text || "")} 
        cssClasses={["search-entry"]} 
        hexpand 
      />
      <label label="↑↓: Nav • Enter: Focus • Del: Close" cssClasses={["shortcut-hint"]} />
    </box>
  );
}