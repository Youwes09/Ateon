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

export type UpdateStatus = "idle" | "checking" | "cloning" | "copying" | "success" | "error";

export interface UpdateProgress {
  status: UpdateStatus;
  message: string;
  currentFile?: number;
  totalFiles?: number;
}

const CONFIG_PATH = `${GLib.get_home_dir()}/.config/ags/configs/updater.json`;

export class UpdaterService {
  private config: UpdateConfig | null = null;

  constructor() {
    this.loadConfig();
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

  getCurrentVersion(): string {
    if (!this.config?.lastUpdate) {
      return "Not updated yet";
    }

    const { hash, date } = this.config.lastUpdate;
    return `${date} (${hash})`;
  }

  async checkForUpdates(): Promise<{ version: string; hash: string; isUpToDate: boolean }> {
    if (!this.config) {
      throw new Error("No config found");
    }

    const httpsUrl = "https://github.com/Youwes09/Ateon.git";

    const result = await execAsync(
      `git ls-remote ${httpsUrl} ${this.config.branch} | awk '{print $1}'`
    );
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
    }

    const currentHash = this.config.lastUpdate?.hash;
    const isUpToDate = currentHash === shortHash;

    return {
      version: formattedVersion,
      hash: shortHash,
      isUpToDate
    };
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