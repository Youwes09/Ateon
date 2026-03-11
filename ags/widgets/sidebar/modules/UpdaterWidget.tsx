// widgets/sidebar/modules/UpdaterWidget.tsx
import { Gtk } from "ags/gtk4";
import { createState, With, onCleanup } from "ags";
import Pango from "gi://Pango";
import { updaterService, UpdateStatus, UpdateConfig } from "../../../utils/updater/updater";
import { packageService, PackageCategory, PackageInfo } from "../../../utils/updater/packages";

type UpdaterMode = "system" | "packages";

export default function UpdaterWidget() {
  const [mode, setMode] = createState<UpdaterMode>("system");
  const [status, setStatus] = createState<UpdateStatus>("idle");
  const [message, setMessage] = createState<string>("Ready to update");
  const [currentVersion, setCurrentVersion] = createState<string>(updaterService.getCurrentVersion());
  const [latestVersion, setLatestVersion] = createState<string>("Unknown");
  const [isUpdating, setIsUpdating] = createState(false);
  const [showConfig, setShowConfig] = createState(false);
  const [showPackages, setShowPackages] = createState(false);
  const [config, setConfig] = createState<UpdateConfig | null>(updaterService.getConfig());
  const [packages, setPackages] = createState<PackageCategory[]>([]);
  const [selectedPackages, setSelectedPackages] = createState<Set<string>>(new Set());

  const modes = [
    { id: "system", icon: "update", tooltip: "System" },
    { id: "packages", icon: "package_2", tooltip: "Packages" },
  ];

  const refreshCurrentVersion = () => {
    setCurrentVersion(updaterService.getCurrentVersion());
  };

  const loadPackages = async () => {
    try {
      const pkgCategories = await packageService.scanAvailablePackages();
      setPackages(pkgCategories);
    } catch (error) {
      console.error("Failed to load packages:", error);
    }
  };

  // Load packages when switching to packages mode
  const handleModeChange = (newMode: UpdaterMode) => {
    setMode(newMode);
    if (newMode === "packages") {
      loadPackages();
    }
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
      
      if (result.isUpToDate) {
        setStatus("success");
        setMessage("Already up to date");
        setTimeout(() => {
          setStatus("idle");
          setMessage("Ready to update");
        }, 3000);
      } else {
        setStatus("idle");
        setMessage("Update available!");
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
      setMessage(`Check failed: ${error}`);
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

      setStatus("success");
      setMessage("Updated successfully!");
      setConfig(updaterService.getConfig());
      refreshCurrentVersion();
      
      setTimeout(() => {
        setStatus("idle");
        setMessage("Ready to update");
        setIsUpdating(false);
      }, 5000);
    } catch (error) {
      console.error("Update failed:", error);
      setStatus("error");
      setMessage(`Update failed: ${error}`);
      setIsUpdating(false);
      
      setTimeout(() => {
        setStatus("idle");
        setMessage("Ready to update");
      }, 5000);
    }
  };

  const installPackages = async () => {
    const selected = selectedPackages.get();
    const packageNames = Array.from(selected);

    if (packageNames.length === 0) {
      setMessage("No packages selected");
      setStatus("error");
      setTimeout(() => {
        setStatus("idle");
        setMessage("Ready to install");
      }, 3000);
      return;
    }

    setIsUpdating(true);
    setStatus("copying");

    try {
      const result = await packageService.installPackages(
        packageNames,
        (current, total, pkgName, msg) => {
          setMessage(`${msg} (${current}/${total})`);
        }
      );

      if (result.failed.length > 0) {
        setStatus("error");
        setMessage(`Installed ${result.installed.length}, failed ${result.failed.length}`);
      } else {
        setStatus("success");
        setMessage(`Successfully installed ${result.installed.length} packages!`);
      }

      // Refresh package list
      await loadPackages();
      
      setTimeout(() => {
        setStatus("idle");
        setMessage("Ready to install");
        setIsUpdating(false);
      }, 5000);
    } catch (error) {
      console.error("Package installation failed:", error);
      setStatus("error");
      setMessage(`Installation failed: ${error}`);
      setIsUpdating(false);
      
      setTimeout(() => {
        setStatus("idle");
        setMessage("Ready to install");
      }, 5000);
    }
  };

  const updatePackages = async () => {
    setIsUpdating(true);
    setStatus("copying");

    try {
      const result = await packageService.updateAllInstalledPackages(
        (current, total, pkgName, msg) => {
          setMessage(`${msg} (${current}/${total})`);
        }
      );

      if (result.updated.length === 0) {
        setStatus("idle");
        setMessage("No packages to update");
      } else if (result.failed.length > 0) {
        setStatus("error");
        setMessage(`Updated ${result.updated.length}, failed ${result.failed.length}, skipped ${result.skipped.length}`);
      } else {
        setStatus("success");
        setMessage(`Successfully updated ${result.updated.length} packages!`);
      }

      // Refresh package list
      await loadPackages();
      
      setTimeout(() => {
        setStatus("idle");
        setMessage("Ready to update");
        setIsUpdating(false);
      }, 5000);
    } catch (error) {
      console.error("Package update failed:", error);
      setStatus("error");
      setMessage(`Update failed: ${error}`);
      setIsUpdating(false);
      
      setTimeout(() => {
        setStatus("idle");
        setMessage("Ready to update");
      }, 5000);
    }
  };

  const toggleFile = (index: number) => {
    if (updaterService.toggleFile(index)) {
      setConfig(updaterService.getConfig());
    }
  };

  const togglePackage = (pkgName: string) => {
    setSelectedPackages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pkgName)) {
        newSet.delete(pkgName);
      } else {
        newSet.add(pkgName);
      }
      return newSet;
    });
  };

  return (
    <box class="updater-widget" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
      {/* Header with mode navigation */}
      <box class="updater-header" orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
        <label label="System Manager" class="header-title" hexpand />
        
        <box class="updater-nav" spacing={4}>
          {modes.map((m) => (
            <button
              cssClasses={mode((current) =>
                current === m.id
                  ? ["nav-mode-button", "active"]
                  : ["nav-mode-button"],
              )}
              tooltipText={m.tooltip}
              onClicked={() => handleModeChange(m.id as UpdaterMode)}
            >
              <label label={m.icon} cssClasses={["icon-compact"]} />
            </button>
          ))}
        </box>
      </box>

      <Gtk.Separator />

      {/* Content area */}
      <stack
        cssClasses={["updater-content"]}
        transitionType={Gtk.StackTransitionType.CROSSFADE}
        transitionDuration={150}
        $={(stack) => {
          const unsubscribe = mode.subscribe(() => {
            stack.visibleChildName = mode.get();
          });
          onCleanup(unsubscribe);
        }}
      >
        {/* System Updater */}
        <box
          $type="named"
          name="system"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={12}
        >
          <With value={config}>
            {(cfg) => {
              if (!cfg) {
                return (
                  <box class="config-error" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                    <label label="Warning" cssClasses={["config-icon"]} />
                    <label label="No config file found" cssClasses={["config-error-text"]} halign={Gtk.Align.CENTER} />
                    <label label="Create updater.json in ~/.config/ags/configs/system" cssClasses={["config-error-hint"]} halign={Gtk.Align.CENTER} />
                  </box>
                );
              }

              return (
                <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                  <box class="version-info" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                    <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                      <label label="Current:" cssClasses={["version-label"]} halign={Gtk.Align.START} />
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
                      <label label="Latest:" cssClasses={["version-label"]} halign={Gtk.Align.START} />
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
                    {(s) => (
                      <box
                        cssClasses={["status-box", `status-${s}`]}
                        orientation={Gtk.Orientation.HORIZONTAL}
                        spacing={8}
                      >
                        <label
                          label={
                            s === "checking" ? "Hourglass_Empty" :
                            s === "cloning" ? "Download" :
                            s === "copying" ? "Content_Copy" :
                            s === "success" ? "Check_Circle" :
                            s === "error" ? "Error" : "Info"
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
                              wrap
                            />
                          )}
                        </With>
                      </box>
                    )}
                  </With>

                  <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8} homogeneous>
                    <button
                      cssClasses={["updater-button", "updater-button-check"]}
                      onClicked={checkForUpdates}
                      sensitive={isUpdating((u) => !u)}
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
                    onClicked={() => setShowConfig(prev => !prev)}
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
                        <box class="config-list" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                          <label
                            label="Select configs to update:"
                            cssClasses={["config-list-title"]}
                            halign={Gtk.Align.START}
                          />
                          {cfg.files.map((file, index) => (
                            <box cssClasses={["config-item"]} orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                              <box hexpand orientation={Gtk.Orientation.VERTICAL}>
                                <label label={file.name} cssClasses={["config-name"]} halign={Gtk.Align.START} />
                                <label label={file.destination} cssClasses={["config-path"]} halign={Gtk.Align.START} />
                              </box>
                              <switch
                                cssClasses={["config-switch"]}
                                active={file.enabled}
                                onNotifyActive={() => toggleFile(index)}
                              />
                            </box>
                          ))}
                          <box class="config-summary" orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
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

                  <box class="config-info" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                    <label label="Repository" cssClasses={["config-title"]} halign={Gtk.Align.START} />
                    <label
                      label={cfg.repoUrl.split("/").slice(-2).join("/")}
                      cssClasses={["config-detail"]}
                      halign={Gtk.Align.START}
                    />
                    <label label={`Branch: ${cfg.branch}`} cssClasses={["config-detail"]} halign={Gtk.Align.START} />
                  </box>
                </box>
              );
            }}
          </With>
        </box>

        {/* Package Manager */}
        <box
          $type="named"
          name="packages"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={12}
        >
          <With value={status}>
            {(s) => (
              <box
                cssClasses={["status-box", `status-${s}`]}
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={8}
              >
                <label
                  label={
                    s === "copying" ? "Download" :
                    s === "success" ? "Check_Circle" :
                    s === "error" ? "Error" : "Package"
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
                      wrap
                    />
                  )}
                </With>
              </box>
            )}
          </With>

          <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8} homogeneous>
            <With value={isUpdating}>
              {(updating) => (
                <button
                  cssClasses={["updater-button", "updater-button-update"]}
                  onClicked={installPackages}
                  sensitive={!updating}
                >
                  <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <label label="Download" cssClasses={["button-icon"]} />
                    <label label={updating ? "Installing..." : "Install"} />
                  </box>
                </button>
              )}
            </With>
            <With value={isUpdating}>
              {(updating) => (
                <button
                  cssClasses={["updater-button", "updater-button-check"]}
                  onClicked={updatePackages}
                  sensitive={!updating}
                >
                  <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                    <label label="Refresh" cssClasses={["button-icon"]} />
                    <label label={updating ? "Updating..." : "Update"} />
                  </box>
                </button>
              )}
            </With>
          </box>

          <button
            cssClasses={["config-toggle-button"]}
            onClicked={() => setShowPackages(prev => !prev)}
          >
            <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
              <label label="Category" cssClasses={["button-icon"]} />
              <label label="Available Packages" hexpand halign={Gtk.Align.START} />
              <With value={showPackages}>
                {(show) => (
                  <label
                    label={show ? "Expand_Less" : "Expand_More"}
                    cssClasses={["button-icon"]}
                  />
                )}
              </With>
            </box>
          </button>

          <With value={showPackages}>
            {(show) => {
              if (!show) return null;

              return (
                <box class="package-categories" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                  <With value={packages}>
                    {(pkgCategories) => {
                      if (pkgCategories.length === 0) {
                        return (
                          <box class="package-empty" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                            <label label="⚠" cssClasses={["empty-icon"]} />
                            <label label="No packages available" cssClasses={["empty-text"]} halign={Gtk.Align.CENTER} />
                            <label label="Switch to System tab and run Update first" cssClasses={["empty-hint"]} halign={Gtk.Align.CENTER} wrap />
                          </box>
                        );
                      }

                      return (
                        <>
                          {pkgCategories.map((category) => (
                            <box cssClasses={["package-category"]} orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                              <label
                                label={category.name}
                                cssClasses={["category-title"]}
                                halign={Gtk.Align.START}
                              />
                              <label
                                label={category.description}
                                cssClasses={["category-description"]}
                                halign={Gtk.Align.START}
                                wrap
                              />
                              <box class="package-list" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                                {category.packages.map((pkg) => (
                                  <box cssClasses={["package-item"]} orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                                    <box hexpand orientation={Gtk.Orientation.VERTICAL}>
                                      <box orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                                        <label label={pkg.name} cssClasses={["package-name"]} halign={Gtk.Align.START} />
                                        {pkg.installed && (
                                          <label label="✓" cssClasses={["package-installed"]} tooltipText="Installed" />
                                        )}
                                      </box>
                                      <label label={pkg.description} cssClasses={["package-description"]} halign={Gtk.Align.START} wrap />
                                      {pkg.version && (
                                        <label label={`v${pkg.version}`} cssClasses={["package-version"]} halign={Gtk.Align.START} />
                                      )}
                                    </box>
                                    <With value={selectedPackages}>
                                      {(selected) => (
                                        <switch
                                          cssClasses={["config-switch"]}
                                          active={selected.has(pkg.name)}
                                          onNotifyActive={() => togglePackage(pkg.name)}
                                        />
                                      )}
                                    </With>
                                  </box>
                                ))}
                              </box>
                            </box>
                          ))}
                          <With value={selectedPackages}>
                            {(selected) => (
                              <box class="package-summary" orientation={Gtk.Orientation.HORIZONTAL} spacing={8}>
                                <label
                                  label={`${selected.size} packages selected`}
                                  cssClasses={["summary-text"]}
                                  halign={Gtk.Align.START}
                                  hexpand
                                />
                              </box>
                            )}
                          </With>
                        </>
                      );
                    }}
                  </With>
                </box>
              );
            }}
          </With>
        </box>
      </stack>
    </box>
  );
}