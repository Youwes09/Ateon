import { Gtk } from "astal/gtk4";
import Gsk from "gi://Gsk";
import Graphene from "gi://Graphene";
import { shouldVisualize, getVisualizerDimensions, fillPath } from "../utils";

export function drawDots(
  widget: any,
  snapshot: Gtk.Snapshot,
  values: number[],
  bars: number,
) {
  const { width, height, color } = getVisualizerDimensions(widget);

  if (!shouldVisualize(bars, values)) return;

  const pathBuilder = new Gsk.PathBuilder();
  const horizontalSpacing = width / (bars - 1);

  const aspectRatio = width / height;
  const scaleFactor = 0.4 / (1 + 0.1 * aspectRatio);
  const baseDotSize = horizontalSpacing * scaleFactor;
  const maxSize = height / 4;
  const dotSize = Math.max(4, Math.min(baseDotSize, maxSize));

  for (let i = 0; i < bars && i < values.length; i++) {
    const x = width * (i / (bars - 1));
    const y = height * (1 - values[i]);

    const amplifiedSize = dotSize * (0.8 + values[i] * 0.4);
    pathBuilder.add_circle(new Graphene.Point().init(x, y), amplifiedSize);
  }

  fillPath(snapshot, pathBuilder, color);
}
