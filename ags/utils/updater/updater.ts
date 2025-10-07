// utils/updater.ts
import { execAsync } from "ags/process";
import GLib from "gi://GLib";

export interface FileMapping {
  source: string;
  destination: string;
  enabled: boolean;
  name: string;
  exclude?: string[];
}

export interface UpdateConfig {
  repoUrl: string;
  branch: string;
  tempDir: string;
  files: FileMapping[];
  lastUpdate?: {
    hash: string;
    date: string;
  };
}

export interface PackageGroup {
  name: string;
  description: string;
  packages: string[];
}

export interface PackagesConfig {
  packageGroups: PackageGroup[];
}

export interface PackageStatus {
  name: string;
  installed: boolean;
  version?: string;
}

export interface PackageGroupStatus {
  name: string;
  description: string;
  packages: PackageStatus[];
  installedCount: number;
  totalCount: number;
}

export type UpdateStatus = "idle" | "checking" | "cloning" | "copying" | "success" | "error";

export interface UpdateProgress {
  status: UpdateStatus;
  message: string;
  currentFile?: number;
  totalFiles?: number;
}

const CONFIG_PATH = `${GLib.get_home_dir()}/.config/ags/configs/system/updater.json`;
let PACKAGES_PATH = `${GLib.get_home_dir()}/.config/ags/configs/system/packages.json`;

export class UpdaterService {
  private config: UpdateConfig | null = null;
  private packagesConfig: PackagesConfig | null = null;

  constructor() {
    this.loadConfig();
    this.loadPackagesConfig();
  }

  loadConfig(): UpdateConfig | null {
    try {
      const [success, contents] = GLib.file_get_contents(CONFIG_PATH);
      
      if (success) {
        const decoder = new TextDecoder("utf-8");
        const configText = decoder.decode(contents);
        this.config = JSON.parse(configText);
        return this.config;
      }
    } catch (error) {
      console.error("Failed to load updater config:", error);
    }
    this.config = null;
    return null;
  }

  loadPackagesConfig(): PackagesConfig | null {
    try {
      // First try to load from cloned repo if it exists
      if (this.config?.tempDir) {
        const tempDir = this.config.tempDir.replace("~", GLib.get_home_dir());
        const repoPackagesPath = `${tempDir}/configs/system/packages.json`;
        
        try {
          const [success, contents] = GLib.file_get_contents(repoPackagesPath);
          if (success) {
            const decoder = new TextDecoder("utf-8");
            const configText = decoder.decode(contents);
            this.packagesConfig = JSON.parse(configText);
            PACKAGES_PATH = repoPackagesPath;
            return this.packagesConfig;
          }
        } catch (e) {
          // Fall through to local config
        }
      }

      // Fall back to local config
      const [success, contents] = GLib.file_get_contents(PACKAGES_PATH);
      
      if (success) {
        const decoder = new TextDecoder("utf-8");
        const configText = decoder.decode(contents);
        this.packagesConfig = JSON.parse(configText);
        return this.packagesConfig;
      }
    } catch (error) {
      console.error("Failed to load packages config:", error);
    }
    this.packagesConfig = null;
    return null;
  }

  saveConfig(config: UpdateConfig): boolean {
    try {
      const configDir = CONFIG_PATH.substring(0, CONFIG_PATH.lastIndexOf("/"));
      GLib.mkdir_with_parents(configDir, 0o755);
      GLib.file_set_contents(CONFIG_PATH, JSON.stringify(config, null, 2));
      this.config = config;
      return true;
    } catch (error) {
      console.error("Failed to save config:", error);
      return false;
    }
  }

  getConfig(): UpdateConfig | null {
    return this.config;
  }

  getPackagesConfig(): PackagesConfig | null {
    return this.packagesConfig;
  }

  getCurrentVersion(): string {
    if (!this.config?.lastUpdate) {
      return "Not updated yet";
    }

    const { hash, date } = this.config.lastUpdate;
    return `${date} (${hash})`;
  }

  async checkPackageInstalled(packageName: string): Promise<{ installed: boolean; version?: string }> {
    try {
      // Check if package is installed using pacman
      const result = await execAsync(`pacman -Q ${packageName} 2>/dev/null || echo "not-installed"`);
      
      if (result.trim() === "not-installed" || result.trim() === "") {
        return { installed: false };
      }
      
      // Parse version from "package-name version" format
      const parts = result.trim().split(" ");
      const version = parts.length > 1 ? parts[1] : undefined;
      
      return { installed: true, version };
    } catch (error) {
      return { installed: false };
    }
  }

  async checkAllPackages(): Promise<PackageGroupStatus[]> {
    if (!this.packagesConfig) {
      return [];
    }

    const results: PackageGroupStatus[] = [];

    for (const group of this.packagesConfig.packageGroups) {
      const packageStatuses: PackageStatus[] = [];
      
      for (const pkg of group.packages) {
        const status = await this.checkPackageInstalled(pkg);
        packageStatuses.push({
          name: pkg,
          installed: status.installed,
          version: status.version
        });
      }

      const installedCount = packageStatuses.filter(p => p.installed).length;

      results.push({
        name: group.name,
        description: group.description,
        packages: packageStatuses,
        installedCount,
        totalCount: group.packages.length
      });
    }

    return results;
  }

  async installPackage(packageName: string): Promise<{ success: boolean; usedYay: boolean; error?: string }> {
    try {
      // First try with pacman
      try {
        await execAsync(`pkexec pacman -S --noconfirm ${packageName}`);
        return { success: true, usedYay: false };
      } catch (pacmanError) {
        console.log(`Pacman failed for ${packageName}, trying yay...`);
        
        // If pacman fails, try with yay (no sudo needed for yay)
        try {
          await execAsync(`yay -S --noconfirm ${packageName}`);
          return { success: true, usedYay: true };
        } catch (yayError) {
          return { 
            success: false, 
            usedYay: false,
            error: `Both pacman and yay failed: ${yayError}` 
          };
        }
      }
    } catch (error) {
      return { 
        success: false, 
        usedYay: false,
        error: `Installation error: ${error}` 
      };
    }
  }

  async installMissingPackages(
    groupName?: string,
    onProgress?: (current: number, total: number, packageName: string) => void
  ): Promise<{ installed: string[]; failed: string[] }> {
    if (!this.packagesConfig) {
      return { installed: [], failed: [] };
    }

    const missingPackages: string[] = [];
    const groupsToCheck = groupName 
      ? this.packagesConfig.packageGroups.filter(g => g.name === groupName)
      : this.packagesConfig.packageGroups;

    // First, collect all missing packages
    for (const group of groupsToCheck) {
      for (const pkg of group.packages) {
        const status = await this.checkPackageInstalled(pkg);
        if (!status.installed) {
          missingPackages.push(pkg);
        }
      }
    }

    const installed: string[] = [];
    const failed: string[] = [];

    // Install each missing package
    for (let i = 0; i < missingPackages.length; i++) {
      const pkg = missingPackages[i];
      onProgress?.(i + 1, missingPackages.length, pkg);

      const result = await this.installPackage(pkg);
      
      if (result.success) {
        installed.push(pkg);
      } else {
        failed.push(pkg);
        console.error(`Failed to install ${pkg}:`, result.error);
      }
    }

    return { installed, failed };
  }

  async checkForUpdates(): Promise<{ version: string; hash: string; isUpToDate: boolean }> {
    if (!this.config) {
      throw new Error("No config found");
    }

    const httpsUrl = "https://github.com/Youwes09/Ateon.git";

    try {
      const result = await execAsync(
        `git ls-remote ${httpsUrl} ${this.config.branch} | awk '{print $1}'`
      );
      
      if (!result || result.trim() === "") {
        throw new Error("Failed to fetch repository information");
      }
      
      const fullHash = result.trim();
      const shortHash = fullHash.substring(0, 7);
    
    let formattedVersion = shortHash;
    
    try {
      const tempDir = this.config.tempDir.replace("~", GLib.get_home_dir());
      await execAsync(`mkdir -p ${tempDir}/temp-git`);
      await execAsync(`git init ${tempDir}/temp-git 2>/dev/null`);
      await execAsync(`git -C ${tempDir}/temp-git remote add origin ${this.config.repoUrl} 2>/dev/null || true`);
      await execAsync(`git -C ${tempDir}/temp-git fetch --depth=1 origin ${this.config.branch} 2>/dev/null`);
      
      const dateResult = await execAsync(
        `git -C ${tempDir}/temp-git log -1 FETCH_HEAD --format=%cd --date=short 2>/dev/null`
      );
      
      await execAsync(`rm -rf ${tempDir}/temp-git`);
      
      const dateStr = dateResult.trim();
      if (dateStr && dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-');
        const shortYear = year.slice(2);
        const formattedDate = `${parseInt(month)}/${parseInt(day)}/${shortYear}`;
        formattedVersion = `${formattedDate} (${shortHash})`;
      }
    } catch (e) {
      // Fallback to just hash if date fetch fails
      console.warn("Failed to fetch commit date:", e);
    }

    const currentHash = this.config.lastUpdate?.hash;
    const isUpToDate = currentHash === shortHash;

    return {
      version: formattedVersion,
      hash: shortHash,
      isUpToDate
    };
    } catch (error) {
      console.error("Failed to check for updates:", error);
      throw new Error(`Repository check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async performUpdate(
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<void> {
    if (!this.config) {
      throw new Error("No config found");
    }

    const tempDir = this.config.tempDir.replace("~", GLib.get_home_dir());

    try {
      // Clone repository
      onProgress?.({
        status: "cloning",
        message: "Cloning repository..."
      });

      await execAsync(`rm -rf ${tempDir}`).catch(() => {});
      const httpsUrl = "https://github.com/Youwes09/Ateon.git";

      await execAsync(
        `git clone --depth 1 --branch ${this.config.branch} ${httpsUrl} ${tempDir}`
      );

      // Copy files
      const enabledFiles = this.config.files.filter(f => f.enabled);
      
      for (let i = 0; i < enabledFiles.length; i++) {
        const file = enabledFiles[i];
        onProgress?.({
          status: "copying",
          message: `Copying ${file.name}...`,
          currentFile: i + 1,
          totalFiles: enabledFiles.length
        });

        const sourcePath = `${tempDir}/${file.source}`;
        const destPath = file.destination.replace("~", GLib.get_home_dir());

        const isDir = await execAsync(`bash -c 'test -d ${sourcePath} && echo "1" || echo "0"'`);
        
        if (isDir.trim() === "1") {
          await execAsync(`mkdir -p ${destPath}`);
          
          if (file.exclude && file.exclude.length > 0) {
            for (const ex of file.exclude) {
              const excludePath = `${sourcePath}/${ex}`;
              await execAsync(`rm -rf ${excludePath}`).catch(() => {});
            }
          }
          
          await execAsync(`bash -c 'cp -r ${sourcePath}/* ${destPath}/'`);
        } else {
          const destDir = destPath.substring(0, destPath.lastIndexOf("/"));
          await execAsync(`mkdir -p ${destDir}`);
          await execAsync(`cp ${sourcePath} ${destPath}`);
        }
      }

      // Update config with new version
      const hashResult = await execAsync(`git -C ${tempDir} rev-parse --short HEAD`);
      const commitHash = hashResult.trim().substring(0, 7);

      const now = new Date();
      const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear().toString().slice(2)}`;
      
      this.config.lastUpdate = {
        hash: commitHash,
        date: dateStr
      };
      
      this.saveConfig(this.config);

      // Load packages config from the cloned repo
      const repoPackagesPath = `${tempDir}/configs/system/packages.json`;
      try {
        const [success, contents] = GLib.file_get_contents(repoPackagesPath);
        if (success) {
          const decoder = new TextDecoder("utf-8");
          const configText = decoder.decode(contents);
          const packagesConfig: PackagesConfig = JSON.parse(configText);
          
          // Install missing packages
          onProgress?.({
            status: "copying",
            message: "Checking for missing packages..."
          });

          const allPackages: string[] = [];
          for (const group of packagesConfig.packageGroups) {
            allPackages.push(...group.packages);
          }

          const missingPackages: string[] = [];
          for (const pkg of allPackages) {
            const status = await this.checkPackageInstalled(pkg);
            if (!status.installed) {
              missingPackages.push(pkg);
            }
          }

          if (missingPackages.length > 0) {
            onProgress?.({
              status: "copying",
              message: `Installing ${missingPackages.length} missing packages...`
            });

            for (let i = 0; i < missingPackages.length; i++) {
              const pkg = missingPackages[i];
              onProgress?.({
                status: "copying",
                message: `Installing ${pkg} (${i + 1}/${missingPackages.length})...`
              });

              const result = await this.installPackage(pkg);
              if (!result.success) {
                console.warn(`Failed to install ${pkg}:`, result.error);
              }
            }
          }

          // Save packages config locally
          const localPackagesPath = `${GLib.get_home_dir()}/.config/ags/configs/system/packages.json`;
          const configDir = localPackagesPath.substring(0, localPackagesPath.lastIndexOf("/"));
          GLib.mkdir_with_parents(configDir, 0o755);
          GLib.file_set_contents(localPackagesPath, JSON.stringify(packagesConfig, null, 2));
          
          // Reload packages config
          this.loadPackagesConfig();
        }
      } catch (e) {
        console.warn("Failed to process packages.json:", e);
      }

      // Cleanup
      await execAsync(`rm -rf ${tempDir}`);

      onProgress?.({
        status: "success",
        message: "Updated successfully!"
      });
    } catch (error) {
      await execAsync(`rm -rf ${tempDir}`).catch(() => {});
      throw error;
    }
  }

  toggleFile(index: number): boolean {
    if (!this.config) return false;

    this.config.files[index].enabled = !this.config.files[index].enabled;
    return this.saveConfig(this.config);
  }

  getRepositoryInfo(): { name: string; branch: string } | null {
    if (!this.config) return null;

    return {
      name: this.config.repoUrl.split("/").slice(-2).join("/"),
      branch: this.config.branch
    };
  }
}

// Export singleton instance
export const updaterService = new UpdaterService();