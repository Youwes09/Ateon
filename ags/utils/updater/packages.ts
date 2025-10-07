// utils/packages.ts
import { execAsync } from "ags/process";
import GLib from "gi://GLib";

export interface PackageCategory {
  name: string;
  packages: string[];
  enabled: boolean;
}

class PackageService {
  private config: PackageCategory[] | null = null;
  private configPath = `${GLib.get_home_dir()}/.config/ags/configs/system/packages.json`;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const [success, contents] = GLib.file_get_contents(this.configPath);
      if (success) {
        const decoder = new TextDecoder();
        const jsonStr = decoder.decode(contents);
        this.config = JSON.parse(jsonStr);
      }
    } catch (error) {
      console.error("Failed to load package config:", error);
      // Default categories
      this.config = [
        {
          name: "Core Utilities",
          packages: ["git", "curl", "wget", "unzip", "zip"],
          enabled: true
        },
        {
          name: "Development",
          packages: ["nodejs", "npm", "python3", "gcc", "make"],
          enabled: false
        },
        {
          name: "Terminal Tools",
          packages: ["neovim", "tmux", "zsh", "fzf", "ripgrep"],
          enabled: false
        }
      ];
    }
  }

  getPackages(): PackageCategory[] {
    return this.config || [];
  }

  toggleCategory(index: number): boolean {
    if (!this.config || index < 0 || index >= this.config.length) {
      return false;
    }

    this.config[index].enabled = !this.config[index].enabled;
    this.saveConfig();
    return true;
  }

  private saveConfig(): void {
    try {
      const jsonStr = JSON.stringify(this.config, null, 2);
      GLib.file_set_contents(this.configPath, jsonStr);
    } catch (error) {
      console.error("Failed to save package config:", error);
    }
  }

  async installPackages(
    packages: string[],
    onProgress: (message: string) => void
  ): Promise<void> {
    // Detect package manager
    let packageManager = "pacman";
    let installCmd = "sudo pacman -S --noconfirm";

    try {
      await execAsync(["which", "apt"]);
      packageManager = "apt";
      installCmd = "sudo apt install -y";
    } catch {
      try {
        await execAsync(["which", "dnf"]);
        packageManager = "dnf";
        installCmd = "sudo dnf install -y";
      } catch {
        // Default to pacman
      }
    }

    onProgress(`Using ${packageManager} to install packages...`);

    for (const pkg of packages) {
      onProgress(`Installing ${pkg}...`);
      try {
        await execAsync(`${installCmd} ${pkg}`);
      } catch (error) {
        console.error(`Failed to install ${pkg}:`, error);
        throw new Error(`Failed to install ${pkg}`);
      }
    }
  }
}

export const packageService = new PackageService();