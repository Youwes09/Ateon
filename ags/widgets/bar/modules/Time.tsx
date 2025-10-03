import app from "ags/gtk4/app";
import { Gtk } from "ags/gtk4";
import { interval } from "ags/time";
import { createState } from "ags";
import options from "options.ts";

export default function Time() {
  const [time, setTime] = createState("");
  const [revealPower, setRevealPower] = createState(false);

  interval(1000, () => {
    const now = new Date();
    const format = options["clock.format"].get();
    
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    
    if (format === "12") {
      const isPM = hours >= 12;
      hours = hours % 12 || 12;
      const hh = hours.toString().padStart(2, "0");
      setTime(`${hh}:${minutes} ${isPM ? "PM" : "AM"}`);
    } else {
      const hh = hours.toString().padStart(2, "0");
      setTime(`${hh}:${minutes}`);
    }
  });

  return (
    <box
      $={(self) => {
        const motionController = new Gtk.EventControllerMotion();

        motionController.connect("enter", () => {
          setRevealPower(true);
        });

        motionController.connect("leave", () => {
          setRevealPower(false);
        });

        self.add_controller(motionController);
      }}
    >
      <label cssClasses={["clock"]} label={time} />
      <revealer
        transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
        transitionDuration={300}
        revealChild={revealPower}
      >
        <button
          cssClasses={["power-button"]}
          onClicked={() => app.toggle_window("logout-menu")}
        >
          <image iconName="system-shutdown-symbolic" />
        </button>
      </revealer>
    </box>
  );
}