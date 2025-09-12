import { Gtk } from "astal/gtk4";
import Gsk from "gi://Gsk";
import {
  WaterfallState,
  shouldVisualize,
  getVisualizerDimensions,
  createColorWithOpacity,
  fillPath,
} from "../utils";

export function drawWaterfall(
  widget: any,
  snapshot: Gtk.Snapshot,
  values: number[],
  bars: number,
  state: WaterfallState,
) {
  const { width, height, color } = getVisualizerDimensions(widget);

  if (!shouldVisualize(bars, values)) return;

  // Smooth transition
  const smoothedValues = [...values];
  if (state.historyFrames.length > 0) {
    const lastFrame = state.historyFrames[0];
    for (let i = 0; i < bars && i < values.length; i++) {
      smoothedValues[i] =
        state.transitionAlpha * values[i] +
        (1 - state.transitionAlpha) * lastFrame[i];
    }
  }

  state.historyFrames.unshift([...smoothedValues]);
  if (state.historyFrames.length > state.maxHistoryFrames) {
    state.historyFrames.pop();
  }

  const frameHeight = height / state.maxHistoryFrames;
  for (let frame = 0; frame < state.historyFrames.length; frame++) {
    const frameValues = state.historyFrames[frame];
    const pathBuilder = new Gsk.PathBuilder();
    const frameY = frame * frameHeight;

    const opacity = 1 - Math.pow(frame / state.maxHistoryFrames, 1.2) * 0.9;

    pathBuilder.move_to(
      0,
      frameY + frameHeight - frameHeight * 0.8 * frameValues[0],
    );

    const renderPoints = bars * 3;
    const barWidth = width / (renderPoints - 1);

    for (let i = 1; i < renderPoints; i++) {
      const dataPos = (i / renderPoints) * (bars - 1);
      const dataIndex = Math.floor(dataPos);
      const fraction = dataPos - dataIndex;

      let value;
      if (dataIndex >= bars - 1) {
        value = frameValues[bars - 1];
      } else {
        value =
          frameValues[dataIndex] * (1 - fraction) +
          frameValues[dataIndex + 1] * fraction;
      }

      const x = i * barWidth;
      const y = frameY + frameHeight - frameHeight * 0.85 * value;

      if (i % 3 === 0) {
        pathBuilder.line_to(x, y);
      } else {
        const prevX = (i - 1) * barWidth;
        const prevY =
          frameY +
          frameHeight -
          frameHeight *
            0.85 *
            (frameValues[Math.floor((i - 1) / 3)] *
              (1 - ((i - 1) / 3 - Math.floor((i - 1) / 3))) +
              frameValues[Math.min(bars - 1, Math.ceil((i - 1) / 3))] *
                ((i - 1) / 3 - Math.floor((i - 1) / 3)));

        const ctrlX = (prevX + x) / 2;
        pathBuilder.quad_to(ctrlX, prevY, x, y);
      }
    }

    pathBuilder.line_to(width, frameY + frameHeight);
    pathBuilder.line_to(0, frameY + frameHeight);
    pathBuilder.close();

    const frameColor = createColorWithOpacity(color, opacity);
    fillPath(snapshot, pathBuilder, frameColor);
  }

  widget.queue_draw();
}
