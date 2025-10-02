// widgets/sidebar/modules/UpdaterWidget.tsx
import { Gtk } from "ags/gtk4";
import { createState, With } from "ags";
import { execAsync } from "ags/process";
import GLib from "gi://GLib";
import Pango from "gi://Pango";

interface FileMapping {
  source: string;
  destination: string;
  enabled: boolean;
  name: string;
  exclude?: string[];
}

interface UpdateConfig {
  repoUrl: string;
  branch: string;
  tempDir: string;
  files: FileMapping[];
  lastUpdate?: {
    hash: string;
    date: string;
  };
}

type UpdateStatus = "idle" | "checking" | "cloning" | "copying" | "success" | "error";

const CONFIG_PATH = `${GLib.get_home_dir()}/.config/ags/configs/updater.json`;

function loadConfig(): UpdateConfig | null {
  try {
    const [success, contents] = GLib.file_get_contents(CONFIG_PATH);
    
    if (success) {
      const decoder = new TextDecoder("utf-8");
      const configText = decoder.decode(contents);
      return JSON.parse(configText);
    }
  } catch (error) {
    console.error("Failed to load updater config:", error);
  }
  return null;
}

function saveConfig(config: UpdateConfig): boolean {
  try {
    const configDir = CONFIG_PATH.substring(0, CONFIG_PATH.lastIndexOf("/"));
    GLib.mkdir_with_parents(configDir, 0o755);
    GLib.file_set_contents(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error("Failed to save config:", error);
    return false;
  }
}

export default function UpdaterWidget() {
  const [status, setStatus] = createState<UpdateStatus>("idle");
  const [message, setMessage] = createState<string>("Ready to update");
  const [currentVersion, setCurrentVersion] = createState<string>("Not updated yet");
  const [latestVersion, setLatestVersion] = createState<string>("Unknown");
  const [isUpdating, setIsUpdating] = createState(false);
  const [showConfig, setShowConfig] = createState(false);
  const [config, setConfig] = createState<UpdateConfig | null>(loadConfig());

  const checkCurrentVersion = () => {
    const cfg = config.get();
    if (!cfg?.lastUpdate) {
      setCurrentVersion("Not updated yet");
      return;
    }

    const { hash, date } = cfg.lastUpdate;
    setCurrentVersion(`${date} (${hash})`);
  };

  const checkForUpdates = async () => {
    const cfg = config.get();
    if (!cfg) {
      setMessage("No config found");
      return;
    }

    setStatus("checking");
    setMessage("Checking for updates...");

    try {
      const result = await execAsync(
        `git ls-remote ${cfg.repoUrl} ${cfg.branch} | awk '{print $1}'`
      );
      const fullHash = result.trim();
      const shortHash = fullHash.substring(0, 7);
      
      try {
        const tempDir = cfg.tempDir.replace("~", GLib.get_home_dir());
        await execAsync(`mkdir -p ${tempDir}/temp-git`);
        await execAsync(`git init ${tempDir}/temp-git 2>/dev/null`);
        await execAsync(`git -C ${tempDir}/temp-git remote add origin ${cfg.repoUrl} 2>/dev/null || true`);
        await execAsync(`git -C ${tempDir}/temp-git fetch --depth=1 origin ${cfg.branch} 2>/dev/null`);
        
        const dateResult = await execAsync(
          `git -C ${tempDir}/temp-git log -1 FETCH_HEAD --format=%cd --date=short 2>/dev/null`
        );
        
        await execAsync(`rm -rf ${tempDir}/temp-git`);
        
        const dateStr = dateResult.trim();
        if (dateStr && dateStr.includes('-')) {
          const [year, month, day] = dateStr.split('-');
          const shortYear = year.slice(2);
          const formattedDate = `${parseInt(month)}/${parseInt(day)}/${shortYear}`;
          setLatestVersion(`${formattedDate} (${shortHash})`);
        } else {
          setLatestVersion(shortHash);
        }
      } catch (e) {
        setLatestVersion(shortHash);
      }

      setMessage("Check complete");
      setStatus("idle");

      const cfg2 = config.get();
      const currentHash = cfg2?.lastUpdate?.hash;
      if (currentHash && shortHash === currentHash) {
        setMessage("Already up to date");
        setStatus("success");
        setTimeout(() => {
          setStatus("idle");
          setMessage("Ready to update");
        }, 3000);
      } else if (currentHash) {
        setMessage("Update available!");
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
      setMessage("Check failed");
      setStatus("error");
      setTimeout(() => {
        setStatus("idle");
        setMessage("Ready to update");
      }, 5000);
    }
  };

  const performUpdate = async () => {
    const cfg = config.get();
    if (!cfg) {
      setMessage("No config found");
      setStatus("error");
      return;
    }

    setIsUpdating(true);
    const tempDir = cfg.tempDir.replace("~", GLib.get_home_dir());

    try {
      setStatus("cloning");
      setMessage("Cloning repository...");

      await execAsync(`rm -rf ${tempDir}`).catch(() => {});
      await execAsync(
        `git clone --depth 1 --branch ${cfg.branch} ${cfg.repoUrl} ${tempDir}`
      );

      setStatus("copying");
      const enabledFiles = cfg.files.filter(f => f.enabled);
      
      for (let i = 0; i < enabledFiles.length; i++) {
        const file = enabledFiles[i];
        setMessage(`Copying ${file.name} (${i + 1}/${enabledFiles.length})...`);

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

      const hashResult = await execAsync(`git -C ${tempDir} rev-parse --short HEAD`);
      const commitHash = hashResult.trim().substring(0, 7);

      const now = new Date();
      const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear().toString().slice(2)}`;
      
      cfg.lastUpdate = {
        hash: commitHash,
        date: dateStr
      };
      
      setConfig({ ...cfg });
      saveConfig(cfg);

      await execAsync(`rm -rf ${tempDir}`);

      setStatus("success");
      setMessage(`Updated successfully!`);
      checkCurrentVersion();
      
      setTimeout(() => {
        setStatus("idle");
        setMessage("Ready to update");
      }, 3000);
    } catch (error) {
      console.error("Update failed:", error);
      setStatus("error");
      setMessage(`Update failed`);
      
      await execAsync(`rm -rf ${tempDir}`).catch(() => {});
      
      setTimeout(() => {
        setStatus("idle");
        setMessage("Ready to update");
      }, 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleFile = (index: number) => {
    const cfg = config.get();
    if (!cfg) return;

    cfg.files[index].enabled = !cfg.files[index].enabled;
    setConfig({ ...cfg });
    saveConfig(cfg);
  };

  checkCurrentVersion();

  return (
    <box
      class="updater-widget"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={12}
    >
      <box
        class="widget-header"
        orientation={Gtk.Orientation.HORIZONTAL}
        spacing={8}
      >
        <label
          label="System_Update"
          cssClasses={["header-icon"]}
        />
        <label
          label="System Updater"
          cssClasses={["header-title"]}
          halign={Gtk.Align.START}
          hexpand
        />
      </box>

      <Gtk.Separator />

      <With value={config}>
        {(cfg) => {
          if (!cfg) {
            return (
              <box
                class="config-error"
                orientation={Gtk.Orientation.VERTICAL}
                spacing={8}
              >
                <label
                  label="Warning"
                  cssClasses={["config-icon"]}
                />
                <label
                  label="No config file found"
                  cssClasses={["config-error-text"]}
                  halign={Gtk.Align.CENTER}
                />
                <label
                  label="Create updater.json in ~/.config/ags/configs/"
                  cssClasses={["config-error-hint"]}
                  halign={Gtk.Align.CENTER}
                />
              </box>
            );
          }

          return (
            <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
              <box
                class="version-info"
                orientation={Gtk.Orientation.VERTICAL}
                spacing={8}
              >
                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                  <label
                    label="Current:"
                    cssClasses={["version-label"]}
                    halign={Gtk.Align.START}
                  />
                  <With value={currentVersion}>
                    {(version) => (
                      <label
                        label={version}
                        cssClasses={["version-value"]}
                        halign={Gtk.Align.START}
                        hexpand
                        ellipsize={Pango.EllipsizeMode.END}
                        maxWidthChars={20}
                      />
                    )}
                  </With>
                </box>

                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                  <label
                    label="Latest:"
                    cssClasses={["version-label"]}
                    halign={Gtk.Align.START}
                  />
                  <With value={latestVersion}>
                    {(version) => (
                      <label
                        label={version}
                        cssClasses={["version-value"]}
                        halign={Gtk.Align.START}
                        hexpand
                        ellipsize={Pango.EllipsizeMode.END}
                        maxWidthChars={20}
                      />
                    )}
                  </With>
                </box>
              </box>

              <With value={status}>
                {(currentStatus) => (
                  <box
                    cssClasses={["status-box", `status-${currentStatus}`]}
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={8}
                  >
                    <label
                      label={
                        currentStatus === "checking" ? "Hourglass_Empty" :
                        currentStatus === "cloning" ? "Download" :
                        currentStatus === "copying" ? "Content_Copy" :
                        currentStatus === "success" ? "Check_Circle" :
                        currentStatus === "error" ? "Error" :
                        "Info"
                      }
                      cssClasses={["status-icon"]}
                    />
                    <With value={message}>
                      {(msg) => (
                        <label
                          label={msg}
                          cssClasses={["status-message"]}
                          halign={Gtk.Align.START}
                          hexpand
                        />
                      )}
                    </With>
                  </box>
                )}
              </With>

              <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={8}
                homogeneous
              >
                <button
                  cssClasses={["updater-button", "updater-button-check"]}
                  onClicked={checkForUpdates}
                  sensitive={!isUpdating.get()}
                >
                  <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <label label="Refresh" cssClasses={["button-icon"]} />
                    <label label="Check" />
                  </box>
                </button>

                <With value={isUpdating}>
                  {(updating) => (
                    <button
                      cssClasses={["updater-button", "updater-button-update"]}
                      onClicked={performUpdate}
                      sensitive={!updating}
                    >
                      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                        <label label="Download" cssClasses={["button-icon"]} />
                        <label label={updating ? "Updating..." : "Update"} />
                      </box>
                    </button>
                  )}
                </With>
              </box>

              <button
                cssClasses={["config-toggle-button"]}
                onClicked={() => setShowConfig(!showConfig.get())}
              >
                <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                  <label label="Settings" cssClasses={["button-icon"]} />
                  <label label="Configure Files" hexpand halign={Gtk.Align.START} />
                  <With value={showConfig}>
                    {(show) => (
                      <label
                        label={show ? "Expand_Less" : "Expand_More"}
                        cssClasses={["button-icon"]}
                      />
                    )}
                  </With>
                </box>
              </button>

              <With value={showConfig}>
                {(show) => {
                  if (!show) return null;

                  return (
                    <box
                      class="config-list"
                      orientation={Gtk.Orientation.VERTICAL}
                      spacing={4}
                    >
                      <label
                        label="Select configs to update:"
                        cssClasses={["config-list-title"]}
                        halign={Gtk.Align.START}
                      />
                      {cfg.files.map((file, index) => (
                        <box
                          cssClasses={["config-item"]}
                          orientation={Gtk.Orientation.HORIZONTAL}
                          spacing={8}
                        >
                          <box hexpand orientation={Gtk.Orientation.VERTICAL}>
                            <label
                              label={file.name}
                              cssClasses={["config-name"]}
                              halign={Gtk.Align.START}
                            />
                            <label
                              label={file.destination}
                              cssClasses={["config-path"]}
                              halign={Gtk.Align.START}
                            />
                          </box>
                          <Gtk.Switch
                            cssClasses={["config-switch"]}
                            active={file.enabled}
                            onStateSet={() => {
                              toggleFile(index);
                              return true;
                            }}
                          />
                        </box>
                      ))}
                      <box
                        class="config-summary"
                        orientation={Gtk.Orientation.HORIZONTAL}
                        spacing={8}
                      >
                        <label
                          label={`${cfg.files.filter(f => f.enabled).length}/${cfg.files.length} configs enabled`}
                          cssClasses={["summary-text"]}
                          halign={Gtk.Align.START}
                          hexpand
                        />
                      </box>
                    </box>
                  );
                }}
              </With>

              <box
                class="config-info"
                orientation={Gtk.Orientation.VERTICAL}
                spacing={4}
              >
                <label
                  label="Repository"
                  cssClasses={["config-title"]}
                  halign={Gtk.Align.START}
                />
                <label
                  label={cfg.repoUrl.split("/").slice(-2).join("/")}
                  cssClasses={["config-detail"]}
                  halign={Gtk.Align.START}
                />
                <label
                  label={`Branch: ${cfg.branch}`}
                  cssClasses={["config-detail"]}
                  halign={Gtk.Align.START}
                />
              </box>
            </box>
          );
        }}
      </With>
    </box>
  );
}