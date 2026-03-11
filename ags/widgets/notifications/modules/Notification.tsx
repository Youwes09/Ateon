import { Gtk } from "ags/gtk4";
import Adw from "gi://Adw?version=1";
import Pango from "gi://Pango";
import { createState, Accessor } from "ags";
import { NotificationIcon } from "./Icon.tsx";
import {
  urgency,
  UnifiedNotification,
  createNotificationTimeLabel,
} from "utils/notifd";

export interface BaseNotificationProps {
  notification: UnifiedNotification;
  onAction?: (id: number, action: string) => void;
  onDismiss?: (id: number) => void;
  onClick?: (button: number, notification: UnifiedNotification) => void;
  onHover?: () => void;
  onHoverLost?: () => void;
  variant?: "live" | "stored";
  showDismissButton?: boolean | Accessor<boolean>;
  showTimeAsRelative?: boolean;
  cssClasses?: string[];
  maxWidth?: number;
  maxHeight?: number;
}

export function BaseNotification({
  notification,
  onAction,
  onDismiss,
  onClick,
  onHover,
  onHoverLost,
  variant = "live",
  showDismissButton = false,
  cssClasses = [],
  maxWidth = 300,
}: BaseNotificationProps) {
  const { START, CENTER, END } = Gtk.Align;
  const [isHovered, setIsHovered] = createState(false);
  const timeLabel = createNotificationTimeLabel(notification.time, { variant });

  // Calculate character limits based on pixel constraints
  const maxWidthChars = Math.floor(maxWidth / 8);
  const titleMaxChars = Math.floor(maxWidthChars * 0.5);
  const bodyMaxChars = Math.floor(maxWidthChars);

  // Simple click handling - just dismiss
  const handleClick = (button: number) => {
    if (onClick) {
      onClick(button, notification);
    }
  };

  const handleHover = () => {
    setIsHovered(true);
    if (onHover) onHover();
  };

  const handleHoverLost = () => {
    setIsHovered(false);
    if (onHoverLost) onHoverLost();
  };

  const buildCssClasses = (): string[] => {
    const classes = [
      "base-notification",
      `notification-${variant}`,
      `${urgency(notification)}`,
      ...cssClasses,
    ];

    if (variant === "stored") {
      if (notification.seen) classes.push("notification-seen");
      else classes.push("notification-unseen");
      if (notification.dismissed) classes.push("notification-dismissed");
    }

    if (isHovered.get()) classes.push("notification-hovered");

    return classes;
  };

  return (
    <Adw.Clamp maximumSize={maxWidth}>
      <box
        orientation={Gtk.Orientation.VERTICAL}
        vexpand={false}
        cssClasses={[...buildCssClasses(), "notification-container"]}
        name={notification.id.toString()}
        overflow={Gtk.Overflow.HIDDEN}
      >
        <Gtk.GestureClick
          button={0}
          onPressed={(gesture) => {
            const button = gesture.get_current_button();
            handleClick(button);
          }}
        />
        <Gtk.EventControllerMotion
          onEnter={handleHover}
          onLeave={handleHoverLost}
        />

        {/* Header */}
        <box cssClasses={["header"]}>
          <label
            cssClasses={["app-name"]}
            halign={START}
            label={notification.appName}
            ellipsize={Pango.EllipsizeMode.END}
            singleLineMode={true}
            maxWidthChars={Math.floor(maxWidthChars * 0.4)}
          />
          <label 
            cssClasses={["time"]} 
            hexpand 
            halign={END} 
            label={timeLabel} 
          />
        </box>

        {/* Content - Icon and Text Side by Side */}
        <box cssClasses={["content"]} overflow={Gtk.Overflow.HIDDEN}>
          <box
            cssClasses={["thumb"]}
            visible={Boolean(NotificationIcon(notification))}
            halign={CENTER}
            valign={START}
          >
            {NotificationIcon(notification)}
          </box>

          <box
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={["text-content"]}
            hexpand={true}
            halign={START}
            valign={CENTER}
            overflow={Gtk.Overflow.HIDDEN}
          >
            <label
              cssClasses={["title"]}
              valign={START}
              wrap={true}
              wrapMode={Pango.WrapMode.WORD_CHAR}
              label={notification.summary}
              ellipsize={Pango.EllipsizeMode.END}
              widthChars={titleMaxChars}
              lines={2}
            />
            {notification.body && (
              <label
                cssClasses={["body"]}
                valign={START}
                wrap={true}
                wrapMode={Pango.WrapMode.WORD_CHAR}
                label={notification.body}
                ellipsize={Pango.EllipsizeMode.END}
                widthChars={bodyMaxChars}
                lines={3}
              />
            )}
          </box>
        </box>
      </box>
    </Adw.Clamp>
  );
}