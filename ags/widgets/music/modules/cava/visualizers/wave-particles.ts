import { Gtk } from "astal/gtk4";
import Gsk from "gi://Gsk";
import Graphene from "gi://Graphene";
import {
  ParticleState,
  Point,
  shouldVisualize,
  getVisualizerDimensions,
  calculateTimeDelta,
  fillPath,
} from "../utils";

export function drawWaveParticles(
  widget: any,
  snapshot: Gtk.Snapshot,
  values: number[],
  bars: number,
  state: ParticleState,
) {
  const { width, height, color } = getVisualizerDimensions(widget);

  if (!shouldVisualize(bars, values)) return;

  const deltaTime = calculateTimeDelta(state);

  drawWaveAndGenerateParticles(
    state,
    snapshot,
    values,
    bars,
    width,
    height,
    color,
  );
  updateWaveParticles(state, deltaTime);
  drawParticleShapes(state, snapshot, color);

  widget.queue_draw();
}

function drawWaveAndGenerateParticles(
  state: ParticleState,
  snapshot: Gtk.Snapshot,
  values: number[],
  bars: number,
  width: number,
  height: number,
  color: any,
) {
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

    if (values[i] > 0.1) {
      const particleCount = Math.ceil(values[i] * 2);

      for (let p = 0; p < particleCount; p++) {
        const t = Math.random();
        const x = p1.x + t * (p2.x - p1.x);
        const y = p1.y + t * (p2.y - p1.y);

        state.particles.push({
          x: x,
          y: y,
          velocity: -120 * values[i] * (Math.random() * 0.5 + 0.5),
          life: 1.0,
        });
      }
    }
  }

  pathBuilder.line_to(width, height);
  pathBuilder.line_to(0, height);
  pathBuilder.close();

  fillPath(snapshot, pathBuilder, color);
}

function updateWaveParticles(state: ParticleState, deltaTime: number) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const particle = state.particles[i];

    particle.y += particle.velocity * deltaTime;
    particle.life -= deltaTime;

    if (particle.life <= 0) {
      state.particles.splice(i, 1);
    }
  }

  if (state.particles.length > 300) {
    state.particles.splice(0, state.particles.length - 300);
  }
}

function drawParticleShapes(
  state: ParticleState,
  snapshot: Gtk.Snapshot,
  color: any,
) {
  const particleBuilder = new Gsk.PathBuilder();
  const particleSize = 1.5;

  for (const particle of state.particles) {
    particleBuilder.add_circle(
      new Graphene.Point().init(
        particle.x - particleSize / 2,
        particle.y - particleSize / 2,
      ),
      particleSize,
    );
  }

  fillPath(snapshot, particleBuilder, color);
}
