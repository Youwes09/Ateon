import { Gtk } from "astal/gtk4";
import Gsk from "gi://Gsk";
import {
  Point,
  shouldVisualize,
  getVisualizerDimensions,
  fillPath,
} from "../utils";

export function drawCatmullRom(
  widget: any,
  snapshot: Gtk.Snapshot,
  values: number[],
  bars: number,
) {
  const { width, height, color } = getVisualizerDimensions(widget);

  if (!shouldVisualize(bars, values)) return;

  const pathBuilder = new Gsk.PathBuilder();
  pathBuilder.move_to(0, height - height * values[0]);

  const barWidth = width / (bars - 1);

  for (let i = 0; i <= bars - 2 && i + 1 < values.length; i++) {
    let p0: Point, p1: Point, p2: Point, p3: Point;

    if (i === 0) {
      p0 = { x: i * barWidth, y: height - height * values[i] };
      p3 = {
        x: (i + 2) * barWidth,
        y: height - height * values[Math.min(i + 2, values.length - 1)],
      };
    } else if (i === bars - 2) {
      p0 = { x: (i - 1) * barWidth, y: height - height * values[i - 1] };
      p3 = { x: (i + 1) * barWidth, y: height - height * values[i + 1] };
    } else {
      p0 = { x: (i - 1) * barWidth, y: height - height * values[i - 1] };
      p3 = {
        x: (i + 2) * barWidth,
        y: height - height * values[Math.min(i + 2, values.length - 1)],
      };
    }

    p1 = { x: i * barWidth, y: height - height * values[i] };
    p2 = { x: (i + 1) * barWidth, y: height - height * values[i + 1] };

    const c1 = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6,
    };

    const c2 = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6,
    };

    pathBuilder.cubic_to(c1.x, c1.y, c2.x, c2.y, p2.x, p2.y);
  }

  pathBuilder.line_to(width, height);
  pathBuilder.line_to(0, height);
  pathBuilder.close();

  fillPath(snapshot, pathBuilder, color);
}
