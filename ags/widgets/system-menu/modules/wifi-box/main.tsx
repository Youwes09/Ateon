import app from "ags/gtk4/app";
import { Gtk } from "ags/gtk4";
import { createBinding, createState, For, onCleanup } from "ags";
import { execAsync } from "ags/process";
import { interval } from "ags/time";
import Network from "gi://AstalNetwork";
import { NetworkItem } from "./modules/NetworkItem.tsx";
import { PasswordDialog } from "./modules/PasswordDialog.tsx";
import {
  availableNetworks,
  savedNetworks,
  activeNetwork,
  showPasswordDialog,
  scanTimer,
  setScanTimer,
  scanNetworks,
  getSavedNetworks,
  disconnectNetwork,
  forgetNetwork,
} from "utils/wifi";
import options from "options.ts";

export const WiFiBox = () => {
  const network = Network.get_default();
  const [isExpanded, setIsExpanded] = createState(false);

  // Safe getter to avoid null refs
  const wifi = () => network?.wifi ?? null;

  return (
    <box cssClasses={["toggle"]} orientation={Gtk.Orientation.VERTICAL}>
      {/* === WiFi Toggle Header === */}
      <box>
        {/* Toggle WiFi on/off */}
        <button
          onClicked={() => {
            const w = wifi();
            if (!w) return;
            w.set_enabled(!w.enabled);
          }}
          cssClasses={createBinding(network, "wifi")((w) =>
            w?.enabled ? ["button"] : ["button-disabled"],
          )}
        >
          <image
            iconName={createBinding(network, "wifi")(
              (w) => w?.icon_name ?? "network-offline-symbolic",
            )}
          />
        </button>

        {/* Expand available networks */}
        <button
          hexpand
          onClicked={() => {
            const w = wifi();
            if (!w?.enabled) return;
            setIsExpanded((prev) => !prev);
            if (!isExpanded.get()) {
              scanNetworks();
              getSavedNetworks();
            }
          }}
        >
          <box hexpand>
            <label
              hexpand
              xalign={0}
              label={createBinding(network, "wifi")(
                (w) =>
                  w?.ssid ||
                  (w?.enabled ? "Not Connected" : "Wi-Fi Off"),
              )}
            />
            <image
              iconName="pan-end-symbolic"
              halign={Gtk.Align.END}
              cssClasses={isExpanded((expanded) =>
                expanded
                  ? ["arrow-indicator", "arrow-down"]
                  : ["arrow-indicator"],
              )}
            />
          </box>
        </button>
      </box>

      {/* === Revealer Section === */}
      <revealer
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={300}
        revealChild={isExpanded}
        onNotifyChildRevealed={(revealer) => {
          const window = app.get_window("system-menu");
          if (window && !revealer.childRevealed) {
            window.set_default_size(-1, -1);
          }
        }}
        $={(self) => {
          const unsubscribeExpanded = isExpanded.subscribe(() => {
            const expanded = isExpanded.get();
            const w = wifi();

            if (expanded && w?.enabled) {
              scanTimer.get()?.cancel();
              const newTimer = interval(10000, () => {
                scanNetworks();
                getSavedNetworks();
              });
              setScanTimer(newTimer);
            } else {
              scanTimer.get()?.cancel();
              setScanTimer(null);
            }
          });

          const windowListener = app.connect("window-toggled", (_, window) => {
            if (
              window.name === "system-menu" &&
              !window.visible &&
              isExpanded.get()
            ) {
              setIsExpanded(false);
            }
          });

          onCleanup(() => {
            scanTimer.get()?.cancel();
            setScanTimer(null);
            app.disconnect(windowListener);
            unsubscribeExpanded();
          });
        }}
      >
        <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["system-menu-list"]}>
          {/* === Password Dialog === */}
          <box visible={showPasswordDialog}>
            <PasswordDialog />
          </box>

          {/* === Available Networks === */}
          <box orientation={Gtk.Orientation.VERTICAL}>
            <label label="Available Networks" cssClasses={["section-label"]} />

            {/* Empty state */}
            <box visible={availableNetworks((nets) => nets.length === 0)}>
              <label
                label="No networks found"
                cssClasses={["empty-label"]}
                halign={Gtk.Align.CENTER}
                hexpand
              />
            </box>

            {/* Networks list */}
            <box
              orientation={Gtk.Orientation.VERTICAL}
              visible={availableNetworks((nets) => nets.length > 0)}
            >
              <For each={availableNetworks}>
                {(n) => <NetworkItem network={n} />}
              </For>
            </box>
          </box>

          {/* === Saved Networks === */}
          <box
            orientation={Gtk.Orientation.VERTICAL}
            visible={savedNetworks((saved) => {
              const availableSSIDs = new Set(
                availableNetworks.get().map((n) => n.ssid),
              );
              return saved.some((ssid) => !availableSSIDs.has(ssid));
            })}
          >
            <label label="Saved Networks" cssClasses={["section-label"]} />
            <For each={savedNetworks}>
              {(ssid) => {
                const isAvailable = availableNetworks
                  .get()
                  .some((n) => n.ssid === ssid);
                if (isAvailable) return null;

                return (
                  <button cssClasses={["network-item", "saved-network"]}>
                    <box hexpand valign={Gtk.Align.CENTER}>
                      <label label={ssid} hexpand xalign={0} />
                      <button
                        label="Forget"
                        cssClasses={["forget-button"]}
                        onClicked={(self, event) => {
                          event?.stopPropagation();
                          forgetNetwork(ssid);
                        }}
                      />
                    </box>
                  </button>
                );
              }}
            </For>
          </box>

          {/* === Controls === */}
          <box hexpand>
            {/* Refresh Button */}
            <button
              halign={Gtk.Align.START}
              cssClasses={["refresh-button"]}
              onClicked={() => {
                scanNetworks();
                getSavedNetworks();
              }}
            >
              <image iconName="view-refresh-symbolic" />
            </button>

            {/* Disconnect Option */}
            <box hexpand>
              <box
                orientation={Gtk.Orientation.VERTICAL}
                cssClasses={["connected-network"]}
                hexpand
                visible={activeNetwork((active) => active !== null)}
              >
                <button
                  label="Disconnect"
                  cssClasses={["disconnect-button"]}
                  onClicked={() => {
                    const active = activeNetwork.get();
                    if (active) disconnectNetwork(active.ssid);
                  }}
                />
              </box>
            </box>

            {/* Advanced Settings */}
            <button
              cssClasses={["settings-button"]}
              halign={Gtk.Align.END}
              visible={options["system-menu.modules.wifi-advanced.enable"](
                (v) => Boolean(v),
              )}
              onClicked={() => {
                execAsync(["sh", "-c", String(options["app.wifi"].get())]);
                setIsExpanded(false);
              }}
            >
              <image iconName="emblem-system-symbolic" />
            </button>
          </box>
        </box>
      </revealer>
    </box>
  );
};
