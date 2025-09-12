import { Gtk } from "astal/gtk4";
import Gsk from "gi://Gsk";
import Graphene from "gi://Graphene";
import {
  ParticleState,
  shouldVisualize,
  getVisualizerDimensions,
  calculateTimeDelta,
  fillPath,
} from "../utils";

export function drawParticles(
  widget: any,
  snapshot: Gtk.Snapshot,
  values: number[],
  bars: number,
  state: ParticleState,
) {
  const { width, height, color } = getVisualizerDimensions(widget);

  if (!shouldVisualize(bars, values)) return;

  // Timing
  const deltaTime = calculateTimeDelta(state);
  const limitedDeltaTime = Math.min(deltaTime, 0.05);

  // Generate new particles based on audio intensity
  generateParticles(state, values, bars, width, height);

  // Update existing particles
  updateParticles(state, limitedDeltaTime, height);

  // Draw all particles
  drawParticleShapes(state, snapshot, color);

  widget.queue_draw();
}

// Helper function to generate new particles based on audio values
function generateParticles(
  state: ParticleState,
  values: number[],
  bars: number,
  width: number,
  height: number,
) {
  const particlesPerFrame = 4;
  const avgIntensity =
    values.reduce((sum, val) => sum + val, 0) / values.length;
  const totalParticles = Math.ceil(particlesPerFrame * avgIntensity * 5);

  for (let p = 0; p < totalParticles; p++) {
    const position = Math.random() * width;
    const barWidth = width / (bars - 1);
    const barIndex = Math.min(bars - 2, Math.floor(position / barWidth));

    const barPosition = position / barWidth - barIndex;
    const intensity =
      values[barIndex] * (1 - barPosition) + values[barIndex + 1] * barPosition;

    if (intensity > 0.05) {
      state.particles.push({
        x: position,
        y: height,
        velocity: -300 * intensity * (Math.random() * 0.5 + 0.75),
        life: 5.0,
      });
    }
  }
}

// Helper function to draw all particles
function drawParticleShapes(
  state: ParticleState,
  snapshot: Gtk.Snapshot,
  color: any,
) {
  const pathBuilder = new Gsk.PathBuilder();
  const particleSize = 2;

  for (const particle of state.particles) {
    pathBuilder.add_circle(
      new Graphene.Point().init(
        particle.x - particleSize / 2,
        particle.y - particleSize / 2,
      ),
      particleSize,
    );
  }

  fillPath(snapshot, pathBuilder, color);
}


// Particle management function
function updateParticles(
  state: ParticleState,
  deltaTime: number,
  height: number,
) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const particle = state.particles[i];

    // Update particle position
    particle.y += particle.velocity * deltaTime;
    particle.velocity += 120 * deltaTime; // Gravity
    particle.life -= deltaTime * 0.1; // Fade out

    // Remove dead particles
    if (particle.life <= 0 || particle.y > height) {
      state.particles.splice(i, 1);
    }
  }

  // Limit particle count
  if (state.particles.length > 600) {
    state.particles.splice(0, state.particles.length - 600);
  }
}
