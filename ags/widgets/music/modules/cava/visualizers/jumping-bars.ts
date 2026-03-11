import { Gtk } from "astal/gtk4";
import Gsk from "gi://Gsk";
import Graphene from "gi://Graphene";
import {
  JumpingBarsState,
  shouldVisualize,
  getVisualizerDimensions,
  calculateTimeDelta,
  fillPath,
} from "../utils";

export function drawJumpingBars(
  widget: any,
  snapshot: Gtk.Snapshot,
  values: number[],
  bars: number,
  state: JumpingBarsState,
) {
  const { width, height, color } = getVisualizerDimensions(widget);

  if (!shouldVisualize(bars, values)) return;

  const deltaTime = calculateTimeDelta(state);

  // Initialize arrays if needed
  if (state.barHeights.length !== bars) {
    state.barHeights = new Array(bars).fill(0);
    state.barVelocities = new Array(bars).fill(0);
  }

  const spacing = 3;
  const barWidth = (width - spacing * (bars - 1)) / bars;
  const pathBuilder = new Gsk.PathBuilder();

  // Physics constants
  const JUMP_MULTIPLIER = 3.5;
  const MAX_VELOCITY = height * 3;
  const GRAVITY = 900;
  const BOUNCE_FACTOR = -0.3;

  // Update and draw each bar
  for (let i = 0; i < bars && i < values.length; i++) {
    const targetHeight = Math.min(height, values[i] * height);

    // Jump up when audio increases
    if (targetHeight > state.barHeights[i]) {
      state.barVelocities[i] = Math.min(
        MAX_VELOCITY,
        Math.max(
          state.barVelocities[i],
          (targetHeight - state.barHeights[i]) * JUMP_MULTIPLIER,
        ),
      );
    }

    // Update position with velocity
    state.barHeights[i] += state.barVelocities[i] * deltaTime;
    // Apply gravity
    state.barVelocities[i] -= GRAVITY * deltaTime;

    // Ceiling constraint with bounce
    if (state.barHeights[i] > height) {
      state.barHeights[i] = height;
      state.barVelocities[i] *= BOUNCE_FACTOR;
    }

    // Draw the bar
    const x = i * (barWidth + spacing);
    pathBuilder.add_rect(
      new Graphene.Rect().init(
        x,
        height - state.barHeights[i],
        barWidth,
        state.barHeights[i],
      ),
    );
  }

  fillPath(snapshot, pathBuilder, color);
  widget.queue_draw();
}
