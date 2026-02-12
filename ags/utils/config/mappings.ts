import { OptionChoice } from "./types.ts";

export const OS_OPTIONS: OptionChoice[] = [
  { label: "Arch Linux", value: "arch-symbolic" },
  { label: "NixOS", value: "nix-symbolic" },
  { label: "Windows", value: "windows-symbolic"},
  { label: "Ateon", value: "ateon-symbolic"},
];

export const BAR_POSITION_OPTIONS: OptionChoice[] = [
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
];

export const BAR_STYLE_OPTIONS: OptionChoice[] = [
  { label: "Expanded", value: "expanded" },
  { label: "Floating", value: "floating" },
  { label: "Rounded Corners", value: "corners" },
  { label: "Beveled", value: "beveled" },
];

export const THEME_STYLE_OPTIONS = [
  { label: "Normal", value: "normal" },
  { label: "Glass", value: "glass" },
];