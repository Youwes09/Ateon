export interface WidgetDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  component: () => JSX.Element;
  separatorAfter: boolean;
  canDisable: boolean;
  mode: "widgets" | "settings"; // Add mode to determine which tab it belongs to
}

export type SidebarWidgetId =
  | "clock"
  | "weather"
  | "hardware"
  | "notes"
  | "settings"
  | "timer"
  | "updater";

export type SidebarMode = "widgets" | "settings";

export interface ModeConfig {
  id: SidebarMode;
  label: string;
  icon: string;
}

export const MODES: ModeConfig[] = [
  { id: "widgets", label: "Widgets", icon: "Widgets" },
  { id: "settings", label: "Settings", icon: "Settings" },
];

export const DEFAULT_WIDGET_ORDER: SidebarWidgetId[] = [
  "clock",
  "weather",
  "hardware",
  "notes",
  "settings",
  "timer",
  "updater",
];

export const DEFAULT_ENABLED_WIDGETS: SidebarWidgetId[] = [
  "clock",
  "weather",
  "hardware",
  "notes",
  "settings",
  "timer",
  "updater",
];