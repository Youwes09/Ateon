import GLib from "gi://GLib?version=2.0";
import { TimeState } from "./types.ts";

// Maximum delta time to prevent huge jumps (50ms)
const MAX_DELTA_TIME = 0.05;

// Default delta for first frame (60 FPS)
const DEFAULT_DELTA = 0.016;

// Minimum delta to prevent division by zero
const MIN_DELTA_TIME = 0.001;

export function calculateTimeDelta(state: TimeState): number {
  try {
    const now = GLib.get_monotonic_time() / 1000000;
    
    // First frame initialization
    if (state.lastUpdate === 0) {
      state.lastUpdate = now;
      return DEFAULT_DELTA;
    }
    
    const deltaTime = now - state.lastUpdate;
    state.lastUpdate = now;
    
    // Clamp delta time to reasonable bounds
    return Math.max(MIN_DELTA_TIME, Math.min(MAX_DELTA_TIME, deltaTime));
  } catch (error) {
    console.error("Error calculating time delta:", error);
    return DEFAULT_DELTA;
  }
}

// Reset time state (useful when restarting animations)
export function resetTimeState(state: TimeState): void {
  state.lastUpdate = 0;
}

// Smooth interpolation for animations
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * Math.max(0, Math.min(1, t));
}

// Ease-out cubic for smooth deceleration
export function easeOutCubic(t: number): number {
  const t1 = t - 1;
  return t1 * t1 * t1 + 1;
}

// Ease-in cubic for smooth acceleration
export function easeInCubic(t: number): number {
  return t * t * t;
}

// Ease-in-out for smooth start and end
export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Spring physics for bouncy animations
export interface SpringState {
  position: number;
  velocity: number;
}

export function updateSpring(
  state: SpringState,
  target: number,
  deltaTime: number,
  stiffness: number = 200,
  damping: number = 20
): number {
  const force = (target - state.position) * stiffness;
  const dampingForce = state.velocity * damping;
  
  state.velocity += (force - dampingForce) * deltaTime;
  state.position += state.velocity * deltaTime;
  
  return state.position;
}

// Frame rate independent smoothing
export function smoothDamp(
  current: number,
  target: number,
  currentVelocity: { value: number },
  smoothTime: number,
  deltaTime: number,
  maxSpeed: number = Infinity
): number {
  // Prevent division by zero
  smoothTime = Math.max(0.0001, smoothTime);
  
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  
  let change = current - target;
  const maxChange = maxSpeed * smoothTime;
  
  change = Math.max(-maxChange, Math.min(maxChange, change));
  const temp = (currentVelocity.value + omega * change) * deltaTime;
  
  currentVelocity.value = (currentVelocity.value - omega * temp) * exp;
  
  let output = target + (change + temp) * exp;
  
  // Prevent overshooting
  if ((target - current > 0) === (output > target)) {
    output = target;
    currentVelocity.value = (output - target) / deltaTime;
  }
  
  return output;
}