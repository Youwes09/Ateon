import app from "ags/gtk4/app";
import { exec } from "ags/process";
import { monitorFile } from "ags/file";
import GLib from "gi://GLib?version=2.0";
import { picker } from "utils/picker";
import options from "options.ts";
// Widgets
import {
  Bar,
  SystemMenu,
  OnScreenDisplay,
  Notifications,
  LogoutMenu,
  PickerWindow,
  MusicPlayer,
  Sidebar,
  Clipboard,
  WindowSwitcher,
  Dock,
} from "./widgets";

const configDir = GLib.get_user_config_dir();
const baseScss = `${configDir}/ags/style/main.scss`;
const css = `${configDir}/ags/style/main.css`;
const icons = `${configDir}/ags/assets/icons`;
const styleDirectories = ["abstracts", "layouts", "base"];

function getComponentsPath() {
  const themeStyle = options["theme.style"].get();
  return `${configDir}/ags/style/components/${themeStyle}`;
}

function reloadCss() {
  const componentsPath = getComponentsPath();
  console.log(`Recompiling SCSS with theme: ${options["theme.style"].get()}`);
  console.log(`Components path: ${componentsPath}`);
  
  // Add quotes around paths to handle spaces and ensure proper execution
  const command = `sass --load-path="${componentsPath}" "${baseScss}" "${css}"`;
  console.log(`Running: ${command}`);
  exec(command);
  app.apply_css(css);
}

app.start({
  icons,
  css,
  instanceName: "ateon",
  requestHandler(argv: string[], res: (response: any) => void) {
    const request = argv[0];
    switch (request) {
      case "picker":
        app.toggle_window("picker");
        res("picker toggled");
        break;
      case "clipboard":
        app.toggle_window("clipboard");
        res("clipboard toggled");
        break;
      case "window-switcher":
        app.toggle_window("window-switcher");
        res("window switcher toggled");
        break;
      case "logout":
        app.toggle_window("logout-menu");
        res("logout menu toggled");
        break;
      case "sidebar":
        app.toggle_window("sidebar");
        res("sidebar toggled");
        break;
      case "reload-css":
        reloadCss();
        res("css reloaded");
        break;
      case "wall-rand":
        picker.random("wp");
        res("random wallpaper set");
        break;
      default:
        res("not found");
    }
  },
  main() {
    // Initial compilation with theme path
    const componentsPath = getComponentsPath();
    console.log(`Initial compilation with theme: ${options["theme.style"].get()}`);
    console.log(`Components path: ${componentsPath}`);
    const command = `sass --load-path="${componentsPath}" "${baseScss}" "${css}"`;
    console.log(`Running: ${command}`);
    exec(command);
    
    // Watch style directories
    styleDirectories.forEach((dir) =>
      monitorFile(`${configDir}/ags/style/${dir}`, reloadCss),
    );
    
    // Watch both theme directories
    monitorFile(`${configDir}/ags/style/components/normal`, reloadCss);
    monitorFile(`${configDir}/ags/style/components/glass`, reloadCss);
    
    // Watch for theme option changes
    options["theme.style"].subscribe((newTheme) => {
      console.log(`Theme switched to: ${newTheme}`);
      reloadCss();
    });
    
    // Initialize widgets
    Bar();
    Notifications();
    OnScreenDisplay();
    SystemMenu();
    MusicPlayer();
    PickerWindow();
    LogoutMenu();
    Sidebar();
    Clipboard();
    WindowSwitcher();
    Dock();
  },
});