self: {
  config,
  lib,
  pkgs,
  ...
}: let
  cfg = config.programs.ateon;
in {
  options.programs.ateon = {
    enable = lib.mkEnableOption "Ateon Material Design shell";

    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.system}.default;
      defaultText = lib.literalExpression "self.packages.\${pkgs.system}.default";
      description = "The Ateon package to use";
    };

    hyprland = {
      enable = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Whether to enable Hyprland integration";
      };

      autoStart = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Whether to automatically start Ateon with Hyprland";
      };
    };
  };

  config = lib.mkIf cfg.enable {
    home.packages = [cfg.package];

    # Hyprland autostart configuration
    wayland.windowManager.hyprland = lib.mkIf (cfg.hyprland.enable && cfg.hyprland.autoStart) {
      settings = {
        exec-once = [
          "${cfg.package}/bin/ateon"
        ];
      };
    };
  };
}