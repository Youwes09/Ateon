import ClockWidget from "./modules/ClockWidget";
import WeatherWidget from "./modules/WeatherWidget";
import MatshellSettingsWidget from "./modules/AteonSettingsWidget/main";
import HardwareMonitorWidget from "./modules/HardwareWidget/main";
import NotesWidget from "./modules/NotesWidget";
import TimerWidget from "./modules/TimerWidget";
import UpdaterWidget from "./modules/UpdaterWidget";
import type { WidgetDefinition, SidebarWidgetId } from "./types.ts";

export const SIDEBAR_WIDGETS = {
  clock: {
    id: "clock",
    name: "Clock",
    icon: "Schedule",
    description: "Time and date",
    component: ClockWidget,
    separatorAfter: true,
    canDisable: false,
    mode: "widgets",
  },
  weather: {
    id: "weather",
    name: "Weather",
    icon: "Partly_Cloudy_Day",
    description: "Weather information",
    component: WeatherWidget,
    separatorAfter: true,
    canDisable: true,
    mode: "widgets",
  },
  hardware: {
    id: "hardware",
    name: "System Monitor",
    icon: "Memory",
    description: "CPU, RAM, GPU, Disk",
    component: HardwareMonitorWidget,
    separatorAfter: true,
    canDisable: true,
    mode: "widgets",
  },
  notes: {
    id: "notes",
    name: "Notes",
    icon: "Note",
    description: "Scratchpad",
    component: NotesWidget,
    separatorAfter: false,
    canDisable: true,
    mode: "widgets",
  },
  settings: {
    id: "settings",
    name: "Settings",
    icon: "Settings_Applications",
    description: "Configuration panel",
    component: MatshellSettingsWidget,
    separatorAfter: false,
    canDisable: false,
    mode: "settings",
  },
  timer: {
    id: "timer",
    name: "Timer",
    icon: "Timer",
    description: "Timer",
    component: TimerWidget,
    separatorAfter: true,
    canDisable: true,
    mode: "widgets",
  },
  updater: {
    id: "updater",
    name: "Updater",
    icon: "System_Update",
    description: "System updates",
    component: UpdaterWidget,
    separatorAfter: true,
    canDisable: true,
    mode: "settings",
  },
} as const satisfies Record<string, WidgetDefinition>;

export function getAvailableWidgets(): WidgetDefinition[] {
  return Object.values(SIDEBAR_WIDGETS);
}

export function getWidgetById(id: string): WidgetDefinition | undefined {
  return SIDEBAR_WIDGETS[id as SidebarWidgetId];
}

export function isValidWidgetId(id: string): id is SidebarWidgetId {
  return id in SIDEBAR_WIDGETS;
}

export function getWidgetsByMode(mode: "widgets" | "settings"): WidgetDefinition[] {
  return Object.values(SIDEBAR_WIDGETS).filter(w => w.mode === mode);
}