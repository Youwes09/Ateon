import { Gtk } from "astal/gtk4";
import Gsk from "gi://Gsk";
import Graphene from "gi://Graphene";
import { shouldVisualize, getVisualizerDimensions, fillPath } from "../utils";

export function drawBars(
  widget: any,
  snapshot: Gtk.Snapshot,
  values: number[],
  bars: number,
) {
  const { width, height, color } = getVisualizerDimensions(widget);

  if (!shouldVisualize(bars, values)) return;

  const spacing = 5;
  const barWidth = (width - spacing * bars) / bars;

  snapshot.translate(new Graphene.Point().init(spacing / 2, 0));

  const pathBuilder = new Gsk.PathBuilder();

  values.forEach((value, i) => {
    const x = i * (barWidth + spacing);
    const y = height;
    const barHeight = -value * height;

    pathBuilder.add_rect(new Graphene.Rect().init(x, y, barWidth, barHeight));
  });

  pathBuilder.close();

  fillPath(snapshot, pathBuilder, color);

  snapshot.translate(new Graphene.Point().init(spacing / 2, 0));
}
