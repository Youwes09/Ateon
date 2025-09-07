import { Gtk } from "astal/gtk4";
import Gsk from "gi://Gsk";
import Graphene from "gi://Graphene";
import {
  shouldVisualize,
  getVisualizerDimensions,
  createColorWithOpacity,
  fillPath,
} from "../utils";

export function drawMesh(
  widget: any,
  snapshot: Gtk.Snapshot,
  values: number[],
  bars: number,
) {
  const { width, height, color } = getVisualizerDimensions(widget);

  if (!shouldVisualize(bars, values)) return;

  const rows = 8;
  const cellWidth = width / bars;
  const cellHeight = height / rows;

  for (let i = 0; i < bars && i < values.length; i++) {
    const value = values[i];
    const activeRows = Math.ceil(rows * value);

    for (let row = 0; row < activeRows; row++) {
      const opacity = 1 - (row / rows) * 0.9;
      const cellY = height - (row + 1) * cellHeight;

      const cellColor = createColorWithOpacity(color, opacity);
      const pathBuilder = new Gsk.PathBuilder();

      pathBuilder.add_rect(
        new Graphene.Rect().init(
          i * cellWidth + 1,
          cellY + 1,
          cellWidth - 2,
          cellHeight - 2,
        ),
      );

      fillPath(snapshot, pathBuilder, cellColor);
    }
  }
}
