import { Gtk } from "ags/gtk4";
import Gsk from "gi://Gsk";

// Cache for color objects to reduce allocations
const colorCache = new Map<string, any>();

export function fillPath(
  snapshot: Gtk.Snapshot,
  pathBuilder: Gsk.PathBuilder,
  color: any,
): void {
  try {
    const path = pathBuilder.to_path();
    if (path) {
      snapshot.append_fill(path, Gsk.FillRule.WINDING, color);
    }
  } catch (error) {
    console.error("Error filling path:", error);
  }
}

export function strokePath(
  snapshot: Gtk.Snapshot,
  pathBuilder: Gsk.PathBuilder,
  color: any,
  lineWidth: number = 2
): void {
  try {
    const path = pathBuilder.to_path();
    if (path) {
      const stroke = new Gsk.Stroke();
      stroke.set_line_width(lineWidth);
      snapshot.append_stroke(path, stroke, color);
    }
  } catch (error) {
    console.error("Error stroking path:", error);
  }
}

export function createColorWithOpacity(baseColor: any, opacity: number): any {
  try {
    // Create cache key
    const key = `${baseColor.to_string()}-${opacity.toFixed(2)}`;
    
    // Check cache first
    if (colorCache.has(key)) {
      return colorCache.get(key);
    }
    
    // Create new color
    const color = baseColor.copy();
    color.alpha = Math.max(0, Math.min(1, opacity));
    
    // Cache it (limit cache size to prevent memory leaks)
    if (colorCache.size > 100) {
      const firstKey = colorCache.keys().next().value;
      colorCache.delete(firstKey);
    }
    
    colorCache.set(key, color);
    return color;
  } catch (error) {
    console.error("Error creating color with opacity:", error);
    return baseColor;
  }
}

// Clear color cache (call this when disposing)
export function clearColorCache(): void {
  colorCache.clear();
}

// Optimized rectangle rendering
export function drawRect(
  snapshot: Gtk.Snapshot,
  x: number,
  y: number,
  width: number,
  height: number,
  color: any
): void {
  try {
    if (width <= 0 || height <= 0) return;
    
    const rect = new Graphene.Rect();
    rect.init(x, y, width, height);
    snapshot.append_color(color, rect);
  } catch (error) {
    console.error("Error drawing rectangle:", error);
  }
}

// Optimized rounded rectangle rendering
export function drawRoundedRect(
  snapshot: Gtk.Snapshot,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: any
): void {
  try {
    if (width <= 0 || height <= 0) return;
    
    const rect = new Graphene.Rect();
    rect.init(x, y, width, height);
    
    const roundedRect = new Gsk.RoundedRect();
    roundedRect.init_from_rect(rect, radius);
    
    snapshot.push_rounded_clip(roundedRect);
    snapshot.append_color(color, rect);
    snapshot.pop();
  } catch (error) {
    console.error("Error drawing rounded rectangle:", error);
  }
}

// Optimized circle rendering
export function drawCircle(
  snapshot: Gtk.Snapshot,
  centerX: number,
  centerY: number,
  radius: number,
  color: any
): void {
  try {
    if (radius <= 0) return;
    
    const rect = new Graphene.Rect();
    rect.init(centerX - radius, centerY - radius, radius * 2, radius * 2);
    
    const roundedRect = new Gsk.RoundedRect();
    roundedRect.init_from_rect(rect, radius);
    
    snapshot.push_rounded_clip(roundedRect);
    snapshot.append_color(color, rect);
    snapshot.pop();
  } catch (error) {
    console.error("Error drawing circle:", error);
  }
}

// Batch rectangle rendering for performance
export function drawRectBatch(
  snapshot: Gtk.Snapshot,
  rects: Array<{ x: number; y: number; width: number; height: number }>,
  color: any
): void {
  try {
    for (const rect of rects) {
      if (rect.width > 0 && rect.height > 0) {
        drawRect(snapshot, rect.x, rect.y, rect.width, rect.height, color);
      }
    }
  } catch (error) {
    console.error("Error in batch rectangle drawing:", error);
  }
}

// Linear gradient helper
export function createLinearGradient(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  stops: Array<{ offset: number; color: any }>
): any {
  try {
    const startPoint = new Graphene.Point();
    startPoint.init(startX, startY);
    
    const endPoint = new Graphene.Point();
    endPoint.init(endX, endY);
    
    const colorStops: any[] = [];
    for (const stop of stops) {
      colorStops.push(new Gsk.ColorStop(stop.offset, stop.color));
    }
    
    return new Gsk.LinearGradient(startPoint, endPoint, colorStops);
  } catch (error) {
    console.error("Error creating linear gradient:", error);
    return null;
  }
}

// Radial gradient helper
export function createRadialGradient(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  stops: Array<{ offset: number; color: any }>
): any {
  try {
    const center = new Graphene.Point();
    center.init(centerX, centerY);
    
    const colorStops: any[] = [];
    for (const stop of stops) {
      colorStops.push(new Gsk.ColorStop(stop.offset, stop.color));
    }
    
    return new Gsk.RadialGradient(center, radiusX, radiusY, 0, 1, colorStops);
  } catch (error) {
    console.error("Error creating radial gradient:", error);
    return null;
  }
}