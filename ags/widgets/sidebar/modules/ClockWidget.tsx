// widgets/sidebar/modules/ClockWidget.tsx
import { Gtk } from "ags/gtk4";
import { createState, With } from "ags";
import options from "options.ts";

/** ---------- State ---------- **/

const [currentTime, setCurrentTime] = createState("00:00:00");
const [currentDate, setCurrentDate] = createState("");
const [ampmText, setAmpmText] = createState(""); // Empty string means don't show

// Format time based on 12/24 hour preference
function formatTime(date: Date, format: string) {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  
  if (format === "12") {
    const isPM = hours >= 12;
    setAmpmText(isPM ? "PM" : "AM");
    hours = hours % 12 || 12; // Convert to 12-hour format
  } else {
    setAmpmText(""); // Hide AM/PM in 24-hour mode
  }
  
  const hh = hours.toString().padStart(2, "0");
  return `${hh}:${minutes}:${seconds}`;
}

// Format date
function updateDate() {
  const now = new Date();
  return now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Update time every second
setInterval(() => {
  const now = new Date();
  const format = options["clock.format"].get();
  setCurrentTime(formatTime(now, format));
}, 1000);

// Update date once per minute
setInterval(() => setCurrentDate(updateDate()), 60_000);
// Set initial date and time
setCurrentDate(updateDate());
const initialFormat = options["clock.format"].get();
setCurrentTime(formatTime(new Date(), initialFormat));

/** ---------- Digit Stack ---------- **/

function DigitStack(index: number) {
  return (
    <stack
      class="digit-stack"
      transitionDuration={400}
      transitionType={Gtk.StackTransitionType.SLIDE_UP_DOWN}
      $={(self) => (
        <With value={currentTime}>
          {(time) => {
            const str = time ?? "00:00:00";
            self.visibleChildName = str[index] ?? "0";
            return null;
          }}
        </With>
      )}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <label
          $type="named"
          name={i.toString()}
          label={i.toString()}
          xalign={0.5}
        />
      ))}
    </stack>
  );
}

/** ---------- Widget ---------- **/

export default function ClockWidget() {
  return (
    <box
      class="clock-widget"
      orientation={Gtk.Orientation.VERTICAL}
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.CENTER}
      spacing={8}
    >
      {/* Time */}
      <box spacing={4} halign={Gtk.Align.CENTER}>
        {DigitStack(0)}
        {DigitStack(1)}
        <label class="colon" label=":" />
        {DigitStack(3)}
        {DigitStack(4)}
        <label class="colon" label=":" />
        {DigitStack(6)}
        {DigitStack(7)}
        
        {/* AM/PM indicator for 12-hour format */}
        <With value={ampmText}>
          {(text) => {
            if (!text) return <box />; // Empty box when not showing
            return (
              <label 
                class="ampm-label" 
                label={text} 
                valign={Gtk.Align.END}
                cssClasses={["ampm-indicator"]}
              />
            );
          }}
        </With>
      </box>

      {/* Divider */}
      <Gtk.Separator orientation={Gtk.Orientation.HORIZONTAL} />

      {/* Date */}
      <With value={currentDate}>
        {(date) => (
          <label class="date-label" label={date} halign={Gtk.Align.CENTER} />
        )}
      </With>
    </box>
  );
}