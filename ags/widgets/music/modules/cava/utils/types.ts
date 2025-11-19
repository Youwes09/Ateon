export interface TimeState {
  lastUpdate: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  velocity: number;
  life: number;
}

export interface ParticleState extends TimeState {
  particles: Particle[];
  maxParticles: number;
}

export interface WaterfallState {
  historyFrames: number[][];
  maxHistoryFrames: number;
  transitionAlpha: number;
}

export interface JumpingBarsState extends TimeState {
  barHeights: number[];
  barVelocities: number[];
  maxBars: number;
}

// Constants for performance tuning
const MAX_PARTICLES = 200;
const MAX_HISTORY_FRAMES = 30;
const MAX_BARS = 100;

export function createParticleState(): ParticleState {
  return {
    particles: [],
    lastUpdate: 0,
    maxParticles: MAX_PARTICLES,
  };
}

export function createWaterfallState(): WaterfallState {
  return {
    historyFrames: [],
    maxHistoryFrames: MAX_HISTORY_FRAMES,
    transitionAlpha: 0.3,
  };
}

export function createJumpingBarsState(): JumpingBarsState {
  return {
    barVelocities: [],
    barHeights: [],
    lastUpdate: 0,
    maxBars: MAX_BARS,
  };
}

// Utility functions for state management

export function clearParticleState(state: ParticleState): void {
  state.particles.length = 0;
  state.lastUpdate = 0;
}

export function clearWaterfallState(state: WaterfallState): void {
  state.historyFrames.length = 0;
}

export function clearJumpingBarsState(state: JumpingBarsState): void {
  state.barHeights.length = 0;
  state.barVelocities.length = 0;
  state.lastUpdate = 0;
}

// Memory-efficient particle management
export function updateParticles(state: ParticleState, deltaTime: number): void {
  // Remove dead particles efficiently
  let writeIndex = 0;
  for (let readIndex = 0; readIndex < state.particles.length; readIndex++) {
    const particle = state.particles[readIndex];
    particle.life -= deltaTime;
    
    if (particle.life > 0) {
      if (writeIndex !== readIndex) {
        state.particles[writeIndex] = particle;
      }
      writeIndex++;
    }
  }
  state.particles.length = writeIndex;
}

// Efficient waterfall frame management
export function addWaterfallFrame(state: WaterfallState, values: number[]): void {
  // Clone values efficiently
  const frame = new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    frame[i] = values[i];
  }
  
  state.historyFrames.unshift(frame);
  
  // Limit history size
  if (state.historyFrames.length > state.maxHistoryFrames) {
    state.historyFrames.pop();
  }
}

// Efficient bar state initialization
export function ensureBarArrays(state: JumpingBarsState, bars: number): void {
  const currentLength = state.barHeights.length;
  
  if (currentLength < bars) {
    // Grow arrays
    for (let i = currentLength; i < bars && i < state.maxBars; i++) {
      state.barHeights.push(0);
      state.barVelocities.push(0);
    }
  } else if (currentLength > bars) {
    // Shrink arrays
    state.barHeights.length = bars;
    state.barVelocities.length = bars;
  }
}