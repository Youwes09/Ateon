// ~/.config/ags/utils/cheatsheet.ts
import { createState } from "ags";

/** ---------- Types ---------- **/
export interface Keybind {
  mods: string[];
  key: string;
  comment: string;
}

export interface KeybindSection {
  name: string;
  keybinds: Keybind[];
}

export interface KeybindGroup {
  name: string;
  sections: KeybindSection[];
}

export interface CheatSheetTab {
  icon: string;
  name: string;
}

/** ---------- Constants ---------- **/
export const TABS: CheatSheetTab[] = [
  { icon: "keyboard", name: "Keybinds" },
  { icon: "science", name: "Elements" },
];

// Sample keybind data - replace with your actual keybinds
export const KEYBIND_DATA: KeybindGroup[] = [
  {
    name: "System",
    sections: [
      {
        name: "Window Management",
        keybinds: [
          { mods: ["Super"], key: "Return", comment: "Open terminal" },
          { mods: ["Super"], key: "q", comment: "Close window" },
          { mods: ["Super"], key: "f", comment: "Toggle fullscreen" },
          { mods: ["Super", "Shift"], key: "f", comment: "Toggle floating" },
          { mods: ["Super"], key: "v", comment: "Toggle split" },
          { mods: ["Super"], key: "p", comment: "Pin window" },
        ],
      },
      {
        name: "Navigation",
        keybinds: [
          { mods: ["Super"], key: "h", comment: "Focus left" },
          { mods: ["Super"], key: "j", comment: "Focus down" },
          { mods: ["Super"], key: "k", comment: "Focus up" },
          { mods: ["Super"], key: "l", comment: "Focus right" },
          { mods: ["Super", "Shift"], key: "h", comment: "Move left" },
          { mods: ["Super", "Shift"], key: "j", comment: "Move down" },
          { mods: ["Super", "Shift"], key: "k", comment: "Move up" },
          { mods: ["Super", "Shift"], key: "l", comment: "Move right" },
        ],
      },
      {
        name: "Workspaces",
        keybinds: [
          { mods: ["Super"], key: "1", comment: "Switch to workspace 1" },
          { mods: ["Super"], key: "2", comment: "Switch to workspace 2" },
          { mods: ["Super"], key: "3", comment: "Switch to workspace 3" },
          { mods: ["Super"], key: "4", comment: "Switch to workspace 4" },
          { mods: ["Super", "Shift"], key: "1", comment: "Move to workspace 1" },
          { mods: ["Super", "Shift"], key: "2", comment: "Move to workspace 2" },
          { mods: ["Super", "Shift"], key: "3", comment: "Move to workspace 3" },
          { mods: ["Super", "Shift"], key: "4", comment: "Move to workspace 4" },
        ],
      },
    ],
  },
  {
    name: "Applications",
    sections: [
      {
        name: "Launchers",
        keybinds: [
          { mods: ["Super"], key: "d", comment: "App launcher" },
          { mods: ["Super"], key: "r", comment: "Run command" },
          { mods: ["Super"], key: "e", comment: "File manager" },
          { mods: ["Super"], key: "b", comment: "Web browser" },
          { mods: ["Super"], key: "t", comment: "Terminal" },
        ],
      },
      {
        name: "System Controls",
        keybinds: [
          { mods: ["Super"], key: "Escape", comment: "Lock screen" },
          { mods: ["Super", "Shift"], key: "e", comment: "Logout menu" },
          { mods: ["Super", "Shift"], key: "r", comment: "Restart WM" },
          { mods: ["Super", "Shift"], key: "q", comment: "Exit WM" },
        ],
      },
      {
        name: "Media & Volume",
        keybinds: [
          { mods: [], key: "XF86AudioPlay", comment: "Play/Pause" },
          { mods: [], key: "XF86AudioNext", comment: "Next track" },
          { mods: [], key: "XF86AudioPrev", comment: "Previous track" },
          { mods: [], key: "XF86AudioRaiseVolume", comment: "Volume up" },
          { mods: [], key: "XF86AudioLowerVolume", comment: "Volume down" },
          { mods: [], key: "XF86AudioMute", comment: "Toggle mute" },
        ],
      },
    ],
  },
  {
    name: "AGS Widgets",
    sections: [
      {
        name: "Interface",
        keybinds: [
          { mods: ["Super"], key: "F1", comment: "Toggle cheat sheet" },
          { mods: ["Super"], key: "space", comment: "App launcher" },
          { mods: ["Super"], key: "m", comment: "System menu" },
          { mods: ["Super"], key: "n", comment: "Notifications" },
          { mods: ["Super"], key: "s", comment: "Sidebar" },
          { mods: ["Super", "Shift"], key: "m", comment: "Music player" },
        ],
      },
    ],
  },
];

// Periodic table elements (sample data)
export const PERIODIC_ELEMENTS = [
  [
    { type: "element", number: 1, symbol: "H", name: "Hydrogen" },
    { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" },
    { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" },
    { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" },
    { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" },
    { type: "element", number: 2, symbol: "He", name: "Helium" },
  ],
  [
    { type: "element", number: 3, symbol: "Li", name: "Lithium" },
    { type: "element", number: 4, symbol: "Be", name: "Beryllium" },
    { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" },
    { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" },
    { type: "empty" }, { type: "empty" },
    { type: "element", number: 5, symbol: "B", name: "Boron" },
    { type: "element", number: 6, symbol: "C", name: "Carbon" },
    { type: "element", number: 7, symbol: "N", name: "Nitrogen" },
    { type: "element", number: 8, symbol: "O", name: "Oxygen" },
    { type: "element", number: 9, symbol: "F", name: "Fluorine" },
    { type: "element", number: 10, symbol: "Ne", name: "Neon" },
  ],
  [
    { type: "element", number: 11, symbol: "Na", name: "Sodium" },
    { type: "element", number: 12, symbol: "Mg", name: "Magnesium" },
    { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" },
    { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" },
    { type: "empty" }, { type: "empty" },
    { type: "element", number: 13, symbol: "Al", name: "Aluminum" },
    { type: "element", number: 14, symbol: "Si", name: "Silicon" },
    { type: "element", number: 15, symbol: "P", name: "Phosphorus" },
    { type: "element", number: 16, symbol: "S", name: "Sulfur" },
    { type: "element", number: 17, symbol: "Cl", name: "Chlorine" },
    { type: "element", number: 18, symbol: "Ar", name: "Argon" },
  ],
];

/** ---------- Key Substitutions ---------- **/
export const KEY_SUBSTITUTIONS: Record<string, string> = {
  "Super": "⌘",
  "Ctrl": "⌃", 
  "Alt": "⌥",
  "Shift": "⇧",
  "Return": "⏎",
  "Escape": "⎋",
  "Tab": "⇥",
  "Space": "␣",
  "BackSpace": "⌫",
  "Delete": "⌦",
  "mouse_up": "Scroll ↑",
  "mouse_down": "Scroll ↓",
  "mouse:272": "LMB",
  "mouse:273": "RMB",
  "XF86AudioPlay": "⏯",
  "XF86AudioNext": "⏭",
  "XF86AudioPrev": "⏮",
  "XF86AudioRaiseVolume": "🔊",
  "XF86AudioLowerVolume": "🔉",
  "XF86AudioMute": "🔇",
};

/** ---------- State Management ---------- **/
const [visible, setVisible] = createState(false);
const [selectedTab, setSelectedTab] = createState(0);

/** ---------- Cheat Sheet Service ---------- **/
export const CheatSheetService = {
  // State getters
  get visible() { return visible; },
  get selectedTab() { return selectedTab; },
  
  // Data getters
  get tabs() { return TABS; },
  get keybinds() { return KEYBIND_DATA; },
  get elements() { return PERIODIC_ELEMENTS; },
  get keySubstitutions() { return KEY_SUBSTITUTIONS; },
  
  // Actions
  toggle() {
    setVisible(!visible);
  },
  
  show() {
    setVisible(true);
  },
  
  hide() {
    setVisible(false);
  },
  
  setTab(index: number) {
    setSelectedTab(Math.max(0, Math.min(index, TABS.length - 1)));
  },
  
  nextTab() {
    setSelectedTab((selectedTab + 1) % TABS.length);
  },
  
  prevTab() {
    setSelectedTab((selectedTab - 1 + TABS.length) % TABS.length);
  },
};