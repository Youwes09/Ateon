self: {
  config,
  lib,
  pkgs,
  ...
}: let
  cfg = config.services.ateon;
in {
  options.services.ateon = {
    enable = lib.mkEnableOption "Ateon Material Design shell";
    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.system}.default;
      defaultText = lib.literalExpression "self.packages.\${pkgs.system}.default";
      description = "The Ateon package to use";
    };
    installRecommended = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Install recommended applications (Firefox, file manager, etc.)";
    };
  };
  config = lib.mkIf cfg.enable {
    # Install Ateon and all dependencies in one systemPackages list
    environment.systemPackages = [cfg.package] ++ (with pkgs; [
      # Build tools & libraries
      dart-sass
      imagemagick
      libgtop
      libadwaita
      libsoup_3
      glib-networking
      
      # Hyprland ecosystem
      hyprpaper
      
      # System utilities
      libnotify
      wl-clipboard
      cliphist
      brightnessctl
      
      # Bluetooth
      bluez
      
      # Network
      networkmanager
      
      # Screenshot & utilities
      grim
      slurp
      hyprpicker
      playerctl
      swappy
      
      # Terminal tools
      foot
      fish
      starship
      fastfetch
    ]) ++ (lib.optionals cfg.installRecommended (with pkgs; [
      # Optional recommended apps
      firefox
      nautilus
      gnome-text-editor
      pavucontrol
    ]));
    
    # Fonts (matching install.sh + Material Design icons)
    fonts.packages = with pkgs; [
      # Programming fonts
      jetbrains-mono
      fira-code
      
      # Nerd Fonts - individual packages
      nerd-fonts.jetbrains-mono
      nerd-fonts.fira-code
      
      # Material Design icons (critical for AGS)
      material-design-icons
      material-symbols
      
      # Standard system fonts
      noto-fonts
      noto-fonts-color-emoji
      font-awesome
    ];
    
    # Ensure icon cache is built
    environment.pathsToLink = [ "/share/icons" ];
    
    # GTK icon theme configuration
    environment.variables = {
      # Ensure GTK can find icons
      GTK_THEME = "Adwaita:dark";
    };
    
    # Enable required services
    services.pipewire = {
      enable = lib.mkDefault true;
      pulse.enable = lib.mkDefault true;
      alsa.enable = lib.mkDefault true;
      alsa.support32Bit = lib.mkDefault true;
    };
    
    # Bluetooth services
    services.blueman.enable = lib.mkDefault true;
    hardware.bluetooth = {
      enable = lib.mkDefault true;
      powerOnBoot = lib.mkDefault true;
    };
    
    # Power management
    services.upower.enable = lib.mkDefault true;
    
    # Enable Hyprland
    programs.hyprland.enable = lib.mkDefault true;
    
    # Enable NetworkManager
    networking.networkmanager.enable = lib.mkDefault true;
    
    # Enable polkit
    security.polkit.enable = lib.mkDefault true;
    
    # Polkit agent (matching install.sh which uses polkit-gnome)
    systemd.user.services.polkit-gnome-authentication-agent-1 = {
      description = "polkit-gnome-authentication-agent-1";
      wantedBy = [ "graphical-session.target" ];
      wants = [ "graphical-session.target" ];
      after = [ "graphical-session.target" ];
      serviceConfig = {
        Type = "simple";
        ExecStart = "${pkgs.polkit_gnome}/libexec/polkit-gnome-authentication-agent-1";
        Restart = "on-failure";
        RestartSec = 1;
        TimeoutStopSec = 10;
      };
    };
    
    # XDG portal for file pickers and screen sharing
    xdg.portal = {
      enable = lib.mkDefault true;
      extraPortals = with pkgs; [
        xdg-desktop-portal-gtk
        xdg-desktop-portal-hyprland
      ];
      config.common.default = "*";
    };
    
    # Enable dconf for GTK settings
    programs.dconf.enable = lib.mkDefault true;
  };
}