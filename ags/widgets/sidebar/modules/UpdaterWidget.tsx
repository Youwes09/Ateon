// widgets/sidebar/modules/UpdaterWidget.tsx
import { Gtk } from "ags/gtk4";
import { createState, With } from "ags";
import Pango from "gi://Pango";
import { updaterService, UpdateStatus, UpdateConfig } from "../../../utils/updater";

export default function UpdaterWidget() {
  const [status, setStatus] = createState<UpdateStatus>("idle");
  const [message, setMessage] = createState<string>("Ready to update");
  const [currentVersion, setCurrentVersion] = createState<string>(updaterService.getCurrentVersion());
  const [latestVersion, setLatestVersion] = createState<string>("Unknown");
  const [isUpdating, setIsUpdating] = createState(false);
  const [showConfig, setShowConfig] = createState(false);
  const [config, setConfig] = createState<UpdateConfig | null>(updaterService.getConfig());

  const refreshCurrentVersion = () => {
    setCurrentVersion(updaterService.getCurrentVersion());
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
      const result = await updaterService.checkForUpdates();
      
      setLatestVersion(result.version);
      setMessage("Check complete");
      setStatus("idle");

      if (result.isUpToDate) {
        setMessage("Already up to date");
        setStatus("success");
        setTimeout(() => {
          setStatus("idle");
          setMessage("Ready to update");
        }, 3000);
      } else {
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

    try {
      await updaterService.performUpdate((progress) => {
        setStatus(progress.status);
        
        if (progress.currentFile && progress.totalFiles) {
          setMessage(`${progress.message} (${progress.currentFile}/${progress.totalFiles})`);
        } else {
          setMessage(progress.message);
        }
      });

      // Refresh config and version after successful update
      setConfig(updaterService.getConfig());
      refreshCurrentVersion();
      
      setTimeout(() => {
        setStatus("idle");
        setMessage("Ready to update");
      }, 3000);
    } catch (error) {
      console.error("Update failed:", error);
      setStatus("error");
      setMessage("Update failed");
      
      setTimeout(() => {
        setStatus("idle");
        setMessage("Ready to update");
      }, 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleFile = (index: number) => {
    if (updaterService.toggleFile(index)) {
      setConfig(updaterService.getConfig());
    }
  };

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