import { Gtk } from "astal/gtk4";
import Gsk from "gi://Gsk";
import { shouldVisualize, getVisualizerDimensions, fillPath } from "../utils";

export function drawSmooth(
  widget: any,
  snapshot: Gtk.Snapshot,
  values: number[],
  bars: number,
) {
  const { width, height, color } = getVisualizerDimensions(widget);

  if (!shouldVisualize(bars, values)) return;

  const pathBuilder = new Gsk.PathBuilder();
  let lastX = 0;
  let lastY = height - height * values[0];
  const barWidth = width / (bars - 1);

  pathBuilder.move_to(lastX, lastY);

  for (let i = 1; i < bars && i < values.length; i++) {
    const h = height * values[i];
    const y = height - h;

    pathBuilder.cubic_to(
      lastX + barWidth / 2,
      lastY,
      lastX + barWidth / 2,
      y,
      i * barWidth,
      y,
    );

    lastX = i * barWidth;
    lastY = y;
  }

  pathBuilder.line_to(lastX, height);
  pathBuilder.line_to(0, height);
  pathBuilder.close();

  fillPath(snapshot, pathBuilder, color);
}
