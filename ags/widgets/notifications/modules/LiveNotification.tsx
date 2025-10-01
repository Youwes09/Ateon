import { onCleanup, onMount } from "ags";
import Notifd from "gi://AstalNotifd";
import { BaseNotification } from "./Notification.tsx";
import { liveToUnified, createTimeoutManager } from "utils/notifd";

export function NotificationWidget({
  notification,
}: {
  notification: Notifd.Notification;
}) {
  const notifd = Notifd.get_default();
  const TIMEOUT_DELAY = 4000; // 4 seconds like macOS

  const timeoutManager = createTimeoutManager(
    () => notification.dismiss(),
    TIMEOUT_DELAY,
  );

  onMount(() => {
    timeoutManager.setupTimeout();
  });

  onCleanup(() => {
    timeoutManager.cleanup();
  });

  const handleClick = (button: number) => {
    // Simple: any click dismisses the notification
    notification.dismiss();
  };

  return (
    <BaseNotification
      notification={liveToUnified(notification)}
      variant="live"
      onClick={handleClick}
      onDismiss={(id) => notification.dismiss()}
      onHover={() => timeoutManager.handleHover()}
      onHoverLost={() => timeoutManager.handleHoverLost()}
      cssClasses={["notification"]}
    />
  );
}