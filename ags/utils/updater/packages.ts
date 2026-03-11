// utils/packages.ts
import { execAsync } from "ags/process";
import GLib from "gi://GLib";

export interface PackageInfo {
  name: string;
  description: string;
  installed: boolean;
  version?: string;
}

export interface PackageCategory {
  name: string;
  description: string;
  packages: PackageInfo[];
}

class PackageService {
  private pkgbuildPath = `${GLib.get_home_dir()}/.config/ags/configs/PKGBUILD`;
  private pkgbuildDir = `${GLib.get_home_dir()}/.config/ags/configs`;

  constructor() {
    console.log(`PackageService initialized with PKGBUILD: ${this.pkgbuildPath}`);
  }

  /**
   * Check if a package is installed
   */
  async checkPackageInstalled(packageName: string): Promise<{ installed: boolean; version?: string }> {
    try {
      const result = await execAsync(`pacman -Q ${packageName} 2>/dev/null || echo "not-installed"`);
      
      if (result.trim() === "not-installed" || result.trim() === "") {
        return { installed: false };
      }
      
      const parts = result.trim().split(" ");
      const version = parts.length > 1 ? parts[1] : undefined;
      
      return { installed: true, version };
    } catch (error) {
      return { installed: false };
    }
  }

  /**
   * Parse PKGBUILD to extract package information
   */
  private async parsePKGBUILD(pkgbuildPath: string): Promise<{
    name: string;
    description: string;
    version: string;
    dependencies: string[];
  } | null> {
    try {
      const [success, contents] = GLib.file_get_contents(pkgbuildPath);
      if (!success) return null;

      const decoder = new TextDecoder();
      const content = decoder.decode(contents);

      // Extract pkgname
      const nameMatch = content.match(/pkgname=['"]?([^'")\s]+)['"]?/);
      const name = nameMatch ? nameMatch[1] : "";

      // Extract pkgdesc
      const descMatch = content.match(/pkgdesc=['"]([^'"]+)['"]?/);
      const description = descMatch ? descMatch[1] : "No description available";

      // Extract pkgver
      const verMatch = content.match(/pkgver=['"]?([^'")\s]+)['"]?/);
      const version = verMatch ? verMatch[1] : "unknown";

      // Extract depends array
      const dependencies: string[] = [];
      const dependsMatch = content.match(/depends=\(([\s\S]*?)\)/);
      if (dependsMatch) {
        const depsContent = dependsMatch[1];
        const depsMatches = depsContent.matchAll(/['"]([^'"]+)['"]/g);
        for (const match of depsMatches) {
          dependencies.push(match[1]);
        }
      }

      return { name, description, version, dependencies };
    } catch (error) {
      console.error("Failed to parse PKGBUILD:", error);
      return null;
    }
  }

  /**
   * Scan for the PKGBUILD and return package info
   */
  async scanAvailablePackages(): Promise<PackageCategory[]> {
    try {
      // Check if PKGBUILD exists
      const pkgbuildExists = await execAsync(`bash -c "test -f ${this.pkgbuildPath} && echo 1 || echo 0"`);
      
      if (pkgbuildExists.trim() !== "1") {
        console.warn("PKGBUILD not found at:", this.pkgbuildPath);
        return [];
      }

      console.log("Found PKGBUILD at:", this.pkgbuildPath);
      const pkgInfo = await this.parsePKGBUILD(this.pkgbuildPath);
      
      if (!pkgInfo) {
        console.error("Failed to parse PKGBUILD");
        return [];
      }

      const installStatus = await this.checkPackageInstalled(pkgInfo.name);
      
      return [{
        name: "Ateon Desktop Environment",
        description: pkgInfo.description,
        packages: [{
          name: pkgInfo.name,
          description: `v${pkgInfo.version} - ${pkgInfo.dependencies.length} dependencies`,
          installed: installStatus.installed,
          version: installStatus.version || pkgInfo.version
        }]
      }];

    } catch (error) {
      console.error("Failed to scan packages:", error);
      return [];
    }
  }

  /**
   * Install the package from PKGBUILD
   */
  async installPackages(
    packageNames: string[],
    onProgress: (current: number, total: number, packageName: string, message: string) => void
  ): Promise<{ installed: string[]; failed: string[] }> {
    const installed: string[] = [];
    const failed: string[] = [];

    const pkgName = packageNames[0];
    
    onProgress(1, 1, pkgName, `Installing ${pkgName}...`);

    try {
      // Check if PKGBUILD exists
      const pkgbuildExists = await execAsync(`bash -c "test -f ${this.pkgbuildPath} && echo 1 || echo 0"`);
      
      if (pkgbuildExists.trim() !== "1") {
        console.error(`PKGBUILD not found at ${this.pkgbuildPath}`);
        failed.push(pkgName);
        return { installed, failed };
      }

      // Build and install using makepkg
      onProgress(1, 1, pkgName, `Building ${pkgName}...`);
      await execAsync(`bash -c "cd ${this.pkgbuildDir} && makepkg -si --noconfirm 2>&1"`);
      
      installed.push(pkgName);
      console.log(`Successfully installed ${pkgName}`);

    } catch (error) {
      console.error(`Failed to install ${pkgName}:`, error);
      failed.push(pkgName);
    }

    return { installed, failed };
  }

  /**
   * Update the installed package by rebuilding
   */
  async updateAllInstalledPackages(
    onProgress: (current: number, total: number, packageName: string, message: string) => void
  ): Promise<{ updated: string[]; failed: string[]; skipped: string[] }> {
    const updated: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];

    const categories = await this.scanAvailablePackages();
    if (categories.length === 0 || categories[0].packages.length === 0) {
      return { updated, failed, skipped };
    }

    const pkg = categories[0].packages[0];
    const pkgName = pkg.name;

    // Check if package is installed
    if (!pkg.installed) {
      onProgress(1, 1, pkgName, `Skipping ${pkgName} (not installed)`);
      skipped.push(pkgName);
      return { updated, failed, skipped };
    }

    onProgress(1, 1, pkgName, `Updating ${pkgName}...`);

    try {
      // Clean previous build artifacts
      onProgress(1, 1, pkgName, `Cleaning build artifacts...`);
      await execAsync(`bash -c "cd ${this.pkgbuildDir} && rm -rf pkg/ src/ *.pkg.tar.* 2>/dev/null || true"`);

      // Rebuild and reinstall
      onProgress(1, 1, pkgName, `Rebuilding ${pkgName}...`);
      await execAsync(`bash -c "cd ${this.pkgbuildDir} && makepkg -sif --noconfirm 2>&1"`);
      
      updated.push(pkgName);
      console.log(`Successfully updated ${pkgName}`);

    } catch (error) {
      console.error(`Failed to update ${pkgName}:`, error);
      failed.push(pkgName);
    }

    return { updated, failed, skipped };
  }

  /**
   * Remove the package
   */
  async removePackage(packageName: string): Promise<{ success: boolean; error?: string }> {
    try {
      await execAsync(`pkexec pacman -R --noconfirm ${packageName}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Removal failed: ${error}`
      };
    }
  }
}

export const packageService = new PackageService();