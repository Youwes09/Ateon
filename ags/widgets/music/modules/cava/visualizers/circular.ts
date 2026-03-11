import { Gtk } from "astal/gtk4";
import Gsk from "gi://Gsk";
import {
  Point,
  shouldVisualize,
  getVisualizerDimensions,
  fillPath,
} from "../utils";

export function drawCircular(
  widget: any,
  snapshot: Gtk.Snapshot,
  values: number[],
  bars: number,
) {
  const { width, height, color } = getVisualizerDimensions(widget);

  if (!shouldVisualize(bars, values)) return;

  // Initialize rotation property if it doesn't exist
  if (widget._circularRotation === undefined) {
    widget._circularRotation = 0;
  }

  // Update rotation for the next frame
  widget._circularRotation += 0.005;
  // Keep rotation within 0 to 2π range
  if (widget._circularRotation > Math.PI * 2) {
    widget._circularRotation -= Math.PI * 2;
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = (Math.min(width, height) / 2) * 2.5;

  const pathBuilder = new Gsk.PathBuilder();
  const points: Point[] = [];

  // Perimeter points based on audio values with rotation
  for (let i = 0; i < bars && i < values.length; i++) {
    const angle = (i / bars) * Math.PI * 2 + widget._circularRotation;
    const value = values[i];
    const amplifiedValue = Math.pow(value, 0.8);
    const radius = maxRadius * (0.1 + amplifiedValue * 0.9);

    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }

  // Extra points for smooth looping
  const allPoints: Point[] = [
    points[points.length - 1],
    ...points,
    points[0],
    points[1],
  ];

  pathBuilder.move_to(points[0].x, points[0].y);

  // Draw smooth curves Catmull-Rom spline
  for (let i = 0; i < points.length; i++) {
    const p0 = allPoints[i];
    const p1 = allPoints[i + 1];
    const p2 = allPoints[i + 2];
    const p3 = allPoints[i + 3];

    const tension = 1 / 5;

    const c1 = {
      x: p1.x + (p2.x - p0.x) * tension,
      y: p1.y + (p2.y - p0.y) * tension,
    };

    const c2 = {
      x: p2.x - (p3.x - p1.x) * tension,
      y: p2.y - (p3.y - p1.y) * tension,
    };

    pathBuilder.cubic_to(c1.x, c1.y, c2.x, c2.y, p2.x, p2.y);
  }

  pathBuilder.close();
  fillPath(snapshot, pathBuilder, color);
  widget.queue_draw();
}
