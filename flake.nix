{
  description = "Ateon: A Material Design desktop shell for Hyprland powered by AGS, Astal & Chromash";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    systems.url = "github:nix-systems/default";

    astal = {
      url = "github:aylur/astal";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    ags = {
      url = "github:aylur/ags";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.astal.follows = "astal";
    };

    matugen = {
      url = "github:InioX/matugen";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs @ {
    self,
    nixpkgs,
    astal,
    ags,
    systems,
    flake-parts,
    ...
  }: let
    mkPkgs = system:
      import nixpkgs {
        inherit system;
        config.allowUnfree = true;
      };

    # Core AGS/Astal build dependencies
    mkCoreBuildInputs = system: let
      pkgs = mkPkgs system;
      astalPkgs = astal.packages.${system};
    in
      (with pkgs; [
        glib
        gjs
        typescript
        libgtop
        libadwaita
        libsoup_3
        glib-networking
      ])
      ++ (with astalPkgs; [
        astal4
        io
        notifd
        apps
        wireplumber
        mpris
        network
        tray
        bluetooth
        cava
        battery
        powerprofiles
        hyprland
      ]);

    # Runtime dependencies that need to be in PATH
    mkRuntimeDeps = system: let
      pkgs = mkPkgs system;
      matugenPackage = inputs.matugen.packages.${system}.default;
    in
      with pkgs; [
        # Core utilities
        dart-sass
        imagemagick
        libnotify
        wl-clipboard
        cliphist  # Using cliphist instead of clipvault for now
        brightnessctl
        
        # Hyprland ecosystem
        hyprpaper
        
        # System services
        bluez
        networkmanager
        
        # Screenshot & color picker
        grim
        slurp
        hyprpicker
        swappy
        
        # Media control
        playerctl
        
        # Python for various tools
        python3
        
        # Matugen for theming
        matugenPackage
      ];

    # Icon and font packages
    mkIconsAndFonts = system: let
      pkgs = mkPkgs system;
    in
      with pkgs; [
        adwaita-icon-theme
        material-design-icons
        material-symbols
        hicolor-icon-theme
        gnome-themes-extra
      ];

    mkAteonPackage = system: let
      pkgs = mkPkgs system;
      agsPackage = ags.packages.${system}.default;
      runtimeDeps = mkRuntimeDeps system;
      iconsAndFonts = mkIconsAndFonts system;
    in
      pkgs.stdenv.mkDerivation {
        pname = "ateon";
        version = "1.0.0";

        src = ./ags;

        nativeBuildInputs = with pkgs; [
          wrapGAppsHook3
          gobject-introspection
          agsPackage
        ];

        buildInputs = (mkCoreBuildInputs system) ++ iconsAndFonts;

        installPhase = ''
          mkdir -p $out/bin $out/share/ateon
          ags bundle app.ts $out/bin/ateon
          
          cp -r style $out/share/ateon/
          cp -r assets $out/share/ateon/
          cp -r matugen $out/share/ateon/
          cp -r configs $out/share/ateon/
        '';

        preFixup = ''
          gappsWrapperArgs+=(
            --prefix PATH : ${pkgs.lib.makeBinPath runtimeDeps}
            --prefix XDG_DATA_DIRS : ${pkgs.lib.makeSearchPath "share" iconsAndFonts}
            --set GTK_THEME Adwaita:dark
            --set GDK_PIXBUF_MODULE_FILE ${pkgs.librsvg}/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache
          )
        '';

        postInstall = ''
          # Create wrapper script that initializes config directory
          mv $out/bin/ateon $out/bin/.ateon-unwrapped
          
          cat > $out/bin/ateon << 'WRAPPER'
          #!/bin/sh
          ATEON_CONFIG="$HOME/.config/ags"
          
          if [ ! -d "$ATEON_CONFIG" ]; then
            echo "Initializing Ateon configuration..."
            mkdir -p "$ATEON_CONFIG"
            cp -r SHARE_DIR/* "$ATEON_CONFIG/"
            find "$ATEON_CONFIG" -type d -exec chmod 755 {} \;
            find "$ATEON_CONFIG" -type f -exec chmod 644 {} \;
            echo "Ateon configuration installed to $ATEON_CONFIG"
          fi
          
          exec UNWRAPPED_BIN "$@"
          WRAPPER
          
          sed -i "s|SHARE_DIR|$out/share/ateon|g" $out/bin/ateon
          sed -i "s|UNWRAPPED_BIN|$out/bin/.ateon-unwrapped|g" $out/bin/ateon
          chmod +x $out/bin/ateon
        '';

        meta = with pkgs.lib; {
          description = "Material Design desktop shell for Hyprland";
          homepage = "https://github.com/Youwes09/Ateon";
          license = licenses.gpl3;
          platforms = platforms.linux;
          maintainers = [];
        };
      };
  in
    flake-parts.lib.mkFlake {inherit inputs;} {
      systems = import systems;

      perSystem = {system, ...}: let
        pkgs = mkPkgs system;
        agsPackage = ags.packages.${system}.default;

        shellHook = ''
          echo "Setting up Ateon development environment..."

          cat > tsconfig.json << EOF
          {
            "compilerOptions": {
              "allowImportingTsExtensions": true,
              "allowJs": true,
              "baseUrl": ".",
              "experimentalDecorators": false,
              "jsx": "react-jsx",
              "jsxImportSource": "ags/gtk4",
              "module": "ES2022",
              "moduleResolution": "Bundler",
              "noImplicitAny": false,
              "paths": {
                "ags/*": ["${agsPackage}/share/ags/js/lib/*"],
                "ags": ["${agsPackage}/share/ags/js/lib/index.ts"]
              },
              "typeRoots": ["./@girs"],
              "strict": true,
              "target": "ES2020"
            }
          }
          EOF

          if [ ! -d "@girs" ]; then
            ags types -d .
          else
            ags types update -d .
          fi

          echo "Ateon devenv ready! Run 'ags run' to start development."
        '';
      in {
        packages.default = mkAteonPackage system;

        apps.default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/ateon";
        };

        devShells.default = pkgs.mkShell {
          buildInputs = 
            (mkCoreBuildInputs system) 
            ++ (mkRuntimeDeps system)
            ++ (mkIconsAndFonts system)
            ++ [agsPackage];
          inherit shellHook;
        };
      };

      flake = {
        homeManagerModules.default = import ./nix/hm-module.nix self;
        nixosModules.default = import ./nix/nixos-module.nix self;
      };
    };
}