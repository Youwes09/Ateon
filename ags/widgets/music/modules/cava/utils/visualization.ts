export function shouldVisualize(bars: number, values: number[]): boolean {
  // Quick rejection checks
  if (bars === 0 || !values || values.length === 0) {
    return false;
  }
  
  // Check if all values are near zero (threshold for performance)
  const threshold = 0.001;
  for (let i = 0; i < values.length; i++) {
    if (values[i] >= threshold) {
      return true;
    }
  }
  
  return false;
}

export interface WidgetDimensions {
  width: number;
  height: number;
  color: any;
}

export function getVisualizerDimensions(widget: any): WidgetDimensions | null {
  try {
    const width = widget.get_width();
    const height = widget.get_height();
    
    // Validate dimensions
    if (!width || !height || width <= 0 || height <= 0) {
      return null;
    }
    
    const color = widget.getColor();
    
    if (!color) {
      return null;
    }
    
    return { width, height, color };
  } catch (error) {
    console.error("Error getting visualizer dimensions:", error);
    return null;
  }
}

// Optimized value normalization
export function normalizeValues(values: number[], bars: number): number[] {
  if (!values || values.length === 0) {
    return new Array(bars).fill(0);
  }
  
  const normalized = new Array(bars);
  const step = values.length / bars;
  
  for (let i = 0; i < bars; i++) {
    const startIdx = Math.floor(i * step);
    const endIdx = Math.floor((i + 1) * step);
    
    // Average values in this range
    let sum = 0;
    let count = 0;
    
    for (let j = startIdx; j < endIdx && j < values.length; j++) {
      sum += values[j];
      count++;
    }
    
    normalized[i] = count > 0 ? Math.max(0, Math.min(1, sum / count)) : 0;
  }
  
  return normalized;
}

// Smooth value transitions for better visual appearance
export function smoothValues(
  current: number[],
  target: number[],
  smoothing: number = 0.3
): number[] {
  if (!current || current.length === 0) {
    return target.slice();
  }
  
  const result = new Array(target.length);
  const len = Math.min(current.length, target.length);
  
  for (let i = 0; i < len; i++) {
    result[i] = current[i] + (target[i] - current[i]) * smoothing;
  }
  
  // Fill remaining with target values if target is longer
  for (let i = len; i < target.length; i++) {
    result[i] = target[i];
  }
  
  return result;
}

// Efficient peak detection
export function findPeaks(values: number[], threshold: number = 0.7): number[] {
  const peaks: number[] = [];
  
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] > threshold &&
        values[i] > values[i - 1] &&
        values[i] > values[i + 1]) {
      peaks.push(i);
    }
  }
  
  return peaks;
}

// Calculate average value efficiently
export function calculateAverage(values: number[]): number {
  if (!values || values.length === 0) return 0;
  
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
  }
  
  return sum / values.length;
}

// Clamp value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}